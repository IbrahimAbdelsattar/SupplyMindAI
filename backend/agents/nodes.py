import os
import json
import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from backend.agents.state import AgentState
from backend.knowledge.langsmith_tracing import configure_langsmith

configure_langsmith()

try:
    from langsmith import traceable as _traceable
except ImportError:
    def _traceable(*a, **kw):  # type: ignore
        def deco(fn):
            return fn
        return deco
from backend.tools.forecasting_tools import generate_forecast
from backend.tools.inventory_tools import analyze_inventory
from backend.tools.rag_tools import query_inventory_knowledge
from backend.tools.mlops_tools import get_mlops_metrics
from backend.tools.knowledge_tools import (
    search_forecast_knowledge,
    search_inventory_knowledge,
    search_insights_knowledge,
    search_mlops_knowledge,
)

from backend.llm.client import get_llm

LOGGER = logging.getLogger(__name__)

_agent_llm_cache = {}


def _get_agent_llm(name: str):
    """Retrieve or build LLM dynamically."""
    if name not in _agent_llm_cache:
        base_llm = get_llm(temperature=0.2)
        if base_llm is None:
            _agent_llm_cache[name] = None
        else:
            if name == "llm":
                _agent_llm_cache[name] = base_llm
            elif name == "forecasting_llm":
                _agent_llm_cache[name] = base_llm.bind_tools([generate_forecast, search_forecast_knowledge])
            elif name == "inventory_llm":
                _agent_llm_cache[name] = base_llm.bind_tools([analyze_inventory, search_inventory_knowledge])
            elif name == "rag_llm":
                _agent_llm_cache[name] = base_llm.bind_tools([query_inventory_knowledge, search_insights_knowledge])
            elif name == "mlops_llm":
                _agent_llm_cache[name] = base_llm.bind_tools([get_mlops_metrics, search_mlops_knowledge])
    return _agent_llm_cache.get(name)


def __getattr__(name: str):
    """PEP 562 hook for lazy module-level attributes."""
    if name in {"llm", "forecasting_llm", "inventory_llm", "rag_llm", "mlops_llm"}:
        return _get_agent_llm(name)
    raise AttributeError(f"module {__name__} has no attribute {name}")


supervisor_prompt = """You are the **StockMind AI Orchestrator** — routing layer for the Inventory Intelligence Engine.
Route the user's request to the correct specialized agent:
- **Inventory Agent** — stock levels, reorder, stockout, overstock, safety stock, EOQ, ROP, inventory health
- **Forecasting Agent** — predictions, future demand, seasonality, forecast trends
- **RAG Agent** — historical reports, document queries, supplier info, insights
- **MLOps Agent** — model accuracy, drift, system resources, pipeline health

Respond ONLY with: inventory | forecasting | rag | mlops | FINISH"""

INVENTORY_AGENT_PROMPT = """You are the **Inventory Intelligence Agent** — part of StockMind AI.
You specialize in inventory reasoning, stock health, and optimization.

BEFORE answering, the system has already:
1. Detected this is an inventory question
2. Retrieved relevant inventory knowledge documents
3. Evaluated business rules against inventory data

Use the provided inventory context and business rules results to ground your answer.
Use `analyze_inventory` for live stock analysis and `search_inventory_knowledge` for past incidents.
Never invent SKU metrics, dates, or percentages. If data is insufficient, state what is missing."""

INTENT_DETECTOR_PROMPT = """Classify the user's question into one of:
- **inventory**: Stock, reorder, stockout, overstock, safety stock, EOQ, ROP, inventory health, working capital
- **forecast**: Demand prediction, forecast trends, seasonality, confidence
- **report**: Report generation, ABC/XYZ analysis
- **mlops**: Model drift, accuracy, retraining, pipeline health
- **general**: Platform questions, how-to, feature explanations
- **out_of_scope**: HR, Finance, employee, auth, website, developer docs, enterprise search

Respond ONLY with the category name. No other text."""


@_traceable(name="supervisor_node", run_type="chain")
def supervisor_node(state: AgentState):
    messages = [SystemMessage(content=supervisor_prompt)] + state['messages']
    model = _get_agent_llm("llm")
    if not model:
        return {"current_intent": "FINISH"}
    response = model.invoke(messages)
    return {"current_intent": response.content.strip()}


@_traceable(name="intent_detector_node", run_type="chain")
def intent_detector_node(state: AgentState):
    """Detect intent using pattern matching + LLM fallback."""
    question = state["messages"][0].content if state["messages"] else ""
    if not question:
        return {"intent_category": "general", "intent_confidence": 1.0, "intent_reason": "Empty question"}
    try:
        from backend.inventory.intent_detector import detect_intent
        intent_result = detect_intent(question)
        return {"intent_category": intent_result.category.value, "intent_confidence": intent_result.confidence, "intent_reason": intent_result.reason}
    except Exception:
        pass
    model = _get_agent_llm("llm")
    if model:
        intent_msg = [SystemMessage(content=INTENT_DETECTOR_PROMPT), HumanMessage(content=question)]
        response = model.invoke(intent_msg)
        intent_text = response.content.strip().lower() if hasattr(response, "content") else "general"
        valid = ("inventory", "forecast", "report", "mlops", "general", "out_of_scope")
        return {"intent_category": intent_text if intent_text in valid else "general", "intent_confidence": 0.7, "intent_reason": f"LLM classified: {intent_text}"}
    return {"intent_category": "general", "intent_confidence": 0.5, "intent_reason": "No detection available"}


@_traceable(name="business_rules_node", run_type="chain")
def business_rules_node(state: AgentState):
    """Evaluate business rules for the product in the user's question."""
    product_id = state.get("product_id", "")
    question = state["messages"][0].content if state["messages"] else ""
    if not product_id:
        try:
            from backend.inventory.intent_detector import _extract_product_id
            extracted = _extract_product_id(question)
            if extracted:
                product_id = extracted
        except Exception:
            pass
    if not product_id:
        return {"business_rules_result": {}, "inventory_context": ""}
    try:
        from backend.inventory.knowledge_builder import build_inventory_knowledge_document
        from backend.inventory.business_rules import evaluate_business_rules
        doc = build_inventory_knowledge_document(product_id)
        if doc is None:
            return {"business_rules_result": {}, "inventory_context": ""}
        rules_result = evaluate_business_rules(
            product_id=doc.product_id, current_stock=doc.current_stock, safety_stock=doc.safety_stock,
            reorder_point=doc.reorder_point, lead_time_days=doc.lead_time_days,
            inventory_turnover=doc.inventory_turnover, days_of_supply=doc.days_of_supply,
            forecast_demand=doc.forecast_demand, product_name=doc.product_name,
        )
        doc_dict = doc.to_document_dict()
        context = f"INVENTORY KNOWLEDGE DOCUMENT:\n{doc_dict['content']}\n\nBUSINESS RULES:\n{rules_result.to_prompt_context()}"
        return {"business_rules_result": rules_result.to_dict(), "inventory_context": context}
    except Exception as exc:
        LOGGER.exception("Business rules failed: %s", exc)
        return {"business_rules_result": {}, "inventory_context": ""}


@_traceable(name="inventory_node", run_type="chain")
def inventory_node(state: AgentState):
    """Inventory Intelligence Agent — uses business rules + inventory documents."""
    inv_ctx = state.get("inventory_context", "")
    biz_rules = state.get("business_rules_result", {})
    context_block = ""
    if inv_ctx:
        context_block = f"\n\nPRE-COMPUTED INVENTORY CONTEXT:\n{inv_ctx}"
    elif biz_rules:
        context_block = f"\n\nBUSINESS RULES:\n{json.dumps(biz_rules, indent=2)}"
    sys_msg = SystemMessage(content=INVENTORY_AGENT_PROMPT + context_block)
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("inventory_llm")
    if not model:
        return {"messages": [AIMessage(content="Inventory Intelligence Agent unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}


@_traceable(name="forecasting_node", run_type="chain")
def forecasting_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Forecasting Agent. Use `generate_forecast` for predictions and `search_forecast_knowledge` for historical forecast context.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("forecasting_llm")
    if not model:
        return {"messages": [AIMessage(content="Forecasting Agent unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}


@_traceable(name="rag_node", run_type="chain")
def rag_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Insights Agent. Use `search_insights_knowledge` and `query_inventory_knowledge` for grounded document retrieval.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("rag_llm")
    if not model:
        return {"messages": [AIMessage(content="Insights Agent unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}


@_traceable(name="mlops_node", run_type="chain")
def mlops_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the MLOps Agent. Use `get_mlops_metrics` for live metrics and `search_mlops_knowledge` for drift/retraining history.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("mlops_llm")
    if not model:
        return {"messages": [AIMessage(content="MLOps Agent unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}


@_traceable(name="insights_node", run_type="chain")
def insights_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Executive Insights Agent. Synthesize forecasting and inventory data into a final strategic summary.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("llm")
    if not model:
        return {"messages": [AIMessage(content="Executive Insights Agent unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}


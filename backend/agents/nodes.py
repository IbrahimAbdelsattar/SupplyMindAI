import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from backend.agents.state import AgentState
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

# Cache dictionary for lazy loading the LLMs
_agent_llm_cache = {}


def _get_agent_llm(name: str):
    """Retrieve or build LLM dynamically to avoid import-time ChatOpenAI creation."""
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


supervisor_prompt = """You are the Supply Mind AI Orchestrator.
Your job is to route the user's request to the correct specialized agent.
Available agents:
- Forecasting Agent (for predictions, future demand, seasonality)
- Inventory Agent (for stock levels, reorder quantities, risks)
- RAG Agent (for historical reports, document queries, supplier info)
- MLOps Agent (for model accuracy, drift, system resources)

Respond ONLY with the exact name of the agent to route to (forecasting, inventory, rag, mlops), or "FINISH" if you can answer directly based on context.
"""

def supervisor_node(state: AgentState):
    messages = [SystemMessage(content=supervisor_prompt)] + state['messages']
    model = _get_agent_llm("llm")
    if not model:
        return {"current_intent": "FINISH"}
    response = model.invoke(messages)
    return {"current_intent": response.content.strip()}

def forecasting_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Forecasting Agent. Use `generate_forecast` for predictions and `search_forecast_knowledge` for historical forecast context.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("forecasting_llm")
    if not model:
        return {"messages": [AIMessage(content="Forecasting Agent is currently unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}

def inventory_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Inventory Agent. Use `analyze_inventory` for live stock analysis and `search_inventory_knowledge` for similar past incidents.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("inventory_llm")
    if not model:
        return {"messages": [AIMessage(content="Inventory Agent is currently unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}

def rag_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Insights Agent. Use `search_insights_knowledge` and `query_inventory_knowledge` for grounded document retrieval.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("rag_llm")
    if not model:
        return {"messages": [AIMessage(content="Insights Agent is currently unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}

def mlops_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the MLOps Agent. Use `get_mlops_metrics` for live metrics and `search_mlops_knowledge` for drift/retraining history.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("mlops_llm")
    if not model:
        return {"messages": [AIMessage(content="MLOps Agent is currently unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}

def insights_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Executive Insights Agent. Synthesize forecasting and inventory data into a final strategic summary.")
    messages = [sys_msg] + state['messages']
    model = _get_agent_llm("llm")
    if not model:
        return {"messages": [AIMessage(content="Executive Insights Agent is currently unavailable (LLM disabled).")]}
    response = model.invoke(messages)
    return {"messages": [response]}

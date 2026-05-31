"""LangGraph copilot — coordinates multi-agent retrieval workflows."""

from __future__ import annotations

import os

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode

from backend.agents.state import AgentState
from backend.tools.forecasting_tools import generate_forecast
from backend.tools.inventory_tools import analyze_inventory
from backend.tools.knowledge_tools import (
    recall_agent_memory_tool,
    search_forecast_knowledge,
    search_insights_knowledge,
    search_inventory_knowledge,
    search_mlops_knowledge,
)
from backend.tools.mlops_tools import get_mlops_metrics
from backend.tools.rag_tools import query_inventory_knowledge

_copilot_tools = [
    search_forecast_knowledge,
    search_inventory_knowledge,
    search_insights_knowledge,
    search_mlops_knowledge,
    recall_agent_memory_tool,
    query_inventory_knowledge,
    generate_forecast,
    analyze_inventory,
    get_mlops_metrics,
]
_copilot_tool_node = ToolNode(_copilot_tools)

_key = os.getenv("CHATBOT_API_KEY") or os.getenv("OPENROUTER_API_KEY", "").strip()
_copilot_llm = ChatOpenAI(
    model=os.getenv("LLM_MODEL", "openai/gpt-4o-mini"),
    api_key=_key or "not-set",
    base_url="https://openrouter.ai/api/v1" if _key else None,
    temperature=0.15,
).bind_tools(_copilot_tools)

_COPILOT_SYSTEM = """You are SupplyMind Copilot — a supply chain intelligence assistant.
Use tools to retrieve historical forecasts, inventory incidents, insights, and MLOps events.
Never invent SKU metrics, dates, or percentages not returned by tools or operational data.
If tools return no data, say so and suggest running forecast/inventory/insights to populate the knowledge base.
"""


def copilot_agent_node(state: AgentState):
    messages = [SystemMessage(content=_COPILOT_SYSTEM)] + state["messages"]
    response = _copilot_llm.invoke(messages)
    return {"messages": [response]}


def _route_after_copilot(state: AgentState):
    last = state["messages"][-1]
    if hasattr(last, "tool_calls") and last.tool_calls:
        return "tools"
    return END


_copilot_workflow = StateGraph(AgentState)
_copilot_workflow.add_node("copilot", copilot_agent_node)
_copilot_workflow.add_node("tools", _copilot_tool_node)
_copilot_workflow.set_entry_point("copilot")
_copilot_workflow.add_conditional_edges("copilot", _route_after_copilot)
_copilot_workflow.add_edge("tools", "copilot")

copilot_graph = _copilot_workflow.compile()


def run_copilot_graph(question: str, product_id: str = "") -> dict:
    from backend.knowledge.langsmith_tracing import configure_langsmith

    configure_langsmith()
    result = copilot_graph.invoke(
        {
            "messages": [HumanMessage(content=question)],
            "product_id": product_id,
            "current_intent": "copilot",
        }
    )
    final = result["messages"][-1]
    answer = final.content if isinstance(final, AIMessage) else str(final)
    return {"answer": answer, "sources": []}

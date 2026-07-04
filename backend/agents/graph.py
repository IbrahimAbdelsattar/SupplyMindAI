from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from backend.agents.state import MAX_TOOL_ROUNDS, AgentState
from backend.agents.nodes import (
    supervisor_node, forecasting_node, inventory_node, rag_node, mlops_node, insights_node
)
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

import logging

LOGGER = logging.getLogger(__name__)

tools = [
    generate_forecast,
    analyze_inventory,
    query_inventory_knowledge,
    get_mlops_metrics,
    search_forecast_knowledge,
    search_inventory_knowledge,
    search_insights_knowledge,
    search_mlops_knowledge,
]
_tool_node = ToolNode(tools)


def tool_node_with_count(state: AgentState):
    """Run tools and increment tool_call_count."""
    result = _tool_node.invoke(state)
    new_count = state.get("tool_call_count", 0) + 1
    result["tool_call_count"] = new_count
    return result


def router(state: AgentState):
    intent = state.get("current_intent", "").lower()
    if "forecast" in intent:
        return "forecasting"
    if "inventory" in intent or "stock" in intent or "reorder" in intent:
        return "inventory"
    if "mlops" in intent or "drift" in intent or "model" in intent and "forecast" not in intent:
        return "mlops"
    if "finish" in intent:
        return END
    if "rag" in intent or "document" in intent or "supplier" in intent:
        return "rag"
    return "rag"

workflow = StateGraph(AgentState)

workflow.add_node("supervisor", supervisor_node)
workflow.add_node("forecasting", forecasting_node)
workflow.add_node("inventory", inventory_node)
workflow.add_node("rag", rag_node)
workflow.add_node("mlops", mlops_node)
workflow.add_node("tools", tool_node_with_count)

workflow.set_entry_point("supervisor")

workflow.add_conditional_edges("supervisor", router)

def agent_router(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    tool_count = state.get("tool_call_count", 0)

    if tool_count >= MAX_TOOL_ROUNDS:
        LOGGER.info("Multi-agent hit max tool rounds (%d), forcing END", MAX_TOOL_ROUNDS)
        return END

    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

for agent in ["forecasting", "inventory", "rag", "mlops"]:
    workflow.add_conditional_edges(agent, agent_router)

workflow.add_edge("tools", "supervisor")

app_graph = workflow.compile()

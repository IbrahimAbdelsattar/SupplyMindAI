from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from backend.agents.state import AgentState
from backend.agents.nodes import (
    supervisor_node, forecasting_node, inventory_node, rag_node, mlops_node, insights_node
)
from backend.tools.forecasting_tools import generate_forecast
from backend.tools.inventory_tools import analyze_inventory
from backend.tools.rag_tools import query_inventory_knowledge
from backend.tools.mlops_tools import get_mlops_metrics

tools = [generate_forecast, analyze_inventory, query_inventory_knowledge, get_mlops_metrics]
tool_node = ToolNode(tools)

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
workflow.add_node("tools", tool_node)

workflow.set_entry_point("supervisor")

workflow.add_conditional_edges("supervisor", router)

def agent_router(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

for agent in ["forecasting", "inventory", "rag", "mlops"]:
    workflow.add_conditional_edges(agent, agent_router)

workflow.add_edge("tools", "supervisor")

app_graph = workflow.compile()

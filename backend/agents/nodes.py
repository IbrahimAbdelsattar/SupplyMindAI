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

_openrouter_key = os.getenv("LLM_REASONING_API_KEY") or os.getenv("OPENROUTER_API_KEY", "").strip()
llm = ChatOpenAI(
    model=os.getenv("LLM_MODEL", "openai/gpt-4o-mini"),
    api_key=_openrouter_key or "not-set",
    base_url="https://openrouter.ai/api/v1" if _openrouter_key else None,
    temperature=0.2,
)

forecasting_llm = llm.bind_tools([generate_forecast, search_forecast_knowledge])
inventory_llm = llm.bind_tools([analyze_inventory, search_inventory_knowledge])
rag_llm = llm.bind_tools([query_inventory_knowledge, search_insights_knowledge])
mlops_llm = llm.bind_tools([get_mlops_metrics, search_mlops_knowledge])

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
    response = llm.invoke(messages)
    return {"current_intent": response.content.strip()}

def forecasting_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Forecasting Agent. Use `generate_forecast` for predictions and `search_forecast_knowledge` for historical forecast context.")
    messages = [sys_msg] + state['messages']
    response = forecasting_llm.invoke(messages)
    return {"messages": [response]}

def inventory_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Inventory Agent. Use `analyze_inventory` for live stock analysis and `search_inventory_knowledge` for similar past incidents.")
    messages = [sys_msg] + state['messages']
    response = inventory_llm.invoke(messages)
    return {"messages": [response]}

def rag_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Insights Agent. Use `search_insights_knowledge` and `query_inventory_knowledge` for grounded document retrieval.")
    messages = [sys_msg] + state['messages']
    response = rag_llm.invoke(messages)
    return {"messages": [response]}

def mlops_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the MLOps Agent. Use `get_mlops_metrics` for live metrics and `search_mlops_knowledge` for drift/retraining history.")
    messages = [sys_msg] + state['messages']
    response = mlops_llm.invoke(messages)
    return {"messages": [response]}

def insights_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Executive Insights Agent. Synthesize forecasting and inventory data into a final strategic summary.")
    messages = [sys_msg] + state['messages']
    response = llm.invoke(messages)
    return {"messages": [response]}

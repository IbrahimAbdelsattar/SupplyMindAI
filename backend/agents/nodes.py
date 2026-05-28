import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from backend.agents.state import AgentState
from backend.tools.forecasting_tools import generate_forecast
from backend.tools.inventory_tools import analyze_inventory
from backend.tools.rag_tools import query_inventory_knowledge
from backend.tools.mlops_tools import get_mlops_metrics

llm = ChatOpenAI(
    model=os.getenv("LLM_MODEL", "openai/gpt-4o-mini"),
    api_key=os.getenv("OPENROUTER_API_KEY", "dummy"),
    base_url="https://openrouter.ai/api/v1" if "openrouter" in str(os.getenv("OPENROUTER_API_KEY", "")).lower() or os.getenv("OPENROUTER_API_KEY") else None,
    temperature=0.2
)

forecasting_llm = llm.bind_tools([generate_forecast])
inventory_llm = llm.bind_tools([analyze_inventory])
rag_llm = llm.bind_tools([query_inventory_knowledge])
mlops_llm = llm.bind_tools([get_mlops_metrics])

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
    sys_msg = SystemMessage(content="You are the Forecasting Agent. Use the `generate_forecast` tool to answer questions about future demand.")
    messages = [sys_msg] + state['messages']
    response = forecasting_llm.invoke(messages)
    return {"messages": [response]}

def inventory_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Inventory Agent. Use the `analyze_inventory` tool to check stock health and recommend orders.")
    messages = [sys_msg] + state['messages']
    response = inventory_llm.invoke(messages)
    return {"messages": [response]}

def rag_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the RAG Knowledge Agent. Use `query_inventory_knowledge` to search historical documents.")
    messages = [sys_msg] + state['messages']
    response = rag_llm.invoke(messages)
    return {"messages": [response]}

def mlops_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the MLOps Agent. Use `get_mlops_metrics` to check model accuracy and data drift.")
    messages = [sys_msg] + state['messages']
    response = mlops_llm.invoke(messages)
    return {"messages": [response]}

def insights_node(state: AgentState):
    sys_msg = SystemMessage(content="You are the Executive Insights Agent. Synthesize forecasting and inventory data into a final strategic summary.")
    messages = [sys_msg] + state['messages']
    response = llm.invoke(messages)
    return {"messages": [response]}

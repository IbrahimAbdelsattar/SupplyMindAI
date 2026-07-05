from typing import TypedDict, List, Annotated, Any
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    """State definition for the LangGraph agent orchestration.

    Extended with Inventory Intelligence Engine fields:
    - intent_category: detected intent (inventory, forecast, report, mlops, general, out_of_scope)
    - business_rules_result: result of evaluating business rules
    - inventory_context: context built from inventory knowledge documents
    """
    messages: Annotated[List[BaseMessage], operator.add]
    product_id: str
    current_intent: str
    tool_call_count: int

    # Inventory Intelligence Engine fields
    intent_category: str
    intent_confidence: float
    intent_reason: str
    business_rules_result: dict
    inventory_context: str
    retrieved_documents: list


MAX_TOOL_ROUNDS = 4


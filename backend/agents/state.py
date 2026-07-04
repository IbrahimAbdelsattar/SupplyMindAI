from typing import TypedDict, List, Annotated
from langchain_core.messages import BaseMessage
import operator


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    product_id: str
    current_intent: str
    tool_call_count: int


MAX_TOOL_ROUNDS = 4  # max tool → copilot cycles before forced END

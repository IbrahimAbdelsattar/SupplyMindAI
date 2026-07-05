import logging
from typing import Any
from backend.knowledge.memory import recall_memory, upsert_memory

LOGGER = logging.getLogger(__name__)

class MemoryManager:
    """Manages isolated agent memory scopes using the AgentMemory table."""

    @staticmethod
    def get_context(agent_type: str, query: str, user_id: str, limit: int = 3) -> str:
        """Recall similar agent memories filtered strictly by agent_type."""
        try:
            memories = recall_memory(
                query=query,
                agent_type=agent_type,
                user_id=user_id,
                limit=limit
            )
            if not memories:
                return ""
            
            lines = [f"- {m.get('content', '')}" for m in memories if m.get('content')]
            if lines:
                return "\nRelevant memory context:\n" + "\n".join(lines)
        except Exception as exc:
            LOGGER.warning("Failed to recall memories for agent %s: %s", agent_type, exc)
        return ""

    @staticmethod
    def save_memory(agent_type: str, session_id: str, user_id: str, content: str, key: str = "last") -> None:
        """Save a memory snippet associated strictly with the agent_type."""
        try:
            memory_key = f"session:{session_id}:{key}"
            upsert_memory(
                agent_type=agent_type,
                memory_key=memory_key,
                content=content,
                user_id=user_id,
                with_embedding=True
            )
        except Exception as exc:
            LOGGER.warning("Failed to save memory for agent %s: %s", agent_type, exc)
            
            
def recall_agent_memory(query: str, agent_type: str, user_id: str | None = None, limit: int = 3) -> list[dict[str, Any]]:
    """Exposes memory recall utility specifically for agents/tools."""
    return recall_memory(query, agent_type=agent_type, user_id=user_id, limit=limit)

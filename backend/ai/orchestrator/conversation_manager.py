import logging
import uuid
from datetime import datetime, timezone
from typing import Any, List, Dict
from sqlalchemy import select
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from backend.db import Conversation
from backend.knowledge.client import knowledge_session, is_knowledge_available

LOGGER = logging.getLogger(__name__)

class ConversationManager:
    """Saves and retrieves conversation turns isolated by session, user, and agent type."""

    @staticmethod
    def save_turn(
        user_id: str,
        session_id: str,
        role: str,
        content: str,
        agent_type: str,
        metadata: Dict[str, Any] | None = None
    ) -> None:
        """Persist a conversation message containing the scope agent_type in its metadata."""
        if not is_knowledge_available():
            return

        combined_metadata = metadata or {}
        combined_metadata["agent_type"] = agent_type

        try:
            with knowledge_session() as db:
                db.add(
                    Conversation(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        session_id=session_id,
                        role=role,
                        content=content,
                        conversation_metadata=combined_metadata,
                        created_at=datetime.now(timezone.utc),
                    )
                )
        except Exception as exc:
            LOGGER.warning("Failed to save conversation turn for agent %s: %s", agent_type, exc)

    @staticmethod
    def get_history(
        user_id: str,
        session_id: str,
        agent_type: str,
        limit: int = 10
    ) -> List[BaseMessage]:
        """Load recent conversation history strictly scoped to the active agent."""
        if not is_knowledge_available():
            return []

        try:
            with knowledge_session() as db:
                # Query all turns in the session
                statement = (
                    select(Conversation)
                    .where(
                        Conversation.user_id == user_id,
                        Conversation.session_id == session_id
                    )
                    .order_by(Conversation.created_at.asc())
                )
                rows = db.scalars(statement).all()

            # Filter turns in memory that match the active agent
            messages: List[BaseMessage] = []
            for conv in rows:
                meta = conv.conversation_metadata or {}
                if meta.get("agent_type") == agent_type:
                    if conv.role == "user":
                        messages.append(HumanMessage(content=conv.content))
                    elif conv.role == "assistant":
                        messages.append(AIMessage(content=conv.content))
            
            return messages[-limit:]
        except Exception as exc:
            LOGGER.warning("Failed to retrieve conversation history for agent %s: %s", agent_type, exc)
            return []

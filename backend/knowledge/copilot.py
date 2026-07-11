"""SupplyMind Copilot — multi-source grounded assistant."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.db import Conversation
from backend.knowledge.client import is_knowledge_available, knowledge_session
from backend.knowledge.langsmith_tracing import configure_langsmith, trace_run
from backend.knowledge.memory import recall_memory, upsert_memory
from backend.knowledge.rag import rag_query

LOGGER = logging.getLogger(__name__)


def _save_conversation_turn(
    *,
    user_id: str,
    session_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not is_knowledge_available():
        return
    try:
        with knowledge_session() as db:
            db.add(
                Conversation(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    session_id=session_id,
                    role=role,
                    content=content,
                    conversation_metadata=metadata or {},
                    created_at=datetime.now(timezone.utc),
                )
            )
    except Exception as exc:
        LOGGER.warning("Conversation persist failed: %s", exc)


def _use_langgraph_copilot() -> bool:
    import os

    return os.getenv("COPILOT_USE_LANGGRAPH", "true").strip().lower() in {"1", "true", "yes", "on"}


def copilot_chat(
    *,
    message: str,
    user_id: str,
    session_id: str | None = None,
    product_id: str | None = None,
    mode: str = "business",
) -> dict[str, Any]:
    from backend.ai.orchestrator.router import AIOrchestrator
    from backend.ai.orchestrator.session_manager import SessionManager

    session_id = SessionManager.get_or_create_session(session_id)
    
    orchestrator = AIOrchestrator()
    result = orchestrator.execute_query(
        query=message,
        user_id=user_id,
        session_id=session_id,
        product_id=product_id,
        mode=mode,
    )

    return {
        "answer": result.get("answer", ""),
        "sources": result.get("sources", []),
        "session_id": session_id,
        "grounded": result.get("grounded", False),
    }


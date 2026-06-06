"""Database-backed long-term agent memory."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from backend.db import AgentMemory
from backend.knowledge.client import is_knowledge_available, knowledge_session
from backend.knowledge.embeddings import embed_text
from backend.knowledge.search import search_memory

LOGGER = logging.getLogger(__name__)


def upsert_memory(
    *, agent_type: str, memory_key: str, content: str, user_id: str | None = None,
    metadata: dict[str, Any] | None = None, with_embedding: bool = True,
) -> dict[str, Any] | None:
    if not is_knowledge_available():
        return None
    now = datetime.now(timezone.utc)
    try:
        with knowledge_session() as db:
            memory = db.scalar(
                select(AgentMemory).where(
                    AgentMemory.agent_type == agent_type,
                    AgentMemory.memory_key == memory_key,
                    AgentMemory.user_id == user_id,
                )
            )
            if memory is None:
                memory = AgentMemory(
                    id=str(uuid.uuid4()), user_id=user_id, agent_type=agent_type,
                    memory_key=memory_key, created_at=now, updated_at=now,
                )
                db.add(memory)
            memory.content = content
            memory.memory_metadata = metadata or {}
            memory.embedding = embed_text(content) if with_embedding else None
            memory.updated_at = now
        return {
            "agent_type": agent_type, "memory_key": memory_key, "content": content,
            "user_id": user_id, "metadata": metadata or {}, "updated_at": now.isoformat(),
        }
    except Exception as exc:
        LOGGER.exception("Memory upsert failed: %s", exc)
        return None


def recall_memory(
    query: str, *, agent_type: str | None = None, user_id: str | None = None, limit: int = 5
) -> list[dict[str, Any]]:
    return search_memory(query, agent_type=agent_type, user_id=user_id, match_count=limit)

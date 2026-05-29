"""Agent long-term memory in Supabase."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.knowledge.client import get_supabase_client, is_supabase_available
from backend.knowledge.embeddings import embed_text
from backend.knowledge.search import search_memory

LOGGER = logging.getLogger(__name__)


def upsert_memory(
    *,
    agent_type: str,
    memory_key: str,
    content: str,
    user_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    with_embedding: bool = True,
) -> dict[str, Any] | None:
    if not is_supabase_available():
        return None

    client = get_supabase_client()
    if client is None:
        return None

    row: dict[str, Any] = {
        "agent_type": agent_type,
        "memory_key": memory_key,
        "content": content,
        "user_id": user_id,
        "metadata": metadata or {},
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if with_embedding:
        row["embedding"] = embed_text(content)

    try:
        client.table("memory").upsert(row, on_conflict="user_id,agent_type,memory_key").execute()
        return row
    except Exception as exc:
        LOGGER.exception("Memory upsert failed: %s", exc)
        return None


def recall_memory(
    query: str,
    *,
    agent_type: str | None = None,
    user_id: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    return search_memory(query, agent_type=agent_type, user_id=user_id, match_count=limit)

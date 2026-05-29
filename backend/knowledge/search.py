"""Semantic search over Supabase pgvector."""

from __future__ import annotations

import logging
from typing import Any

from backend.knowledge.client import get_supabase_client, is_supabase_available
from backend.knowledge.config import get_knowledge_settings
from backend.knowledge.embeddings import embed_text

LOGGER = logging.getLogger(__name__)


def semantic_search(
    query: str,
    *,
    source_type: str | None = None,
    product_id: str | None = None,
    user_id: str | None = None,
    match_count: int | None = None,
    match_threshold: float | None = None,
) -> list[dict[str, Any]]:
    if not is_supabase_available() or not query.strip():
        return []

    settings = get_knowledge_settings()
    client = get_supabase_client()
    if client is None:
        return []

    vector = embed_text(query)
    params = {
        "query_embedding": vector,
        "match_count": match_count or settings.default_match_count,
        "match_threshold": match_threshold if match_threshold is not None else settings.match_threshold,
        "filter_source_type": source_type,
        "filter_product_id": product_id,
        "filter_user_id": user_id,
    }

    try:
        result = client.rpc("match_documents", params).execute()
        rows = result.data or []
        return [
            {
                "document_id": str(r.get("document_id", "")),
                "source_type": r.get("source_type"),
                "source_id": r.get("source_id"),
                "title": r.get("title"),
                "content": r.get("content"),
                "metadata": r.get("metadata") or {},
                "similarity": float(r.get("similarity") or 0),
            }
            for r in rows
        ]
    except Exception as exc:
        LOGGER.exception("Semantic search failed: %s", exc)
        return []


def search_memory(
    query: str,
    *,
    agent_type: str | None = None,
    user_id: str | None = None,
    match_count: int = 5,
) -> list[dict[str, Any]]:
    if not is_supabase_available():
        return []

    client = get_supabase_client()
    if client is None:
        return []

    settings = get_knowledge_settings()
    vector = embed_text(query)
    try:
        result = client.rpc(
            "match_memory",
            {
                "query_embedding": vector,
                "match_count": match_count,
                "match_threshold": settings.match_threshold,
                "filter_agent_type": agent_type,
                "filter_user_id": user_id,
            },
        ).execute()
        return list(result.data or [])
    except Exception as exc:
        LOGGER.exception("Memory search failed: %s", exc)
        return []

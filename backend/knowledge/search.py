"""Semantic search over locally persisted embeddings."""

from __future__ import annotations

import logging
import math
from typing import Any

from sqlalchemy import or_, select

from backend.db import AgentMemory, KnowledgeDocument, KnowledgeEmbedding
from backend.knowledge.client import is_knowledge_available, knowledge_session
from backend.knowledge.config import get_knowledge_settings
from backend.knowledge.embeddings import embed_text

LOGGER = logging.getLogger(__name__)


def _cosine(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    return dot / (left_norm * right_norm) if left_norm and right_norm else 0.0


def semantic_search(
    query: str,
    *,
    source_type: str | None = None,
    product_id: str | None = None,
    user_id: str | None = None,
    match_count: int | None = None,
    match_threshold: float | None = None,
) -> list[dict[str, Any]]:
    if not is_knowledge_available() or not query.strip():
        return []

    settings = get_knowledge_settings()
    threshold = settings.match_threshold if match_threshold is None else match_threshold
    limit = match_count or settings.default_match_count
    vector = embed_text(query)

    try:
        with knowledge_session() as db:
            statement = select(KnowledgeDocument, KnowledgeEmbedding).join(
                KnowledgeEmbedding, KnowledgeEmbedding.document_id == KnowledgeDocument.id
            )
            if source_type:
                statement = statement.where(KnowledgeDocument.source_type == source_type)
            if user_id:
                statement = statement.where(
                    or_(KnowledgeDocument.user_id == user_id, KnowledgeDocument.user_id.is_(None))
                )
            if product_id:
                statement = statement.where(
                    or_(
                        KnowledgeDocument.source_id == product_id,
                        KnowledgeDocument.document_metadata["product_id"].as_string() == product_id,
                    )
                )
            rows = db.execute(statement).all()

        best_by_document: dict[str, dict[str, Any]] = {}
        for document, embedding in rows:
            similarity = _cosine(vector, list(embedding.embedding or []))
            if similarity < threshold:
                continue
            current = best_by_document.get(document.id)
            if current and current["similarity"] >= similarity:
                continue
            best_by_document[document.id] = {
                "document_id": document.id,
                "source_type": document.source_type,
                "source_id": document.source_id,
                "title": document.title,
                "content": document.content,
                "metadata": document.document_metadata or {},
                "similarity": similarity,
            }
        return sorted(best_by_document.values(), key=lambda row: row["similarity"], reverse=True)[:limit]
    except Exception as exc:
        LOGGER.exception("Semantic search failed: %s", exc)
        return []


def search_memory(
    query: str, *, agent_type: str | None = None, user_id: str | None = None, match_count: int = 5
) -> list[dict[str, Any]]:
    if not is_knowledge_available() or not query.strip():
        return []

    settings = get_knowledge_settings()
    vector = embed_text(query)
    try:
        with knowledge_session() as db:
            statement = select(AgentMemory).where(AgentMemory.embedding.is_not(None))
            if agent_type:
                statement = statement.where(AgentMemory.agent_type == agent_type)
            if user_id:
                statement = statement.where(or_(AgentMemory.user_id == user_id, AgentMemory.user_id.is_(None)))
            memories = list(db.scalars(statement))

        results = []
        for memory in memories:
            similarity = _cosine(vector, list(memory.embedding or []))
            if similarity >= settings.match_threshold:
                results.append(
                    {
                        "memory_id": memory.id,
                        "agent_type": memory.agent_type,
                        "memory_key": memory.memory_key,
                        "content": memory.content,
                        "metadata": memory.memory_metadata or {},
                        "similarity": similarity,
                    }
                )
        return sorted(results, key=lambda row: row["similarity"], reverse=True)[:match_count]
    except Exception as exc:
        LOGGER.exception("Memory search failed: %s", exc)
        return []

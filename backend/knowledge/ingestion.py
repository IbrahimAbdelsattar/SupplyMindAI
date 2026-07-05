"""Document ingestion into the application knowledge database."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.db import KnowledgeDocument, KnowledgeEmbedding
from backend.knowledge.client import is_knowledge_available, knowledge_session
from backend.knowledge.embeddings import chunk_text, embed_texts_batch

LOGGER = logging.getLogger(__name__)
SourceType = str


def ingest_document(
    *,
    title: str,
    content: str,
    source_type: SourceType,
    source_id: str | None = None,
    user_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not is_knowledge_available():
        return None

    now = datetime.now(timezone.utc)
    document_id = str(uuid.uuid4())
    meta = dict(metadata or {})
    meta.setdefault("ingested_at", now.isoformat())
    chunks = chunk_text(content) or [content[:2000] if content else title]

    try:
        vectors = embed_texts_batch(chunks)
        with knowledge_session() as db:
            db.add(
                KnowledgeDocument(
                    id=document_id,
                    user_id=user_id,
                    source_type=source_type,
                    source_id=source_id,
                    title=title,
                    content=content,
                    document_metadata=meta,
                    created_at=now,
                    updated_at=now,
                )
            )
            db.add_all(
                [
                    KnowledgeEmbedding(
                        id=str(uuid.uuid4()),
                        document_id=document_id,
                        embedding=vector,
                        chunk_index=index,
                        chunk_content=chunk,
                        embedding_metadata=meta,
                        created_at=now,
                    )
                    for index, (chunk, vector) in enumerate(zip(chunks, vectors))
                ]
            )
    except Exception as exc:
        LOGGER.exception("Knowledge ingestion failed: %s", exc)
        return None

    return {
        "document_id": document_id,
        "source_type": source_type,
        "source_id": source_id,
        "chunks": len(chunks),
    }


def ingest_forecast_summary(
    *, product_id: str, horizon_days: int, summary: str, user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=f"Forecast: {product_id} ({horizon_days}d)",
        content=summary,
        source_type="forecast",
        source_id=product_id,
        user_id=user_id,
        metadata={"product_id": product_id, "horizon_days": horizon_days, **(extra or {})},
    )


def ingest_inventory_knowledge_document(
    *,
    product_id: str,
    content: str,
    title: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Ingest an inventory knowledge document (from the Knowledge Builder).

    Args:
        product_id: The product identifier.
        content: The semantic text content of the document.
        title: Optional title (defaults to "Inventory Intelligence: {product_id}").
        metadata: Optional metadata dict.

    Returns:
        Ingestion result dict or None on failure.
    """
    return ingest_document(
        title=title or f"Inventory Intelligence: {product_id}",
        content=content,
        source_type="inventory_intelligence",
        source_id=product_id,
        metadata={
            "product_id": product_id,
            "document_type": "inventory_intelligence",
            **(metadata or {}),
        },
    )

def ingest_inventory_recommendation(
    *, product_id: str, summary: str, user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=f"Inventory recommendation: {product_id}", content=summary,
        source_type="inventory", source_id=product_id, user_id=user_id,
        metadata={"product_id": product_id, **(extra or {})},
    )


def ingest_insight(
    *, product_id: str, summary: str, user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=f"AI insight: {product_id}", content=summary, source_type="insight",
        source_id=product_id, user_id=user_id,
        metadata={"product_id": product_id, **(extra or {})},
    )


def ingest_report(
    *, report_id: str, title: str, content: str, user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=title, content=content, source_type="report", source_id=report_id,
        user_id=user_id, metadata=extra or {},
    )


def ingest_mlops_event(
    *, event_id: str, summary: str, user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=f"MLOps: {event_id}", content=summary, source_type="mlops",
        source_id=event_id, user_id=user_id, metadata=extra or {},
    )

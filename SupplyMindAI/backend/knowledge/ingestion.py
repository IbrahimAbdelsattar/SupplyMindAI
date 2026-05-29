"""Document ingestion into Supabase (documents + embeddings)."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.knowledge.client import get_supabase_client, is_supabase_available
from backend.knowledge.config import get_knowledge_settings
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
    """Store document and embedding chunks in Supabase."""
    if not is_supabase_available():
        return None

    client = get_supabase_client()
    if client is None:
        return None

    meta = dict(metadata or {})
    meta.setdefault("ingested_at", datetime.now(timezone.utc).isoformat())

    doc_row = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "source_type": source_type,
        "source_id": source_id,
        "title": title,
        "content": content,
        "metadata": meta,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        client.table("documents").insert(doc_row).execute()
    except Exception as exc:
        LOGGER.exception("Document insert failed: %s", exc)
        return None

    chunks = chunk_text(content)
    if not chunks:
        chunks = [content[:2000] if content else title]

    vectors = embed_texts_batch(chunks)
    embed_rows = []
    for idx, (chunk, vector) in enumerate(zip(chunks, vectors)):
        embed_rows.append(
            {
                "id": str(uuid.uuid4()),
                "document_id": doc_row["id"],
                "embedding": vector,
                "chunk_index": idx,
                "metadata": {**meta, "chunk": chunk[:200]},
            }
        )

    try:
        client.table("embeddings").insert(embed_rows).execute()
    except Exception as exc:
        LOGGER.exception("Embedding insert failed: %s", exc)
        client.table("documents").delete().eq("id", doc_row["id"]).execute()
        return None

    return {
        "document_id": doc_row["id"],
        "source_type": source_type,
        "source_id": source_id,
        "chunks": len(embed_rows),
    }


def ingest_forecast_summary(
    *,
    product_id: str,
    horizon_days: int,
    summary: str,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    meta = {"product_id": product_id, "horizon_days": horizon_days, **(extra or {})}
    return ingest_document(
        title=f"Forecast: {product_id} ({horizon_days}d)",
        content=summary,
        source_type="forecast",
        source_id=product_id,
        user_id=user_id,
        metadata=meta,
    )


def ingest_inventory_recommendation(
    *,
    product_id: str,
    summary: str,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    meta = {"product_id": product_id, **(extra or {})}
    return ingest_document(
        title=f"Inventory recommendation: {product_id}",
        content=summary,
        source_type="inventory",
        source_id=product_id,
        user_id=user_id,
        metadata=meta,
    )


def ingest_insight(
    *,
    product_id: str,
    summary: str,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    meta = {"product_id": product_id, **(extra or {})}
    return ingest_document(
        title=f"AI insight: {product_id}",
        content=summary,
        source_type="insight",
        source_id=product_id,
        user_id=user_id,
        metadata=meta,
    )


def ingest_report(
    *,
    report_id: str,
    title: str,
    content: str,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=title,
        content=content,
        source_type="report",
        source_id=report_id,
        user_id=user_id,
        metadata=extra or {},
    )


def ingest_mlops_event(
    *,
    event_id: str,
    summary: str,
    user_id: str | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    return ingest_document(
        title=f"MLOps: {event_id}",
        content=summary,
        source_type="mlops",
        source_id=event_id,
        user_id=user_id,
        metadata=extra or {},
    )

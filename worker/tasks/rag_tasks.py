from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from celery import shared_task
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.knowledge.ingestion import ingest_document

LOGGER = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=30, queue="rag")
def index_knowledge_document(
    self,
    tenant_id: str,
    doc_id: str,
    content: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    LOGGER.info("Indexing document %s for tenant=%s", doc_id, tenant_id)
    try:
        res = ingest_document(
            title=f"Doc {doc_id}",
            content=content or "",
            source_type="general",
            source_id=doc_id,
            user_id=tenant_id,
            metadata=metadata or {},
        )
        if not res:
            LOGGER.warning("Document %s skipped (knowledge unavailable)", doc_id)
        LOGGER.info("Document %s indexed successfully", doc_id)
        return {"tenant_id": tenant_id, "doc_id": doc_id, "status": "indexed"}
    except Exception as exc:
        LOGGER.error("Failed to index document %s: %s", doc_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, queue="rag")
def reindex_collection(
    self,
    tenant_id: str,
) -> dict[str, Any]:
    LOGGER.info("Reindexing collection for tenant=%s", tenant_id)
    db: Session = SessionLocal()
    try:
        from backend.db import Conversation

        convs = (
            db.query(Conversation)
            .filter(Conversation.session_id.isnot(None))
            .order_by(Conversation.session_id, Conversation.created_at)
            .all()
        )
        sessions: dict[str, list[str]] = {}
        for c in convs:
            sessions.setdefault(c.session_id, []).append(f"{c.role}: {c.content}")

        from backend.db import KnowledgeDocument
        db.query(KnowledgeDocument).filter(KnowledgeDocument.user_id == tenant_id).delete()
        db.commit()
        
        count = 0
        for session_id, messages in sessions.items():
            ingest_document(
                title=f"session_{session_id}",
                content="\n".join(messages),
                source_type="conversation",
                source_id=session_id,
                user_id=tenant_id,
                metadata={
                    "session_id": session_id,
                    "conversation_count": len(messages),
                },
            )
            count += 1
        LOGGER.info("Reindex complete for tenant=%s — %d sessions", tenant_id, count)
        return {"tenant_id": tenant_id, "sessions_indexed": count}
    except Exception as exc:
        LOGGER.error("Reindex failed for tenant=%s: %s", tenant_id, exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@shared_task(queue="rag")
def warm_up_rag() -> dict[str, Any]:
    LOGGER.info("Warming up RAG service (native DB - no warmup needed)")
    return {"status": "warmed"}

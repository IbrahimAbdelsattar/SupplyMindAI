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

from backend.bootstrap import init_rag_service
from backend.db import SessionLocal
from backend.globals import RAG_SERVICE

LOGGER = logging.getLogger(__name__)

_rag_initialized = False


def _ensure_rag():
    global _rag_initialized
    if not _rag_initialized:
        svc = init_rag_service()
        _rag_initialized = True
        LOGGER.info("RAG service initialized for worker")
        return svc
    return RAG_SERVICE


@shared_task(bind=True, max_retries=3, default_retry_delay=30, queue="rag")
def index_knowledge_document(
    self,
    tenant_id: str,
    doc_id: str,
    content: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    LOGGER.info("Indexing document %s for tenant=%s", doc_id, tenant_id)
    rag = _ensure_rag()
    try:
        rag.add_document(tenant_id, doc_id, content or "", metadata or {})
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
    rag = _ensure_rag()
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

        rag.clear_tenant(tenant_id)
        count = 0
        for session_id, messages in sessions.items():
            rag.add_document(
                tenant_id,
                f"session_{session_id}",
                "\n".join(messages),
                {
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
    LOGGER.info("Warming up RAG service")
    _ensure_rag()
    return {"status": "warmed"}

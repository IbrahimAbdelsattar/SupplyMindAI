"""Knowledge / RAG / Copilot API routes."""

from __future__ import annotations

from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.knowledge import copilot_chat, ingest_document, is_supabase_available, rag_query, semantic_search
from backend.knowledge.config import get_knowledge_settings

router = APIRouter(tags=["knowledge"])


def _get_user():
    from backend.main import _get_current_user

    return _get_current_user


def _require_knowledge() -> None:
    if not is_supabase_available():
        raise HTTPException(
            status_code=503,
            detail="Supabase intelligence layer is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )


def _user_id(user: Any) -> str:
    return str(getattr(user, "id", "anonymous"))


class IngestRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    source_type: Literal[
        "forecast", "inventory", "insight", "report", "mlops", "incident", "recommendation", "general"
    ] = "general"
    source_id: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    source_type: Optional[str] = None
    product_id: Optional[str] = None
    match_count: Optional[int] = Field(default=None, ge=1, le=50)


class RagQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    source_type: Optional[str] = None
    product_id: Optional[str] = None
    include_operational_context: bool = True


class CopilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    mode: Literal["business", "technical"] = "business"


@router.get("/knowledge/status")
def knowledge_status(user: Any = Depends(_get_user)) -> dict[str, Any]:
    settings = get_knowledge_settings()
    return {
        "configured": settings.is_configured,
        "available": is_supabase_available(),
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
    }


@router.post("/knowledge/ingest")
def knowledge_ingest(payload: IngestRequest, user: Any = Depends(_get_user)) -> dict[str, Any]:
    _require_knowledge()
    result = ingest_document(
        title=payload.title,
        content=payload.content,
        source_type=payload.source_type,
        source_id=payload.source_id,
        user_id=_user_id(user),
        metadata=payload.metadata,
    )
    if result is None:
        raise HTTPException(status_code=500, detail="Ingestion failed")
    return {"status": "ok", **result}


@router.post("/knowledge/search")
def knowledge_search(payload: SearchRequest, user: Any = Depends(_get_user)) -> dict[str, Any]:
    _require_knowledge()
    results = semantic_search(
        payload.query,
        source_type=payload.source_type,
        product_id=payload.product_id,
        user_id=_user_id(user),
        match_count=payload.match_count,
    )
    return {"results": results, "count": len(results)}


@router.post("/rag/query")
def rag_query_endpoint(payload: RagQueryRequest, user: Any = Depends(_get_user)) -> dict[str, Any]:
    return rag_query(
        payload.question,
        source_type=payload.source_type,
        product_id=payload.product_id,
        user_id=_user_id(user),
        operational_context=payload.include_operational_context,
    )


@router.post("/copilot/chat")
def copilot_chat_endpoint(payload: CopilotChatRequest, user: Any = Depends(_get_user)) -> dict[str, Any]:
    return copilot_chat(
        message=payload.message,
        user_id=_user_id(user),
        session_id=payload.session_id,
        product_id=payload.product_id,
        mode=payload.mode,
    )

from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.dependencies import _get_current_user
from backend.services.rag_service import RagService

router = APIRouter(prefix="/api/v1/rag", tags=["inventory-rag"])

class RagQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    source_type: Optional[str] = None
    product_id: Optional[str] = None
    include_operational_context: bool = True

@router.post("/query")
def rag_query_endpoint(
    payload: RagQueryRequest,
    user: Any = Depends(_get_current_user)
) -> dict[str, Any]:
    svc = RagService()
    user_id = str(getattr(user, "id", "anonymous"))
    return svc.query(
        question=payload.question,
        source_type=payload.source_type,
        product_id=payload.product_id,
        user_id=user_id,
        operational_context=payload.include_operational_context,
    )

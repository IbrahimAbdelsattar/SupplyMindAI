from __future__ import annotations

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.dependencies import _get_current_user
from backend.llm.client import is_copilot_enabled
from backend.services.copilot_service import CopilotService

router = APIRouter(prefix="/api/v1/copilot", tags=["copilot"])

class CopilotChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: Optional[str] = None
    product_id: Optional[str] = None
    mode: Optional[str] = "business"

@router.post("/chat")
def copilot_chat_endpoint(
    payload: CopilotChatRequest,
    user: Any = Depends(_get_current_user)
) -> dict[str, Any]:
    if not is_copilot_enabled():
        raise HTTPException(status_code=503, detail="Copilot service is currently disabled or LLM is not configured.")
    svc = CopilotService()
    answer = svc.chat(payload.message)
    return {
        "answer": answer,
        "session_id": payload.session_id,
        "sources": [],
        "grounded": False
    }

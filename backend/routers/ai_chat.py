from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.globals import STORE

router = APIRouter(prefix="/api/v1/ai", tags=["ai-chat"])


def _uid(user) -> str:
    return user.id if hasattr(user, "id") else user["id"]


@router.post("/chat")
def ai_chat(payload: dict, user=Depends(_get_current_user)):
    try:
        question = payload.get("message", "")
        from backend.services.rag_service import RagService

        svc = RagService()
        result = svc.query(question, user_id=_uid(user))
        return {"reply": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/copilot/chat")
def copilot_chat(payload: dict, user=Depends(_get_current_user)):
    try:
        message = payload.get("message", "")
        from backend.services.copilot_service import CopilotService

        svc = CopilotService()
        result = svc.chat(message)
        return {"reply": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights/generate")
def insights_generate(payload: dict, user=Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        question = payload.get("question", "Generate insights for this product.")
        from backend.services.rag_service import RagService

        svc = RagService()
        result = svc.query(question, product_id=product_id, user_id=_uid(user))
        return {"insights": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights/chat")
def insights_chat(payload: dict, user=Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        question = payload.get("question", payload.get("message", ""))
        from backend.services.rag_service import RagService

        svc = RagService()
        result = svc.query(question, product_id=product_id, user_id=_uid(user))
        return {"reply": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

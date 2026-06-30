from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.globals import STORE
from backend.knowledge.auth import AuthUser

router = APIRouter(prefix="/api/v1/ai", tags=["ai-chat"])


@router.post("/chat")
def ai_chat(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        message = payload.get("message", "")
        from backend.services.chat_service import handle_chat_message

        result = handle_chat_message(message, user_id=str(user.id))
        return {"reply": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/copilot/chat")
def copilot_chat(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        message = payload.get("message", "")
        from backend.services.copilot_service import handle_copilot_chat

        result = handle_copilot_chat(message, user_id=str(user.id))
        return {"reply": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights/generate")
def insights_generate(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        from backend.services.insight_service import generate_insights

        result = generate_insights(product_id=product_id)
        return {"insights": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights/chat")
def insights_chat(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        message = payload.get("message", "")
        product_id = payload.get("product_id")
        from backend.services.insight_service import chat_about_insights

        result = chat_about_insights(message, product_id=product_id)
        return {"reply": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

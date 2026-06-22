from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.knowledge.auth import AuthUser
from backend.schemas.insights import ChatRequest

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


@router.post("")
def chat_endpoint(payload: ChatRequest, user: AuthUser = Depends(_get_current_user)):
    from loguru import logger

    try:
        from backend.agents.graph import app_graph
        from langchain_core.messages import HumanMessage

        initial_state = {
            "messages": [HumanMessage(content=payload.question)],
            "product_id": payload.selected_sku or "",
            "current_intent": "",
        }

        result = app_graph.invoke(initial_state)
        final_message = result["messages"][-1].content

        return {"answer": final_message, "sources": []}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Chat graph failed: %s", exc)
        raise HTTPException(status_code=500, detail="Chat service is temporarily unavailable") from exc

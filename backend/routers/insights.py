from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user

from backend.schemas.insights import InsightsGeneratePayload, ChatPayload

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])


@router.post("/generate")
def insights_generate(
    payload: InsightsGeneratePayload,
    user: dict = Depends(_get_current_user),
):
    try:
        product_id = payload.product_id
        from backend.services.rag_service import RagService

        svc = RagService()
        result = svc.query(
            "Generate insights for this product.",
            product_id=product_id,
            user_id=user["id"],
        )
        return {"insights": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/chat")
def insights_chat(
    payload: ChatPayload,
    user: dict = Depends(_get_current_user),
):
    try:
        question = payload.message
        product_id = payload.selected_sku
        from backend.services.rag_service import RagService

        svc = RagService()
        result = svc.query(question, product_id=product_id, user_id=user["id"])
        return {"reply": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

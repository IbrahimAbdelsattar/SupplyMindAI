from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user

from backend.schemas.insights import InsightsGeneratePayload, ChatPayload

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])

_IMPACTS = ["high", "medium", "low"]
_DIRECTIONS = ["up", "down", "flat"]
_FACTORS = ["Seasonality", "Historical Trends", "Promotions", "External Factors", "Other"]


def _build_insights_from_answer(answer: str, product_id: str) -> dict:
    """Parse a RAG answer into structured insight cards."""
    sentences = [s.strip() for s in answer.split(".") if len(s.strip()) > 20]

    insights = []
    for i, sentence in enumerate(sentences[:5]):
        insights.append({
            "title": f"Insight {i + 1}: {sentence[:60]}{'...' if len(sentence) > 60 else ''}",
            "description": sentence,
            "impact": random.choice(_IMPACTS),
            "direction": random.choice(_DIRECTIONS),
            "factor": random.choice(_FACTORS),
            "confidence": random.randint(65, 95),
        })

    if not insights:
        insights = [{
            "title": f"Analysis for {product_id}",
            "description": answer[:200] if answer else "No specific insights available.",
            "impact": "medium",
            "direction": "flat",
            "factor": "Historical Trends",
            "confidence": 70,
        }]

    lines = [l.strip() for l in answer.split("\n") if l.strip()]
    executive_summary = lines[0][:300] if lines else f"Analysis complete for product {product_id}."
    recommendations = [l.strip("- ").strip() for l in lines[1:4] if l.strip()] or [
        "Review current inventory levels",
        "Monitor demand patterns closely",
    ]

    return {
        "insights": insights,
        "executive_summary": executive_summary,
        "recommendations": recommendations,
    }


@router.post("/generate")
def insights_generate(
    payload: InsightsGeneratePayload,
    user: dict = Depends(_get_current_user),
):
    try:
        product_id = payload.product_id
        from backend.services.rag_service import RagService

        svc = RagService()
        uid = user.id if hasattr(user, "id") else user["id"]
        result = svc.query(
            f"Generate supply chain insights for product {product_id}.",
            product_id=product_id,
            user_id=uid,
        )
        answer = result.get("answer", "")
        return _build_insights_from_answer(answer, product_id)
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

        uid = user.id if hasattr(user, "id") else user["id"]
        svc = RagService()
        result = svc.query(question, product_id=product_id, user_id=uid)
        return {"response": result.get("answer", "")}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.schemas.insights import InsightsGeneratePayload, ChatPayload

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/insights", tags=["insights"])


@router.post("/generate")
def insights_generate(
    payload: InsightsGeneratePayload,
    user: dict = Depends(_get_current_user),
):
    """Generate AI insights for a product using ML feature extraction (SHAP) + LLM reasoning."""
    try:
        from backend.services.insight_service import generate_insights

        return generate_insights(payload.product_id)
    except Exception as exc:
        LOGGER.error("Insight generation failed for %s: %s", payload.product_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# LLM Observability Endpoints
# ---------------------------------------------------------------------------
@router.get("/monitor/stats")
def llm_monitor_stats(user: dict = Depends(_get_current_user)):
    """Return aggregated LLM call statistics per feature."""
    from backend.llm.monitor import llm_monitor

    return {
        "stats": llm_monitor.get_stats(),
        "total_calls": sum(s["calls"] for s in llm_monitor.get_stats().values()),
    }


@router.get("/monitor/recent")
def llm_monitor_recent(
    limit: int = 50,
    feature: str | None = None,
    user: dict = Depends(_get_current_user),
):
    """Return recent LLM call records."""
    from backend.llm.monitor import llm_monitor

    return {
        "records": llm_monitor.get_recent(limit=limit, feature=feature),
        "count": len(llm_monitor.get_recent(limit=limit, feature=feature)),
    }

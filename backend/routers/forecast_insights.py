from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.dependencies import _get_current_user
from backend.llm.forecast_reasoning import (
    generate_executive_insights,
    generate_high_risk_insights,
    generate_product_insight,
    generate_revenue_insights,
)
from backend.services.forecast_intelligence_service import ForecastIntelligenceService

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/forecast", tags=["forecast-insights"])


def _get_service() -> ForecastIntelligenceService:
    from backend.main import FORECAST_INTELLIGENCE

    if FORECAST_INTELLIGENCE is None:
        raise HTTPException(status_code=503, detail="Forecast intelligence service not initialized")
    return FORECAST_INTELLIGENCE


class InsightsResponse(BaseModel):
    summary: str = Field(..., description="Executive summary")
    risks: list[dict[str, Any]] = Field(default_factory=list, description="Identified risks")
    recommendations: list[dict[str, Any]] = Field(default_factory=list, description="Strategic recommendations")
    revenue_opportunities: list[dict[str, Any]] = Field(default_factory=list, description="Revenue growth opportunities")


@router.post("/insights", response_model=InsightsResponse)
def forecast_insights(user: Any = Depends(_get_current_user)) -> InsightsResponse:
    svc = _get_service()
    if not svc.is_loaded:
        raise HTTPException(status_code=503, detail="Forecast intelligence data not available")

    all_data = svc.get_all_forecasts()
    result = generate_executive_insights(all_data)
    return InsightsResponse(**result)


@router.post("/insights/product/{product_id}", response_model=InsightsResponse)
def product_insight(product_id: str, user: Any = Depends(_get_current_user)) -> InsightsResponse:
    svc = _get_service()
    forecasts = svc.get_product_forecast(product_id)
    if not forecasts:
        raise HTTPException(status_code=404, detail=f"No forecast data for product: {product_id}")

    result = generate_product_insight(product_id, forecasts)
    return InsightsResponse(**result)


@router.post("/insights/high-risk", response_model=InsightsResponse)
def high_risk_insight(user: Any = Depends(_get_current_user)) -> InsightsResponse:
    svc = _get_service()
    high_risk = svc.get_high_risk_products()
    if not high_risk:
        return InsightsResponse(summary="No high-risk products identified.", risks=[], recommendations=[], revenue_opportunities=[])

    result = generate_high_risk_insights(high_risk)
    return InsightsResponse(**result)


@router.post("/insights/revenue", response_model=InsightsResponse)
def revenue_insight(user: Any = Depends(_get_current_user)) -> InsightsResponse:
    svc = _get_service()
    revenue_data = svc.get_revenue_forecasts()
    if not revenue_data:
        return InsightsResponse(summary="No revenue forecast data available.", risks=[], recommendations=[], revenue_opportunities=[])

    result = generate_revenue_insights(revenue_data)
    return InsightsResponse(**result)

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.main import FORECAST_INTELLIGENCE  # noqa: F811
from backend.services.forecast_intelligence_service import ForecastIntelligenceService

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/forecast/intelligence", tags=["forecast-intelligence"])


def _get_service() -> ForecastIntelligenceService:
    from backend.main import FORECAST_INTELLIGENCE

    if FORECAST_INTELLIGENCE is None:
        raise HTTPException(status_code=503, detail="Forecast intelligence service not initialized")
    return FORECAST_INTELLIGENCE


@router.get("")
def list_intelligence(user: Any = Depends(_get_current_user)) -> list[dict[str, Any]]:
    svc = _get_service()
    return svc.get_all_forecasts()


@router.get("/product/{product_id}")
def product_intelligence(product_id: str, user: Any = Depends(_get_current_user)) -> list[dict[str, Any]]:
    svc = _get_service()
    results = svc.get_product_forecast(product_id)
    if not results:
        raise HTTPException(status_code=404, detail=f"No forecast data for product: {product_id}")
    return results


@router.get("/high-risk")
def high_risk_intelligence(user: Any = Depends(_get_current_user)) -> list[dict[str, Any]]:
    svc = _get_service()
    return svc.get_high_risk_products()


@router.get("/recommendations")
def reorder_recommendations(user: Any = Depends(_get_current_user)) -> list[dict[str, Any]]:
    svc = _get_service()
    return svc.get_reorder_recommendations()


@router.get("/revenue")
def revenue_forecasts(user: Any = Depends(_get_current_user)) -> list[dict[str, Any]]:
    svc = _get_service()
    return svc.get_revenue_forecasts()

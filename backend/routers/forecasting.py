from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.dependencies import _get_current_user
from backend.globals import MODELS, STORE
from backend.knowledge.auth import AuthUser
from backend.schemas.forecast import ForecastPredictRequest, ForecastPredictResponse

router = APIRouter(prefix="/api/v1/forecast", tags=["forecasting"])


@router.post("/predict", response_model=ForecastPredictResponse)
def predict_forecast(payload: ForecastPredictRequest, user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.forecast_model import ARIMAForecast

        model = MODELS.get_model("arima")
        forecaster = ARIMAForecast(model=model)
        result = forecaster.forecast(
            product_id=payload.product_id,
            periods=payload.periods,
            confidence=payload.confidence,
        )
        raw_json = json.dumps(result, default=str)

        forecast_response = ForecastPredictResponse(**json.loads(raw_json))

        return forecast_response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights")
def forecast_insights(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        forecast_data = payload.get("forecast_data")
        from backend.services.insight_service import generate_insights

        result = generate_insights(product_id=product_id, forecast_data=forecast_data)
        return {"insights": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/intelligence/analyze")
def forecast_intelligence_analyze(
    product_id: str = Query(..., description="Product ID"),
    user: AuthUser = Depends(_get_current_user),
):
    try:
        from backend.services.forecast_intelligence import analyze_product

        result = analyze_product(product_id)
        return {"product_id": product_id, "analysis": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/intelligence/scenarios")
def forecast_intelligence_scenarios(
    product_id: str = Query(..., description="Product ID"),
    user: AuthUser = Depends(_get_current_user),
):
    try:
        from backend.services.forecast_intelligence import generate_scenarios

        scenarios = generate_scenarios(product_id)
        return {"product_id": product_id, "scenarios": scenarios}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/intelligence/anomalies")
def forecast_intelligence_anomalies(
    product_id: str = Query(..., description="Product ID"),
    user: AuthUser = Depends(_get_current_user),
):
    try:
        from backend.services.forecast_intelligence import detect_anomalies

        anomalies = detect_anomalies(product_id)
        return {"product_id": product_id, "anomalies": anomalies}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

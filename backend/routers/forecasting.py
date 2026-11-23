from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.dependencies import _get_current_user, require_permission
from backend.auth.rbac import Permission
from backend.globals import STORE
from backend.schemas.forecast import ForecastPredictRequest, ForecastPredictResponse, ForecastPoint
from backend.services.monthly_forecast import ForecastUnavailable, monthly_predictions

router = APIRouter(prefix="/api/v1/forecast", tags=["forecasting"])


@router.post("/predict", response_model=ForecastPredictResponse)
def predict_forecast(payload: ForecastPredictRequest, user: dict = Depends(require_permission(Permission.GENERATE_FORECASTS))):
    try:
        import pandas as pd

        n_months = max(1, payload.horizon_days // 30)
        monthly_summary = monthly_predictions(payload.product_id, n_months)

        sales = STORE.sales_daily()
        qty_col = "qty" if "qty" in sales.columns else "total_qty"
        history = sales.loc[sales["product_id"] == payload.product_id, ["date", qty_col]].copy()
        history[qty_col] = pd.to_numeric(history[qty_col], errors="coerce")
        daily_sales = history.groupby("date")[qty_col].sum(min_count=1).dropna().sort_index().tail(30)
        historical_points = [
            ForecastPoint(date=day.strftime("%Y-%m-%d"), actual=float(quantity))
            for day, quantity in daily_sales.items()
        ]

        # The model predicts monthly totals. Chart the daily average within each calendar month.
        forecast_points = []
        for prediction in monthly_summary:
            period = pd.Period(prediction.period, freq="M")
            days = min(period.days_in_month, payload.horizon_days - len(forecast_points))
            if days <= 0:
                break
            daily_average = prediction.predicted_demand / period.days_in_month
            forecast_points.extend(
                ForecastPoint(date=day.strftime("%Y-%m-%d"), forecast=round(daily_average, 2))
                for day in pd.date_range(period.start_time, periods=days)
            )

        return ForecastPredictResponse(
            product_id=payload.product_id,
            horizon_days=payload.horizon_days,
            series=historical_points + forecast_points,
            monthly_summary=monthly_summary
        )
    except ForecastUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights")
def forecast_insights(payload: dict, user: dict = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        forecast_data = payload.get("forecast_data")
        from backend.services.insight_service import generate_insights

        result = generate_insights(product_id=product_id, forecast_data=forecast_data)
        return {"insights": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/insights/stream")
async def forecast_insights_stream(
    payload: dict,
    user: dict = Depends(_get_current_user),
):
    """Stream forecast-based AI insights as SSE events."""
    from backend.services.streaming import stream_insights

    product_id = payload.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id is required")
    generator = stream_insights(product_id)
    return StreamingResponse(generator, media_type="text/event-stream")


@router.post("/reasoning/stream")
async def forecast_reasoning_stream(
    payload: dict,
    user: dict = Depends(require_permission(Permission.GENERATE_FORECASTS)),
):
    """Stream forecast reasoning analysis as SSE events."""
    from backend.services.streaming import stream_forecast_reasoning

    forecasts = payload.get("forecasts", [])
    question = payload.get("question")
    generator = stream_forecast_reasoning(forecasts=forecasts, question=question)
    return StreamingResponse(generator, media_type="text/event-stream")


@router.get("/intelligence/analyze")
def forecast_intelligence_analyze(
    product_id: str = Query(..., description="Product ID"),
    user: dict = Depends(_get_current_user),
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
    user: dict = Depends(_get_current_user),
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
    user: dict = Depends(_get_current_user),
):
    try:
        from backend.services.forecast_intelligence import detect_anomalies

        anomalies = detect_anomalies(product_id)
        return {"product_id": product_id, "anomalies": anomalies}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

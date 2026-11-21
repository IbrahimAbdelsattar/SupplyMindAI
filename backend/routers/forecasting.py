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
        from datetime import timedelta
        
        n_months = max(1, payload.horizon_days // 30)
        monthly_summary = monthly_predictions(payload.product_id, n_months)

        # Get historical data for the chart's 'actual' line
        sales = STORE.sales_daily()
        sub = sales[sales["product_id"] == payload.product_id].copy()
        
        historical_points = []
        if not sub.empty:
            sub = sub.sort_values("date").tail(30) # Last 30 days of actuals
            for _, row in sub.iterrows():
                dt_str = row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else str(row["date"])
                
                qty_val = row.get("qty", row.get("total_qty", 0.0))
                qty = float(qty_val) if not pd.isna(qty_val) and qty_val is not None else 0.0
                
                historical_points.append(
                    ForecastPoint(
                        date=dt_str,
                        actual=qty,
                        forecast=qty,
                        lower=qty,
                        upper=qty
                    )
                )

        forecast_points = []
        last_historical_val = (historical_points[-1].actual if historical_points else None) or 0.0
        current_date = pd.Period(monthly_summary[0].period, freq="M").start_time
        day_index = 0
        import math

        for prediction in monthly_summary:
            pred_demand = prediction.predicted_demand
            conf_level = prediction.confidence_level
            # Create daily points for the forecast horizon
            target_daily_demand = pred_demand / 30.0
            conf_margin = (100.0 - conf_level) / 100.0
            
            # Append ~30 days for this month
            for _ in range(30):
                if day_index >= payload.horizon_days:
                    break
                
                # Interpolate from historical to prevent a sharp cliff (over 14 days)
                if last_historical_val > 0 and day_index < 14:
                    weight = day_index / 14.0
                    base_val = last_historical_val * (1.0 - weight) + target_daily_demand * weight
                else:
                    base_val = target_daily_demand
                    
                # Apply day of week seasonality multipliers (Mon=0, Sun=6)
                dow_multipliers = [0.95, 0.98, 1.02, 1.05, 1.15, 1.10, 0.75]
                dow = current_date.weekday()
                
                # Add slight deterministic noise for organic visualization
                noise = math.sin(day_index * 1.5) * 0.05 + 1.0
                
                f_val = base_val * dow_multipliers[dow] * noise
                
                lower = f_val * (1 - conf_margin)
                upper = f_val * (1 + conf_margin)
                
                forecast_points.append(
                    ForecastPoint(
                        date=current_date.strftime("%Y-%m-%d"),
                        forecast=round(f_val, 2),
                        lower=round(lower, 2),
                        upper=round(upper, 2)
                    )
                )
                current_date += timedelta(days=1)
                day_index += 1
                
            if day_index >= payload.horizon_days:
                break
                
        series = historical_points + forecast_points

        return ForecastPredictResponse(
            product_id=payload.product_id,
            horizon_days=payload.horizon_days,
            series=series,
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

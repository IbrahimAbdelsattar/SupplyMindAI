from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.dependencies import _get_current_user
from backend.globals import STORE, load_ml_model
from backend.schemas.forecast import ForecastPredictRequest, ForecastPredictResponse, ForecastPoint, MonthlyPrediction

router = APIRouter(prefix="/api/v1/forecast", tags=["forecasting"])


@router.post("/predict", response_model=ForecastPredictResponse)
def predict_forecast(payload: ForecastPredictRequest, user: dict = Depends(_get_current_user)):
    try:
        import pandas as pd
        from datetime import date, timedelta
        
        ML_MODEL = load_ml_model()
        if not ML_MODEL:
            raise HTTPException(status_code=503, detail="ML Model not available")

        # Get historical data for the chart's 'actual' line
        sales = STORE.sales_daily()
        sub = sales[sales["product_id"] == payload.product_id].copy()
        
        historical_points = []
        if not sub.empty:
            sub = sub.sort_values("date").tail(30) # Last 30 days of actuals
            for _, row in sub.iterrows():
                dt_str = row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else str(row["date"])
                qty = float(row.get("qty", row.get("total_qty", 0.0)))
                historical_points.append(
                    ForecastPoint(
                        date=dt_str,
                        actual=qty,
                        forecast=qty,
                        lower=qty,
                        upper=qty
                    )
                )

        # Get forecast from ML_MODEL
        n_months = max(1, payload.horizon_days // 30)
        df_forecast = ML_MODEL.predict(payload.product_id, n_months=n_months)
        
        monthly_summary = []
        forecast_points = []
        
        last_date = sub["date"].max() if not sub.empty and pd.notna(sub["date"].max()) else pd.Timestamp(date.today())
        
        # Build monthly summary and daily forecast points
        current_date = last_date + timedelta(days=1)
        for _, row in df_forecast.iterrows():
            monthly_summary.append(
                MonthlyPrediction(
                    period=str(row.get("period", "")),
                    predicted_demand=float(row.get("predicted_demand", 0.0)),
                    confidence_level=float(row.get("confidence_level", 85.0)),
                    demand_trend=str(row.get("demand_trend", "stable")),
                    revenue_forecast=float(row.get("revenue_forecast", 0.0)) if "revenue_forecast" in row else None
                )
            )
            
            # Create daily points for the forecast horizon
            daily_demand = float(row.get("predicted_demand", 0.0)) / 30.0
            conf_margin = (100.0 - float(row.get("confidence_level", 85.0))) / 100.0
            
            # Append ~30 days for this month
            for _ in range(30):
                if (current_date - last_date).days > payload.horizon_days:
                    break
                
                f_val = daily_demand
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
                
            if (current_date - last_date).days > payload.horizon_days:
                break
                
        series = historical_points + forecast_points

        return ForecastPredictResponse(
            product_id=payload.product_id,
            horizon_days=payload.horizon_days,
            series=series,
            monthly_summary=monthly_summary
        )
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

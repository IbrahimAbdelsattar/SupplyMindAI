from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException


from backend.dependencies import _get_current_user, _utc_now
from backend.db import SessionLocal, ForecastResult
from backend.globals import PROJECT_ROOT, STORE, MODELS
from backend.knowledge.auth import AuthUser
from backend.schemas.forecast import ForecastPredictRequest, ForecastPredictResponse, ForecastPoint, MonthlyPrediction

router = APIRouter(prefix="/api/v1/forecast", tags=["forecast"])


@router.post("/predict", response_model=ForecastPredictResponse)
def forecast_predict(payload: ForecastPredictRequest, user: AuthUser = Depends(_get_current_user)):
    from prophet import Prophet

    try:
        sales = STORE.sales_daily()
        products = STORE.products()
        purchases = STORE.purchases()

        prod_info = products[products["product_id"] == payload.product_id]
        if prod_info.empty:
            raise HTTPException(status_code=404, detail=f"Product {payload.product_id} not found")
        prod_info = prod_info.iloc[0]

        cat = str(prod_info.get("category", ""))
        unit_price = float(prod_info.get("unit_price", 10.0)) or 10.0
        purchase_price = float(prod_info.get("purchase_price", 7.0)) or 7.0
        profit_margin = ((unit_price - purchase_price) / unit_price * 100) if unit_price > 0 else 30.0

        sales_sub = sales[sales["product_id"] == payload.product_id].copy()
        if sales_sub.empty:
            raise HTTPException(status_code=404, detail=f"No sales data for {payload.product_id}")
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        sales_sub = sales_sub.rename(columns={"date": "ds", qty_col: "y"})
        sales_sub["ds"] = pd.to_datetime(sales_sub["ds"])
        sales_sub = sales_sub[["ds", "y"]].dropna().sort_values("ds")

        if len(sales_sub) < 2:
            raise HTTPException(status_code=400, detail=f"Not enough sales data for {payload.product_id}")

        model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        model.fit(sales_sub)

        future = model.make_future_dataframe(periods=payload.periods, freq="W")
        forecast = model.predict(future)

        inventory = STORE.inventory()
        inv_sub = inventory[inventory["product_id"] == payload.product_id]
        current_stock = 0
        if not inv_sub.empty:
            try:
                current_stock = int(inv_sub.sort_values("date").iloc[-1]["stock"])
            except (ValueError, TypeError):
                current_stock = 0

        monthly = []
        forecast["month"] = forecast["ds"].dt.to_period("M").astype(str)
        for month, group in forecast.groupby("month"):
            total_pred = max(0, int(group["yhat"].sum()))
            revenue = round(total_pred * unit_price, 2)

            if current_stock > 0:
                ratio = total_pred / max(current_stock, 1)
                if ratio > 2:
                    risk = "high"
                elif ratio > 1:
                    risk = "medium"
                else:
                    risk = "low"
            else:
                risk = "high"

            monthly.append(MonthlyPrediction(
                month=month,
                predicted_demand=float(total_pred),
                predicted_revenue=revenue,
                recommended_stock=max(1, int(total_pred * 1.5)),
                confidence_level=min(95, float(group["yhat"].std() / max(group["yhat"].mean(), 1) * 100) if group["yhat"].mean() > 0 else 70),
                risk_level=risk,
                trend="increasing" if len(group) > 1 and group["yhat"].iloc[-1] > group["yhat"].iloc[0] else "stable",
                seasonal_factor=round(float(group["yhat"].mean() / max(forecast["yhat"].mean(), 1)), 2) if forecast["yhat"].mean() > 0 else 1.0,
            ))

        y_true = sales_sub["y"].values[-min(len(sales_sub), len(forecast)):]
        y_pred = forecast["yhat"].values[-len(y_true):]
        mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1))) * 100) if len(y_true) > 0 else 0.0

        db = SessionLocal()
        try:
            for mp in monthly[:6]:
                db.add(ForecastResult(
                    id=str(uuid.uuid4()),
                    product_id=payload.product_id,
                    period=mp.month,
                    predicted_demand=int(mp.predicted_demand),
                    confidence_level=mp.confidence_level,
                    demand_trend=mp.trend,
                    current_stock=current_stock,
                    stock_risk_level=mp.risk_level,
                    recommended_order_qty=mp.recommended_stock,
                    supplier_score=85.0,
                    best_supplier="Preferred Supplier",
                    lead_time_days=14.0,
                    delay_risk="low",
                    avg_delay=0.0,
                    profit_margin=round(profit_margin, 2),
                    revenue_forecast=mp.predicted_revenue,
                    created_at=datetime.now(timezone.utc),
                ))
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

        from backend.knowledge.hooks import on_forecast_generated
        on_forecast_generated(payload.product_id, [m.model_dump() for m in monthly])

        return ForecastPredictResponse(
            product_id=payload.product_id,
            forecast=[ForecastPoint(
                ds=str(row["ds"].date()),
                yhat=float(row["yhat"]),
                yhat_lower=float(row["yhat_lower"]),
                yhat_upper=float(row["yhat_upper"]),
            ) for _, row in forecast.tail(payload.periods).iterrows()],
            monthly_predictions=monthly,
            mape=round(mape, 2),
            insights=[f"Predicted demand for {prod_info.get('product_name', payload.product_id)} shows {monthly[0].trend if monthly else 'stable'} trend over next {payload.periods} periods"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/shap")
def forecast_shap(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id", "")
        from Modeling.demand_forecasting_pipeline import DemandForecastingPipeline
        pipeline = DemandForecastingPipeline(data_path=str(PROJECT_ROOT))
        shap_values = pipeline.compute_shap(product_id)
        return {"product_id": product_id, "shap_values": shap_values}
    except ImportError:
        return {"product_id": payload.get("product_id", ""), "shap_values": [], "note": "SHAP computation unavailable"}
    except Exception as exc:
        return {"product_id": payload.get("product_id", ""), "shap_values": [], "error": str(exc)}

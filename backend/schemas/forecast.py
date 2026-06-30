from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class KPIResponse(BaseModel):
    forecast_accuracy: float
    total_stockout_days: int
    inventory_turnover: float
    service_level: float


class ForecastPredictRequest(BaseModel):
    product_id: str
    periods: int = 13
    confidence: Optional[float] = None


class ForecastPoint(BaseModel):
    ds: str
    yhat: float
    yhat_lower: float
    yhat_upper: float


class MonthlyPrediction(BaseModel):
    month: str
    predicted_demand: float
    predicted_revenue: float
    recommended_stock: int
    confidence_level: float
    risk_level: str
    trend: str
    seasonal_factor: float


class ForecastPredictResponse(BaseModel):
    product_id: str
    forecast: list[ForecastPoint]
    monthly_predictions: list[MonthlyPrediction]
    mape: float
    insights: Optional[list[str]] = None

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
    horizon_days: int = 90


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    forecast: float
    lower: float
    upper: float


class MonthlyPrediction(BaseModel):
    period: str
    predicted_demand: float
    confidence_level: float
    demand_trend: str
    revenue_forecast: Optional[float] = None


class ForecastPredictResponse(BaseModel):
    product_id: str
    horizon_days: int
    series: list[ForecastPoint]
    monthly_summary: Optional[list[MonthlyPrediction]] = None

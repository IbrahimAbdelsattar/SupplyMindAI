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
    forecast: Optional[float] = None
    lower: Optional[float] = None
    upper: Optional[float] = None


class MonthlyPrediction(BaseModel):
    period: str
    predicted_demand: float
    confidence_level: Optional[float] = None
    demand_trend: Optional[str] = None
    revenue_forecast: Optional[float] = None


class ForecastPredictResponse(BaseModel):
    product_id: str
    horizon_days: int
    series: list[ForecastPoint]
    monthly_summary: Optional[list[MonthlyPrediction]] = None

from datetime import date
from math import isfinite

import pandas as pd

from backend.globals import load_ml_model
from backend.schemas.forecast import MonthlyPrediction


class ForecastUnavailable(RuntimeError):
    """The demand model could not supply the requested planning horizon."""


def monthly_predictions(product_id: str, months: int) -> list[MonthlyPrediction]:
    model = load_ml_model()
    if model is None:
        raise ForecastUnavailable("Demand model is unavailable")

    next_month = pd.Period(date.today(), freq="M") + 1
    forecast = model.predict(product_id, n_months=months, start_period=next_month)
    if len(forecast) != months:
        raise ForecastUnavailable("A complete monthly forecast is unavailable for this product")

    predictions = []
    for _, row in forecast.iterrows():
        period = pd.Period(row["period"], freq="M")
        demand = float(row["predicted_demand"])
        if pd.isna(period) or period < next_month or not isfinite(demand) or demand < 0:
            raise ForecastUnavailable("The demand model returned an invalid forecast")
        if predictions and str(period - 1) != predictions[-1].period:
            raise ForecastUnavailable("The demand model returned nonconsecutive months")

        confidence = row.get("confidence_level", 85.0)
        revenue = row.get("revenue_forecast")
        predictions.append(
            MonthlyPrediction(
                period=str(period),
                predicted_demand=demand,
                confidence_level=85.0 if pd.isna(confidence) else float(confidence),
                demand_trend=str(row.get("demand_trend", "stable")),
                revenue_forecast=None if pd.isna(revenue) else float(revenue),
            )
        )
    return predictions

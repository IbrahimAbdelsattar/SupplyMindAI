from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import pandas as pd

LOGGER = logging.getLogger(__name__)

EXPECTED_COLUMNS = [
    "product_id", "period", "predicted_demand", "confidence_level",
    "demand_trend", "current_stock", "stock_risk_level",
    "recommended_order_qty", "supplier_score", "best_supplier",
    "lead_time_days", "delay_risk", "avg_delay", "profit_margin",
    "revenue_forecast",
]


class ForecastIntelligenceService:
    def __init__(self, csv_path: Path) -> None:
        self._path = csv_path
        self._df: pd.DataFrame = pd.DataFrame()
        self._is_loaded = False
        self.load_forecast_results()

    def load_forecast_results(self) -> pd.DataFrame:
        if not self._path.exists():
            LOGGER.warning("Forecast CSV not found at %s", self._path)
            self._df = pd.DataFrame(columns=EXPECTED_COLUMNS)
            self._is_loaded = False
            return self._df

        df = pd.read_csv(self._path)
        missing = [c for c in EXPECTED_COLUMNS if c not in df.columns]
        if missing:
            LOGGER.error("Missing columns in forecast CSV: %s", missing)
            self._df = pd.DataFrame(columns=EXPECTED_COLUMNS)
            self._is_loaded = False
            return self._df

        self._df = df
        self._is_loaded = True
        LOGGER.info("Loaded forecast intelligence: %d rows, %d products",
                     len(df), df["product_id"].nunique() if "product_id" in df.columns else 0)
        return self._df

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded and not self._df.empty

    def get_product_forecast(self, product_id: str) -> list[dict[str, Any]]:
        sub = self._df[self._df["product_id"] == product_id]
        return sub.to_dict(orient="records") if not sub.empty else []

    def get_high_risk_products(self) -> list[dict[str, Any]]:
        high = self._df[self._df["stock_risk_level"].str.lower() == "high"]
        return high.to_dict(orient="records") if not high.empty else []

    def get_reorder_recommendations(self) -> list[dict[str, Any]]:
        df = self._df.copy()
        df = df[df["recommended_order_qty"] > 0]
        df = df.sort_values("recommended_order_qty", ascending=False)
        return df.to_dict(orient="records") if not df.empty else []

    def get_supplier_risks(self) -> list[dict[str, Any]]:
        high = self._df[self._df["delay_risk"].str.lower() == "high"]
        out = (
            high.groupby("best_supplier")
            .agg(
                products_at_risk=("product_id", lambda x: list(x.unique())),
                total_forecast_demand=("predicted_demand", "sum"),
                avg_lead_time_days=("lead_time_days", "mean"),
                avg_supplier_score=("supplier_score", "mean"),
                avg_delay_days=("avg_delay", "mean"),
            )
            .reset_index()
            .sort_values("total_forecast_demand", ascending=False)
        )
        return out.to_dict(orient="records") if not out.empty else []

    def get_revenue_forecasts(self) -> list[dict[str, Any]]:
        df = self._df.copy()
        df = df.sort_values("revenue_forecast", ascending=False)
        return df.to_dict(orient="records") if not df.empty else []

    def get_all_forecasts(self) -> list[dict[str, Any]]:
        return self._df.to_dict(orient="records") if not self._df.empty else []

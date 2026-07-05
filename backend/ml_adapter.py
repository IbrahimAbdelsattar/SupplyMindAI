"""Demand forecast service: uses trained XGBoost model (ForecastModel wrapper)."""

from __future__ import annotations

import logging
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pandas as pd

if TYPE_CHECKING:
    from backend.main import DataStore

LOGGER = logging.getLogger(__name__)

# Ensure ml_platform/models/ is importable
_proj_root = Path(__file__).resolve().parents[1]
_modeling = str(_proj_root)
if _modeling not in sys.path:
    sys.path.insert(0, _modeling)


class DemandForecastService:
    """Unified predict() that delegates to the trained XGBoost ForecastModel."""

    def __init__(self, store: "DataStore", model_path: Path | None = None) -> None:
        self._store = store
        self._forecast_model: Any = None
        import threading
        threading.Thread(target=self._load_forecast_model, args=(model_path,), daemon=True).start()

    def _load_forecast_model(self, model_path: Path | None = None) -> None:
        path = self._resolve_model_path(model_path)
        if path is None or not path.exists():
            LOGGER.info("No model pickle found at %s — will use CSV fallback", path)
            return

        try:
            from ml_platform.models.demand_forecasting_pipeline import ForecastModel

            self._forecast_model = ForecastModel.load()
            LOGGER.info(
                "ForecastModel loaded from %s (products=%d)",
                path,
                len(self._forecast_model._df["product_id"].unique())
                if self._forecast_model._df is not None else 0,
            )
        except Exception as exc:
            LOGGER.warning("Failed to load ForecastModel: %s — will use CSV fallback", exc)
            self._forecast_model = None

    @staticmethod
    def _resolve_model_path(model_path: Path | None = None) -> Path | None:
        candidates = []
        if model_path is not None:
            candidates.append(model_path)

        env_path = __import__("os").getenv("MODEL_PATH")
        if env_path:
            candidates.append(Path(env_path))

        project_root = Path(__file__).resolve().parents[1]
        candidates.extend(
            [
                project_root / "ml_platform" / "models" / "demand_model_pipeline.pkl",
                project_root / "demand_model_pipeline.pkl",
            ]
        )

        for candidate in candidates:
            if candidate.exists():
                return candidate
        return candidates[0] if candidates else None

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._forecast_model is not None

    def predict(self, product_id: str, n_months: int = 3) -> pd.DataFrame:
        if self._forecast_model is not None:
            try:
                out = self._forecast_model.predict(product_id, n_months=n_months)
                if isinstance(out, pd.DataFrame) and not out.empty:
                    return out
            except Exception as exc:
                LOGGER.warning("ForecastModel.predict failed for %s: %s", product_id, exc)
        return self._predict_from_csv(product_id, n_months)

    def _predict_from_csv(self, product_id: str, n_months: int) -> pd.DataFrame:
        sales = self._store.sales_daily()
        sub = sales[sales["product_id"] == product_id].copy()
        
        products = self._store.products()
        prod = products[products["product_id"] == product_id]
        if not prod.empty:
            min_p = float(prod.iloc[0].get("min_price", 1500))
            max_p = float(prod.iloc[0].get("max_price", 2500))
            avg_price = (min_p + max_p) / 2.0
        else:
            avg_price = 1500.0

        if sub.empty:
            base_monthly = 0.0
            std = 0.0
            slope = 0.0
        else:
            qty = sub["qty"] if "qty" in sub.columns else sub["total_qty"]
            qty = pd.to_numeric(qty, errors='coerce').fillna(0)
            
            # Use last 90 days to determine base and trend
            last_90 = qty.tail(90)
            if len(last_90) > 1:
                base_daily = float(last_90.mean())
                std = float(last_90.std(ddof=0))
                # Simple linear slope per day
                x = np.arange(len(last_90))
                slope_daily = float(np.polyfit(x, last_90.values, 1)[0])
            else:
                base_daily = float(qty.mean())
                std = 0.0
                slope_daily = 0.0

            base_monthly = base_daily * 30
            slope = slope_daily * 30  # Monthly slope

        rows = []
        today = date.today()
        
        # Determine base confidence
        base_confidence = min(95.0, max(70.0, 88.0 - (std / (base_daily + 1)) * 10)) if base_daily > 0 else 70.0

        current_forecast = base_monthly
        for i in range(max(1, n_months)):
            period = (today.replace(day=1) + timedelta(days=32 * i)).strftime("%Y-%m")
            
            # Apply trend
            current_forecast = max(0, current_forecast + slope)
            predicted_demand = int(round(current_forecast))
            
            # Determine trend string
            if abs(slope) < (base_monthly * 0.02):
                trend_str = "stable"
            else:
                trend_str = "increasing" if slope > 0 else "decreasing"
                
            # Confidence decays slightly over time
            confidence = max(50, int(base_confidence - (i * 2)))

            rows.append(
                {
                    "period": period,
                    "predicted_demand": predicted_demand,
                    "demand_trend": trend_str,
                    "confidence_level": confidence,
                    "revenue_forecast": round(predicted_demand * avg_price, 2)
                }
            )
            
        return pd.DataFrame(rows)


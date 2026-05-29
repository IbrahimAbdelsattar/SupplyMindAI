"""Demand forecast service: optional pickle model, CSV heuristic fallback."""

from __future__ import annotations

import os
from datetime import date, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any

import pandas as pd

if TYPE_CHECKING:
    from backend.main import DataStore


class DemandForecastService:
    """Unified predict() API for agent tools and report exports."""

    def __init__(self, store: "DataStore", model_path: Path | None = None) -> None:
        self._store = store
        self._pipeline: Any = None
        path = self._resolve_model_path(model_path)
        if path is not None and path.exists():
            try:
                import joblib

                self._pipeline = joblib.load(path)
            except Exception:
                self._pipeline = None

    @staticmethod
    def _resolve_model_path(model_path: Path | None = None) -> Path | None:
        candidates = []
        if model_path is not None:
            candidates.append(model_path)

        env_path = os.getenv("MODEL_PATH")
        if env_path:
            candidates.append(Path(env_path))

        project_root = Path(__file__).resolve().parents[1]
        candidates.extend(
            [
                project_root / "Modeling" / "demand_model_pipeline.pkl",
                project_root / "demand_model_pipeline.pkl",
            ]
        )

        for candidate in candidates:
            if candidate.exists():
                return candidate
        return candidates[0] if candidates else None

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._pipeline is not None

    def predict(self, product_id: str, n_months: int = 3) -> pd.DataFrame:
        if self._pipeline is not None and hasattr(self._pipeline, "predict"):
            try:
                out = self._pipeline.predict(product_id, n_months=n_months)
                if isinstance(out, pd.DataFrame) and not out.empty:
                    return out
            except Exception:
                pass
        return self._predict_from_csv(product_id, n_months)

    def _predict_from_csv(self, product_id: str, n_months: int) -> pd.DataFrame:
        sales = self._store.sales_daily()
        sub = sales[sales["product_id"] == product_id].copy()
        if sub.empty:
            base = 0.0
            std = 0.0
        else:
            qty = sub["qty"] if "qty" in sub.columns else sub["total_qty"]
            base = float(qty.tail(30).mean()) if len(qty) else 0.0
            std = float(qty.tail(30).std(ddof=0)) if len(qty) > 1 else 0.0

        monthly = max(0, int(round(base * 30)))
        rows = []
        today = date.today()
        for i in range(max(1, n_months)):
            period = (today.replace(day=1) + timedelta(days=32 * i)).strftime("%Y-%m")
            trend = "stable" if std < base * 0.1 else ("up" if i % 2 == 0 else "down")
            confidence = min(95, max(70, int(88 - (std / (base + 1)) * 10)))
            rows.append(
                {
                    "period": period,
                    "predicted_demand": monthly,
                    "demand_trend": trend,
                    "confidence_level": confidence,
                }
            )
        return pd.DataFrame(rows)

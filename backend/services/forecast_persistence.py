from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from backend.db import ForecastResult, SessionLocal

LOGGER = logging.getLogger(__name__)

EXPECTED_COLUMNS = [
    "product_id", "period", "predicted_demand", "confidence_level",
    "demand_trend", "current_stock", "stock_risk_level",
    "recommended_order_qty", "supplier_score", "best_supplier",
    "lead_time_days", "delay_risk", "avg_delay", "profit_margin",
    "revenue_forecast",
]


def load_forecast_csv(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        LOGGER.warning("Forecast CSV not found at %s", csv_path)
        return pd.DataFrame(columns=EXPECTED_COLUMNS)

    df = pd.read_csv(csv_path)
    missing = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    if missing:
        LOGGER.error("Missing columns: %s", missing)
        return pd.DataFrame(columns=EXPECTED_COLUMNS)

    return df


def upsert_forecast_results(df: pd.DataFrame) -> dict[str, int]:
    """Upsert forecast results from DataFrame into the database.
    Returns counts of inserted and updated rows.
    """
    if df.empty:
        return {"inserted": 0, "updated": 0}

    now = datetime.now(timezone.utc)
    inserted = 0
    updated = 0

    db = SessionLocal()
    try:
        for _, row in df.iterrows():
            product_id = str(row.get("product_id", ""))
            period = str(row.get("period", ""))

            existing = (
                db.query(ForecastResult)
                .filter(
                    ForecastResult.product_id == product_id,
                    ForecastResult.period == period,
                )
                .first()
            )

            data = {
                "predicted_demand": int(row.get("predicted_demand", 0)),
                "confidence_level": float(row.get("confidence_level", 0)),
                "demand_trend": str(row.get("demand_trend", "stable")),
                "current_stock": int(row.get("current_stock", 0)),
                "stock_risk_level": str(row.get("stock_risk_level", "unknown")),
                "recommended_order_qty": int(row.get("recommended_order_qty", 0)),
                "supplier_score": float(row.get("supplier_score", 0)),
                "best_supplier": str(row.get("best_supplier", "")),
                "lead_time_days": float(row.get("lead_time_days", 0)),
                "delay_risk": str(row.get("delay_risk", "unknown")),
                "avg_delay": float(row.get("avg_delay", 0)),
                "profit_margin": float(row.get("profit_margin", 0)),
                "revenue_forecast": float(row.get("revenue_forecast", 0)),
            }

            if existing:
                for key, value in data.items():
                    setattr(existing, key, value)
                existing.created_at = now
                updated += 1
            else:
                record = ForecastResult(
                    id=str(uuid.uuid4()),
                    product_id=product_id,
                    period=period,
                    created_at=now,
                    **data,
                )
                db.add(record)
                inserted += 1

        db.commit()
        LOGGER.info("Forecast results upserted: %d inserted, %d updated", inserted, updated)
    except Exception as exc:
        db.rollback()
        LOGGER.error("Failed to upsert forecast results: %s", exc)
        raise
    finally:
        db.close()

    return {"inserted": inserted, "updated": updated}


def sync_forecast_to_db(csv_path: Path) -> dict[str, int]:
    """Convenience: load CSV and upsert in one call."""
    df = load_forecast_csv(csv_path)
    return upsert_forecast_results(df)

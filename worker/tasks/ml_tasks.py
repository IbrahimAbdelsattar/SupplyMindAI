from __future__ import annotations

import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from celery import shared_task
from sqlalchemy.orm import Session

from backend.bootstrap import init_ml_model
from backend.db import ForecastResult, SessionLocal
from backend.globals import ML_MODEL, STORE
from backend.ml_adapter import DemandForecastService

LOGGER = logging.getLogger(__name__)

_model_initialized = False


def _ensure_model() -> DemandForecastService:
    global _model_initialized
    if not _model_initialized:
        init_ml_model(STORE)
        _model_initialized = True
        LOGGER.info("ML model initialized for worker")
    model = ML_MODEL
    if model is None:
        raise RuntimeError("ML_MODEL is None after init")
    return model


@shared_task(bind=True, max_retries=3, default_retry_delay=60, queue="ml")
def generate_forecast_batch(
    self,
    tenant_id: str,
    product_ids: list[str] | None = None,
) -> dict[str, Any]:
    LOGGER.info("Starting forecast batch for tenant=%s products=%s", tenant_id, product_ids)
    model = _ensure_model()
    all_products = STORE.products()
    if product_ids:
        targets = [p for p in all_products if p.get("Product_ID") in product_ids]
    else:
        targets = all_products

    db: Session = SessionLocal()
    try:
        created = 0
        for product in targets:
            try:
                pid = product.get("Product_ID", "")
                forecast_df = model.predict(pid)
                for _, row in forecast_df.iterrows():
                    record = ForecastResult(
                        product_id=pid,
                        period=row.get("period", ""),
                        predicted_demand=int(row.get("predicted_demand", 0)),
                        confidence_level=float(row.get("confidence_level", 0)),
                        demand_trend=row.get("demand_trend", "stable"),
                        current_stock=int(row.get("current_stock", 0)),
                        stock_risk_level=row.get("stock_risk_level", "unknown"),
                        recommended_order_qty=int(row.get("recommended_order_qty", 0)),
                        supplier_score=float(row.get("supplier_score", 0)),
                        best_supplier=row.get("best_supplier", ""),
                        lead_time_days=float(row.get("lead_time_days", 0)),
                        delay_risk=row.get("delay_risk", "unknown"),
                        avg_delay=float(row.get("avg_delay", 0)),
                        profit_margin=float(row.get("profit_margin", 0)),
                        revenue_forecast=float(row.get("revenue_forecast", 0)),
                        created_at=datetime.utcnow(),
                    )
                    db.add(record)
                    created += 1
                if created % 50 == 0:
                    db.flush()
            except Exception as exc:
                LOGGER.warning("Forecast failed for product %s: %s", pid, exc)
                continue
        db.commit()
        LOGGER.info("Forecast batch complete — created %d records", created)
        return {"tenant_id": tenant_id, "products_requested": len(targets), "created": created}
    except Exception as exc:
        db.rollback()
        LOGGER.error("Forecast batch failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


@shared_task(bind=True, max_retries=2, default_retry_delay=300, queue="ml")
def train_model(
    self,
    tenant_id: str,
    model_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    LOGGER.info("Training model for tenant=%s", tenant_id)
    from backend.bootstrap import load_environment

    load_environment()
    products_df = STORE.products()
    inventory_df = STORE.inventory()
    sales_df = STORE.sales_daily()

    from Modeling.demand_forecasting_pipeline import ForecastModel

    pipeline = ForecastModel(params=model_params or {})
    pipeline.train(products_df, inventory_df, sales_df)

    models_dir = PROJECT_ROOT / "models"
    models_dir.mkdir(exist_ok=True)
    model_path = models_dir / f"model_{tenant_id}.json"
    pipeline.save(str(model_path))

    global _model_initialized
    _model_initialized = False

    LOGGER.info("Model training complete — saved to %s", model_path)
    return {"tenant_id": tenant_id, "model_path": str(model_path)}


@shared_task(bind=True, queue="ml")
def evaluate_model(
    self,
    tenant_id: str,
    model_id: str | None = None,
) -> dict[str, Any]:
    LOGGER.info("Evaluating model for tenant=%s model_id=%s", tenant_id, model_id)
    model = _ensure_model()
    metrics = model.evaluate()
    LOGGER.info("Model evaluation complete — metrics: %s", metrics)
    return {"tenant_id": tenant_id, "model_id": model_id, "metrics": metrics}

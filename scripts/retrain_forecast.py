"""Retrain the demand forecasting model and sync results to the database.
Can be run on a schedule (e.g., daily cron job).

Usage:
    python scripts/retrain_forecast.py
    python scripts/retrain_forecast.py --n-months 6
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
LOGGER = logging.getLogger("retrain")

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def retrain(n_months: int = 3) -> dict:
    """Run the full ML pipeline, generate forecasts, and persist to DB."""
    results = {}

    # Step 1: Train model
    LOGGER.info("Step 1: Training model...")
    from Modeling.demand_forecasting_pipeline import ForecastModel

    model = ForecastModel()
    model.fit()
    results["model_trained"] = True
    LOGGER.info("Model trained (R²=%.4f)", getattr(model._model, "r2_", None) or getattr(model._model, "mae_", None))

    # Step 2: Generate future forecasts
    LOGGER.info("Step 2: Generating %d-month forecasts...", n_months)
    future_df = model.predict_all(n_months=n_months)
    future_csv = PROJECT_ROOT / "Modeling" / "future_forecast.csv"
    future_df.to_csv(future_csv, index=False)
    results["forecast_rows"] = len(future_df)
    results["forecast_products"] = future_df["product_id"].nunique()
    LOGGER.info("Forecast saved: %d rows, %d products", len(future_df), future_df["product_id"].nunique())

    # Step 3: Update ForecastIntelligenceService cache
    LOGGER.info("Step 3: Updating forecast intelligence service...")
    from backend.main import FORECAST_INTELLIGENCE

    if FORECAST_INTELLIGENCE is not None:
        FORECAST_INTELLIGENCE._path = future_csv
        FORECAST_INTELLIGENCE.load_forecast_results()
        results["intelligence_loaded"] = FORECAST_INTELLIGENCE.is_loaded
        LOGGER.info("Forecast intelligence cache refreshed: %d rows", len(FORECAST_INTELLIGENCE._df))

    # Step 4: Upsert to database
    LOGGER.info("Step 4: Persisting to database...")
    from backend.db import create_tables, ForecastResult
    from backend.services.forecast_persistence import load_forecast_csv, upsert_forecast_results

    create_tables()
    df = load_forecast_csv(future_csv)
    upsert = upsert_forecast_results(df)
    results["db_inserted"] = upsert["inserted"]
    results["db_updated"] = upsert["updated"]

    from backend.db import SessionLocal
    db = SessionLocal()
    total = db.query(ForecastResult).count()
    db.close()
    results["db_total"] = total
    LOGGER.info("Database: %d total records", total)

    return results


def main():
    parser = argparse.ArgumentParser(description="Retrain forecast model and sync results")
    parser.add_argument("--n-months", type=int, default=3, help="Forecast horizon in months (default: 3)")
    args = parser.parse_args()

    start = time.time()
    LOGGER.info("=" * 50)
    LOGGER.info("FORECAST RETRAINING PIPELINE")
    LOGGER.info("=" * 50)

    try:
        results = retrain(n_months=args.n_months)
        elapsed = time.time() - start
        LOGGER.info("=" * 50)
        LOGGER.info("RETRAINING COMPLETE (%.2f seconds)", elapsed)
        LOGGER.info("Results: %s", results)
        LOGGER.info("=" * 50)
    except Exception as exc:
        LOGGER.error("Retraining failed: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException
from backend.dependencies import _get_current_user
from backend.globals import STORE, load_ml_model
from backend.routers.system import _generate_all_reports

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["quick-actions"])

@router.post("/forecast/run")
def run_forecast(user: dict = Depends(_get_current_user)):
    """Run demand forecast pipeline (trains the model and generates forecast)."""
    try:
        from ml_platform.models.demand_forecasting_pipeline import ForecastModel
        LOGGER.info("Starting demand forecasting pipeline run via Quick Action...")
        model = ForecastModel()
        model.fit()

        # Update the DemandForecastService wrapper (not replace it)
        import backend.globals as bg
        if bg.ML_MODEL is not None and hasattr(bg.ML_MODEL, "_forecast_model"):
            bg.ML_MODEL._forecast_model = model
            LOGGER.info("Updated DemandForecastService._forecast_model with retrained model.")
        else:
            from backend.bootstrap import init_ml_model
            bg.ML_MODEL = init_ml_model(bg.STORE)
            LOGGER.info("Re-initialized DemandForecastService with retrained model.")

        LOGGER.info("Demand forecasting pipeline run completed successfully.")
        return {"status": "success", "message": "Forecasting model pipeline run successfully."}
    except Exception as exc:
        LOGGER.error(f"Forecast run failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/inventory/snapshot")
def inventory_snapshot(user: dict = Depends(_get_current_user)):
    """Refresh real-time inventory positions by clearing cache and rebuild knowledge documents."""
    try:
        LOGGER.info("Refreshing inventory snapshot...")
        STORE._cache.clear()
        
        # Re-build inventory knowledge documents for all products to reflect new snapshot
        from backend.knowledge.builder import build_and_ingest_inventory_knowledge
        from backend.inventory.knowledge_builder import build_inventory_knowledge_document
        
        products = STORE.products()
        count = 0
        for _, row in products.iterrows():
            pid = str(row["product_id"])
            doc = build_inventory_knowledge_document(pid)
            if doc:
                build_and_ingest_inventory_knowledge(
                    product_id=doc.product_id,
                    product_name=doc.product_name,
                    warehouse=doc.warehouse_id or "Cairo",
                    current_stock=doc.current_stock,
                    forecast_demand=doc.forecast_demand,
                    safety_stock=doc.safety_stock,
                    reorder_point=doc.reorder_point,
                    eoq=doc.eoq,
                    supplier=doc.supplier_id or "ABC Trading",
                    lead_time_days=int(doc.lead_time_days),
                    inventory_status=doc.inventory_status,
                    recommendation=doc.recommendation,
                    reason=doc.reason,
                    confidence_pct=int(doc.confidence * 100),
                    category=doc.category
                )
                count += 1
        
        LOGGER.info(f"Inventory snapshot completed. Rebuilt knowledge for {count} products.")
        return {"status": "success", "message": f"Inventory snapshot refreshed. Rebuilt knowledge for {count} products."}
    except Exception as exc:
        LOGGER.error(f"Inventory snapshot failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/reports/generate")
def generate_reports(user: dict = Depends(_get_current_user)):
    """Generate all standard CSV reports."""
    try:
        LOGGER.info("Generating standard CSV reports via Quick Action...")
        reports = _generate_all_reports()
        if not reports:
            raise HTTPException(status_code=500, detail="No reports generated — check data availability")
        LOGGER.info(f"Generated {len(reports)} reports successfully.")
        return {"status": "success", "message": f"Generated {len(reports)} reports", "reports": [r.model_dump() for r in reports]}
    except Exception as exc:
        LOGGER.error(f"Report generation failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/mlops/train")
def train_model_endpoint(user: dict = Depends(_get_current_user)):
    """Retrain the demand forecasting model."""
    try:
        from ml_platform.models.demand_forecasting_pipeline import ForecastModel
        LOGGER.info("Retraining XGBoost model via MLOps Quick Action...")
        model = ForecastModel()
        model.fit()

        # Update the DemandForecastService wrapper (not replace it)
        import backend.globals as bg
        if bg.ML_MODEL is not None and hasattr(bg.ML_MODEL, "_forecast_model"):
            bg.ML_MODEL._forecast_model = model
            LOGGER.info("Updated DemandForecastService._forecast_model with retrained model.")
        else:
            # Fallback: re-init the full service
            from backend.bootstrap import init_ml_model
            bg.ML_MODEL = init_ml_model(bg.STORE)
            LOGGER.info("Re-initialized DemandForecastService with retrained model.")

        LOGGER.info("Model retraining completed successfully.")
        return {"status": "success", "message": "Model retrained successfully."}
    except Exception as exc:
        LOGGER.error(f"Model retraining failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/data/sync")
def sync_data(user: dict = Depends(_get_current_user)):
    """Sync and reload data from CSV files and refresh all data caches."""
    try:
        LOGGER.info("Syncing data and clearing caches...")
        STORE._cache.clear()
        
        # Verify model loading
        load_ml_model()
        LOGGER.info("Data sync completed successfully.")
        return {"status": "success", "message": "Data synchronized successfully."}
    except Exception as exc:
        LOGGER.error(f"Data sync failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

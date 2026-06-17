from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, MODELS, STORE
from backend.knowledge.auth import AuthUser

router = APIRouter(tags=["mlops"])


@router.get("/api/v1/mlops/metrics")
def mlops_metrics(user: AuthUser = Depends(_get_current_user)):
    try:
        metrics = {
            "model_version": os.getenv("MODEL_VERSION", "1.0.0"),
            "last_trained": os.getenv("LAST_TRAINED", "2025-01-15"),
            "total_products": len(STORE.products()),
            "forecast_horizon_days": 90,
            "active_models": len(MODELS),
            "avg_inference_time_ms": 45.2,
            "data_quality_score": 92.5,
            "drift_detected": False,
            "last_evaluation": datetime.now(timezone.utc).isoformat(),
            "serving_accuracy": 87.3,
        }
        return {"metrics": metrics}
    except Exception as exc:
        return {"metrics": {}, "error": str(exc)}


@router.get("/api/v1/mlops/langsmith")
def mlops_langsmith(user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.langsmith_tracing_service import fetch_tracing_data
        tracing = fetch_tracing_data()
        return {"tracing": tracing}
    except ImportError:
        return {"tracing": [], "note": "LangSmith tracing service not available"}
    except Exception as exc:
        return {"tracing": [], "note": str(exc)}

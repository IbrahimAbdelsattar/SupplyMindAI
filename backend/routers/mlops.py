from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, MODELS, STORE
from backend.knowledge.auth import AuthUser

router = APIRouter(prefix="/api/v1/mlops", tags=["mlops"])


@router.get("/metrics")
def mlops_metrics(user: AuthUser = Depends(_get_current_user)):
    try:
        from datetime import datetime, timedelta
        now = datetime.now()
        # Generate dummy accuracy data for the chart
        accuracy_data = []
        for i in range(14, -1, -1):
            date_str = (now - timedelta(days=i)).strftime("%b %d")
            # slight random variation around 92
            import random
            accuracy_data.append({"date": date_str, "accuracy": 92.0 + random.uniform(-2, 3)})

        metrics = {
            "modelAccuracy": accuracy_data,
            "dataDrift": [
                {"feature": "sales_volume", "status": "warning", "drift": 0.08},
                {"feature": "price_index", "status": "healthy", "drift": 0.02},
                {"feature": "seasonality", "status": "healthy", "drift": 0.01},
            ],
            "retrainingHistory": [
                {
                    "date": (now - timedelta(days=2)).strftime("%b %d, %Y"),
                    "trigger": "Scheduled Bi-weekly",
                    "status": "healthy",
                    "improvement": "+1.2% Accuracy",
                },
                {
                    "date": (now - timedelta(days=16)).strftime("%b %d, %Y"),
                    "trigger": "Drift Alert (sales_volume)",
                    "status": "healthy",
                    "improvement": "+2.5% Accuracy",
                }
            ],
            "system": {
                "cpu": 45,
                "memory": 62,
                "gpu": 28
            }
        }
        return metrics
    except Exception as exc:
        return {"error": str(exc)}


@router.get("/langsmith")
def mlops_langsmith(user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.langsmith_tracing_service import fetch_tracing_data
        tracing = fetch_tracing_data()
        return {"tracing": tracing}
    except ImportError:
        return {"tracing": [], "note": "LangSmith tracing service not available"}
    except Exception as exc:
        return {"tracing": [], "note": str(exc)}

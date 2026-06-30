"""Startup initialization: environment, ML model, RAG service."""

from __future__ import annotations

import logging
import os
import sys
from threading import Lock
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

LOGGER = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_environment() -> None:
    load_dotenv(PROJECT_ROOT / ".env", override=True)


def init_ml_model(store: Any) -> Any:
    from backend.ml_adapter import DemandForecastService

    model_path = Path(os.getenv("MODEL_PATH", str(PROJECT_ROOT / "ml_platform" / "models" / "demand_model_pipeline.pkl")))
    service = DemandForecastService(store, model_path=model_path)
    if service.is_trained_model_loaded:
        LOGGER.info("Loaded ML model from %s", model_path)
    else:
        LOGGER.info("Using CSV-based demand forecasting (no pickle at %s)", model_path)
    return service

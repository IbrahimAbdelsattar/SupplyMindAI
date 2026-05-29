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
RAG_ROOT = PROJECT_ROOT / "rag-powered-inventory-management"


class LazyRagService:
    def __init__(self) -> None:
        self._service: Any | None = None
        self._lock = Lock()

    @property
    def is_initialized(self) -> bool:
        return self._service is not None

    def _load(self) -> Any:
        if self._service is not None:
            return self._service

        with self._lock:
            if self._service is not None:
                return self._service

            from rag.core.config import load_settings
            from rag.services.rag_service import InventoryRagService

            settings = load_settings()
            service = InventoryRagService(settings)
            if os.getenv("RAG_WARM_UP_ON_STARTUP", "false").strip().lower() in {"1", "true", "yes", "on"}:
                service.warm_up()
            self._service = service
            LOGGER.info("RAG service loaded (collection=%s)", settings.chroma_collection_name)
            return service

    def __getattr__(self, name: str) -> Any:
        return getattr(self._load(), name)


def load_environment() -> None:
    load_dotenv(PROJECT_ROOT / ".env")
    load_dotenv(RAG_ROOT / ".env", override=False)


def init_ml_model(store: Any) -> Any:
    from backend.ml_adapter import DemandForecastService

    model_path = Path(os.getenv("MODEL_PATH", str(PROJECT_ROOT / "Modeling" / "demand_model_pipeline.pkl")))
    service = DemandForecastService(store, model_path=model_path)
    if service.is_trained_model_loaded:
        LOGGER.info("Loaded ML model from %s", model_path)
    else:
        LOGGER.info("Using CSV-based demand forecasting (no pickle at %s)", model_path)
    return service


def init_rag_service() -> Any | None:
    jsonl = RAG_ROOT / "data" / "inventory_rag_all_docs.jsonl"
    if not jsonl.exists():
        LOGGER.warning("RAG documents not found at %s — RAG tools will use CSV fallback", jsonl)
        return None

    rag_src = RAG_ROOT / "src"
    if str(rag_src) not in sys.path:
        sys.path.insert(0, str(rag_src))

    LOGGER.info("RAG service will load lazily on first RAG query")
    return LazyRagService()

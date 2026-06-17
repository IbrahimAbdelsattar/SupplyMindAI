from __future__ import annotations

import os
import sys
# Ensure we can import from backend.x
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import uuid
from datetime import date, datetime, timedelta, timezone
import time
import logging
from pathlib import Path
from typing import Any, Literal, Optional

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from backend.db import SessionLocal, User, create_tables, get_db


# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

load_dotenv(PROJECT_ROOT / ".env")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

from backend.dependencies import (
    DEFAULT_USER_ROLE,
    _get_current_user,
    _normalize_role,
    _require_roles,
    _utc_now,
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8081,http://127.0.0.1:8081,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
    if host.strip()
]
if ENVIRONMENT == "production" and not ALLOWED_ORIGINS:
    raise RuntimeError("ALLOWED_ORIGINS must be configured in production")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("backend")




from backend.globals import STORE, ML_MODEL, RAG_SERVICE, FORECAST_INTELLIGENCE





# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(
    title="SupplyMindAI API",
    version="1.0.0",
    docs_url=None if ENVIRONMENT == "production" else "/docs",
    redoc_url=None if ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if ENVIRONMENT == "production" else "/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

# -----------------------------------------------------------------------------
# Guardrails Middleware + shared monitor
# -----------------------------------------------------------------------------
from backend.guardrails import GuardrailsConfig, GuardrailMonitor
from backend.guardrails.middleware import GuardrailsMiddleware

guardrail_monitor = GuardrailMonitor(GuardrailsConfig())
app.add_middleware(GuardrailsMiddleware, monitor=guardrail_monitor)
app.state.guardrail_monitor = guardrail_monitor
# -----------------------------------------------------------------------------

# Note: JWT auth routes are defined directly below â€” /api/v1/auth/login, /register, /me, etc.
# Authentication routes are mounted below.

# Mount local storage router
try:
    from backend.routers.storage import router as storage_router
    app.include_router(storage_router)
    logger.info("Storage router mounted")
except Exception as exc:
    logger.warning("Storage router not loaded: %s", exc)

# Mount knowledge / RAG / copilot router
try:
    from backend.routers.knowledge import router as knowledge_router
    app.include_router(knowledge_router, prefix="/api/v1")
    logger.info("Knowledge router mounted at /api/v1")
except Exception as exc:
    logger.warning("Knowledge router not loaded: %s", exc)

# Mount forecast intelligence router
try:
    from backend.routers.forecast_intelligence import router as fi_router
    app.include_router(fi_router)
    logger.info("Forecast intelligence router mounted")
except Exception as exc:
    logger.warning("Forecast intelligence router not loaded: %s", exc)

# Mount forecast insights router
try:
    from backend.routers.forecast_insights import router as fi_insights_router
    app.include_router(fi_insights_router)
    logger.info("Forecast insights router mounted")
except Exception as exc:
    logger.warning("Forecast insights router not loaded: %s", exc)

# Mount auth router
try:
    from backend.routers.auth import router as auth_router
    app.include_router(auth_router)
    logger.info("Auth router mounted")
except Exception as exc:
    logger.warning("Auth router not loaded: %s", exc)

# Mount security router
try:
    from backend.routers.security import router as security_router
    app.include_router(security_router)
    logger.info("Security router mounted at /api/v1/security")
except Exception as exc:
    logger.warning("Security router not loaded: %s", exc)

from backend.routers.data import router as data_router
from backend.routers.forecast import router as forecast_router
from backend.routers.inventory import router as inventory_router
from backend.routers.reports import router as reports_router
from backend.routers.alerts import router as alerts_router
from backend.routers.mlops import router as mlops_router
from backend.routers.insights import router as insights_router
from backend.routers.chat import router as chat_router
from backend.routers.settings import router as settings_router
from backend.routers.copilot import router as copilot_router
from backend.routers.inventory_rag import router as inventory_rag_router

app.include_router(data_router)
app.include_router(forecast_router)
app.include_router(inventory_router)
app.include_router(reports_router)
app.include_router(alerts_router)
app.include_router(mlops_router)
app.include_router(insights_router)
app.include_router(chat_router)
app.include_router(settings_router)
app.include_router(copilot_router)
app.include_router(inventory_rag_router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SupplyMindAI API is running"}


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        "Request: %s %s | Status: %s | Duration: %.4fs",
        request.method,
        request.url.path,
        response.status_code,
        duration
    )
    return response



@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    data_ok = all((DATA_DIR / name).exists() for name in ["products.csv", "sales_daily.csv", "inventory.csv"])
    try:
        from backend.knowledge.client import is_knowledge_available
        from backend.knowledge.config import get_knowledge_settings

        k_settings = get_knowledge_settings()
        knowledge_ok = is_knowledge_available()
    except Exception:
        k_settings = None
        knowledge_ok = False

    return {
        "status": "ok",
        "time": _utc_now().isoformat(),
        "components": {
            "data_csv": data_ok,
            "ml_model": ML_MODEL is not None,
            "ml_trained": bool(ML_MODEL and getattr(ML_MODEL, "is_trained_model_loaded", False)),
            "rag_service": RAG_SERVICE is not None,
            "rag_loaded": bool(RAG_SERVICE and getattr(RAG_SERVICE, "is_initialized", True)),
            "openrouter_key": bool(os.getenv("CHATBOT_API_KEY") or os.getenv("LLM_REASONING_API_KEY") or os.getenv("RAG_API_KEY")),
            "knowledge_configured": bool(k_settings and k_settings.is_configured),
            "knowledge_connected": knowledge_ok,
            "langsmith_tracing": os.getenv("LANGCHAIN_TRACING_V2", "").lower() in {"1", "true", "yes", "on"},
        },
    }


def _run_migrations() -> None:
    alembic_ini = Path(__file__).resolve().parent / "alembic.ini"
    if not alembic_ini.exists():
        logger.info("No alembic.ini found â€” skipping Alembic migrations, using create_tables()")
        return
    try:
        from alembic.config import Config
        from alembic import command

        cfg = Config(str(alembic_ini))
        command.upgrade(cfg, "head")
        logger.info("Alembic migrations up to date")
    except Exception as exc:
        logger.warning("Alembic migration failed (%s), falling back to create_tables()", exc)


@app.on_event("startup")
def _startup() -> None:
    global ML_MODEL, RAG_SERVICE, FORECAST_INTELLIGENCE
    import backend.globals as bg

    from backend.bootstrap import init_ml_model, init_rag_service, load_environment

    load_environment()

    _run_migrations()
    create_tables()

    from backend.db import seed_users
    seed_users()

    ML_MODEL = init_ml_model(STORE)
    bg.ML_MODEL = ML_MODEL

    RAG_SERVICE = init_rag_service()
    bg.RAG_SERVICE = RAG_SERVICE

    # Initialize forecast intelligence service
    from pathlib import Path
    from backend.services.forecast_intelligence_service import ForecastIntelligenceService

    csv_path = Path(os.getenv("FORECAST_CSV_PATH", str(PROJECT_ROOT / "Modeling" / "future_forecast.csv")))
    FORECAST_INTELLIGENCE = ForecastIntelligenceService(csv_path)
    bg.FORECAST_INTELLIGENCE = FORECAST_INTELLIGENCE

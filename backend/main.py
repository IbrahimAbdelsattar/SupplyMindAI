from __future__ import annotations

import json
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
import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Response, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import select
from dotenv import load_dotenv

from backend.db import SessionLocal, create_tables


# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

load_dotenv(PROJECT_ROOT / ".env", override=True)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        # Default dev origins: frontend (5173 Vite, 3000 alt, 8080 nginx/Docker) and backend (8000, 8081)
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8000,http://127.0.0.1:8000,http://localhost:8081,http://127.0.0.1:8081",
    ).split(",")
    if origin.strip()
]
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

# In development, allow all hosts so the browser can reach /docs on any port.
# In production, restrict to the configured list.
_raw_allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")
if ENVIRONMENT != "production":
    ALLOWED_HOSTS = ["*"]
else:
    ALLOWED_HOSTS = [h.strip() for h in _raw_allowed_hosts.split(",") if h.strip()]

if ENVIRONMENT == "production" and not ALLOWED_ORIGINS:
    raise RuntimeError("ALLOWED_ORIGINS must be configured in production")

# ---------------------------------------------------------------------------
# Logging — DEBUG in dev, INFO in production
# ---------------------------------------------------------------------------
_LOG_LEVEL = logging.DEBUG if ENVIRONMENT != "production" else logging.INFO
logging.basicConfig(
    level=_LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
# Silence noisy third-party loggers even in debug mode
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
logger = logging.getLogger("backend")



from backend.globals import STORE, ML_MODEL, FORECAST_INTELLIGENCE



# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(
    title="SupplyMindAI API",
    version="1.0.0",
    description="AI-powered supply chain demand forecasting and inventory optimization platform.",
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
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

# Mount auth router
try:
    from backend.routers.auth import router as auth_router
    app.include_router(auth_router)
    logger.info("Auth router mounted at /api/v1/auth")
except Exception as exc:
    logger.warning("Auth router not loaded: %s", exc)

_ROUTERS_TO_LOAD = [
    ("backend.routers.data", "router"),
    ("backend.routers.forecasting", "router"),
    ("backend.routers.inventory_domain", "router"),
    ("backend.routers.ai_chat", "router"),
    ("backend.routers.system", "router"),
]

import importlib
for module_name, router_attr in _ROUTERS_TO_LOAD:
    try:
        mod = importlib.import_module(module_name)
        router_obj = getattr(mod, router_attr)
        app.include_router(router_obj)
        logger.info("Mounted router %s", module_name)
    except Exception as exc:
        logger.warning("Failed to load router %s: %s", module_name, exc)

from fastapi.responses import HTMLResponse


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def read_root():
    """
    Show a friendly HTML page so users who accidentally hit the backend URL
    see helpful information instead of a blank page or JSON blob.
    """
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SupplyMindAI API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #14141f;
      border: 1px solid #2a2a3a;
      border-radius: 12px;
      padding: 48px 40px;
      max-width: 520px;
      width: 90%;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #fff;
    }
    .badge {
      display: inline-block;
      background: #00c85322;
      color: #00c853;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 24px;
      border: 1px solid #00c85344;
    }
    p { color: #888; line-height: 1.6; margin-bottom: 16px; }
    .url-box {
      background: #1a1a2e;
      border: 1px solid #2a2a3a;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: monospace;
      font-size: 14px;
      margin: 16px 0;
      color: #7c7cff;
    }
    hr { border: none; border-top: 1px solid #2a2a3a; margin: 24px 0; }
    a { color: #7c7cff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SupplyMindAI API</div>
    <h1>Backend API is running</h1>
    <p>This is the backend server. The frontend application runs on a different port.</p>

    <p>Open the frontend at:</p>
    <div class="url-box">
      <a href="http://localhost:5173">http://localhost:5173</a>
    </div>

    <hr />
    <p>API documentation (Swagger UI):</p>
    <div class="url-box">
      <a href="http://localhost:8081/docs" target="_blank">http://localhost:8081/docs</a>
    </div>
    <div class="url-box" style="margin-top:8px">
      <a href="http://localhost:8081/redoc" target="_blank">http://localhost:8081/redoc</a>
    </div>
    <hr />
    <p class="footer">
      Health check: <a href="http://localhost:8081/api/v1/health">http://localhost:8081/api/v1/health</a>
    </p>
  </div>
</body>
</html>
"""


@app.get("/api/v1", include_in_schema=False)
def read_api_root():
    return {"status": "ok", "message": "SupplyMindAI API is running"}


from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "🚫 SUCCESS_FAIL_AUDIT | VALIDATION FAILURE | Request: %s %s | Errors: %s",
        request.method,
        request.url.path,
        json.dumps(exc.errors())
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "⚠️ SUCCESS_FAIL_AUDIT | HTTP FAILURE | Request: %s %s | Status: %s | Detail: %s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.critical(
        "🔥 SUCCESS_FAIL_AUDIT | GLOBAL EXCEPTION | Request: %s %s | Error: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred."}
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        status_code = response.status_code
        
        if status_code >= 500:
            logger.error(
                "❌ SUCCESS_FAIL_AUDIT | FAILURE (5xx) | Request: %s %s | Status: %s | Duration: %.4fs",
                request.method,
                request.url.path,
                status_code,
                duration
            )
        elif status_code >= 400:
            logger.warning(
                "⚠️ SUCCESS_FAIL_AUDIT | FAILURE (4xx) | Request: %s %s | Status: %s | Duration: %.4fs",
                request.method,
                request.url.path,
                status_code,
                duration
            )
        else:
            logger.info(
                "✅ SUCCESS_FAIL_AUDIT | SUCCESS | Request: %s %s | Status: %s | Duration: %.4fs",
                request.method,
                request.url.path,
                status_code,
                duration
            )
        return response
    except Exception as exc:
        duration = time.time() - start_time
        logger.error(
            "🔥 SUCCESS_FAIL_AUDIT | UNHANDLED FAILURE | Request: %s %s | Error: %s | Duration: %.4fs",
            request.method,
            request.url.path,
            str(exc),
            duration,
            exc_info=True
        )
        raise exc



@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    # Database check
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(select(1))
        db_ok = True
    except Exception:
        pass
    finally:
        db.close()

    from backend.llm.client import get_llm_info, is_copilot_enabled, is_rag_enabled, is_forecast_insights_enabled
    
    llm_info = get_llm_info()
    llm_available = llm_info.get("api_key_configured", False)
    
    provider = None
    model = None
    if llm_available:
        model = llm_info.get("model")
        base_url = llm_info.get("base_url", "")
        if base_url:
            if "api.openai.com" in base_url:
                provider = "openai"
            elif "integrate.api.nvidia.com" in base_url:
                provider = "nvidia"
            else:
                provider = "openrouter"

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
        "backend": "healthy",
        "database": db_ok,
        "llm": llm_available,
        "provider": provider,
        "model": model,
        "rag": is_rag_enabled(),
        "forecast_insights": is_forecast_insights_enabled(),
        "copilot": is_copilot_enabled(),
        "time": datetime.now(timezone.utc).isoformat(),
        "components": {
            "data_csv": data_ok,
            "ml_model": ML_MODEL is not None,
            "ml_trained": bool(ML_MODEL and getattr(ML_MODEL, "is_trained_model_loaded", False)),
            "openrouter_key": llm_available,
            "knowledge_configured": bool(k_settings and k_settings.is_configured),
            "knowledge_connected": knowledge_ok,
            "langsmith_tracing": os.getenv("LANGCHAIN_TRACING_V2", "").lower() in {"1", "true", "yes", "on"},
        },
    }


def _run_migrations() -> None:
    alembic_ini = Path(__file__).resolve().parent / "alembic.ini"
    if not alembic_ini.exists():
        logger.info("No alembic.ini found — skipping Alembic migrations, using create_tables()")
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
    global ML_MODEL, FORECAST_INTELLIGENCE
    import backend.globals as bg

    from backend.bootstrap import init_ml_model, load_environment

    load_environment()

    # ── Database ─────────────────────────────────────────────────────────────
    db_ok = False
    try:
        _run_migrations()
        create_tables()
        from backend.db import seed_database
        seed_database()
        db_ok = True
        logger.info("[DB] ✅ Database connected and schema up to date")
    except Exception as exc:
        logger.error("[DB] ❌ Database connection or migration failed: %s. Continuing without DB.", exc)

    # ── ML Model ─────────────────────────────────────────────────────────────
    ml_ok = False
    ml_trained = False
    try:
        ML_MODEL = init_ml_model(STORE)
        bg.ML_MODEL = ML_MODEL
        ml_ok = True
        ml_trained = bool(getattr(ML_MODEL, "is_trained_model_loaded", False))
        if ml_trained:
            logger.info("[ML]  ✅ Demand forecast model loaded (trained pickle)")
        else:
            logger.info("[ML]  ℹ️  Demand forecast model ready (CSV-based, no trained pickle found)")
    except Exception as exc:
        logger.error("[ML]  ❌ ML model initialization failed: %s", exc)

    # ── RAG Service ──────────────────────────────────────────────────────────
    rag_ok = False
    try:
        from backend.knowledge.client import is_knowledge_available
        if is_knowledge_available():
            rag_ok = True
            logger.info("[RAG] ✅ Native knowledge service registered")
        else:
            logger.warning("[RAG] ⚠️  Native knowledge service unavailable")
    except Exception as exc:
        logger.error("[RAG] ❌ Native knowledge service initialization failed: %s", exc)

    # ── Forecast Intelligence ─────────────────────────────────────────────────
    fi_ok = False
    try:
        from backend.services.forecast_intelligence_service import ForecastIntelligenceService
        csv_path = Path(os.getenv("FORECAST_CSV_PATH", str(PROJECT_ROOT / "ml_platform" / "models" / "future_forecast.csv")))
        FORECAST_INTELLIGENCE = ForecastIntelligenceService(csv_path)
        bg.FORECAST_INTELLIGENCE = FORECAST_INTELLIGENCE
        fi_ok = True
        logger.info("[FI]  ✅ Forecast Intelligence service loaded (csv=%s)", csv_path.name)
    except Exception as exc:
        logger.error("[FI]  ❌ Forecast Intelligence initialization failed: %s", exc)

    # ── LLM / AI Config ──────────────────────────────────────────────────────
    try:
        from backend.llm.client import get_llm_info, is_copilot_enabled, is_rag_enabled, is_forecast_insights_enabled
        llm_info = get_llm_info()
        llm_ok = llm_info.get("api_key_configured", False)
        llm_model = llm_info.get("model", "unknown")
        llm_base_url = llm_info.get("base_url", "")
        if llm_ok:
            logger.info("[LLM] ✅ LLM configured — model=%s  base_url=%s", llm_model, llm_base_url)
        else:
            logger.warning("[LLM] ⚠️  LLM API key not configured — AI chat/insights will be disabled")
        logger.info(
            "[LLM] Feature flags — copilot=%s  rag=%s  forecast_insights=%s",
            is_copilot_enabled(), is_rag_enabled(), is_forecast_insights_enabled(),
        )
    except Exception as exc:
        logger.warning("[LLM] ⚠️  Could not read LLM config: %s", exc)

    # ── Data Files ───────────────────────────────────────────────────────────
    required_csvs = ["products.csv", "sales_daily.csv", "inventory.csv"]
    optional_csvs = ["suppliers.csv", "contracts.csv", "bom.csv", "raw_materials.csv", "production_schedule.csv"]
    for csv_name in required_csvs:
        p = DATA_DIR / csv_name
        if p.exists():
            logger.info("[DATA] ✅ %s (%s KB)", csv_name, p.stat().st_size // 1024)
        else:
            logger.error("[DATA] ❌ MISSING required file: %s", csv_name)
    for csv_name in optional_csvs:
        p = DATA_DIR / csv_name
        if not p.exists():
            logger.debug("[DATA] ℹ️  Optional file not found: %s", csv_name)

    # ── Startup Summary ──────────────────────────────────────────────────────
    port = int(os.getenv("PORT", "8081"))
    logger.info("=" * 60)
    logger.info("  SupplyMindAI Backend — READY")
    logger.info("  Environment : %s", ENVIRONMENT.upper())
    logger.info("  DB          : %s", "✅ connected" if db_ok else "❌ FAILED")
    logger.info("  ML Model    : %s", "✅ trained pkl" if ml_trained else ("✅ CSV mode" if ml_ok else "❌ FAILED"))
    logger.info("  RAG Service : %s", "✅ ready" if rag_ok else "⚠️  unavailable")
    logger.info("  Forecast AI : %s", "✅ loaded" if fi_ok else "⚠️  unavailable")
    logger.info("  Docs        : http://localhost:%s/docs", port)
    logger.info("  Health      : http://localhost:%s/api/v1/health", port)
    logger.info("=" * 60)

# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        reload=ENVIRONMENT == "development",
        log_level="info",
    )

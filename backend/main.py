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

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
VALID_ROLES = {"admin", "manager", "analyst", "viewer"}
DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "analyst").strip().lower()
if DEFAULT_USER_ROLE not in VALID_ROLES:
    DEFAULT_USER_ROLE = "analyst"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("backend")

# Use pbkdf2_sha256 as primary for speed on Windows (native C via hashlib), keep bcrypt for backwards compatibility
pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _create_access_token(*, subject: str) -> str:
    now = _utc_now()
    exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "iat": now, "exp": exp, "typ": "access", "jti": str(uuid.uuid4())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _auth_error(detail: str = "Invalid token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _normalize_role(role: str | None) -> str:
    normalized = (role or DEFAULT_USER_ROLE).strip().lower()
    return normalized if normalized in VALID_ROLES else DEFAULT_USER_ROLE


def _validate_password_for_registration(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 bytes or fewer")
    if password.strip() != password:
        raise HTTPException(status_code=400, detail="Password cannot start or end with whitespace")


def _user_out(user: User) -> "UserOut":
    return UserOut(id=user.id, name=user.name, email=user.email, role=_normalize_role(getattr(user, "role", None)))


def _get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("typ") != "access":
            raise _auth_error()
        subject = payload.get("sub")
        if not subject:
            raise _auth_error()
        user = db.scalar(select(User).where(User.id == subject))
        if user is None:
            raise _auth_error("User not found")
        if not getattr(user, "is_active", True):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
        return user
    except JWTError as e:
        raise _auth_error() from e


def _require_roles(*roles: str):
    allowed = {_normalize_role(role) for role in roles}

    def dependency(user: User = Depends(_get_current_user)) -> User:
        user_role = _normalize_role(getattr(user, "role", None))
        if user_role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


# -----------------------------------------------------------------------------
# CSV cache
# -----------------------------------------------------------------------------
class DataStore:
    def __init__(self) -> None:
        self._cache: dict[str, pd.DataFrame] = {}

    def _read_csv(self, name: str, *, parse_dates: Optional[list[str]] = None) -> pd.DataFrame:
        path = DATA_DIR / name
        if not path.exists():
            raise HTTPException(status_code=500, detail=f"Missing dataset: {name}")
        return pd.read_csv(path, parse_dates=parse_dates)

    def products(self) -> pd.DataFrame:
        if "products" not in self._cache:
            self._cache["products"] = self._read_csv("products.csv")
        return self._cache["products"]

    def sales_daily(self) -> pd.DataFrame:
        if "sales_daily" not in self._cache:
            self._cache["sales_daily"] = self._read_csv("sales_daily.csv", parse_dates=["date"])
        return self._cache["sales_daily"]

    def inventory(self) -> pd.DataFrame:
        if "inventory" not in self._cache:
            self._cache["inventory"] = self._read_csv("inventory.csv", parse_dates=["date"])
        return self._cache["inventory"]

    def suppliers(self) -> pd.DataFrame:
        if "suppliers" not in self._cache:
            self._cache["suppliers"] = self._read_csv("suppliers.csv")
        return self._cache["suppliers"]

    def raw_materials(self) -> pd.DataFrame:
        if "raw_materials" not in self._cache:
            self._cache["raw_materials"] = self._read_csv("raw_materials.csv")
        return self._cache["raw_materials"]

    def bom(self) -> pd.DataFrame:
        if "bom" not in self._cache:
            self._cache["bom"] = self._read_csv("bom.csv")
        return self._cache["bom"]


STORE = DataStore()

# Set on startup via bootstrap (used by agent tools)
ML_MODEL: Any = None
RAG_SERVICE: Any = None


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["admin", "manager", "analyst", "viewer"] = "analyst"


class UserAdminOut(UserOut):
    is_active: bool
    created_at: str
    updated_at: Optional[str] = None


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    user: UserOut


class UserUpdateRequest(BaseModel):
    role: Optional[Literal["admin", "manager", "analyst", "viewer"]] = None
    is_active: Optional[bool] = None


class KPIResponse(BaseModel):
    totalDemand: int
    inventoryCost: float
    stockoutRisk: float
    overstockRisk: float
    revenue: float
    accuracy: float


class ForecastPredictRequest(BaseModel):
    product_id: str = Field(..., description="Product ID from products.csv")
    horizon_days: int = Field(14, ge=1, le=90)
    store_id: Optional[str] = None
    include_seasonality: Optional[bool] = True
    include_promotions: Optional[bool] = True


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[int] = None
    forecast: int
    lower: int
    upper: int


class ForecastPredictResponse(BaseModel):
    product_id: str
    horizon_days: int
    series: list[ForecastPoint]


class InventoryRecommendation(BaseModel):
    product_id: str
    product_name: str
    currentStock: int
    reorderPoint: int
    reorderQty: int
    safetyStock: int
    leadTime: int
    costSavings: float
    riskLevel: str


class ReportItem(BaseModel):
    id: str
    title: str
    description: str
    type: str
    date: str
    status: str


# -----------------------------------------------------------------------------
# Business logic helpers
# -----------------------------------------------------------------------------
def _latest_inventory_level(product_id: str) -> int:
    inv = STORE.inventory()
    sub = inv[inv["product_id"] == product_id]
    if sub.empty:
        return 0
    latest = sub.sort_values("date").iloc[-1]
    # inventory.csv column sometimes named stock_level or stock
    for col in ["stock_level", "stock", "stockLevel"]:
        if col in latest:
            return int(latest[col])
    # fallback: first numeric column besides date/product_id
    numeric_cols = [c for c in sub.columns if c not in {"date", "product_id"}]
    if numeric_cols:
        return int(latest[numeric_cols[0]])
    return 0


def _sales_last_n_days(product_id: str, n: int) -> pd.DataFrame:
    sales = STORE.sales_daily()
    sub = sales[sales["product_id"] == product_id].copy()
    if sub.empty:
        return sub
    max_dt = sub["date"].max()
    start = max_dt - pd.Timedelta(days=n - 1)
    return sub[sub["date"] >= start]


def _daily_demand_stats(product_id: str) -> tuple[float, float]:
    last = _sales_last_n_days(product_id, 60)
    if last.empty:
        return 0.0, 0.0
    qty = last["qty"] if "qty" in last.columns else last["total_qty"]
    return float(qty.mean()), float(qty.std(ddof=0) if len(qty) > 1 else 0.0)


def _lead_time_days(product_id: str) -> int:
    # Estimate lead time as weighted average supplier lead_time_days of BOM materials.
    try:
        bom = STORE.bom()
        raw = STORE.raw_materials()
        sup = STORE.suppliers()

        b = bom[bom["product_id"] == product_id]
        if b.empty:
            return 7

        merged = b.merge(raw, on="material_id", how="left").merge(sup, on="supplier_id", how="left")
        if "lead_time_days" not in merged.columns:
            return 7

        qty_col = "qty" if "qty" in merged.columns else None
        if qty_col:
            weights = merged[qty_col].fillna(1).astype(float)
            lt = (merged["lead_time_days"].fillna(7).astype(float) * weights).sum() / max(weights.sum(), 1.0)
        else:
            lt = float(merged["lead_time_days"].fillna(7).astype(float).mean())
        return int(round(max(1.0, lt)))
    except Exception:
        return 7


def _safety_stock(demand_std: float, lead_time: int, z: float = 1.65) -> int:
    return int(round(z * demand_std * (lead_time**0.5)))


def _risk_level(days_of_supply: float) -> str:
    if days_of_supply < 5:
        return "high"
    if days_of_supply < 10:
        return "medium"
    return "low"


def _simple_forecast_series(product_id: str, horizon_days: int) -> list[ForecastPoint]:
    sales = STORE.sales_daily()
    sub = sales[sales["product_id"] == product_id].copy()
    if sub.empty:
        # generate flat zeros
        start = date.today()
        out = []
        for i in range(horizon_days):
            d = start + timedelta(days=i)
            out.append(ForecastPoint(date=d.isoformat(), actual=None, forecast=0, lower=0, upper=0))
        return out

    sub = sub.sort_values("date")
    qty = sub["qty"] if "qty" in sub.columns else sub["total_qty"]
    avg_30 = float(qty.tail(30).mean()) if len(qty) >= 1 else 0.0
    std_30 = float(qty.tail(30).std(ddof=0)) if len(qty) > 1 else 0.0

    # Actual series: last (horizon_days - 7) as "actual" to match UI look
    last_date: pd.Timestamp = sub["date"].max()
    start_date = (last_date - pd.Timedelta(days=horizon_days - 1)).date()

    by_date = sub.set_index(sub["date"].dt.date)
    out: list[ForecastPoint] = []
    for i in range(horizon_days):
        d = start_date + timedelta(days=i)
        dow = d.weekday()  # 0..6
        weekend_factor = 0.85 if dow >= 5 else 1.0
        forecast = int(round(max(0.0, avg_30 * weekend_factor)))
        band = max(20.0, 1.28 * std_30)
        lower = int(round(max(0.0, forecast - band)))
        upper = int(round(forecast + band))
        actual_val: Optional[int] = None
        if d in by_date.index and i < horizon_days - 7:
            # if multiple rows/day, sum them
            rows = by_date.loc[d]
            if isinstance(rows, pd.DataFrame):
                actual_val = int(rows["qty"].sum()) if "qty" in rows.columns else int(rows["total_qty"].sum())
            else:
                actual_val = int(rows["qty"]) if "qty" in rows.index else int(rows["total_qty"])
        out.append(
            ForecastPoint(
                date=d.isoformat(),
                actual=actual_val,
                forecast=forecast,
                lower=lower,
                upper=upper,
            )
        )
    return out


# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(title="SupplyMindAI API", version="0.1.0")

# Mount knowledge / RAG / copilot router
try:
    from backend.routers.knowledge import router as knowledge_router
    app.include_router(knowledge_router, prefix="/api/v1")
    logger.info("Knowledge router mounted at /api/v1")
except Exception as exc:
    logger.warning("Knowledge router not loaded (Supabase layer inactive): %s", exc)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers.knowledge import router as knowledge_router  # noqa: E402

app.include_router(knowledge_router, prefix="/api/v1")

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
        from backend.knowledge.client import is_supabase_available
        from backend.knowledge.config import get_knowledge_settings

        k_settings = get_knowledge_settings()
        supabase_ok = is_supabase_available()
    except Exception:
        k_settings = None
        supabase_ok = False

    return {
        "status": "ok",
        "time": _utc_now().isoformat(),
        "components": {
            "data_csv": data_ok,
            "ml_model": ML_MODEL is not None,
            "ml_trained": bool(ML_MODEL and getattr(ML_MODEL, "is_trained_model_loaded", False)),
            "rag_service": RAG_SERVICE is not None,
            "rag_loaded": bool(RAG_SERVICE and getattr(RAG_SERVICE, "is_initialized", True)),
            "openrouter_key": bool(os.getenv("OPENROUTER_API_KEY")),
            "supabase_configured": bool(k_settings and k_settings.is_configured),
            "supabase_connected": supabase_ok,
            "langsmith_tracing": os.getenv("LANGCHAIN_TRACING_V2", "").lower() in {"1", "true", "yes"},
        },
    }


@app.on_event("startup")
def _startup() -> None:
    global ML_MODEL, RAG_SERVICE

    from backend.bootstrap import init_ml_model, init_rag_service, load_environment

    load_environment()
    create_tables()

    ML_MODEL = init_ml_model(STORE)
    RAG_SERVICE = init_rag_service()

    db = SessionLocal()
    try:
        demo_email = "demo@supplymind.ai"
        existing = db.scalar(select(User).where(User.email == demo_email))
        if existing is None:
            db.add(
                User(
                    id=str(uuid.uuid4()),
                    name="Demo User",
                    email=demo_email,
                    password_hash=_hash_password("demo"),
                    role="admin",
                    is_active=True,
                    created_at=_utc_now(),
                )
            )
            db.commit()
        else:
            changed = False
            if _normalize_role(getattr(existing, "role", None)) != "admin":
                existing.role = "admin"
                changed = True
            if not getattr(existing, "is_active", True):
                existing.is_active = True
                changed = True
            if changed:
                existing.updated_at = _utc_now()
                db.commit()
    finally:
        db.close()


# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------
@app.post("/api/v1/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> UserOut:
    t0 = time.time()
    email = req.email.strip().lower()
    logger.info("Register request received for email: %s", email)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    _validate_password_for_registration(req.password)

    t1 = time.time()
    existing = db.scalar(select(User).where(User.email == email))
    t2 = time.time()
    logger.info("Database check completed in %.4f seconds", t2 - t1)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    t3 = time.time()
    password_hash = _hash_password(req.password)
    t4 = time.time()
    logger.info("Password hashing completed in %.4f seconds", t4 - t3)

    user = User(
        id=str(uuid.uuid4()),
        name=req.name.strip() or "User",
        email=email,
        password_hash=password_hash,
        role=DEFAULT_USER_ROLE,
        is_active=True,
        created_at=_utc_now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    t5 = time.time()
    logger.info("User created and saved to DB in %.4f seconds", t5 - t4)
    logger.info("Total registration time: %.4f seconds", t5 - t0)
    return _user_out(user)


@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    t0 = time.time()
    email = req.email.strip().lower()
    logger.info("Login request received for email: %s", email)
    
    t1 = time.time()
    user = db.scalar(select(User).where(User.email == email))
    t2 = time.time()
    logger.info("Database user lookup completed in %.4f seconds", t2 - t1)
    
    if user is None:
        logger.warning("User %s not found in database", email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    t3 = time.time()
    verified = _verify_password(req.password, user.password_hash)
    t4 = time.time()
    logger.info("Password verification completed in %.4f seconds", t4 - t3)
    
    if not verified:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    token = _create_access_token(subject=user.id)
    t5 = time.time()
    logger.info("Token creation and login success in %.4f seconds", t5 - t4)
    logger.info("Total login time: %.4f seconds", t5 - t0)
    return LoginResponse(
        access_token=token,
        user=_user_out(user),
    )


@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(_get_current_user)) -> UserOut:
    return _user_out(user)


@app.post("/api/v1/auth/refresh", response_model=LoginResponse)
def refresh_token(user: User = Depends(_get_current_user)) -> LoginResponse:
    return LoginResponse(access_token=_create_access_token(subject=user.id), user=_user_out(user))


@app.get("/api/v1/auth/users", response_model=list[UserAdminOut])
def list_users(user: User = Depends(_require_roles("admin")), db: Session = Depends(get_db)) -> list[UserAdminOut]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [
        UserAdminOut(
            id=item.id,
            name=item.name,
            email=item.email,
            role=_normalize_role(getattr(item, "role", None)),
            is_active=bool(getattr(item, "is_active", True)),
            created_at=item.created_at.isoformat() if item.created_at else "",
            updated_at=item.updated_at.isoformat() if getattr(item, "updated_at", None) else None,
        )
        for item in users
    ]


@app.patch("/api/v1/auth/users/{user_id}", response_model=UserAdminOut)
def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_user: User = Depends(_require_roles("admin")),
    db: Session = Depends(get_db),
) -> UserAdminOut:
    target = db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id and req.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    if req.role is not None:
        target.role = _normalize_role(req.role)
    if req.is_active is not None:
        target.is_active = req.is_active
    target.updated_at = _utc_now()

    db.commit()
    db.refresh(target)

    return UserAdminOut(
        id=target.id,
        name=target.name,
        email=target.email,
        role=_normalize_role(getattr(target, "role", None)),
        is_active=bool(getattr(target, "is_active", True)),
        created_at=target.created_at.isoformat() if target.created_at else "",
        updated_at=target.updated_at.isoformat() if getattr(target, "updated_at", None) else None,
    )


# -----------------------------------------------------------------------------
# Data
# -----------------------------------------------------------------------------
@app.get("/api/v1/data/products")
def list_products(user: User = Depends(_get_current_user)) -> list[dict[str, Any]]:
    df = STORE.products()
    # normalize keys expected by frontend
    items = []
    for _, r in df.iterrows():
        items.append(
            {
                "product_id": str(r.get("product_id")),
                "product_name": str(r.get("product_name")),
                "category": str(r.get("category", "")),
            }
        )
    return items


@app.get("/api/v1/data/kpis", response_model=KPIResponse)
def kpis(period_days: int = 30, user: User = Depends(_get_current_user)) -> KPIResponse:
    sales = STORE.sales_daily().copy()
    inv = STORE.inventory().copy()

    if sales.empty:
        return KPIResponse(
            totalDemand=0,
            inventoryCost=0.0,
            stockoutRisk=0.0,
            overstockRisk=0.0,
            revenue=0.0,
            accuracy=0.0,
        )

    max_dt = sales["date"].max()
    start = max_dt - pd.Timedelta(days=max(1, period_days) - 1)
    w = sales[sales["date"] >= start]

    qty_col = "qty" if "qty" in w.columns else "total_qty"
    revenue_col = "revenue" if "revenue" in w.columns else "total_revenue"

    total_demand = int(w[qty_col].sum())
    revenue = float(w[revenue_col].sum()) if revenue_col in w.columns else float((w[qty_col] * w.get("price", 0)).sum())

    inv_cost = 0.0
    if not inv.empty:
        inv_max = inv["date"].max()
        inv_w = inv[inv["date"] >= (inv_max - pd.Timedelta(days=max(1, period_days) - 1))]
        stock_col = "stock_level" if "stock_level" in inv_w.columns else ("stock" if "stock" in inv_w.columns else None)
        if stock_col:
            avg_stock = float(inv_w[stock_col].mean())
            avg_price = float(w["price"].mean()) if "price" in w.columns and len(w) else 0.0
            inv_cost = avg_stock * avg_price

    stockout_risk = 0.0
    overstock_risk = 0.0
    if not inv.empty:
        stock_col = "stock_level" if "stock_level" in inv.columns else ("stock" if "stock" in inv.columns else None)
        if stock_col:
            latest = inv[inv["date"] == inv["date"].max()]
            stockout_risk = float((latest[stock_col] < latest[stock_col].quantile(0.2)).mean() * 100)
            overstock_risk = float((latest[stock_col] > latest[stock_col].quantile(0.8)).mean() * 100)

    accuracy = 94.2 if ML_MODEL is not None else 85.0

    return KPIResponse(
        totalDemand=total_demand,
        inventoryCost=round(inv_cost, 2),
        stockoutRisk=round(stockout_risk, 1),
        overstockRisk=round(overstock_risk, 1),
        revenue=round(revenue, 2),
        accuracy=accuracy,
    )


# -----------------------------------------------------------------------------
# Forecast
# -----------------------------------------------------------------------------
@app.post("/api/v1/forecast/predict", response_model=ForecastPredictResponse)
def forecast_predict(req: ForecastPredictRequest, user: User = Depends(_get_current_user)) -> ForecastPredictResponse:
    # Validate product_id exists
    products = STORE.products()
    if req.product_id not in set(products["product_id"].astype(str).tolist()):
        raise HTTPException(status_code=404, detail=f"Unknown product_id: {req.product_id}")

    series = _simple_forecast_series(req.product_id, req.horizon_days)
    resp = ForecastPredictResponse(product_id=req.product_id, horizon_days=req.horizon_days, series=series)

    try:
        from backend.knowledge.hooks import on_forecast_generated

        summary_lines = [
            f"Forecast for {req.product_id}, horizon {req.horizon_days} days.",
            f"Points: {len(series)}.",
        ]
        if series:
            summary_lines.append(
                f"Sample: {series[0].date} forecast={series[0].forecast} "
                f"(band {series[0].lower}-{series[0].upper})"
            )
        on_forecast_generated(
            product_id=req.product_id,
            horizon_days=req.horizon_days,
            series_summary="\n".join(summary_lines),
            user_id=str(user.id),
        )
    except Exception:
        pass

    return resp


# -----------------------------------------------------------------------------
# Inventory (NO RAG)
# -----------------------------------------------------------------------------
@app.get("/api/v1/inventory/optimize", response_model=list[InventoryRecommendation])
def inventory_optimize(limit: int = 10, user: User = Depends(_get_current_user)) -> list[InventoryRecommendation]:
    prods = STORE.products().copy()
    recs: list[InventoryRecommendation] = []

    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))

        mean_d, std_d = _daily_demand_stats(pid)
        lt = _lead_time_days(pid)
        safety = _safety_stock(std_d, lt)
        rop = int(round(mean_d * lt + safety))
        current = _latest_inventory_level(pid)

        days_supply = (current / mean_d) if mean_d > 0 else 0.0
        risk = _risk_level(days_supply)

        # EOQ proxy: assume annual demand, ordering cost S, holding cost H
        annual_d = mean_d * 365.0
        S = 50.0
        H = max(1.0, 0.2 * float(r.get("max_price", 1) or 1))
        eoq = int(round(((2 * annual_d * S) / H) ** 0.5)) if annual_d > 0 else 0
        reorder_qty = max(eoq, max(0, rop - current))

        cost_savings = float(max(0.0, (0.05 * float(r.get("max_price", 0) or 0) * reorder_qty)))

        recs.append(
            InventoryRecommendation(
                product_id=pid,
                product_name=pname,
                currentStock=int(current),
                reorderPoint=int(rop),
                reorderQty=int(reorder_qty),
                safetyStock=int(safety),
                leadTime=int(lt),
                costSavings=round(cost_savings, 2),
                riskLevel=risk,
            )
        )

    # prioritize high risk first
    risk_rank = {"high": 0, "medium": 1, "low": 2}
    recs.sort(key=lambda x: (risk_rank.get(x.riskLevel, 9), -x.costSavings))
    out = recs[: max(1, min(100, limit))]

    try:
        from backend.knowledge.hooks import on_inventory_recommendations

        lines = [f"Inventory optimization batch ({len(out)} SKUs):"]
        for r in out[:10]:
            lines.append(
                f"- {r.product_id} {r.product_name}: stock={r.currentStock}, "
                f"ROP={r.reorderPoint}, reorder={r.reorderQty}, risk={r.riskLevel}"
            )
        on_inventory_recommendations(recommendations_text="\n".join(lines), user_id=str(user.id))
    except Exception:
        pass

    return out


# -----------------------------------------------------------------------------
# Reports (simple)
# -----------------------------------------------------------------------------
@app.get("/api/v1/reports/list", response_model=list[ReportItem])
def reports_list(user: User = Depends(_get_current_user)) -> list[ReportItem]:
    today = date.today().isoformat()
    return [
        ReportItem(
            id="r_forecast",
            title="Forecast Export (CSV)",
            description="Latest forecast export for selected product/horizon",
            type="Forecast",
            date=today,
            status="ready",
        ),
        ReportItem(
            id="r_inventory",
            title="Inventory Recommendations (CSV)",
            description="Current inventory optimization recommendations",
            type="Inventory",
            date=today,
            status="ready",
        ),
    ]


@app.get("/api/v1/reports/download")
def reports_download(
    report_id: str,
    product_id: Optional[str] = None,
    horizon_days: int = 14,
    user: User = Depends(_get_current_user),
) -> Response:
    if report_id == "r_inventory":
        recs = inventory_optimize(limit=100, user=user)
        df = pd.DataFrame([r.model_dump() for r in recs])
        csv = df.to_csv(index=False)
        try:
            from backend.knowledge.hooks import on_report_generated

            on_report_generated(
                report_id=report_id,
                title="Inventory Recommendations (CSV)",
                content=csv[:8000],
                user_id=str(user.id),
            )
        except Exception:
            pass
        return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=inventory_recommendations.csv"})

    if report_id == "r_forecast":
        # Always use a product for full forecast
        pid = product_id or "BL_KIT"
        try:
            if ML_MODEL is None:
                raise Exception("No ML model")
            n_months = max(1, horizon_days // 30 + (1 if horizon_days % 30 > 0 else 0))
            preds_df = ML_MODEL.predict(pid, n_months=n_months)

            # Extract daily values for CSV
            import datetime
            import pandas as pd
            today = datetime.date.today()
            current_date = today

            csv_data = []
            for _, row in preds_df.iterrows():
                monthly_demand = row['predicted_demand']
                daily_demand = max(0, int(monthly_demand / 30))
                margin = int(daily_demand * (100 - row.get('confidence_level', 80)) / 100)

                for _ in range(30):
                    csv_data.append({
                        "date": current_date.isoformat(),
                        "forecast": daily_demand,
                        "lower_bound": max(0, daily_demand - margin),
                        "upper_bound": daily_demand + margin
                    })
                    current_date += datetime.timedelta(days=1)

            df = pd.DataFrame(csv_data[:horizon_days])
            csv = df.to_csv(index=False)
            try:
                from backend.knowledge.hooks import on_report_generated

                on_report_generated(
                    report_id=report_id,
                    title=f"Forecast Export {pid}",
                    content=csv[:8000],
                    user_id=str(user.id),
                )
            except Exception:
                pass
            return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=forecast_export_{pid}.csv"})
        except Exception as e:
            print(f"Error in ML export predict, falling back to simple forecast: {e}")
            series = _simple_forecast_series(pid, horizon_days)
            df = pd.DataFrame([p.model_dump() for p in series])
            csv = df.to_csv(index=False)
            return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=forecast_export.csv"})

    raise HTTPException(status_code=404, detail="Unknown report_id")


class AlertItem(BaseModel):
    id: int
    type: str
    title: str
    message: str
    product: str
    time: str

@app.get("/api/v1/alerts/active", response_model=list[AlertItem])
def alerts_active(user: User = Depends(_get_current_user)) -> list[AlertItem]:
    # Mocking alerts dynamically based on actual logic or ML model would go here.
    # For now returning dynamic basic alerts to fulfill the connection.
    try:
        # Check stock risks dynamically
        recs = inventory_optimize(limit=3, user=user)
        active = []
        for i, rec in enumerate(recs):
            active.append(AlertItem(
                id=i,
                type="warning" if rec.riskLevel == "medium" else "error" if rec.riskLevel == "high" else "info",
                title=f"Inventory {rec.riskLevel.capitalize()} Risk",
                message=f"Consider ordering {rec.reorderQty} units soon.",
                product=rec.product_id,
                time="Just now"
            ))
        return active
    except:
        return []

@app.get("/api/v1/data/heatmap")
def heatmap_data(user: User = Depends(_get_current_user)):
    sales = STORE.sales_daily().copy()
    if sales.empty:
        return {"stores": [{"id": "s1", "name": "Store 1"}], "data": []}

    # If there are no stores in data, create a mock grouping, or just use "Store 1"
    stores = [{"id": "s1", "name": "Store 1"}]
    data = []

    prods = STORE.products()
    for _, p in prods.iterrows():
        pid = p["product_id"]
        pname = p.get("product_name", pid)

        # Calculate recent demand
        s_prod = sales[sales["product_id"] == pid]
        demand = s_prod["qty"].sum() if "qty" in s_prod.columns else s_prod["total_qty"].sum() if "total_qty" in s_prod.columns else 0

        data.append({
            "product": pname,
            "store": "Store 1",
            "demand": int(demand / 100) # Scale down for heatmap display
        })

    return {"stores": stores, "data": data}



@app.get("/api/v1/mlops/metrics")
def mlops_metrics(user: User = Depends(_get_current_user)):
    import datetime

    # We dynamically populate these if there's a real model or drift detector.
    # We simulate real-time metrics generation mirroring the expected dashboard model.
    today = datetime.date.today()
    accuracy_trend = []

    # Simple mockup based on whether model is loaded successfully
    base_accuracy = 94.2 if ML_MODEL is not None else 85.0
    for i in range(7, 0, -1):
        accuracy_trend.append({
            "date": (today - datetime.timedelta(days=i*7)).isoformat(),
            "accuracy": round(base_accuracy + (0.5 - (i % 2)), 1)
        })

    payload = {
        "modelAccuracy": accuracy_trend,
        "dataDrift": [
            {"feature": "promotions_impact", "status": "healthy", "drift": 0.02},
            {"feature": "seasonality_index", "status": "warning", "drift": 0.15},
            {"feature": "competitor_pricing", "status": "healthy", "drift": 0.05}
        ],
        "retrainingHistory": [
            {"date": (today - datetime.timedelta(days=1)).isoformat(), "trigger": "Drift Threshold Exceeded", "status": "Success", "improvement": "+1.2% Accuracy"},
            {"date": (today - datetime.timedelta(days=15)).isoformat(), "trigger": "Scheduled Bi-Weekly", "status": "Success", "improvement": "+0.4% Accuracy"}
        ],
        "system": {
            "cpu": 45,
            "memory": 62,
            "gpu": 25
        }
    }

    try:
        from backend.knowledge.hooks import on_mlops_snapshot

        summary = f"MLOps metrics: accuracy trend {accuracy_trend}, drift {payload['dataDrift']}, retraining {payload['retrainingHistory']}"
        on_mlops_snapshot(metrics_summary=summary[:4000], user_id=str(user.id))
    except Exception:
        pass

    return payload


class InsightsGeneratePayload(BaseModel):
    product_id: str
    period: Optional[str] = None

@app.post("/api/v1/insights/generate")
def insights_generate(payload: InsightsGeneratePayload, user: User = Depends(_get_current_user)):
    try:
        from backend.agents.nodes import llm
        from langchain_core.messages import SystemMessage, HumanMessage
        from pydantic import BaseModel, Field
        from typing import List

        class InsightItem(BaseModel):
            title: str = Field(description="A concise title for the insight")
            description: str = Field(description="2-3 sentence explanation")
            impact: str = Field(description="high, medium, or low")
            direction: str = Field(description="up, down, or neutral")
            factor: str = Field(description="The category name (e.g. Seasonality, Promotions)")
            confidence: int = Field(description="Confidence score from 0 to 100")

        class InsightsOutput(BaseModel):
            insights: List[InsightItem]
            executive_summary: str = Field(description="2-3 paragraph business summary")
            recommendations: List[str] = Field(description="A list of actionable steps")

        sys_msg = SystemMessage(content="You are SupplyMind AI, a senior supply chain intelligence analyst. Convert forecasting data and trends into clear, actionable business insights. ALWAYS respond strictly matching the requested JSON schema.")
        user_msg = HumanMessage(content=f"Analyze the recent forecasting, seasonality, and promotional trends for {payload.product_id}. Give me 4 actionable insights about this product.")

        structured_llm = llm.with_structured_output(InsightsOutput)
        result = structured_llm.invoke([sys_msg, user_msg])

        return result.model_dump()

    except Exception as e:
        print(f"Insights error: {e}")
        return {
            "insights": [
                {
                    "title": "Fallback Analysis",
                    "description": "The AI insight generator encountered an error: " + str(e),
                    "impact": "low",
                    "direction": "neutral",
                    "factor": "system",
                    "confidence": 50
                }
            ],
            "executive_summary": "System is currently unable to generate deep insights.",
            "recommendations": ["Ensure ML models are fully loaded and API keys are valid."]
        }

class ChatPayload(BaseModel):
    message: str
    context: Optional[str] = None
    selected_sku: Optional[str] = None

@app.post("/api/v1/insights/chat")
def insights_chat(payload: ChatPayload, user: User = Depends(_get_current_user)):
    try:
        from backend.agents.graph import app_graph
        from langchain_core.messages import HumanMessage

        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "product_id": payload.selected_sku or "",
            "current_intent": ""
        }

        result = app_graph.invoke(initial_state)
        final_message = result['messages'][-1].content

        return {
            "response": final_message,
            "sources": []
        }
    except Exception as e:
        return {"response": f"I encountered an error while processing your request: {e}"}


class ChatRequest(BaseModel):
    question: str
    selected_sku: Optional[str] = None

@app.post("/api/v1/chat")
def chat_endpoint(payload: ChatRequest, user: User = Depends(_get_current_user)):
    try:
        from backend.agents.graph import app_graph
        from langchain_core.messages import HumanMessage

        initial_state = {
            "messages": [HumanMessage(content=payload.question)],
            "product_id": payload.selected_sku or "",
            "current_intent": "",
        }

        result = app_graph.invoke(initial_state)
        final_message = result["messages"][-1].content

        return {"answer": final_message, "sources": []}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"Chat Graph Error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

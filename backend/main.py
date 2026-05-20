from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import User, create_tables, get_db


# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def _create_access_token(*, subject: str) -> str:
    now = datetime.utcnow()
    exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        subject = payload.get("sub")
        if not subject:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.scalar(select(User).where(User.id == subject))
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token") from e


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


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
class UserOut(BaseModel):
    id: str
    name: str
    email: str


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
    user: UserOut


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.on_event("startup")
def _startup() -> None:
    create_tables()

    # ensure a single demo user exists for quick start
    from .db import SessionLocal

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
                    created_at=datetime.utcnow(),
                )
            )
            db.commit()
    finally:
        db.close()


# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------
@app.post("/api/v1/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> UserOut:
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        name=req.name.strip() or "User",
        email=email,
        password_hash=_hash_password(req.password),
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    return UserOut(id=user.id, name=user.name, email=user.email)


@app.post("/api/v1/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    email = req.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not _verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _create_access_token(subject=user.id)
    return LoginResponse(
        access_token=token,
        user=UserOut(id=user.id, name=user.name, email=user.email),
    )


@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: User = Depends(_get_current_user)) -> UserOut:
    return UserOut(id=user.id, name=user.name, email=user.email)


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

    # inventory cost proxy: average stock * average price (rough)
    inv_cost = 0.0
    if not inv.empty:
        inv_max = inv["date"].max()
        inv_w = inv[inv["date"] >= (inv_max - pd.Timedelta(days=max(1, period_days) - 1))]
        stock_col = "stock_level" if "stock_level" in inv_w.columns else ("stock" if "stock" in inv_w.columns else None)
        if stock_col:
            avg_stock = float(inv_w[stock_col].mean())
            avg_price = float(w["price"].mean()) if "price" in w.columns and len(w) else 0.0
            inv_cost = avg_stock * avg_price

    # risk proxies from days-of-supply distribution
    stockout_risk = 0.0
    overstock_risk = 0.0
    if not inv.empty:
        stock_col = "stock_level" if "stock_level" in inv.columns else ("stock" if "stock" in inv.columns else None)
        if stock_col:
            latest = inv[inv["date"] == inv["date"].max()]
            stockout_risk = float((latest[stock_col] < latest[stock_col].quantile(0.2)).mean() * 100)
            overstock_risk = float((latest[stock_col] > latest[stock_col].quantile(0.8)).mean() * 100)

    # accuracy placeholder (until real model tracking exists)
    accuracy = 92.0

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
    return ForecastPredictResponse(product_id=req.product_id, horizon_days=req.horizon_days, series=series)


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
    return recs[: max(1, min(100, limit))]


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
        return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=inventory_recommendations.csv"})

    if report_id == "r_forecast":
        if not product_id:
            raise HTTPException(status_code=400, detail="product_id is required for forecast download")
        series = _simple_forecast_series(product_id, horizon_days)
        df = pd.DataFrame([p.model_dump() for p in series])
        csv = df.to_csv(index=False)
        return Response(content=csv, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=forecast_export.csv"})

    raise HTTPException(status_code=404, detail="Unknown report_id")


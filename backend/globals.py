from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
os.makedirs(DATA_DIR, exist_ok=True)

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# -----------------------------------------------------------------------------
# CSV-backed DataStore — shared across routers, tools, and services
# -----------------------------------------------------------------------------
class DataStore:
    def __init__(self) -> None:
        self._cache: dict[str, pd.DataFrame] = {}

    def _read_csv(self, name: str, *, parse_dates: Optional[list[str]] = None) -> pd.DataFrame:
        path = DATA_DIR / name
        if not path.exists():
            path = DATA_DIR / "enriched data" / name
        if not path.exists():
            raise FileNotFoundError(f"Missing dataset: {name}")
        return pd.read_csv(path, parse_dates=parse_dates)

    def load(self, products, inventory, sales, purchases):
        self._cache["products"] = products if not products.empty else self._cache.get("products", pd.DataFrame())
        self._cache["inventory"] = inventory if not inventory.empty else self._cache.get("inventory", pd.DataFrame())
        self._cache["sales_daily"] = sales if not sales.empty else self._cache.get("sales_daily", pd.DataFrame())

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

    def recommendations(self) -> pd.DataFrame:
        if "recommendations" not in self._cache:
            self._cache["recommendations"] = self._read_csv("recommendations.csv")
        return self._cache["recommendations"]

    def demand_forecasts(self) -> pd.DataFrame:
        if "demand_forecasts" not in self._cache:
            self._cache["demand_forecasts"] = self._read_csv("demand_forecasts.csv")
        return self._cache["demand_forecasts"]

    def contracts(self) -> pd.DataFrame:
        if "contracts" not in self._cache:
            self._cache["contracts"] = self._read_csv("contracts.csv")
        return self._cache["contracts"]

    def production_schedule(self) -> pd.DataFrame:
        if "production_schedule" not in self._cache:
            self._cache["production_schedule"] = self._read_csv("production_schedule.csv", parse_dates=["date"])
        return self._cache["production_schedule"]

    def sales_enriched(self) -> pd.DataFrame:
        if "sales_enriched" not in self._cache:
            self._cache["sales_enriched"] = self._read_csv("sales_enriched.csv", parse_dates=["date"])
        return self._cache["sales_enriched"]

    def inventory_enriched(self) -> pd.DataFrame:
        if "inventory_enriched" not in self._cache:
            self._cache["inventory_enriched"] = self._read_csv("inventory_enriched.csv", parse_dates=["date"])
        return self._cache["inventory_enriched"]

    def production_enriched(self) -> pd.DataFrame:
        if "production_enriched" not in self._cache:
            self._cache["production_enriched"] = self._read_csv("production_enriched.csv", parse_dates=["date"])
        return self._cache["production_enriched"]

    def monthly_sales(self) -> pd.DataFrame:
        if "monthly_sales" not in self._cache:
            self._cache["monthly_sales"] = self._read_csv("monthly_sales.csv")
        return self._cache["monthly_sales"]

    def demand_compliance(self) -> pd.DataFrame:
        if "demand_compliance" not in self._cache:
            self._cache["demand_compliance"] = self._read_csv("demand_compliance.csv")
        return self._cache["demand_compliance"]

    def product_mat_cost(self) -> pd.DataFrame:
        if "product_mat_cost" not in self._cache:
            self._cache["product_mat_cost"] = self._read_csv("product_mat_cost.csv")
        return self._cache["product_mat_cost"]

    def purchases(self) -> pd.DataFrame:
        if "purchases" not in self._cache:
            self._cache["purchases"] = pd.DataFrame()
        return self._cache["purchases"]


STORE = DataStore()

# Set on startup via bootstrap (used by agent tools)
ML_MODEL: Any = None
RAG_SERVICE: Any = None

# Forecast intelligence service (loaded from future_forecast.csv)
FORECAST_INTELLIGENCE: Any = None

MODELS: dict = {}


# -----------------------------------------------------------------------------
# Business logic helpers (used by knowledge/rag.py and services)
# -----------------------------------------------------------------------------
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


def _latest_inventory_level(product_id: str) -> int:
    inv = STORE.inventory()
    sub = inv[inv["product_id"] == product_id]
    if sub.empty:
        return 0
    latest = sub.sort_values("date").iloc[-1]
    for col in ["stock_level", "stock", "stockLevel"]:
        if col in latest:
            val = latest[col]
            try:
                return int(val) if not pd.isna(val) else 0
            except (ValueError, TypeError):
                return 0
    numeric_cols = [c for c in sub.columns if c not in {"date", "product_id"}]
    if numeric_cols:
        val = latest[numeric_cols[0]]
        try:
            return int(val) if not pd.isna(val) else 0
        except (ValueError, TypeError):
            return 0
    return 0

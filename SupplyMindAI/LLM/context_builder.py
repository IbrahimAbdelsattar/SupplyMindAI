from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"


def _read_csv(name: str) -> pd.DataFrame:
    path = DATA_DIR / name
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


def build_context() -> dict[str, Any]:
    products = _read_csv("products.csv")
    sales = _read_csv("sales_daily.csv")
    inventory = _read_csv("inventory.csv")
    suppliers = _read_csv("suppliers.csv")

    context: dict[str, Any] = {
        "products": products.head(20).to_dict(orient="records"),
        "suppliers": suppliers.head(20).to_dict(orient="records"),
        "summary": {
            "product_count": int(len(products)),
            "sales_rows": int(len(sales)),
            "inventory_rows": int(len(inventory)),
        },
    }

    if not sales.empty and "product_id" in sales.columns:
        qty_col = "qty" if "qty" in sales.columns else "total_qty"
        if qty_col in sales.columns:
            context["top_demand_products"] = (
                sales.groupby("product_id", as_index=False)[qty_col]
                .sum()
                .sort_values(qty_col, ascending=False)
                .head(10)
                .to_dict(orient="records")
            )

    if not inventory.empty and {"date", "product_id"}.issubset(inventory.columns):
        stock_col = "stock" if "stock" in inventory.columns else "stock_level"
        if stock_col in inventory.columns:
            latest_date = inventory["date"].max()
            context["latest_inventory"] = (
                inventory[inventory["date"] == latest_date]
                .sort_values(stock_col)
                .head(20)
                .to_dict(orient="records")
            )

    return context

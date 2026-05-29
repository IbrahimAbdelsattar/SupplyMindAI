"""Shared supply-chain analytics used by API routes and agent tools."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pandas as pd

if TYPE_CHECKING:
    from backend.main import DataStore


def daily_demand_stats(store: "DataStore", product_id: str) -> tuple[float, float]:
    last = _sales_last_n_days(store, product_id, 60)
    if last.empty:
        return 0.0, 0.0
    qty = last["qty"] if "qty" in last.columns else last["total_qty"]
    return float(qty.mean()), float(qty.std(ddof=0) if len(qty) > 1 else 0.0)


def lead_time_days(store: "DataStore", product_id: str) -> int:
    try:
        bom = store.bom()
        raw = store.raw_materials()
        sup = store.suppliers()

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


def safety_stock(demand_std: float, lead_time: int, z: float = 1.65) -> int:
    return int(round(z * demand_std * (lead_time**0.5)))


def risk_level(days_of_supply: float) -> str:
    if days_of_supply < 5:
        return "high"
    if days_of_supply < 10:
        return "medium"
    return "low"


def latest_inventory_level(store: "DataStore", product_id: str) -> int:
    inv = store.inventory()
    sub = inv[inv["product_id"] == product_id]
    if sub.empty:
        return 0
    latest = sub.sort_values("date").iloc[-1]
    for col in ["stock_level", "stock", "stockLevel"]:
        if col in latest:
            return int(latest[col])
    numeric_cols = [c for c in sub.columns if c not in {"date", "product_id"}]
    if numeric_cols:
        return int(latest[numeric_cols[0]])
    return 0


def inventory_analysis_text(store: "DataStore", product_id: str) -> str:
    prods = store.products()
    row = prods[prods["product_id"].astype(str) == product_id]
    pname = str(row.iloc[0]["product_name"]) if not row.empty else product_id

    mean_d, std_d = daily_demand_stats(store, product_id)
    lt = lead_time_days(store, product_id)
    safety = safety_stock(std_d, lt)
    rop = int(round(mean_d * lt + safety))
    current = latest_inventory_level(store, product_id)
    days_supply = (current / mean_d) if mean_d > 0 else 0.0
    risk = risk_level(days_supply)

    annual_d = mean_d * 365.0
    max_price = float(row.iloc[0].get("max_price", 1) or 1) if not row.empty else 1.0
    S, H = 50.0, max(1.0, 0.2 * max_price)
    eoq = int(round(((2 * annual_d * S) / H) ** 0.5)) if annual_d > 0 else 0
    reorder_qty = max(eoq, max(0, rop - current))

    return (
        f"Inventory Analysis for {pname} ({product_id}):\n"
        f"- Current Stock: {current}\n"
        f"- Reorder Point: {rop}\n"
        f"- Recommended Order Qty: {reorder_qty}\n"
        f"- Safety Stock: {safety}\n"
        f"- Stock Risk Level: {risk}\n"
        f"- Supplier Lead Time: {lt} days\n"
        f"- Days of Supply: {days_supply:.1f}\n"
    )


def _sales_last_n_days(store: "DataStore", product_id: str, n: int) -> pd.DataFrame:
    sales = store.sales_daily()
    sub = sales[sales["product_id"] == product_id].copy()
    if sub.empty:
        return sub
    max_dt = sub["date"].max()
    start = max_dt - pd.Timedelta(days=n - 1)
    return sub[sub["date"] >= start]

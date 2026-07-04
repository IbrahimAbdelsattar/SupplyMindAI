from __future__ import annotations


from backend.globals import STORE
from backend.analytics import (
    daily_demand_stats,
    lead_time_days as calc_lead_time,
    safety_stock as calc_safety_stock,
    risk_level as calc_risk_level,
    latest_inventory_level,
)


def calculate_optimization(product_id: str) -> dict:
    prods = STORE.products()
    row = prods[prods["product_id"].astype(str) == product_id]
    if row.empty:
        return {
            "product_id": product_id,
            "recommended_stock": 0,
            "reorder_point": 0,
            "optimal_quantity": 0,
            "message": f"Product {product_id} not found",
        }

    mean_d, std_d = daily_demand_stats(STORE, product_id)
    lt = calc_lead_time(STORE, product_id)
    safety = calc_safety_stock(std_d, lt)
    rop = int(round(mean_d * lt + safety))
    stock = latest_inventory_level(STORE, product_id)

    annual_d = mean_d * 365.0
    max_p = float(row.iloc[0].get("max_price", 1) or 1)
    S = 50.0
    H = max(1.0, 0.2 * max_p) if max_p > 0 else 2.0
    eoq = int(round(((2 * annual_d * S) / H) ** 0.5)) if annual_d > 0 else 0
    reorder_qty = max(eoq, max(0, rop - stock))

    return {
        "product_id": product_id,
        "recommended_stock": rop + safety,
        "reorder_point": rop,
        "optimal_quantity": reorder_qty,
        "safety_stock": safety,
        "lead_time": lt,
        "message": "Successfully calculated forecast & lead-time based parameters",
    }

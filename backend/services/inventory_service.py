from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd

LOGGER = logging.getLogger(__name__)

def adjust_inventory(product_id: str, quantity: int, reason: str) -> dict:
    from backend.globals import STORE, DATA_DIR

    inv = STORE.inventory()
    if inv.empty:
        LOGGER.warning("Inventory is empty.")
        current_stock = 0
    else:
        sub = inv[inv["product_id"] == product_id]
        if sub.empty:
            current_stock = 0
        else:
            latest = sub.sort_values("date").iloc[-1]
            current_stock = int(latest["stock"])

    new_stock = current_stock + quantity
    today_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    today_dt = pd.to_datetime(today_str)

    mask = (inv["date"] == today_dt) & (inv["product_id"] == product_id)
    if mask.any():
        idx = inv[mask].index
        inv.loc[idx, "stock"] = new_stock
    else:
        new_row = pd.DataFrame([{
            "date": today_dt,
            "product_id": product_id,
            "stock": new_stock
        }])
        inv = pd.concat([inv, new_row], ignore_index=True)

    csv_path = DATA_DIR / "inventory.csv"
    try:
        inv.to_csv(csv_path, index=False)
        LOGGER.info("Successfully updated inventory for %s (stock %s -> %s)", product_id, current_stock, new_stock)
    except Exception as exc:
        LOGGER.error("Failed to write to %s: %s", csv_path, exc)
        raise

    # Reload STORE cache
    STORE._cache["inventory"] = inv

    return {
        "status": "adjusted",
        "product_id": product_id,
        "quantity_added": quantity,
        "new_stock": new_stock,
        "reason": reason,
    }

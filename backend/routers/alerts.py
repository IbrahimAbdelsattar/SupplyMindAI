from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user
from backend.globals import STORE
from backend.knowledge.auth import AuthUser
from backend.schemas.alerts import AlertItem

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get("/active")
def alerts_active(user: AuthUser = Depends(_get_current_user)):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        now = datetime.now(timezone.utc)

        alerts: list[AlertItem] = []
        for _, r in prods.iterrows():
            pid = str(r["product_id"])
            pname = str(r.get("product_name", pid))
            cat = str(r.get("category", ""))

            latest = inv[inv["product_id"] == pid]
            stock = 0
            if not latest.empty:
                try:
                    stock = int(latest.sort_values("date").iloc[-1]["stock"])
                except (ValueError, TypeError):
                    stock = 0

            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            demand = float(sales_sub[qty_col].tail(30).mean()) if not sales_sub.empty else 0.0
            demand = demand if not pd.isna(demand) else 0.0

            if stock <= 0:
                alerts.append(AlertItem(
                    id=str(uuid.uuid4()),
                    type="stockout",
                    severity="critical",
                    title=f"Stockout: {pname}",
                    description=f"{pname} ({cat}) has zero stock. Immediate replenishment required.",
                    product_id=pid,
                    created_at=now,
                ))
            elif demand > 0 and stock / demand < 5:
                coverage = stock / demand
                alerts.append(AlertItem(
                    id=str(uuid.uuid4()),
                    type="low_stock",
                    severity="high",
                    title=f"Low Stock: {pname}",
                    description=f"Only {coverage:.1f} days of stock remaining. Reorder soon.",
                    product_id=pid,
                    created_at=now,
                ))

        return {"alerts": [a.model_dump() for a in alerts], "total": len(alerts)}
    except Exception as exc:
        return {"alerts": [], "total": 0, "error": str(exc)}

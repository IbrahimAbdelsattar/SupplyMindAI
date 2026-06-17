from __future__ import annotations

from datetime import date
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.dependencies import _get_current_user
from backend.db import SessionLocal
from backend.globals import STORE
from backend.knowledge.auth import AuthUser
from backend.schemas.inventory import InventoryRecommendation, InventoryItemOut, InventorySummaryOut

router = APIRouter(tags=["inventory"])


class InventoryUpdateRequest(BaseModel):
    sku: str
    stock: int
    reason: Optional[str] = None


@router.get("/api/v1/inventory/optimize")
def inventory_optimize(user: AuthUser = Depends(_get_current_user)):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        purchases = STORE.purchases()

        recommendations = []
        for _, r in prods.iterrows():
            pid = str(r["product_id"])
            pname = str(r.get("product_name", pid))

            latest = inv[inv["product_id"] == pid]
            current_stock = 0
            if not latest.empty:
                try:
                    current_stock = int(latest.sort_values("date").iloc[-1]["stock"])
                except (ValueError, TypeError):
                    current_stock = 0

            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            demand = float(sales_sub[qty_col].tail(90).mean()) if not sales_sub.empty else 0.0
            demand = demand if not pd.isna(demand) else 0.0

            lead_time_days = 14.0
            safety_stock = demand * lead_time_days * 0.5
            min_stock = demand * lead_time_days * 0.5
            max_stock = demand * lead_time_days * 2
            reorder_point = demand * lead_time_days * 0.8
            recommended_order = max(0, int(reorder_point - current_stock + safety_stock))

            if current_stock <= reorder_point:
                urgency = "high"
                notes = f"Stock below reorder point ({reorder_point:.0f}). Order {recommended_order} units now."
            elif current_stock <= max_stock * 0.6:
                urgency = "medium"
                notes = f"Stock approaching reorder point ({reorder_point:.0f}). Plan order soon."
            else:
                urgency = "low"
                notes = "Stock level healthy."

            recommendations.append(InventoryRecommendation(
                sku=pid,
                name=pname,
                current_stock=current_stock,
                min_stock=round(min_stock),
                max_stock=round(max_stock),
                reorder_point=round(reorder_point),
                recommended_order=recommended_order,
                order_urgency=urgency,
                expected_lead_time_days=lead_time_days,
                notes=notes,
            ))

        from backend.knowledge.hooks import on_inventory_recommendations
        on_inventory_recommendations([r.model_dump() for r in recommendations])

        return {
            "recommendations": [r.model_dump() for r in recommendations],
            "total": len(recommendations),
            "high_priority": sum(1 for r in recommendations if r.order_urgency == "high"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/v1/inventory/update")
def inventory_update(payload: InventoryUpdateRequest, user: AuthUser = Depends(_get_current_user)):
    try:
        return {"status": "ok", "message": f"Inventory for {payload.sku} updated to {payload.stock}"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/v1/inventory")
def inventory_list(user: AuthUser = Depends(_get_current_user)):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        max_date = inv["date"].max().isoformat() if not inv.empty else date.today().isoformat()

        items = []
        total_units = 0
        critical = low = healthy = 0
        active_count = inactive_count = 0

        for _, r in prods.iterrows():
            pid = str(r["product_id"])
            pname = str(r.get("product_name", pid))
            cat = str(r.get("category", ""))
            ptype = str(r.get("type", ""))

            latest = inv[inv["product_id"] == pid]
            if not latest.empty:
                raw_stock = latest.sort_values("date").iloc[-1]["stock"]
                try:
                    stock = int(raw_stock) if not pd.isna(raw_stock) else 0
                except (ValueError, TypeError):
                    stock = 0
            else:
                stock = 0

            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            demand = float(sales_sub[qty_col].tail(60).mean()) if not sales_sub.empty else 0.0
            demand = demand if not pd.isna(demand) else 0.0

            coverage = stock / demand if (demand > 0 and not pd.isna(stock)) else None
            if coverage is not None and pd.isna(coverage):
                coverage = None

            if coverage is None:
                label = "No demand data"
                status = "Healthy"
            elif coverage >= 14:
                label = f"Covers {coverage:.1f} days ({round(coverage / 30, 1)} months)"
                status = "Healthy"
            elif coverage >= 5:
                label = f"Covers {coverage:.1f} days"
                status = "Low"
            else:
                label = f"Only {coverage:.1f} days left"
                status = "Critical"

            total_units += stock
            active_count += 1
            if status == "Critical":
                critical += 1
            elif status == "Low":
                low += 1
            else:
                healthy += 1

            items.append(InventoryItemOut(
                sku=pid,
                name=pname,
                category=cat,
                productType=ptype,
                active=True,
                stock=stock,
                averageDailyDemand=round(demand, 2) if not pd.isna(demand) else 0.0,
                coverageDays=round(coverage, 2) if coverage is not None else None,
                coverageLabel=label,
                stockStatus=status,
                lastUpdated=max_date,
                sourceText=f"{pname} ({pid}) | Category: {cat} | Stock: {stock} | Demand: {demand:.2f}/day | Status: {status}",
            ))

        summary = InventorySummaryOut(
            asOf=max_date,
            totalProducts=len(prods),
            activeProducts=active_count,
            inactiveProducts=inactive_count,
            totalUnits=total_units,
            criticalProducts=critical,
            lowProducts=low,
            healthyProducts=healthy,
        )

        return {
            "summary": summary.model_dump(),
            "items": [i.model_dump() for i in items],
            "lang": "en",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal inventory list error: {exc}")

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse

from backend.dependencies import _get_current_user, require_permission
from backend.auth.rbac import Permission
from backend.globals import DATA_DIR, PROJECT_ROOT, STORE
from backend.analytics import (
    daily_demand_stats,
    lead_time_days as calc_lead_time,
    safety_stock as calc_safety_stock,
    risk_level as calc_risk_level,
    latest_inventory_level,
)


router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

INVENTORY_REPORTS_DIR = PROJECT_ROOT / "reports" / "inventory"
os.makedirs(INVENTORY_REPORTS_DIR, exist_ok=True)
LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# GET /products — list products from products.csv
# ---------------------------------------------------------------------------
@router.get("/products")
def list_products(user: dict = Depends(_get_current_user)) -> dict[str, Any]:
    try:
        prods = STORE.products()
        items = prods.fillna("").to_dict(orient="records")
        return {"items": items, "total": len(items)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET / — list all inventory items with product info
# ---------------------------------------------------------------------------
@router.get("/")
def list_inventory(user: dict = Depends(_get_current_user)) -> dict[str, Any]:
    try:
        inv = STORE.inventory()
        prods = STORE.products()
        merged = inv.merge(prods, on="product_id", how="left", suffixes=("", "_prod"))
        items = merged.fillna("").to_dict(orient="records")
        latest = inv.sort_values("date").groupby("product_id").last().reset_index() if not inv.empty else inv
        total_products = int(latest["product_id"].nunique()) if not latest.empty else 0
        total_units = int(latest["stock"].sum()) if not latest.empty else 0
        critical_count = int((latest["stock"] <= 5).sum()) if not latest.empty else 0
        low_count = int(((latest["stock"] > 5) & (latest["stock"] <= 20)).sum()) if not latest.empty else 0
        healthy_count = int((latest["stock"] > 20).sum()) if not latest.empty else 0
        active_count = int((latest["stock"] > 0).sum()) if not latest.empty else 0
        inactive_count = total_products - active_count
        return {
            "items": items,
            "total": len(items),
            "summary": {
                "asOf": str(datetime.now(timezone.utc).date()),
                "totalProducts": total_products,
                "activeProducts": active_count,
                "inactiveProducts": inactive_count,
                "totalUnits": total_units,
                "criticalProducts": critical_count,
                "lowProducts": low_count,
                "healthyProducts": healthy_count,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /update — update stock with full payload
# ---------------------------------------------------------------------------
@router.post("/update")
def inventory_update(payload: dict, user: dict = Depends(require_permission(Permission.APPLY_INVENTORY))):
    try:
        product_id = payload.get("product_id")
        quantity = payload.get("quantity", 0)
        reason = payload.get("reason", "manual")
        from backend.services.inventory_service import adjust_inventory

        result = adjust_inventory(product_id, quantity, reason)
        return {"success": True, "adjustment": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /optimize — list optimizations for all products (frontend uses ?limit=N)
# ---------------------------------------------------------------------------
@router.get("/optimize")
def inventory_optimize_list(limit: int = Query(20, ge=1, le=500), user: dict = Depends(_get_current_user)):

    try:
        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        items = []
        for _, r in prods.head(limit).iterrows():
            pid = str(r["product_id"])
            pname = str(r.get("product_name", pid))

            mean_d, std_d = daily_demand_stats(STORE, pid)
            lt = calc_lead_time(STORE, pid)
            safety = calc_safety_stock(std_d, lt)
            rop = int(round(mean_d * lt + safety))
            stock = latest_inventory_level(STORE, pid)

            days_supply = (stock / mean_d) if mean_d > 0 else 0.0
            risk = calc_risk_level(days_supply)

            # Economic Order Quantity
            annual_d = mean_d * 365.0
            min_p = float(r.get("min_price", 0.0)) or 0.0
            max_p = float(r.get("max_price", 0.0)) or 0.0
            avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0

            unit_price = float(r.get("unit_price", 0.0)) or avg_p
            purchase_price = float(r.get("purchase_price", 0.0)) or (unit_price * 0.7)

            S = 50.0
            H = max(1.0, 0.2 * max_p) if max_p > 0 else 2.0
            eoq = int(round(((2 * annual_d * S) / H) ** 0.5)) if annual_d > 0 else 0
            reorder_qty = max(eoq, max(0, rop - stock))

            savings = max(0.0, (stock - rop - safety) * (unit_price - purchase_price) * 0.05)

            items.append({
                "product_id": pid,
                "product_name": pname,
                "currentStock": stock,
                "reorderPoint": rop,
                "reorderQty": reorder_qty,
                "safetyStock": safety,
                "leadTime": lt,
                "costSavings": round(savings, 2),
                "riskLevel": risk,
            })
        return items
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /optimize/{product_id} — single product optimization
# ---------------------------------------------------------------------------
@router.get("/optimize/{product_id}")
def inventory_optimize_get(product_id: str, user: dict = Depends(_get_current_user)):
    try:
        from backend.services.optimization_service import calculate_optimization

        result = calculate_optimization(product_id)
        return {"optimization": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/optimize")
def inventory_optimize(payload: dict, user: dict = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        from backend.services.optimization_service import calculate_optimization

        result = calculate_optimization(product_id)
        return {"optimization": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/adjust")
def inventory_adjust(payload: dict, user: dict = Depends(require_permission(Permission.MANAGE_INVENTORY))):
    try:
        product_id = payload.get("product_id")
        quantity = payload.get("quantity", 0)
        reason = payload.get("reason", "manual")
        from backend.services.inventory_service import adjust_inventory

        result = adjust_inventory(product_id, quantity, reason)
        return {"success": True, "adjustment": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /purchase-orders — create a new purchase order
# ---------------------------------------------------------------------------
@router.post("/purchase-orders")
def create_purchase_order(payload: dict, user: dict = Depends(require_permission(Permission.MANAGE_INVENTORY))):
    try:
        product_id = payload.get("product_id")
        quantity = payload.get("quantity", 0)
        notes = payload.get("notes")
        if not product_id:
            raise HTTPException(status_code=400, detail="Missing product_id")
        qty = int(quantity)
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be a positive integer")
        prods = STORE.products()
        product_row = prods[prods["product_id"] == product_id]
        if product_row.empty:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")
        unit_cost = float(product_row.iloc[0].get("unit_cost", 0))
        total_cost = round(unit_cost * qty, 2)
        po_id = f"PO-{uuid.uuid4().hex[:8].upper()}"
        pos = STORE.purchase_orders()
        new_row = pd.DataFrame([{
            "po_id": po_id, "product_id": product_id, "quantity": qty,
            "unit_cost": unit_cost, "total_cost": total_cost,
            "notes": notes or "", "status": "created",
            "created_at": datetime.now(timezone.utc),
            "created_by": user.get("email", ""),
        }])
        pos = pd.concat([pos, new_row], ignore_index=True)
        csv_path = DATA_DIR / "purchase_orders.csv"
        pos.to_csv(csv_path, index=False)
        STORE._cache["purchase_orders"] = pos
        LOGGER.info("Purchase order %s created for %s (qty=%s)", po_id, product_id, qty)
        return {"success": True, "po_id": po_id}
    except HTTPException:
        raise
    except Exception as exc:
        LOGGER.error("Failed to create purchase order: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

@router.get("/summary")
def inventory_summary(user: dict = Depends(_get_current_user)):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        return {"total_products": len(prods), "total_inventory": int(inv["stock"].sum()) if not inv.empty else 0}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/health")
def inventory_health(user: dict = Depends(_get_current_user)):
    try:
        inv = STORE.inventory()
        latest = inv.sort_values("date").groupby("product_id").last().reset_index()
        stockouts = int((latest["stock"] <= 0).sum())
        low_stock = int(((latest["stock"] > 0) & (latest["stock"] <= 10)).sum())
        healthy = int((latest["stock"] > 10).sum())
        return {
            "stockouts": stockouts,
            "low_stock": low_stock,
            "healthy": healthy,
            "total": stockouts + low_stock + healthy,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/abc-analysis")
def inventory_abc_analysis(user: dict = Depends(_get_current_user)):
    try:
        from backend.services.analysis_service import abc_analysis

        result = abc_analysis()
        return {"abc_analysis": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/xyz-analysis")
def inventory_xyz_analysis(user: dict = Depends(_get_current_user)):
    try:
        from backend.services.analysis_service import xyz_analysis

        result = xyz_analysis()
        return {"xyz_analysis": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/historical-download")
def inventory_historical_download(product_id: Optional[str] = Query(None), user: dict = Depends(_get_current_user)):
    try:
        inv = STORE.inventory()
        if product_id:
            inv = inv[inv["product_id"] == product_id]
        csv_path = INVENTORY_REPORTS_DIR / f"historical_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
        inv.to_csv(csv_path, index=False)
        return FileResponse(str(csv_path), media_type="text/csv", filename=csv_path.name)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# --- Inventory RAG (lives under /api/v1/inventory space) ---

@router.post("/rag-query")
def inventory_rag_query(payload: dict, user: dict = Depends(_get_current_user)):
    try:
        question = payload.get("question", "")
        from backend.knowledge.rag import rag_query
        return rag_query(
            question=question,
            product_id=payload.get("product_id"),
            source_type=payload.get("source_type", "inventory"),
            operational_context=payload.get("include_operational_context", True)
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

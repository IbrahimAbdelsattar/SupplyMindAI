from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, STORE


router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

INVENTORY_REPORTS_DIR = PROJECT_ROOT / "reports" / "inventory"
os.makedirs(INVENTORY_REPORTS_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# GET / — list all inventory items with product info
# ---------------------------------------------------------------------------
@router.get("/")
def list_inventory(user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})) -> dict[str, Any]:
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
def inventory_update(payload: dict, user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
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
def inventory_optimize_list(limit: int = Query(20, ge=1, le=500), user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):

    try:
        prods = STORE.products()
        inv = STORE.inventory()
        sales = STORE.sales_daily()
        items = []
        for _, r in prods.head(limit).iterrows():
            pid = str(r["product_id"])
            pname = str(r.get("product_name", pid))
            latest = inv[inv["product_id"] == pid]
            stock = int(latest.sort_values("date").iloc[-1]["stock"]) if not latest.empty else 0
            sales_sub = sales[sales["product_id"] == pid]
            qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
            daily_avg = float(sales_sub[qty_col].tail(90).mean()) if not sales_sub.empty else 1.0
            daily_avg = max(daily_avg, 0.1)
            lead_time_days = max(int(round(daily_avg * 0.3)), 1)
            safety_stock = int(round(daily_avg * 7))
            reorder_point = int(round(daily_avg * lead_time_days * 1.5))
            reorder_qty = int(round(daily_avg * 30))
            coverage_months = stock / max(daily_avg * 30, 1)
            if coverage_months < 0.5:
                risk = "high"
            elif coverage_months < 1.5:
                risk = "medium"
            else:
                risk = "low"
            unit_price = float(r.get("unit_price", 10.0))
            purchase_price = float(r.get("purchase_price", unit_price * 0.7))
            savings = max(0, (stock - reorder_point - safety_stock) * (unit_price - purchase_price) * 0.05)
            items.append({
                "product_id": pid,
                "product_name": pname,
                "currentStock": stock,
                "reorderPoint": reorder_point,
                "reorderQty": reorder_qty,
                "safetyStock": safety_stock,
                "leadTime": lead_time_days,
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
def inventory_optimize_get(product_id: str, user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
    try:
        from backend.services.optimization_service import calculate_optimization

        result = calculate_optimization(product_id)
        return {"optimization": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/optimize")
def inventory_optimize(payload: dict, user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
    try:
        product_id = payload.get("product_id")
        from backend.services.optimization_service import calculate_optimization

        result = calculate_optimization(product_id)
        return {"optimization": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/adjust")
def inventory_adjust(payload: dict, user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
    try:
        product_id = payload.get("product_id")
        quantity = payload.get("quantity", 0)
        reason = payload.get("reason", "manual")
        from backend.services.inventory_service import adjust_inventory

        result = adjust_inventory(product_id, quantity, reason)
        return {"success": True, "adjustment": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/summary")
def inventory_summary(user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        return {"total_products": len(prods), "total_inventory": int(inv["stock"].sum()) if not inv.empty else 0}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/health")
def inventory_health(user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
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
def inventory_abc_analysis(user: dict = Depends(lambda: {"id":"public","email":"public@example.com"})):
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

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, STORE
from backend.knowledge.auth import AuthUser

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])

INVENTORY_REPORTS_DIR = PROJECT_ROOT / "reports" / "inventory"
os.makedirs(INVENTORY_REPORTS_DIR, exist_ok=True)


@router.post("/optimize")
def inventory_optimize(payload: dict, user: AuthUser = Depends(_get_current_user)):
    try:
        product_id = payload.get("product_id")
        from backend.services.optimization_service import calculate_optimization

        result = calculate_optimization(product_id)
        return {"optimization": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/adjust")
def inventory_adjust(payload: dict, user: AuthUser = Depends(_get_current_user)):
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
def inventory_summary(user: AuthUser = Depends(_get_current_user)):
    try:
        prods = STORE.products()
        inv = STORE.inventory()
        return {"total_products": len(prods), "total_inventory": int(inv["stock"].sum()) if not inv.empty else 0}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/health")
def inventory_health(user: AuthUser = Depends(_get_current_user)):
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
def inventory_abc_analysis(user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.analysis_service import abc_analysis

        result = abc_analysis()
        return {"abc_analysis": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/xyz-analysis")
def inventory_xyz_analysis(user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.analysis_service import xyz_analysis

        result = xyz_analysis()
        return {"xyz_analysis": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/historical-download")
def inventory_historical_download(
    product_id: Optional[str] = Query(None),
    user: AuthUser = Depends(_get_current_user),
):
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
def inventory_rag_query(payload: dict, user: AuthUser = Depends(_get_current_user)):
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

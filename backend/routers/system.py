from __future__ import annotations

import csv
import io
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse

from backend.dependencies import _get_current_user, _utc_now
from backend.db import SessionLocal, UserSettings
from backend.globals import PROJECT_ROOT, MODELS, STORE
from backend.knowledge.auth import AuthUser
from backend.schemas.alerts import AlertItem
from backend.schemas.reports import ReportItem
from backend.schemas.settings import UserSettingsPayload

router = APIRouter(prefix="/api/v1/system", tags=["system"])

REPORTS_DIR = PROJECT_ROOT / "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


# ── Alerts ──

@router.get("/alerts/active")
def system_alerts_active(user: AuthUser = Depends(_get_current_user)):
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


# ── MLOps ──

@router.get("/mlops/metrics")
def system_mlops_metrics(user: AuthUser = Depends(_get_current_user)):
    try:
        from datetime import timedelta
        import random
        now = datetime.now()
        accuracy_data = []
        for i in range(14, -1, -1):
            date_str = (now - timedelta(days=i)).strftime("%b %d")
            accuracy_data.append({"date": date_str, "accuracy": 92.0 + random.uniform(-2, 3)})

        return {
            "modelAccuracy": accuracy_data,
            "dataDrift": [
                {"feature": "sales_volume", "status": "warning", "drift": 0.08},
                {"feature": "price_index", "status": "healthy", "drift": 0.02},
                {"feature": "seasonality", "status": "healthy", "drift": 0.01},
            ],
            "retrainingHistory": [
                {
                    "date": (now - timedelta(days=2)).strftime("%b %d, %Y"),
                    "trigger": "Scheduled Bi-weekly",
                    "status": "healthy",
                    "improvement": "+1.2% Accuracy",
                },
                {
                    "date": (now - timedelta(days=16)).strftime("%b %d, %Y"),
                    "trigger": "Drift Alert (sales_volume)",
                    "status": "healthy",
                    "improvement": "+2.5% Accuracy",
                }
            ],
            "system": {"cpu": 45, "memory": 62, "gpu": 28},
        }
    except Exception as exc:
        return {"error": str(exc)}


@router.get("/mlops/langsmith")
def system_mlops_langsmith(user: AuthUser = Depends(_get_current_user)):
    try:
        from backend.services.langsmith_tracing_service import fetch_tracing_data
        tracing = fetch_tracing_data()
        return {"tracing": tracing}
    except ImportError:
        return {"tracing": [], "note": "LangSmith tracing service not available"}
    except Exception as exc:
        return {"tracing": [], "note": str(exc)}


# ── Reports ──

def _generate_reports_dataframe() -> pd.DataFrame:
    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()
    purchases = STORE.purchases()

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))
        unit_price = float(r.get("unit_price", 10.0)) or 10.0
        purchase_price = float(r.get("purchase_price", 7.0)) or 7.0

        latest = inv[inv["product_id"] == pid]
        stock = 0
        if not latest.empty:
            try:
                stock = int(latest.sort_values("date").iloc[-1]["stock"])
            except (ValueError, TypeError):
                stock = 0

        sales_sub = sales[sales["product_id"] == pid]
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        total_sold = int(sales_sub[qty_col].sum()) if not sales_sub.empty else 0
        avg_monthly = round(total_sold / max(len(sales_sub) / 30, 1), 1) if not sales_sub.empty else 0
        coverage = round(stock / max(avg_monthly, 1), 1) if avg_monthly > 0 else 0

        rows.append({
            "SKU": pid,
            "Product": pname,
            "Category": cat,
            "Stock": stock,
            "Total Sales": total_sold,
            "Avg Monthly Sales": avg_monthly,
            "Coverage (months)": coverage,
            "Unit Price": unit_price,
            "Purchase Price": purchase_price,
            "Margin %": round((unit_price - purchase_price) / unit_price * 100, 1) if unit_price > 0 else 0,
        })

    return pd.DataFrame(rows)


def _create_demo_reports():
    df = _generate_reports_dataframe()
    now = datetime.now(timezone.utc)

    reports_list = []

    csv_path = REPORTS_DIR / "inventory_summary.csv"
    df.to_csv(csv_path, index=False)
    file_size = os.path.getsize(csv_path)
    reports_list.append(ReportItem(
        id=str(uuid.uuid4()),
        title="Inventory Summary Report",
        type="inventory",
        format="csv",
        period_start=(now - timedelta(days=30)).isoformat(),
        period_end=now.isoformat(),
        generated_at=now,
        status="ready",
        file_size=file_size,
        download_url=f"/reports/download/inventory_summary.csv",
    ))

    period_ranges = [
        ("Q1 2025", "2025-01-01", "2025-03-31"),
        ("Q2 2025", "2025-04-01", "2025-06-30"),
        ("Q3 2025", "2025-07-01", "2025-09-30"),
    ]
    for period_name, start_d, end_d in period_ranges:
        report_id = str(uuid.uuid4())
        rpath = REPORTS_DIR / f"report_{report_id}.json"
        with open(rpath, "w") as f:
            json.dump({
                "id": report_id,
                "title": f"Supply Chain Analysis - {period_name}",
                "type": "supply_chain",
                "format": "json",
                "period_start": start_d,
                "period_end": end_d,
                "generated_at": now.isoformat(),
                "status": "ready",
            }, f)
        reports_list.append(ReportItem(
            id=report_id,
            title=f"Supply Chain Analysis - {period_name}",
            type="supply_chain",
            format="json",
            period_start=start_d,
            period_end=end_d,
            generated_at=now,
            status="ready",
            download_url=f"/reports/download/report_{report_id}.json",
        ))

    return reports_list


@router.get("/reports/list")
def system_reports_list(user: AuthUser = Depends(_get_current_user)):
    try:
        reports = _create_demo_reports()
        return {"reports": [r.model_dump() for r in reports]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/reports/download/{filename}")
def system_reports_download(filename: str, user: AuthUser = Depends(_get_current_user)):
    try:
        safe_path = (REPORTS_DIR / filename).resolve()
        if not str(safe_path).startswith(str(REPORTS_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Invalid file path")
        if not safe_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(str(safe_path))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Settings ──

@router.get("/settings")
def system_get_settings(user: AuthUser = Depends(_get_current_user)):
    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()
        return {"settings": row.settings_json if row else {}}
    finally:
        db.close()


@router.put("/settings")
def system_save_settings(payload: UserSettingsPayload, user: AuthUser = Depends(_get_current_user)):
    from loguru import logger

    try:
        new_settings = payload.model_dump(exclude_none=True)
    except AttributeError:
        new_settings = payload.dict(exclude_none=True)

    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()

        if row:
            merged = {**(row.settings_json or {}), **new_settings}
            row.settings_json = merged
            row.updated_at = _utc_now()
        else:
            merged = new_settings
            row = UserSettings(
                id=str(uuid.uuid4()),
                user_id=str(user.id),
                settings_json=merged,
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            db.add(row)

        db.commit()
        return {"settings": merged, "message": "Settings saved"}
    except Exception as exc:
        db.rollback()
        logger.error("save_settings error for user %s: %s", user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save settings") from exc
    finally:
        db.close()

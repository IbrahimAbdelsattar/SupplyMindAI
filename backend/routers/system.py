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
from backend.db import SessionLocal, User, UserSettings
from backend.globals import PROJECT_ROOT, MODELS, STORE

from backend.schemas.alerts import AlertItem
from backend.schemas.reports import ReportItem
from backend.schemas.settings import UserSettingsPayload

router = APIRouter(prefix="/api/v1/system", tags=["system"])

REPORTS_DIR = PROJECT_ROOT / "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


# ── Alerts ──

@router.get("/alerts/active")
def system_alerts_active(user: dict = Depends(_get_current_user)):
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


# ── MLOps (Moved to mlops.py) ──


# ── Reports ──

REPORT_TYPE_MAP = {
    "inventory_summary": "inventory",
    "sales_performance": "forecast",
    "abc_analysis": "supply_chain",
    "purchase_analysis": "technical",
    "operations_overview": "executive",
}

REPORT_LABELS = {
    "inventory_summary": ("Inventory Summary Report", "Current stock levels, coverage days, and reorder recommendations for all products"),
    "sales_performance": ("Sales Performance Report", "Revenue, units sold, and daily demand trends by product"),
    "abc_analysis": ("ABC Classification Report", "Products classified by revenue contribution into A, B, and C tiers"),
    "purchase_analysis": ("Purchase Analysis Report", "Purchase volumes, spend, and supplier breakdown"),
    "operations_overview": ("Operations Overview Report", "Consolidated KPIs across inventory, sales, and procurement"),
}


def _get_latest_stock(product_id: str, inv_df: pd.DataFrame) -> int:
    sub = inv_df[inv_df["product_id"] == product_id]
    if sub.empty:
        return 0
    try:
        return int(sub.sort_values("date").iloc[-1]["stock"])
    except (ValueError, TypeError, KeyError):
        return 0


def _build_inventory_summary() -> pd.DataFrame:
    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))
        min_p = float(r.get("min_price", 0.0)) or 0.0
        max_p = float(r.get("max_price", 0.0)) or 0.0
        avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0

        unit_price = float(r.get("unit_price", 0.0)) or avg_p
        purchase_price = float(r.get("purchase_price", 0.0)) or (unit_price * 0.7)
        stock = _get_latest_stock(pid, inv)

        sales_sub = sales[sales["product_id"] == pid]
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        total_sold = int(sales_sub[qty_col].sum()) if not sales_sub.empty else 0
        avg_daily = round(float(sales_sub[qty_col].mean()), 2) if not sales_sub.empty else 0
        coverage_days = round(stock / max(avg_daily, 1), 1) if avg_daily > 0 else 0

        risk = "critical" if stock == 0 else "high" if coverage_days < 7 else "medium" if coverage_days < 30 else "low"
        margin = round((unit_price - purchase_price) / unit_price * 100, 1) if unit_price > 0 else 0

        rows.append({
            "SKU": pid, "Product": pname, "Category": cat,
            "Current Stock": stock, "Avg Daily Demand": avg_daily,
            "Coverage (days)": coverage_days, "Risk Level": risk,
            "Unit Price": unit_price, "Purchase Price": purchase_price,
            "Margin %": margin, "Total Sold (all time)": total_sold,
        })
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def _build_sales_performance() -> pd.DataFrame:
    prods = STORE.products()
    sales = STORE.sales_daily()

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))
        min_p = float(r.get("min_price", 0.0)) or 0.0
        max_p = float(r.get("max_price", 0.0)) or 0.0
        avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0
        unit_price = float(r.get("unit_price", 0.0)) or avg_p

        sales_sub = sales[sales["product_id"] == pid].copy()
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        if sales_sub.empty:
            continue

        total_qty = int(sales_sub[qty_col].sum())
        avg_daily = round(float(sales_sub[qty_col].mean()), 2)
        max_daily = int(sales_sub[qty_col].max())
        revenue = round(total_qty * unit_price, 2)
        last_30 = sales_sub[sales_sub["date"] >= sales_sub["date"].max() - pd.Timedelta(days=30)]
        recent_avg = round(float(last_30[qty_col].mean()), 2) if not last_30.empty else 0

        rows.append({
            "SKU": pid, "Product": pname, "Category": cat,
            "Total Units Sold": total_qty, "Revenue": revenue,
            "Avg Daily Units": avg_daily, "Peak Daily Units": max_daily,
            "Last 30d Avg": recent_avg, "Unit Price": unit_price,
        })
    df = pd.DataFrame(rows) if rows else pd.DataFrame()
    if not df.empty:
        df = df.sort_values("Revenue", ascending=False).reset_index(drop=True)
    return df


def _build_abc_analysis() -> pd.DataFrame:
    prods = STORE.products()
    sales = STORE.sales_daily()

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))
        min_p = float(r.get("min_price", 0.0)) or 0.0
        max_p = float(r.get("max_price", 0.0)) or 0.0
        avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0
        unit_price = float(r.get("unit_price", 0.0)) or avg_p

        sales_sub = sales[sales["product_id"] == pid]
        qty_col = "qty" if "qty" in sales_sub.columns else "total_qty"
        total_qty = int(sales_sub[qty_col].sum()) if not sales_sub.empty else 0
        revenue = round(total_qty * unit_price, 2)

        rows.append({"SKU": pid, "Product": pname, "Category": cat, "Revenue": revenue, "Units Sold": total_qty})

    df = pd.DataFrame(rows) if rows else pd.DataFrame()
    if df.empty:
        return df

    df = df.sort_values("Revenue", ascending=False).reset_index(drop=True)
    total_rev = df["Revenue"].sum()
    if total_rev == 0:
        df["Tier"] = "C"
        df["Cumulative %"] = 0.0
        return df

    df["Cumulative %"] = round(df["Revenue"].cumsum() / total_rev * 100, 2)
    df["Tier"] = df["Cumulative %"].apply(lambda x: "A" if x <= 80 else "B" if x <= 95 else "C")
    return df


def _build_purchase_analysis() -> pd.DataFrame:
    prods = STORE.products()
    purchases = STORE.purchases()

    if purchases.empty:
        return pd.DataFrame()

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        min_p = float(r.get("min_price", 0.0)) or 0.0
        max_p = float(r.get("max_price", 0.0)) or 0.0
        avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0
        purchase_price = float(r.get("purchase_price", 0.0)) or (avg_p * 0.7)

        psub = purchases[purchases["product_id"] == pid] if "product_id" in purchases.columns else pd.DataFrame()
        if psub.empty:
            continue

        qty_col = "qty" if "qty" in psub.columns else "quantity"
        total_purchased = int(psub[qty_col].sum()) if qty_col in psub.columns else 0
        total_spend = round(total_purchased * purchase_price, 2)
        avg_order = round(total_purchased / max(len(psub), 1), 1)

        supplier = ""
        if "supplier" in psub.columns:
            supplier = str(psub["supplier"].mode().iloc[0]) if not psub["supplier"].mode().empty else ""

        rows.append({
            "SKU": pid, "Product": pname, "Total Purchased": total_purchased,
            "Total Spend": total_spend, "Avg Order Qty": avg_order,
            "Unit Cost": purchase_price, "Supplier": supplier,
        })
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def _build_operations_overview() -> pd.DataFrame:
    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()
    purchases = STORE.purchases()

    total_products = len(prods)
    total_stock = 0
    stockout_count = 0
    low_stock_count = 0
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        stock = _get_latest_stock(pid, inv)
        total_stock += stock
        if stock == 0:
            stockout_count += 1

    qty_col = "qty" if "qty" in sales.columns else "total_qty"
    total_units_sold = int(sales[qty_col].sum()) if not sales.empty and qty_col in sales.columns else 0
    avg_daily_units = round(float(sales[qty_col].mean()), 2) if not sales.empty and qty_col in sales.columns else 0

    total_purchased = 0
    if not purchases.empty:
        pq = "qty" if "qty" in purchases.columns else "quantity"
        total_purchased = int(purchases[pq].sum()) if pq in purchases.columns else 0

    rows = [{
        "Metric": "Total Products", "Value": total_products,
    }, {
        "Metric": "Total Units in Stock", "Value": total_stock,
    }, {
        "Metric": "Stockout Products", "Value": stockout_count,
    }, {
        "Metric": "Total Units Sold (all time)", "Value": total_units_sold,
    }, {
        "Metric": "Avg Daily Sales Units", "Value": avg_daily_units,
    }, {
        "Metric": "Total Units Purchased", "Value": total_purchased,
    }, {
        "Metric": "Inventory Turnover Ratio", "Value": round(total_units_sold / max(total_stock, 1), 2),
    }]
    return pd.DataFrame(rows)


REPORT_BUILDERS = {
    "inventory_summary": _build_inventory_summary,
    "sales_performance": _build_sales_performance,
    "abc_analysis": _build_abc_analysis,
    "purchase_analysis": _build_purchase_analysis,
    "operations_overview": _build_operations_overview,
}


def _save_report_csv(report_key: str, df: pd.DataFrame, now: datetime) -> ReportItem:
    filename = f"{report_key}_{now.strftime('%Y%m%d_%H%M%S')}.csv"
    csv_path = REPORTS_DIR / filename
    df.to_csv(csv_path, index=False)
    file_size = os.path.getsize(csv_path)
    report_id = f"{report_key}_{now.strftime('%Y%m%d%H%M%S')}"
    title, description = REPORT_LABELS.get(report_key, (report_key.replace("_", " ").title(), ""))
    report_type = REPORT_TYPE_MAP.get(report_key, "custom")

    report = ReportItem(
        id=report_id,
        title=title,
        description=description,
        type=report_type,
        format="csv",
        period_start=(now - timedelta(days=30)).isoformat(),
        period_end=now.isoformat(),
        generated_at=now,
        date=now.isoformat(),
        status="ready",
        file_size=file_size,
        download_url=f"/system/reports/download/{filename}",
    )

    meta_path = REPORTS_DIR / f"{report_id}.meta.json"
    with open(meta_path, "w") as f:
        json.dump(report.model_dump(mode="json"), f, indent=2)

    return report


def _generate_all_reports() -> list[ReportItem]:
    now = datetime.now(timezone.utc)
    reports: list[ReportItem] = []

    for key, builder in REPORT_BUILDERS.items():
        try:
            df = builder()
            if not df.empty:
                reports.append(_save_report_csv(key, df, now))
        except Exception:
            continue

    return reports


def _load_existing_reports() -> list[ReportItem]:
    reports: list[ReportItem] = []
    seen_csv: set[str] = set()

    for meta in REPORTS_DIR.glob("*.meta.json"):
        try:
            with open(meta, "r") as f:
                data = json.load(f)
            reports.append(ReportItem(**data))
            csv_name = data.get("download_url", "").split("/")[-1]
            if csv_name:
                seen_csv.add(csv_name)
        except Exception:
            continue

    for csv_file in REPORTS_DIR.glob("*.csv"):
        if csv_file.name in seen_csv:
            continue
        report_type = "custom"
        for k, v in REPORT_TYPE_MAP.items():
            if csv_file.name.startswith(k):
                report_type = v
                break

        reports.append(ReportItem(
            id=csv_file.stem,
            title=csv_file.stem.replace("_", " ").title(),
            type=report_type,
            format="csv",
            period_start=datetime.now(timezone.utc).isoformat(),
            period_end=datetime.now(timezone.utc).isoformat(),
            generated_at=datetime.fromtimestamp(csv_file.stat().st_mtime, timezone.utc),
            status="ready",
            file_size=csv_file.stat().st_size,
            download_url=f"/system/reports/download/{csv_file.name}",
        ))

    reports.sort(key=lambda r: r.generated_at, reverse=True)
    return reports


@router.post("/reports/generate")
def system_reports_generate(user: dict = Depends(_get_current_user)):
    try:
        reports = _generate_all_reports()
        if not reports:
            raise HTTPException(status_code=500, detail="No reports generated — check data availability")
        return {"status": "success", "message": f"Generated {len(reports)} reports", "reports": [r.model_dump() for r in reports]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/reports/list")
def system_reports_list(user: dict = Depends(_get_current_user)):
    try:
        reports = _load_existing_reports()
        return {"reports": [r.model_dump() for r in reports]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/reports/download/{filename}")
def system_reports_download(filename: str, user: dict = Depends(_get_current_user)):
    try:
        safe_path = (REPORTS_DIR / filename).resolve()
        if not str(safe_path).startswith(str(REPORTS_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Invalid file path")
        if not safe_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        media_type = "text/csv" if filename.endswith(".csv") else "application/json"
        return FileResponse(str(safe_path), media_type=media_type, filename=filename)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Settings (Moved to settings.py) ──

@router.get("/user")
def system_get_user(user=Depends(_get_current_user)):
    """Return the currently authenticated demo user"""
    uid = user.id if hasattr(user, "id") else user["id"]
    email = user.email if hasattr(user, "email") else user.get("email", "")
    meta = user.user_metadata if hasattr(user, "user_metadata") else user.get("user_metadata", {})
    app_meta = user.app_metadata if hasattr(user, "app_metadata") else user.get("app_metadata", {})
    return {"user": {
        "id": uid, "email": email,
        "name": meta.get("name", email.split("@")[0]),
        "role": app_meta.get("role", "admin"),
        "user_metadata": meta,
    }}

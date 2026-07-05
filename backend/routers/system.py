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

ALERTS_STATE_DIR = PROJECT_ROOT / "alerts_state"
os.makedirs(ALERTS_STATE_DIR, exist_ok=True)


def _get_alerts_state_path(user_id: str) -> Path:
    return ALERTS_STATE_DIR / f"{user_id}.json"


def _load_alerts_state(user_id: str) -> dict:
    path = _get_alerts_state_path(user_id)
    if path.exists():
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"acknowledged": {}, "dismissed": {}}


def _save_alerts_state(user_id: str, state: dict) -> None:
    path = _get_alerts_state_path(user_id)
    with open(path, "w") as f:
        json.dump(state, f, indent=2)


def _build_alerts(user_id: str) -> list[AlertItem]:
    """Build current alerts from live data, merging persisted ack/dismiss state."""
    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()
    now = datetime.now(timezone.utc)
    state = _load_alerts_state(user_id)

    alerts: list[AlertItem] = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        cat = str(r.get("category", ""))

        # Deterministic ID based on product + condition
        alert_id_base = f"{pid}_{now.strftime('%Y%m%d')}"

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
            alert_id = f"alert-stockout-{alert_id_base}"
            ack_info = state["acknowledged"].get(alert_id)
            dismissed = alert_id in state["dismissed"]
            if not dismissed:
                alerts.append(AlertItem(
                    id=alert_id,
                    type="stockout",
                    severity="critical",
                    title=f"Stockout: {pname}",
                    description=f"{pname} ({cat}) has zero stock. Immediate replenishment required.",
                    product_id=pid,
                    created_at=now,
                    acknowledged=ack_info is not None,
                    acknowledged_at=datetime.fromisoformat(ack_info["at"]) if ack_info else None,
                    acknowledged_by=ack_info.get("by") if ack_info else None,
                ))
        elif demand > 0 and stock / demand < 5:
            coverage = stock / demand
            alert_id = f"alert-low-{alert_id_base}"
            ack_info = state["acknowledged"].get(alert_id)
            dismissed = alert_id in state["dismissed"]
            if not dismissed:
                alerts.append(AlertItem(
                    id=alert_id,
                    type="low_stock",
                    severity="high",
                    title=f"Low Stock: {pname}",
                    description=f"Only {coverage:.1f} days of stock remaining. Reorder soon.",
                    product_id=pid,
                    created_at=now,
                    acknowledged=ack_info is not None,
                    acknowledged_at=datetime.fromisoformat(ack_info["at"]) if ack_info else None,
                    acknowledged_by=ack_info.get("by") if ack_info else None,
                ))

    return alerts


@router.get("/alerts/active")
def system_alerts_active(user: dict = Depends(_get_current_user)):
    try:
        uid = user.id if hasattr(user, "id") else user["id"]
        alerts = _build_alerts(uid)
        active = [a for a in alerts if not a.acknowledged]
        return {"alerts": [a.model_dump() for a in active], "total": len(active)}
    except Exception as exc:
        return {"alerts": [], "total": 0, "error": str(exc)}


@router.get("/alerts/all")
def system_alerts_all(user: dict = Depends(_get_current_user)):
    """Return all alerts including acknowledged ones."""
    try:
        uid = user.id if hasattr(user, "id") else user["id"]
        alerts = _build_alerts(uid)
        return {"alerts": [a.model_dump() for a in alerts], "total": len(alerts)}
    except Exception as exc:
        return {"alerts": [], "total": 0, "error": str(exc)}


@router.post("/alerts/{alert_id}/acknowledge")
def system_alerts_acknowledge(alert_id: str, user: dict = Depends(_get_current_user)):
    try:
        uid = user.id if hasattr(user, "id") else user["id"]
        state = _load_alerts_state(uid)
        now_str = datetime.now(timezone.utc).isoformat()
        state["acknowledged"][alert_id] = {"at": now_str, "by": uid}
        state["dismissed"].pop(alert_id, None)
        _save_alerts_state(uid, state)
        return {"status": "success", "message": f"Alert {alert_id} acknowledged"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/alerts/{alert_id}/dismiss")
def system_alerts_dismiss(alert_id: str, user: dict = Depends(_get_current_user)):
    try:
        uid = user.id if hasattr(user, "id") else user["id"]
        state = _load_alerts_state(uid)
        state["dismissed"][alert_id] = datetime.now(timezone.utc).isoformat()
        state["acknowledged"].pop(alert_id, None)
        _save_alerts_state(uid, state)
        return {"status": "success", "message": f"Alert {alert_id} dismissed"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/alerts/{alert_id}/restore")
def system_alerts_restore(alert_id: str, user: dict = Depends(_get_current_user)):
    """Restore a dismissed alert."""
    try:
        uid = user.id if hasattr(user, "id") else user["id"]
        state = _load_alerts_state(uid)
        state["dismissed"].pop(alert_id, None)
        state["acknowledged"].pop(alert_id, None)
        _save_alerts_state(uid, state)
        return {"status": "success", "message": f"Alert {alert_id} restored"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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
    contracts = STORE.contracts()
    suppliers = STORE.suppliers()
    bom = STORE.bom()
    raw_materials = STORE.raw_materials()

    if contracts.empty:
        return pd.DataFrame()

    # Build supplier lookup: product_id -> primary supplier (via BOM → raw_materials → suppliers)
    supplier_info: dict[str, dict] = {}
    if not bom.empty and not raw_materials.empty and not suppliers.empty:
        rm_map = {}
        if "material_id" in raw_materials.columns and "supplier_id" in raw_materials.columns:
            for _, rm in raw_materials.iterrows():
                rm_map[str(rm["material_id"])] = str(rm["supplier_id"])

        sup_map = {}
        if "supplier_id" in suppliers.columns:
            for _, s in suppliers.iterrows():
                sup_map[str(s["supplier_id"])] = {
                    "name": str(s.get("supplier_name", "")),
                    "region": str(s.get("region", "")),
                    "reliability": float(s.get("reliability", 0)),
                    "lead_time": int(s.get("lead_time_days", 0)),
                }

        if "product_id" in bom.columns and "material_id" in bom.columns:
            for pid_bom, grp in bom.groupby("product_id"):
                pid_str = str(pid_bom)
                seen_suppliers: dict[str, dict] = {}
                for _, b in grp.iterrows():
                    sid = rm_map.get(str(b["material_id"]), "")
                    info = sup_map.get(sid, {})
                    if info and sid not in seen_suppliers:
                        seen_suppliers[sid] = info
                if seen_suppliers:
                    # Pick the supplier with highest reliability
                    best_sid = max(seen_suppliers, key=lambda k: seen_suppliers[k].get("reliability", 0))
                    supplier_info[pid_str] = {**seen_suppliers[best_sid], "supplier_id": best_sid}

    rows = []
    for _, r in prods.iterrows():
        pid = str(r["product_id"])
        pname = str(r.get("product_name", pid))
        min_p = float(r.get("min_price", 0.0)) or 0.0
        max_p = float(r.get("max_price", 0.0)) or 0.0
        avg_p = (min_p + max_p) / 2.0 if (min_p + max_p) > 0 else 10.0
        unit_cost = round(avg_p, 2)

        csub = contracts[contracts["product_id"] == pid] if "product_id" in contracts.columns else pd.DataFrame()
        if csub.empty:
            continue

        total_contracts = len(csub)
        monthly_qty = int(csub["monthly_qty"].sum()) if "monthly_qty" in csub.columns else 0

        # Compute contracted duration (months)
        total_months = 0
        if "start" in csub.columns and "end" in csub.columns:
            for _, c in csub.iterrows():
                try:
                    s = pd.to_datetime(c["start"])
                    e = pd.to_datetime(c["end"])
                    months = max(1, int((e - s).days / 30))
                    total_months += months
                except Exception:
                    total_months += 12
        else:
            total_months = total_contracts * 12

        avg_contract_months = total_months // max(total_contracts, 1)
        total_qty = monthly_qty * avg_contract_months
        total_spend = round(total_qty * unit_cost, 2)
        avg_order_qty = round(total_qty / max(total_contracts, 1), 1)

        # Contract price if available
        contract_price = round(float(csub["price"].mean()), 2) if "price" in csub.columns else unit_cost

        # Supplier info via BOM chain
        info = supplier_info.get(pid, {})

        rows.append({
            "SKU": pid,
            "Product": pname,
            "Active Contracts": total_contracts,
            "Monthly Qty": monthly_qty,
            "Total Qty": total_qty,
            "Unit Cost": unit_cost,
            "Contract Price": contract_price,
            "Total Spend": total_spend,
            "Avg Order Qty": avg_order_qty,
            "Supplier": info.get("name", ""),
            "Region": info.get("region", ""),
            "Reliability": info.get("reliability", 0),
            "Lead Time (days)": info.get("lead_time", 0),
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


@router.post("/reports/generate/{report_type}")
def system_reports_generate_type(report_type: str, user: dict = Depends(_get_current_user)):
    if report_type not in REPORT_BUILDERS:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}. Valid: {list(REPORT_BUILDERS.keys())}")
    try:
        now = datetime.now(timezone.utc)
        df = REPORT_BUILDERS[report_type]()
        if df.empty:
            raise HTTPException(status_code=500, detail=f"No data available for report type: {report_type}")
        report = _save_report_csv(report_type, df, now)
        return {"status": "success", "message": f"Generated {report.title}", "report": report.model_dump()}
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


@router.delete("/reports/{report_id}")
def system_reports_delete(report_id: str, user: dict = Depends(_get_current_user)):
    try:
        meta_path = REPORTS_DIR / f"{report_id}.meta.json"
        csv_path = REPORTS_DIR / f"{report_id}.csv"
        deleted = False
        if meta_path.exists():
            with open(meta_path, "r") as f:
                data = json.load(f)
            csv_name = data.get("download_url", "").split("/")[-1]
            if csv_name:
                csv_target = REPORTS_DIR / csv_name
                if csv_target.exists():
                    csv_target.unlink()
                    deleted = True
            meta_path.unlink()
            deleted = True
        if csv_path.exists():
            csv_path.unlink()
            deleted = True
        if not deleted:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"status": "success", "message": f"Deleted report {report_id}"}
    except HTTPException:
        raise
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

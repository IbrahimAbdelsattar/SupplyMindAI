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
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, STORE
from backend.knowledge.auth import AuthUser
from backend.schemas.reports import ReportItem

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

REPORTS_DIR = PROJECT_ROOT / "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_reports_dataframe() -> pd.DataFrame:
    import pandas as pd
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


def create_demo_reports():
    import pandas as pd
    df = generate_reports_dataframe()
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


@router.get("/list")
def reports_list(user: AuthUser = Depends(_get_current_user)):
    try:
        reports = create_demo_reports()
        return {"reports": [r.model_dump() for r in reports]}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/download/{filename}")
def reports_download(filename: str, user: AuthUser = Depends(_get_current_user)):
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

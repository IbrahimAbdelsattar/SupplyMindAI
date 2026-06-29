from __future__ import annotations

import csv
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from celery import shared_task

from backend.globals import STORE

LOGGER = logging.getLogger(__name__)

REPORTS_DIR = PROJECT_ROOT / "reports"


def _write_csv(filepath: Path, columns: list[str], rows: list[dict[str, Any]]) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)


def _write_json(filepath: Path, data: Any) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


def _generate_forecast_report(tenant_id: str, fmt: str) -> Path:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"forecast_{tenant_id}_{timestamp}.{fmt}"
    filepath = REPORTS_DIR / tenant_id / filename
    products = STORE.products()
    rows = []
    for p in products:
        rows.append({
            "product_id": p.get("Product_ID"),
            "category": p.get("Category"),
            "region": p.get("Region"),
            "current_stock": p.get("Current_Stock"),
            "reorder_point": p.get("Reorder_Point"),
            "lead_time_days": p.get("Lead_Time_Days"),
        })
    if fmt == "csv":
        columns = ["product_id", "category", "region", "current_stock", "reorder_point", "lead_time_days"]
        _write_csv(filepath, columns, rows)
    else:
        _write_json(filepath, rows)
    return filepath


def _generate_inventory_report(tenant_id: str, fmt: str) -> Path:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"inventory_{tenant_id}_{timestamp}.{fmt}"
    filepath = REPORTS_DIR / tenant_id / filename
    inventory = STORE.inventory()
    rows = []
    for item in inventory:
        rows.append({
            "product_id": item.get("Product_ID"),
            "warehouse": item.get("Warehouse"),
            "stock_level": item.get("Stock_Level"),
            "date": str(item.get("Date")),
        })
    if fmt == "csv":
        columns = ["product_id", "warehouse", "stock_level", "date"]
        _write_csv(filepath, columns, rows)
    else:
        _write_json(filepath, rows)
    return filepath


def _generate_sales_report(tenant_id: str, fmt: str) -> Path:
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"sales_{tenant_id}_{timestamp}.{fmt}"
    filepath = REPORTS_DIR / tenant_id / filename
    sales = STORE.sales_daily()
    rows = []
    for s in sales:
        rows.append({
            "product_id": s.get("Product_ID"),
            "date": str(s.get("Date")),
            "quantity": s.get("Quantity"),
            "revenue": s.get("Revenue"),
        })
    if fmt == "csv":
        columns = ["product_id", "date", "quantity", "revenue"]
        _write_csv(filepath, columns, rows)
    else:
        _write_json(filepath, rows)
    return filepath


_REPORT_GENERATORS = {
    "forecast": _generate_forecast_report,
    "inventory": _generate_inventory_report,
    "sales": _generate_sales_report,
}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def generate_report(
    self,
    tenant_id: str,
    report_type: str = "forecast",
    fmt: str = "csv",
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    LOGGER.info("Generating %s report for tenant=%s format=%s", report_type, tenant_id, fmt)
    generator = _REPORT_GENERATORS.get(report_type)
    if not generator:
        raise ValueError(f"Unknown report type: {report_type}")
    try:
        filepath = generator(tenant_id, fmt)
        LOGGER.info("Report saved to %s", filepath)
        return {
            "tenant_id": tenant_id,
            "report_type": report_type,
            "format": fmt,
            "filepath": str(filepath),
            "size_bytes": filepath.stat().st_size,
        }
    except Exception as exc:
        LOGGER.error("Report generation failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task
def generate_scheduled_reports() -> list[dict[str, Any]]:
    LOGGER.info("Generating scheduled reports for all tenants")
    results = []
    for report_type in _REPORT_GENERATORS:
        try:
            result = generate_report("system", report_type, "csv")
            results.append(result)
        except Exception as exc:
            LOGGER.warning("Scheduled report %s failed: %s", report_type, exc)
    return results

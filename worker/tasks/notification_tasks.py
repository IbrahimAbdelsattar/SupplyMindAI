from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from celery import shared_task

from backend.globals import STORE

LOGGER = logging.getLogger(__name__)


def _get_product_alerts() -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    products = STORE.products()
    inventory_map = {item.get("Product_ID"): item for item in STORE.inventory()}

    for product in products:
        pid = product.get("Product_ID")
        inv = inventory_map.get(pid, {})
        current = inv.get("Stock_Level", 0)
        reorder = product.get("Reorder_Point", 0)
        lead_time = product.get("Lead_Time_Days", 0)

        if isinstance(current, (int, float)) and isinstance(reorder, (int, float)):
            if current <= reorder:
                alerts.append({
                    "type": "stockout",
                    "product_id": pid,
                    "current_stock": current,
                    "reorder_point": reorder,
                    "severity": "critical" if current <= reorder * 0.5 else "warning",
                })
        if isinstance(current, (int, float)) and isinstance(reorder, (int, float)):
            excess_threshold = reorder * 3
            if current > excess_threshold:
                alerts.append({
                    "type": "excess",
                    "product_id": pid,
                    "current_stock": current,
                    "excess_threshold": excess_threshold,
                    "severity": "info",
                })
    return alerts


@shared_task
def evaluate_alert_conditions(tenant_id: str) -> dict[str, Any]:
    LOGGER.info("Evaluating alert conditions for tenant=%s", tenant_id)
    alerts = _get_product_alerts()
    LOGGER.info("Alert evaluation complete for tenant=%s — %d alerts", tenant_id, len(alerts))
    return {"tenant_id": tenant_id, "alert_count": len(alerts), "alerts": alerts}


@shared_task
def send_stockout_alert(
    tenant_id: str,
    product_id: str,
    current_stock: float,
) -> dict[str, Any]:
    LOGGER.warning(
        "STOCKOUT ALERT — tenant=%s product=%s stock=%s",
        tenant_id,
        product_id,
        current_stock,
    )
    return {
        "tenant_id": tenant_id,
        "product_id": product_id,
        "current_stock": current_stock,
        "notified": True,
    }


@shared_task
def send_email_notification(
    tenant_id: str,
    user_id: str,
    template: str = "generic",
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ctx = context or {}
    LOGGER.info(
        "Email notification — tenant=%s user=%s template=%s context_keys=%s",
        tenant_id,
        user_id,
        template,
        list(ctx.keys()),
    )
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "template": template,
        "delivered": True,
    }

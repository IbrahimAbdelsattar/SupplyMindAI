from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user
from backend.globals import PROJECT_ROOT, STORE
from backend.schemas.notifications import NotificationItem

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])

NOTIFICATIONS_DIR = PROJECT_ROOT / "notifications"
os.makedirs(NOTIFICATIONS_DIR, exist_ok=True)

_notifications_file = NOTIFICATIONS_DIR / "notifications.json"


def _load_notifications() -> list[dict]:
    if not _notifications_file.exists():
        return []
    with open(_notifications_file, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_notifications(items: list[dict]) -> None:
    with open(_notifications_file, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, default=str)


def _generate_notifications() -> list[NotificationItem]:
    """Scan current alerts and create notifications for new conditions."""
    existing = _load_notifications()
    existing_keys = {n.get("type", "") + ":" + n.get("product_id", "") for n in existing}

    prods = STORE.products()
    inv = STORE.inventory()
    sales = STORE.sales_daily()
    now = datetime.now(timezone.utc)

    new_notifications: list[NotificationItem] = []
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
            key = f"stockout:{pid}"
            if key not in existing_keys:
                new_notifications.append(NotificationItem(
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
            key = f"low_stock:{pid}"
            if key not in existing_keys:
                new_notifications.append(NotificationItem(
                    id=str(uuid.uuid4()),
                    type="low_stock",
                    severity="high",
                    title=f"Low Stock: {pname}",
                    description=f"Only {coverage:.1f} days of stock remaining for {pname}. Reorder soon.",
                    product_id=pid,
                    created_at=now,
                ))

    if new_notifications:
        all_items = existing + [n.model_dump() for n in new_notifications]
        _save_notifications(all_items)

    return new_notifications


@router.get("")
def list_notifications(user: dict = Depends(_get_current_user)):
    _generate_notifications()
    items = _load_notifications()
    items.sort(key=lambda n: n.get("created_at", ""), reverse=True)
    return {"notifications": items, "total": len(items)}


@router.get("/unread-count")
def unread_count(user: dict = Depends(_get_current_user)):
    _generate_notifications()
    items = _load_notifications()
    count = sum(1 for n in items if not n.get("read", False))
    return {"count": count}


@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(_get_current_user)):
    items = _load_notifications()
    found = False
    for n in items:
        if n["id"] == notification_id:
            n["read"] = True
            n["read_at"] = datetime.now(timezone.utc).isoformat()
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Notification not found")
    _save_notifications(items)
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(user: dict = Depends(_get_current_user)):
    items = _load_notifications()
    now = datetime.now(timezone.utc).isoformat()
    for n in items:
        if not n.get("read", False):
            n["read"] = True
            n["read_at"] = now
    _save_notifications(items)
    return {"ok": True}


@router.delete("/{notification_id}")
def delete_notification(notification_id: str, user: dict = Depends(_get_current_user)):
    items = _load_notifications()
    before = len(items)
    items = [n for n in items if n["id"] != notification_id]
    if len(items) == before:
        raise HTTPException(status_code=404, detail="Notification not found")
    _save_notifications(items)
    return {"ok": True}

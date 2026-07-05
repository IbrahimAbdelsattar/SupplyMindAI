from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: str
    type: str  # "stockout", "low_stock", "system", "forecast"
    severity: str  # "critical", "high", "medium", "info"
    title: str
    description: str
    product_id: Optional[str] = None
    created_at: datetime
    read: bool = False
    read_at: Optional[datetime] = None

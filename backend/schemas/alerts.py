from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AlertItem(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    product_id: str
    created_at: datetime
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

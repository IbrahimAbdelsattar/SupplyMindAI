from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ReportItem(BaseModel):
    id: str
    title: str
    type: str
    format: str
    period_start: str
    period_end: str
    generated_at: datetime
    status: str = "ready"
    file_size: Optional[int] = None
    download_url: Optional[str] = None

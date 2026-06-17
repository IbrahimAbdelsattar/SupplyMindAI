from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class UserSettingsPayload(BaseModel):
    theme: Optional[str] = None
    notifications: Optional[dict] = None
    region: Optional[str] = None
    language: Optional[str] = None
    display: Optional[dict] = None

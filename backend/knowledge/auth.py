from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class AuthUser:
    id: str
    email: str
    user_metadata: dict = field(default_factory=dict)
    app_metadata: dict = field(default_factory=dict)
    created_at: str = ""
    updated_at: str = ""

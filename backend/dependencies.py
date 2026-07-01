import logging
from datetime import datetime, timezone
from fastapi import Request
from backend.knowledge.auth import AuthUser

logger = logging.getLogger("backend.auth")

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)

async def _get_current_user(request: Request) -> AuthUser:
    return AuthUser(
        id="demo-user",
        email="demo@supplymind.ai",
        user_metadata={"name": "Demo Admin"},
        app_metadata={"role": "admin", "is_active": True},
        created_at=_utc_now().isoformat(),
        updated_at=_utc_now().isoformat(),
    )

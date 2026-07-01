from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user


router = APIRouter(prefix="/api/v1/security", tags=["security"])


@router.get("/stats")
def security_stats(user: dict = Depends(_get_current_user)):
    return {
        "active_sessions": 0,
        "failed_logins_24h": 0,
        "api_keys_active": 0,
        "last_audit": None,
    }

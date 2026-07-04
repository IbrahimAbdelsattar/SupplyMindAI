"""Storage health check."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user

router = APIRouter(prefix="/api/v1/storage", tags=["storage"])


@router.get("/health")
async def storage_health(user: Any = Depends(_get_current_user)) -> dict[str, Any]:
    """Check storage service health."""
    from backend.knowledge.storage import is_storage_available

    is_available = is_storage_available()
    return {
        "status": "healthy" if is_available else "unavailable",
        "storage_available": is_available,
        "message": "Storage service is available" if is_available else "Storage not configured",
    }

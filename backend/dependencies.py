import logging
from datetime import datetime, timezone
from fastapi import HTTPException, Request, status

from backend.knowledge.auth import AuthUser, get_user_from_token

logger = logging.getLogger("backend.auth")


def _auth_error(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_current_user(request: Request) -> AuthUser:
    # return await get_user_from_token(token)
    return AuthUser(
        id="dev_user_123",
        email="dev@example.com",
        user_metadata={"name": "Dev User"},
        app_metadata={"role": "admin"},
        created_at=_utc_now().isoformat(),
        updated_at=_utc_now().isoformat()
    )

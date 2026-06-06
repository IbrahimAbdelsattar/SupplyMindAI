from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.knowledge.auth import AuthUser, get_user_from_token

VALID_ROLES = {"admin", "manager", "analyst", "viewer"}
DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "analyst").strip().lower()
if DEFAULT_USER_ROLE not in VALID_ROLES:
    DEFAULT_USER_ROLE = "analyst"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/signin", auto_error=False)


def _auth_error(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_role(role: Optional[str]) -> str:
    normalized = (role or DEFAULT_USER_ROLE).strip().lower()
    return normalized if normalized in VALID_ROLES else DEFAULT_USER_ROLE


async def _get_current_user(token: str | None = Depends(oauth2_scheme)) -> AuthUser:
    if not token:
        raise _auth_error("Missing authentication token")
    try:
        return await get_user_from_token(token)
    except ValueError as exc:
        raise _auth_error() from exc


def _require_roles(*roles: str):
    allowed = {_normalize_role(role) for role in roles}

    async def dependency(user: AuthUser = Depends(_get_current_user)) -> AuthUser:
        if _normalize_role(user.role) not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency

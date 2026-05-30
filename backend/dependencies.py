import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import User, get_db

import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.knowledge.auth import get_user_from_token, AuthUser

VALID_ROLES = {"admin", "manager", "analyst", "viewer"}
DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "analyst").strip().lower()
if DEFAULT_USER_ROLE not in VALID_ROLES:
    DEFAULT_USER_ROLE = "analyst"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/signin")

def _auth_error(detail: str = "Invalid token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )

def _normalize_role(role: Optional[str]) -> str:
    normalized = (role or DEFAULT_USER_ROLE).strip().lower()
    return normalized if normalized in VALID_ROLES else DEFAULT_USER_ROLE

async def _get_current_user(
    token: str = Depends(oauth2_scheme),
) -> AuthUser:
    try:
        user = await get_user_from_token(token)
        return user
    except Exception as e:
        raise _auth_error(str(e))

def _require_roles(*roles: str):
    allowed = {_normalize_role(role) for role in roles}

    async def dependency(user: AuthUser = Depends(_get_current_user)) -> AuthUser:
        user_role = _normalize_role(getattr(user, "role", None))
        if user_role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency

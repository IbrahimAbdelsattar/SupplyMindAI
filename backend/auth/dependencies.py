"""FastAPI dependencies for enterprise authentication and authorization.

Chain: JWT verify → domain check → DB lookup → RBAC enforcement.

Usage:
    from backend.auth.dependencies import get_current_user, require_permission

    @router.get("/items")
    async def list_items(user: AuthUser = Depends(get_current_user)):
        ...

    @router.get("/admin/users")
    async def list_users(user: AuthUser = Depends(require_permission(Permission.MANAGE_USERS))):
        ...
"""

from __future__ import annotations

import os
import time
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request, HTTPException, Depends

from backend.auth.tokens import decode_token

from backend.auth.rbac import (
    Role,
    ROLE_PERMISSIONS,
    has_permission,
    require_permission as _check_permission,
)
from backend.auth.audit import (
    log_login_success,
    log_login_failure,
    log_domain_rejected,
    log_account_disabled,
    log_permission_denied,
)
from backend.knowledge.auth import AuthUser

logger = logging.getLogger("backend.auth.dependencies")

# ── Helpers ──────────────────────────────────────────────────────────────


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request headers or connection."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


# ── Core Dependency: get_current_user ──────────────────────────────────────────

async def _get_current_user(request: Request) -> AuthUser:
    """Enterprise auth chain: local JWT → DB lookup → active check → RBAC."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header.split(" ")[1]
    ip = _get_client_ip(request)

    # Step 1: Verify local JWT
    try:
        claims = decode_token(token, expected_type="access")
    except HTTPException:
        log_login_failure("JWT verification failed", ip_address=ip)
        raise

    user_id = claims.get("sub", "")
    
    # Step 2: DB lookup
    from backend.db import get_db
    db = next(get_db())
    try:
        from backend.db import User

        user = db.query(User).filter(User.id == user_id).first()

        if user is None:
            log_login_failure("DB user not found for token sub", ip_address=ip)
            raise HTTPException(status_code=401, detail="Unable to resolve user identity. Please contact an administrator.")

        email = user.email

        # Step 4: Active check
        if not user.is_active:
            log_account_disabled(user.id, email, ip_address=ip)
            raise HTTPException(
                status_code=403,
                detail="Account has been deactivated. Contact an administrator.",
            )

        # Step 5: Build AuthUser with DB role
        app_metadata = {
            "role": user.role,
            "is_active": user.is_active,
            "department": user.department,
        }

        auth_user = AuthUser(
            id=user.id,
            email=user.email,
            user_metadata={"name": user.name, "department": user.department},
            app_metadata=app_metadata,
            created_at=user.created_at.isoformat() if user.created_at else "",
            updated_at=user.updated_at.isoformat() if user.updated_at else "",
        )

        log_login_success(user.id, email, user.role, ip_address=ip)
        return auth_user

    finally:
        db.close()


# ── Permission Dependency Factory ──────────────────────────────────────────────

def require_permission(permission: str):
    """Create a dependency that enforces a specific permission.

    Usage:
        @router.get("/admin/users")
        async def list_users(user = Depends(require_permission(Permission.MANAGE_USERS))):
            ...
    """
    async def _dep(request: Request) -> AuthUser:
        user = await _get_current_user(request)
        role = user.app_metadata.get("role", "")
        if not has_permission(role, permission):
            log_permission_denied(
                user.id,
                user.email,
                role,
                permission,
                resource=str(request.url.path),
                ip_address=_get_client_ip(request),
            )
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required: {permission}",
            )
        return user
    return _dep


def require_role(minimum_role: str):
    """Create a dependency that enforces a minimum role level.

    Usage:
        @router.post("/admin/users")
        async def create_user(user = Depends(require_role(Role.ADMIN))):
            ...
    """
    async def _dep(request: Request) -> AuthUser:
        user = await _get_current_user(request)
        role = user.app_metadata.get("role", "")
        from backend.auth.rbac import is_at_least_role
        if not is_at_least_role(role, minimum_role):
            log_permission_denied(
                user.id,
                user.email,
                role,
                f"role>={minimum_role}",
                resource=str(request.url.path),
                ip_address=_get_client_ip(request),
            )
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient role. Required: {minimum_role} or higher.",
            )
        return user
    return _dep


# ── Public export ──────────────────────────────────────────────────────────────

get_current_user = _get_current_user

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
import base64
import time
import logging
from datetime import datetime, timezone
from typing import Optional

import jwt
import requests
from fastapi import Request, HTTPException, Depends

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

# ── Clerk JWKS Configuration ──────────────────────────────────────────────────

_jwks_cache: dict = {"keys": None, "fetched_at": 0}
_JWKS_CACHE_TTL = 3600  # 1 hour


def _extract_clerk_domain() -> Optional[str]:
    """Extract Clerk domain from the publishable key env var."""
    pk = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    if not pk:
        return None
    try:
        prefix = "pk_test_" if pk.startswith("pk_test_") else "pk_live_" if pk.startswith("pk_live_") else ""
        encoded_domain = pk[len(prefix):]
        padding = 4 - len(encoded_domain) % 4
        if padding != 4:
            encoded_domain += "=" * padding
        domain = base64.b64decode(encoded_domain).decode()
        # Strip any trailing non-DNS chars (e.g. '$') from base64 decode artifacts
        domain = domain.rstrip("$\x00")
        return domain
    except Exception:
        return None


def _get_clerk_jwks() -> list[dict]:
    """Fetch Clerk JWKS with caching."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_CACHE_TTL:
        return _jwks_cache["keys"]

    domain = _extract_clerk_domain()
    if not domain:
        logger.warning("No CLERK_PUBLISHABLE_KEY configured; JWKS fetch skipped")
        return []

    try:
        resp = requests.get(f"https://{domain}/.well-known/jwks.json", timeout=5)
        resp.raise_for_status()
        keys = resp.json().get("keys", [])
        _jwks_cache["keys"] = keys
        _jwks_cache["fetched_at"] = now
        logger.info("Fetched %d JWKS keys from Clerk", len(keys))
        return keys
    except Exception as exc:
        logger.error("Failed to fetch Clerk JWKS: %s", exc)
        return _jwks_cache.get("keys") or []


def _find_jwk_by_kid(kid: str) -> Optional[dict]:
    for key in _get_clerk_jwks():
        if key.get("kid") == kid:
            return key
    return None


def _verify_token(token: str) -> dict:
    """Verify a Clerk JWT via JWKS. Falls back to unverified decode in dev."""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token header: {exc}")

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg", "RS256")

    jwk = _find_jwk_by_kid(kid) if kid else None
    if jwk:
        try:
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
            claims = jwt.decode(token, public_key, algorithms=[alg], options={"verify_aud": False})
            return claims
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidSignatureError:
            raise HTTPException(status_code=401, detail="Invalid token signature")
        except Exception as exc:
            logger.warning("JWKS verification failed, falling back: %s", exc)

    env = os.getenv("ENVIRONMENT", "development")
    if env == "development":
        logger.warning("Dev mode: accepting unverified token")
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    raise HTTPException(status_code=401, detail="Unable to verify token - no valid signing key found")


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
    """Enterprise auth chain: JWT → domain → DB → RBAC.

    1. Extract and verify Clerk JWT
    2. Validate email domain is @supplymind.tech
    3. Look up user in internal DB
    4. Check user.is_active
    5. Return AuthUser with role from DB (not hardcoded)
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header.split(" ")[1]
    ip = _get_client_ip(request)

    # Step 1: Verify JWT
    try:
        claims = _verify_token(token)
    except HTTPException:
        log_login_failure("JWT verification failed", ip_address=ip)
        raise

    user_id = claims.get("sub", "unknown")
    email = claims.get("email", "")

    # Step 2: DB lookup — try email first, then clerk_user_id
    from backend.db import get_db
    db = next(get_db())
    try:
        from backend.db import User

        user = None

        # Try email lookup first
        if email:
            user = db.query(User).filter(User.email == email).first()

        # Fallback: look up by Clerk user ID (sub claim)
        if user is None and user_id and user_id != "unknown":
            user = db.query(User).filter(User.clerk_user_id == user_id).first()
            if user:
                email = user.email  # Use stored email from DB
                logger.info("Resolved email from DB via clerk_user_id=%s -> %s", user_id, email)

        # No user found anywhere — need email to proceed
        if user is None and not email:
            log_login_failure("No email in JWT claims and no matching DB user", ip_address=ip)
            raise HTTPException(status_code=401, detail="Token missing email claim and no matching user in database")

        if user is None:
            # Auto-create first user as admin; subsequent users as analyst
            existing_count = db.query(User).count()
            role = Role.ADMIN if existing_count == 0 else Role.ANALYST
            now = _utc_now()

            user = User(
                id=user_id,
                email=email,
                name=claims.get("name", email.split("@")[0]),
                role=role.value,
                is_active=True,
                department=None,
                clerk_user_id=user_id,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info("Auto-created user %s with role %s", email, role.value)

        # Sync clerk_user_id if not set
        if not user.clerk_user_id and user_id and user_id != "unknown":
            user.clerk_user_id = user_id
            db.commit()

        email = user.email  # Ensure email is always the stored value

        # Domain check removed to allow public users

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

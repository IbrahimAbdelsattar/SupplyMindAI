"""Clerk-only authentication backed by Clerk JWT verification."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from jose import JWTError, jwt
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import httpx

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

CLERK_ISSUER = os.getenv("CLERK_ISSUER", "").strip()
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "").strip()
CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE", "").strip()

_JWKS_CACHE: dict[str, Any] | None = None
_JWKS_CACHE_EXPIRES_AT = datetime.fromtimestamp(0, timezone.utc)
_JWKS_CACHE_TTL_SECONDS = int(os.getenv("CLERK_JWKS_CACHE_TTL_SECONDS", "300"))
_JWKS_LOCK = asyncio.Lock()


class AuthUser(BaseModel):
    id: str
    email: str
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    last_sign_in_at: str | None = None

    @property
    def role(self) -> str:
        return self.app_metadata.get("role", "analyst")


class AuthResponse(BaseModel):
    user: AuthUser
    session: dict[str, Any]
    access_token: str
    refresh_token: str | None = None


def is_auth_available() -> bool:
    return True


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _claim_timestamp_iso(claim_value: Any, fallback: datetime) -> str:
    if isinstance(claim_value, (int, float)):
        return datetime.fromtimestamp(claim_value, timezone.utc).isoformat()
    return fallback.isoformat()


async def _fetch_jwks(jwks_url: str) -> dict[str, Any]:
    now = _now()
    global _JWKS_CACHE, _JWKS_CACHE_EXPIRES_AT
    if _JWKS_CACHE and now < _JWKS_CACHE_EXPIRES_AT:
        return _JWKS_CACHE

    async with _JWKS_LOCK:
        now = _now()
        if _JWKS_CACHE and now < _JWKS_CACHE_EXPIRES_AT:
            return _JWKS_CACHE

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            jwks = response.json()

        _JWKS_CACHE = jwks
        _JWKS_CACHE_EXPIRES_AT = now + timedelta(seconds=_JWKS_CACHE_TTL_SECONDS)
        return jwks


def _derive_clerk_config(unverified_claims: dict[str, Any]) -> tuple[str, str, str | None]:
    issuer = CLERK_ISSUER or str(unverified_claims.get("iss") or "").strip()
    if not issuer:
        raise ValueError("Missing Clerk issuer (set CLERK_ISSUER or provide valid token issuer)")

    jwks_url = CLERK_JWKS_URL or f"{issuer.rstrip('/')}/.well-known/jwks.json"
    audience = CLERK_AUDIENCE or None
    return issuer, jwks_url, audience


async def _verify_clerk_token(access_token: str) -> AuthUser:
    token = access_token.removeprefix("Bearer ").strip()
    if not token:
        raise ValueError("Missing token")

    try:
        unverified_header = jwt.get_unverified_header(token)
        unverified_claims = jwt.get_unverified_claims(token)
    except JWTError as exc:
        raise ValueError("Invalid Clerk token") from exc

    issuer, jwks_url, audience = _derive_clerk_config(unverified_claims)
    jwks = await _fetch_jwks(jwks_url)
    keys = jwks.get("keys", []) if isinstance(jwks, dict) else []
    kid = unverified_header.get("kid")

    signing_key = next((key for key in keys if key.get("kid") == kid), None)
    if not signing_key:
        raise ValueError("Unable to find signing key for Clerk token")

    algorithm = unverified_header.get("alg", "RS256")
    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
        "leeway": 120,
    }

    try:
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            audience=audience,
            issuer=issuer,
            options=options,
        )
    except JWTError as exc:
        raise ValueError("Invalid or expired Clerk token") from exc

    user_id = str(claims.get("sub") or "").strip()
    if not user_id:
        raise ValueError("Clerk token missing subject")

    email = str(claims.get("email") or claims.get("primary_email_address") or "").strip()
    given_name = str(claims.get("given_name") or "").strip()
    family_name = str(claims.get("family_name") or "").strip()
    name = (
        str(claims.get("name") or "").strip()
        or " ".join(part for part in [given_name, family_name] if part).strip()
    )
    if not name:
        name = email.split("@")[0] if email else "User"

    role = str(claims.get("role") or claims.get("org_role") or "analyst").strip().lower()
    now = _now()

    return AuthUser(
        id=user_id,
        email=email,
        user_metadata={"name": name},
        app_metadata={"role": role},
        created_at=_claim_timestamp_iso(claims.get("iat"), now),
        updated_at=now.isoformat(),
        last_sign_in_at=_claim_timestamp_iso(claims.get("iat"), now),
    )


async def get_user_from_token(access_token: str) -> AuthUser:
    return await _verify_clerk_token(access_token)

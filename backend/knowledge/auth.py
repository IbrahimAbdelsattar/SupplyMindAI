"""Application authentication backed by the primary SQL database."""

from __future__ import annotations

import asyncio
import os
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import select
from dotenv import load_dotenv
import httpx

from backend.db import AuthSession, SessionLocal, User

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
INSECURE_JWT_SECRETS = {
    "",
    "development-only-change-me",
    "change-me",
    "changeme",
    "replace-with-a-random-secret",
    "your-jwt-secret",
}
if ENVIRONMENT == "production" and (JWT_SECRET.lower() in INSECURE_JWT_SECRETS or len(JWT_SECRET) < 32):
    raise RuntimeError("JWT_SECRET must be a unique secret of at least 32 characters in production")
if not JWT_SECRET:
    JWT_SECRET = "development-only-change-me"

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
PASSWORD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

AUTH_PROVIDER = os.getenv("AUTH_PROVIDER", "clerk").strip().lower()
ALLOW_LEGACY_AUTH = os.getenv("ALLOW_LEGACY_AUTH", "true").strip().lower() in {"1", "true", "yes", "on"}
CLERK_ISSUER = os.getenv("CLERK_ISSUER", "").strip()
CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "").strip()
CLERK_AUDIENCE = os.getenv("CLERK_AUDIENCE", "").strip()

_JWKS_CACHE: dict[str, Any] | None = None
_JWKS_CACHE_EXPIRES_AT = datetime.fromtimestamp(0, timezone.utc)
_JWKS_CACHE_TTL_SECONDS = int(os.getenv("CLERK_JWKS_CACHE_TTL_SECONDS", "300"))
_JWKS_LOCK = asyncio.Lock()

env_emails = os.getenv("AUTHORIZED_EMAILS", "").strip()
AUTHORIZED_EMAILS = {email.strip().lower() for email in env_emails.split(",") if email.strip()}


class AuthUser(BaseModel):
    id: str
    email: str
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
    last_sign_in_at: Optional[str] = None

    @property
    def role(self) -> str:
        return self.app_metadata.get("role", "analyst")


class AuthResponse(BaseModel):
    user: AuthUser
    session: dict[str, Any]
    access_token: str
    refresh_token: Optional[str] = None


def is_auth_available() -> bool:
    return True


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _user_model(user: User, *, last_sign_in_at: str | None = None) -> AuthUser:
    created = user.created_at or _now()
    updated = user.updated_at or created
    return AuthUser(
        id=user.id,
        email=user.email,
        user_metadata={"name": user.name},
        app_metadata={"role": user.role},
        created_at=created.isoformat(),
        updated_at=updated.isoformat(),
        last_sign_in_at=last_sign_in_at,
    )


def _token(user: User, token_type: str, expires_delta: timedelta, session_id: str) -> str:
    now = _now()
    return jwt.encode(
        {
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "type": token_type,
            "sid": session_id,
            "iat": now,
            "exp": now + expires_delta,
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _auth_response(user: User) -> AuthResponse:
    session_id = str(uuid.uuid4())
    access = _token(user, "access", timedelta(minutes=ACCESS_TOKEN_MINUTES), session_id)
    refresh = _token(user, "refresh", timedelta(days=REFRESH_TOKEN_DAYS), session_id)
    expires_at = _now() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    with SessionLocal() as db:
        db.add(
            AuthSession(
                id=session_id,
                user_id=user.id,
                refresh_token_hash=_token_hash(refresh),
                is_active=True,
                expires_at=_now() + timedelta(days=REFRESH_TOKEN_DAYS),
                created_at=_now(),
                updated_at=_now(),
            )
        )
        db.commit()
    return AuthResponse(
        user=_user_model(user, last_sign_in_at=_now().isoformat()),
        session={"access_token": access, "refresh_token": refresh, "expires_at": expires_at.isoformat()},
        access_token=access,
        refresh_token=refresh,
    )


def _decode(token: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    if payload.get("type") != expected_type or not payload.get("sub") or not payload.get("sid"):
        raise ValueError("Invalid token")
    return payload


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


def _claim_timestamp_iso(claim_value: Any, fallback: datetime) -> str:
    if isinstance(claim_value, (int, float)):
        return datetime.fromtimestamp(claim_value, timezone.utc).isoformat()
    return fallback.isoformat()


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
    name = str(claims.get("name") or "").strip() or " ".join(part for part in [given_name, family_name] if part).strip()
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


async def _get_user_from_legacy_token(access_token: str) -> AuthUser:
    payload = _decode(access_token, "access")
    with SessionLocal() as db:
        auth_session = db.get(AuthSession, payload["sid"])
        if not auth_session or not auth_session.is_active or auth_session.user_id != payload["sub"]:
            raise ValueError("Session is no longer active")
        user = db.get(User, payload["sub"])
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        return _user_model(user)


async def signup_with_email(
    email: str, password: str, metadata: dict[str, Any] | None = None
) -> AuthResponse:
    raise ValueError("Registration is disabled. Only pre-authorized accounts are permitted.")


async def signin_with_email(email: str, password: str) -> AuthResponse:
    email_clean = email.strip().lower()
    if AUTHORIZED_EMAILS and email_clean not in AUTHORIZED_EMAILS:
        raise ValueError("Unauthorized email address. Only registered team members can access this portal.")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email_clean))
        if not user or not user.is_active or not PASSWORD_CONTEXT.verify(password, user.password_hash):
            raise ValueError("Invalid email or password")
        return _auth_response(user)


async def get_user_from_token(access_token: str) -> AuthUser:
    normalized_provider = AUTH_PROVIDER or "clerk"

    if normalized_provider == "legacy":
        return await _get_user_from_legacy_token(access_token)

    if normalized_provider == "clerk":
        try:
            return await _verify_clerk_token(access_token)
        except ValueError:
            if ALLOW_LEGACY_AUTH:
                return await _get_user_from_legacy_token(access_token)
            raise

    try:
        return await _verify_clerk_token(access_token)
    except ValueError:
        return await _get_user_from_legacy_token(access_token)


async def refresh_session(refresh_token: str) -> AuthResponse:
    payload = _decode(refresh_token, "refresh")
    with SessionLocal() as db:
        auth_session = db.get(AuthSession, payload["sid"])
        if (
            not auth_session
            or not auth_session.is_active
            or auth_session.user_id != payload["sub"]
            or auth_session.refresh_token_hash != _token_hash(refresh_token)
        ):
            raise ValueError("Refresh session is no longer active")
        auth_session.is_active = False
        auth_session.updated_at = _now()
        db.commit()
        user = db.get(User, payload["sub"])
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        return _auth_response(user)


async def signout(access_token: str) -> None:
    payload = _decode(access_token.removeprefix("Bearer ").strip(), "access")
    with SessionLocal() as db:
        auth_session = db.get(AuthSession, payload["sid"])
        if auth_session:
            auth_session.is_active = False
            auth_session.updated_at = _now()
            db.commit()


async def update_user_metadata(access_token: str, metadata: dict[str, Any]) -> AuthUser:
    payload = _decode(access_token.removeprefix("Bearer ").strip(), "access")
    with SessionLocal() as db:
        user = db.get(User, payload["sub"])
        if not user:
            raise ValueError("User not found")
        if metadata.get("name"):
            user.name = str(metadata["name"]).strip()
        user.updated_at = _now()
        db.commit()
        db.refresh(user)
        return _user_model(user)


async def reset_password(email: str) -> None:
    # Email delivery is intentionally provider-neutral. Do not reveal account existence.
    return None


async def update_password(access_token: str, new_password: str) -> AuthUser:
    if len(new_password) < 8:
        raise ValueError("Password must be at least 8 characters")
    payload = _decode(access_token.removeprefix("Bearer ").strip(), "access")
    with SessionLocal() as db:
        user = db.get(User, payload["sub"])
        if not user:
            raise ValueError("User not found")
        user.password_hash = PASSWORD_CONTEXT.hash(new_password)
        user.updated_at = _now()
        db.commit()
        db.refresh(user)
        return _user_model(user)


async def delete_user(access_token: str) -> None:
    payload = _decode(access_token.removeprefix("Bearer ").strip(), "access")
    with SessionLocal() as db:
        user = db.get(User, payload["sub"])
        if not user:
            raise ValueError("User not found")
        db.delete(user)
        db.commit()

"""Application authentication backed by the primary SQL database."""

from __future__ import annotations

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
    payload = _decode(access_token, "access")
    with SessionLocal() as db:
        auth_session = db.get(AuthSession, payload["sid"])
        if not auth_session or not auth_session.is_active or auth_session.user_id != payload["sub"]:
            raise ValueError("Session is no longer active")
        user = db.get(User, payload["sub"])
        if not user or not user.is_active:
            raise ValueError("User not found or inactive")
        return _user_model(user)


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

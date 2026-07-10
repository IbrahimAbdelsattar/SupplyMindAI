"""Token issuance and verification (self-hosted JWTs)."""
from __future__ import annotations

import os
import uuid
import hashlib
import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException

logger = logging.getLogger("backend.auth.tokens")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    if ENVIRONMENT != "development":
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable is missing but required in production. "
            "Please set it securely (e.g. using a 64-byte random hex string)."
        )
    else:
        logger.warning(
            "JWT_SECRET_KEY not set in development mode. Falling back to a hardcoded "
            "insecure key. DO NOT DO THIS IN PRODUCTION!"
        )
        JWT_SECRET_KEY = "dev-only-insecure-secret-key-12345"

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user) -> str:
    """Create a short-lived JWT access token."""
    now = _utc_now()
    expires_at = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    claims = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "type": "access",
        "iat": now.timestamp(),
        "exp": expires_at.timestamp(),
    }
    return jwt.encode(claims, JWT_SECRET_KEY, algorithm="HS256")


def create_refresh_token(user) -> tuple[str, str, datetime]:
    """Create a long-lived JWT refresh token.
    
    Returns:
        tuple[str, str, datetime]: (raw_token, token_hash, expires_at)
    """
    now = _utc_now()
    expires_at = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4())
    
    claims = {
        "sub": user.id,
        "jti": jti,
        "type": "refresh",
        "iat": now.timestamp(),
        "exp": expires_at.timestamp(),
    }
    
    raw_token = jwt.encode(claims, JWT_SECRET_KEY, algorithm="HS256")
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    
    return raw_token, token_hash, expires_at


def decode_token(token: str, expected_type: str) -> dict:
    """Decode and verify a token, checking its type claim."""
    try:
        claims = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        if claims.get("type") != expected_type:
            raise HTTPException(
                status_code=401, 
                detail=f"Invalid token type. Expected {expected_type}."
            )
        return claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidSignatureError:
        raise HTTPException(status_code=401, detail="Invalid token signature")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

"""Centralized authentication middleware.

Adds user info to request.state for every authenticated request.
Endpoints that require auth use Depends(get_current_user) or the middleware
populates request.state.user automatically.

This middleware does NOT block unauthenticated requests — it only enriches
authenticated ones. Blocking is done per-endpoint via dependencies.
"""

from __future__ import annotations

import logging
import os
import base64
import time
from typing import Optional

import jwt
import requests
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("backend.auth.middleware")

# Paths that never require auth enrichment
_SKIP_PATHS = frozenset({
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
})


class AuthMiddleware(BaseHTTPMiddleware):
    """Populate request.state.user for authenticated requests.

    If a valid Bearer token is present, decodes it and attaches user info
    to request.state. If invalid or missing, request.state.user = None.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip auth enrichment for public paths
        path = request.url.path
        if any(path.startswith(p) for p in _SKIP_PATHS):
            return await call_next(request)

        # Default: no user
        request.state.user = None
        request.state.user_id = None
        request.state.user_email = None
        request.state.user_role = None

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        token = auth_header.split(" ", 1)[1]
        try:
            claims = _decode_token(token)
            if claims:
                request.state.user_id = claims.get("sub")
                request.state.user_email = claims.get("email")
                request.state.user_role = claims.get("role")
        except Exception:
            pass  # Let endpoint-level deps handle auth errors

        return await call_next(request)


def _decode_token(token: str) -> Optional[dict]:
    """Decode a Clerk JWT without raising — best-effort for middleware."""
    try:
        header = jwt.get_unverified_header(token)
    except Exception:
        return None

    kid = header.get("kid")
    alg = header.get("alg", "RS256")

    # Try JWKS verification
    if kid:
        domain = _extract_clerk_domain()
        if domain:
            try:
                resp = requests.get(
                    f"https://{domain}/.well-known/jwks.json", timeout=3
                )
                resp.raise_for_status()
                for key in resp.json().get("keys", []):
                    if key.get("kid") == kid:
                        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                        return jwt.decode(
                            token, public_key, algorithms=[alg],
                            options={"verify_aud": False},
                        )
            except Exception:
                pass

    # Fallback: dev mode unverified
    if os.getenv("ENVIRONMENT", "development") == "development":
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception:
            return None

    return None


def _extract_clerk_domain() -> Optional[str]:
    """Extract Clerk domain from publishable key."""
    pk = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    if not pk:
        return None
    try:
        prefix = "pk_test_" if pk.startswith("pk_test_") else "pk_live_" if pk.startswith("pk_live_") else ""
        encoded_domain = pk[len(prefix):]
        padding = 4 - len(encoded_domain) % 4
        if padding != 4:
            encoded_domain += "=" * padding
        return base64.b64decode(encoded_domain).decode()
    except Exception:
        return None

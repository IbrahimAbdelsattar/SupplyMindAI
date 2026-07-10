"""Centralized authentication middleware.

Adds user info to request.state for every authenticated request.
Endpoints that require auth use Depends(get_current_user) or the middleware
populates request.state.user automatically.

This middleware does NOT block unauthenticated requests — it only enriches
authenticated ones. Blocking is done per-endpoint via dependencies.

NOTE: Clerk has been removed. This middleware is a pass-through stub.
Auth will be rebuilt manually later.
"""

from __future__ import annotations

import logging
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

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

    Stub: sets all user fields to None. Auth will be rebuilt manually later.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip auth enrichment for public paths
        path = request.url.path
        if any(path.startswith(p) for p in _SKIP_PATHS):
            return await call_next(request)

        # Default: no user (Clerk removed — auth TBD)
        request.state.user = None
        request.state.user_id = None
        request.state.user_email = None
        request.state.user_role = None

        return await call_next(request)

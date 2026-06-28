from __future__ import annotations

from fastapi import HTTPException, Request, status

from backend.knowledge.auth import AuthUser, get_user_from_token


def _auth_error(detail: str = "Invalid or expired token") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_current_user(request: Request) -> AuthUser:
    authorization = request.headers.get("authorization")
    if not authorization:
        raise _auth_error("Missing authentication header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise _auth_error("Invalid authorization scheme")
    try:
        return await get_user_from_token(token)
    except ValueError as exc:
        raise _auth_error() from exc

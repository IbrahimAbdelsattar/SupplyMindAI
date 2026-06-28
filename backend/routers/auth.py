"""Authentication API backed by the application database."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Response

from pydantic import BaseModel

from backend.knowledge.auth import (
    AuthResponse as ServiceAuthResponse,
    AuthUser,
    delete_user,
    get_user_from_token,
    is_auth_available,
    refresh_session,
    reset_password,
    signout,
    update_password,
    update_user_metadata,
)


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# Manual username/password auth request bodies intentionally removed.



class RefreshRequest(BaseModel):
    refresh_token: str


class UpdateMetadataRequest(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None


class UpdatePasswordRequest(BaseModel):
    new_password: str


class ResetPasswordRequest(BaseModel):
    email: str


class AuthResponse(BaseModel):
    user: dict[str, Any]
    session: Optional[dict[str, Any]] = None
    access_token: str
    refresh_token: Optional[str] = None
    message: str = "Success"


def _response(result: ServiceAuthResponse, message: str) -> AuthResponse:
    public_user = {
        "id": result.user.id,
        "name": result.user.user_metadata.get("name", ""),
        "email": result.user.email,
        "role": result.user.role,
    }
    return AuthResponse(
        user=public_user,
        session=result.session,
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        message=message,
    )


def _bearer(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    return parts[1]


async def get_current_user(authorization: str | None) -> AuthUser:
    try:
        return await get_user_from_token(_bearer(authorization))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


# Manual username/password authentication endpoints intentionally removed.



@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: RefreshRequest) -> AuthResponse:
    try:
        return _response(await refresh_session(request.refresh_token), "Session refreshed")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Failed to refresh session") from exc





@router.get("/me")

async def current_user_info(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = await get_current_user(authorization)
    return {"user": user.model_dump(), "message": "User information retrieved"}


@router.post("/signout", status_code=204, response_class=Response)
async def signout_user(authorization: str | None = Header(default=None)) -> Response:
    await signout(_bearer(authorization))
    return Response(status_code=204)


@router.put("/me/metadata")
async def update_user_info(
    request: UpdateMetadataRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = await update_user_metadata(_bearer(authorization), request.model_dump(exclude_none=True))
    return {"user": user.model_dump(), "message": "Profile updated successfully"}


@router.post("/password/reset")
async def reset_user_password(request: ResetPasswordRequest) -> dict[str, str]:
    await reset_password(request.email)
    return {"message": "If the account exists, password reset instructions will be sent."}


@router.post("/password/update")
async def update_user_password(
    request: UpdatePasswordRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    try:
        user = await update_password(_bearer(authorization), request.new_password)
        return {"user": user.model_dump(), "message": "Password updated successfully"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/me")
async def delete_user_account(
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    await delete_user(_bearer(authorization))
    return {"message": "User account deleted successfully"}


@router.get("/health")
async def auth_health() -> dict[str, Any]:
    available = is_auth_available()
    return {
        "status": "healthy" if available else "unavailable",
        "authentication_available": available,
        "message": "Authentication service is available" if available else "Authentication unavailable",
    }


@router.get("/debug_users")
async def debug_users() -> dict[str, Any]:
    from backend.db import SessionLocal, User
    from sqlalchemy import select
    from backend.knowledge.auth import AUTHORIZED_EMAILS

    users_list = []
    try:
        with SessionLocal() as db:
            users = db.scalars(select(User)).all()
            for u in users:
                users_list.append({
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "role": u.role,
                    "is_active": u.is_active,
                    "password_hash_len": len(u.password_hash) if u.password_hash else 0
                })
        db_status = "connected"
        error = None
    except Exception as e:
        db_status = "error"
        error = str(e)

    return {
        "db_status": db_status,
        "db_error": error,
        "authorized_emails_in_memory": list(AUTHORIZED_EMAILS),
        "users_in_db": users_list
    }

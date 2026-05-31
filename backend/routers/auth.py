"""Authentication router — Supabase-powered authentication endpoints."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status, Depends, Response
from pydantic import BaseModel

from backend.knowledge.auth import (
    signup_with_email,
    signin_with_email,
    get_user_from_token,
    refresh_session,
    signout,
    update_user_metadata,
    reset_password,
    update_password,
    delete_user,
    AuthUser,
    is_supabase_auth_available,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ─────────────────────────────────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    """User signup request."""
    email: str
    password: str
    name: Optional[str] = None
    company: Optional[str] = None


class SigninRequest(BaseModel):
    """User signin request."""
    email: str
    password: str


class RefreshRequest(BaseModel):
    """Session refresh request."""
    refresh_token: str


class UpdateMetadataRequest(BaseModel):
    """User metadata update request."""
    name: Optional[str] = None
    company: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict[str, Any]] = None


class UpdatePasswordRequest(BaseModel):
    """Password update request."""
    new_password: str


class ResetPasswordRequest(BaseModel):
    """Password reset request."""
    email: str


class AuthResponse(BaseModel):
    """Authentication response."""
    user: dict[str, Any]
    session: Optional[dict[str, Any]] = None
    access_token: str
    refresh_token: Optional[str] = None
    message: str = "Success"


# ─────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────

async def verify_auth_configured() -> None:
    """Verify that Supabase authentication is configured."""
    if not is_supabase_auth_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available. Please configure Supabase."
        )


async def get_current_user(authorization: str = None) -> AuthUser:
    """Extract and validate user from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authorization scheme")
        
        user = await get_user_from_token(token)
        return user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


# ─────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest) -> AuthResponse:
    """Sign up new user with email and password."""
    await verify_auth_configured()
    
    try:
        # Prepare metadata
        metadata = {}
        if request.name:
            metadata["name"] = request.name
        if request.company:
            metadata["company"] = request.company
        
        # Sign up user
        auth_response = await signup_with_email(
            email=request.email,
            password=request.password,
            metadata=metadata
        )
        
        return AuthResponse(
            user=auth_response.user.model_dump(),
            session=auth_response.session,
            access_token=auth_response.access_token,
            refresh_token=auth_response.refresh_token,
            message="Signup successful. Please check your email to confirm."
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.post("/signin", response_model=AuthResponse)
async def signin(request: SigninRequest) -> AuthResponse:
    """Sign in user with email and password."""
    await verify_auth_configured()
    
    try:
        auth_response = await signin_with_email(
            email=request.email,
            password=request.password
        )
        
        return AuthResponse(
            user=auth_response.user.model_dump(),
            session=auth_response.session,
            access_token=auth_response.access_token,
            refresh_token=auth_response.refresh_token,
            message="Signin successful"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc)
        )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: RefreshRequest) -> AuthResponse:
    """Refresh user session with refresh token."""
    await verify_auth_configured()
    
    try:
        auth_response = await refresh_session(request.refresh_token)
        
        return AuthResponse(
            user=auth_response.user.model_dump(),
            session=auth_response.session,
            access_token=auth_response.access_token,
            refresh_token=auth_response.refresh_token,
            message="Session refreshed"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh session"
        )


@router.get("/me")
async def get_current_user_info(
    authorization: str = None,
) -> dict[str, Any]:
    """Get current user information."""
    await verify_auth_configured()
    
    try:
        user = await get_current_user(authorization)
        return {
            "user": user.model_dump(),
            "message": "User information retrieved"
        }
    except HTTPException:
        raise


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def signout_user(authorization: str = None) -> Response:
    """Sign out current user."""
    await verify_auth_configured()
    
    try:
        user = await get_current_user(authorization)
        await signout(authorization)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise


@router.put("/me/metadata")
async def update_user_info(
    request: UpdateMetadataRequest,
    authorization: str = None,
) -> dict[str, Any]:
    """Update current user's metadata (profile)."""
    await verify_auth_configured()
    
    try:
        user = await get_current_user(authorization)
        
        # Build metadata dict
        metadata = {}
        if request.name:
            metadata["name"] = request.name
        if request.company:
            metadata["company"] = request.company
        if request.avatar_url:
            metadata["avatar_url"] = request.avatar_url
        if request.preferences:
            metadata["preferences"] = request.preferences
        
        updated_user = await update_user_metadata(authorization, metadata)
        
        return {
            "user": updated_user.model_dump(),
            "message": "Profile updated successfully"
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.post("/password/reset")
async def reset_user_password(request: ResetPasswordRequest) -> dict[str, str]:
    """Request password reset email."""
    await verify_auth_configured()
    
    try:
        await reset_password(request.email)
        return {
            "message": "Password reset email sent. Check your inbox."
        }
    except Exception as exc:
        # Don't expose actual error to user
        return {
            "message": "If account exists, password reset email will be sent."
        }


@router.post("/password/update")
async def update_user_password(
    request: UpdatePasswordRequest,
    authorization: str = None,
) -> dict[str, Any]:
    """Update user's password."""
    await verify_auth_configured()
    
    try:
        user = await get_current_user(authorization)
        updated_user = await update_password(authorization, request.new_password)
        
        return {
            "user": updated_user.model_dump(),
            "message": "Password updated successfully"
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.delete("/me")
async def delete_user_account(
    authorization: str = None,
) -> dict[str, str]:
    """Delete user account (irreversible)."""
    await verify_auth_configured()
    
    try:
        user = await get_current_user(authorization)
        await delete_user(authorization)
        
        return {
            "message": "User account deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )


@router.get("/health")
async def auth_health() -> dict[str, Any]:
    """Check authentication service health."""
    is_available = is_supabase_auth_available()
    
    return {
        "status": "healthy" if is_available else "unavailable",
        "authentication_available": is_available,
        "message": "Authentication service is available" if is_available else "Authentication not configured"
    }

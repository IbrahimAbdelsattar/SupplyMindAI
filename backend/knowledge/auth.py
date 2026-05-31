"""Supabase Authentication Manager — handles user auth and session management."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Any, Optional

from pydantic import BaseModel

LOGGER = logging.getLogger(__name__)


class AuthUser(BaseModel):
    """Supabase authenticated user."""
    id: str
    email: str
    user_metadata: dict[str, Any] = {}
    app_metadata: dict[str, Any] = {}
    created_at: str
    updated_at: str
    last_sign_in_at: Optional[str] = None
    
    @property
    def role(self) -> str:
        """Extract role from app_metadata."""
        return self.app_metadata.get("role", "analyst")


class AuthResponse(BaseModel):
    """Authentication response."""
    user: AuthUser
    session: dict[str, Any]
    access_token: str
    refresh_token: Optional[str] = None


@lru_cache(maxsize=1)
def get_supabase_auth_client() -> Any:
    """Get Supabase client configured for authentication."""
    try:
        from supabase import create_client
        import os
        
        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
        
        if not supabase_url or not supabase_anon_key:
            LOGGER.warning("Supabase auth not configured (missing URL or ANON_KEY)")
            return None
            
        return create_client(supabase_url, supabase_anon_key)
    except Exception as exc:
        LOGGER.exception("Failed to initialize Supabase auth client: %s", exc)
        return None


def is_supabase_auth_available() -> bool:
    """Check if Supabase authentication is available."""
    return get_supabase_auth_client() is not None


async def signup_with_email(email: str, password: str, metadata: dict[str, Any] | None = None) -> AuthResponse:
    """Sign up a new user with email and password.
    
    Args:
        email: User email address
        password: User password (min 8 chars)
        metadata: Optional user metadata (name, company, etc.)
    
    Returns:
        AuthResponse with user and session info
        
    Raises:
        ValueError: If email already exists or password too weak
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        user_metadata = metadata or {}
        
        response = client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": user_metadata,
                "redirect_to": f"{client.base_url}/auth/callback"
            }
        })
        
        if not response.user:
            raise ValueError("Failed to create user")
        
        user = AuthUser(**response.user.model_dump())
        session_data = response.session.model_dump() if response.session else {}
        
        LOGGER.info(f"User signed up: {email}")
        
        return AuthResponse(
            user=user,
            session=session_data,
            access_token=session_data.get("access_token", ""),
            refresh_token=session_data.get("refresh_token")
        )
    except Exception as exc:
        LOGGER.error(f"Signup failed for {email}: {exc}")
        raise ValueError(f"Signup failed: {str(exc)}")


async def signin_with_email(email: str, password: str) -> AuthResponse:
    """Sign in user with email and password.
    
    Args:
        email: User email address
        password: User password
    
    Returns:
        AuthResponse with user and session info
        
    Raises:
        ValueError: If credentials invalid
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        response = client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not response.user:
            raise ValueError("Invalid credentials")
        
        user = AuthUser(**response.user.model_dump())
        session_data = response.session.model_dump() if response.session else {}
        
        LOGGER.info(f"User signed in: {email}")
        
        return AuthResponse(
            user=user,
            session=session_data,
            access_token=session_data.get("access_token", ""),
            refresh_token=session_data.get("refresh_token")
        )
    except Exception as exc:
        LOGGER.error(f"Signin failed for {email}: {exc}")
        raise ValueError("Invalid email or password")


async def get_user_from_token(access_token: str) -> AuthUser:
    """Get user information from access token.
    
    Args:
        access_token: JWT access token from Supabase
    
    Returns:
        AuthUser information
        
    Raises:
        ValueError: If token invalid or expired
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        response = client.auth.get_user(access_token)
        
        if not response:
            raise ValueError("Invalid token")
        
        user = AuthUser(**response.model_dump())
        return user
    except Exception as exc:
        LOGGER.error(f"Failed to get user from token: {exc}")
        raise ValueError("Invalid or expired token")


async def refresh_session(refresh_token: str) -> AuthResponse:
    """Refresh user session with refresh token.
    
    Args:
        refresh_token: Refresh token from previous session
    
    Returns:
        AuthResponse with new tokens
        
    Raises:
        ValueError: If refresh token invalid
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        response = client.auth.refresh_session({
            "refresh_token": refresh_token
        })
        
        if not response.user:
            raise ValueError("Failed to refresh session")
        
        user = AuthUser(**response.user.model_dump())
        session_data = response.session.model_dump() if response.session else {}
        
        return AuthResponse(
            user=user,
            session=session_data,
            access_token=session_data.get("access_token", ""),
            refresh_token=session_data.get("refresh_token")
        )
    except Exception as exc:
        LOGGER.error(f"Session refresh failed: {exc}")
        raise ValueError("Failed to refresh session")


async def signout(access_token: str) -> None:
    """Sign out user and invalidate session.
    
    Args:
        access_token: User's access token
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        client.auth.sign_out()
        LOGGER.info("User signed out")
    except Exception as exc:
        LOGGER.error(f"Signout failed: {exc}")
        raise ValueError("Failed to sign out")


async def update_user_metadata(access_token: str, metadata: dict[str, Any]) -> AuthUser:
    """Update user metadata.
    
    Args:
        access_token: User's access token
        metadata: Metadata to update
    
    Returns:
        Updated AuthUser
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        response = client.auth.update_user(
            {"user_metadata": metadata},
            access_token
        )
        
        if not response:
            raise ValueError("Failed to update metadata")
        
        user = AuthUser(**response.model_dump())
        return user
    except Exception as exc:
        LOGGER.error(f"Failed to update user metadata: {exc}")
        raise ValueError("Failed to update profile")


async def reset_password(email: str) -> None:
    """Request password reset for user.
    
    Args:
        email: User email address
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        client.auth.reset_password_for_email(
            email,
            options={"redirect_to": f"{client.base_url}/auth/reset"}
        )
        LOGGER.info(f"Password reset email sent to {email}")
    except Exception as exc:
        LOGGER.error(f"Failed to send password reset: {exc}")
        # Don't expose error to user
        pass


async def update_password(access_token: str, new_password: str) -> AuthUser:
    """Update user password.
    
    Args:
        access_token: User's access token
        new_password: New password
    
    Returns:
        Updated AuthUser
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        response = client.auth.update_user(
            {"password": new_password},
            access_token
        )
        
        if not response:
            raise ValueError("Failed to update password")
        
        user = AuthUser(**response.model_dump())
        return user
    except Exception as exc:
        LOGGER.error(f"Failed to update password: {exc}")
        raise ValueError("Failed to update password")


async def delete_user(access_token: str) -> None:
    """Delete user account.
    
    Args:
        access_token: User's access token
    """
    client = get_supabase_auth_client()
    if not client:
        raise ValueError("Supabase authentication not configured")
    
    try:
        # First, delete user's data
        # Then delete user account
        client.auth.admin.delete_user(access_token)
        LOGGER.info(f"User account deleted")
    except Exception as exc:
        LOGGER.error(f"Failed to delete user: {exc}")
        raise ValueError("Failed to delete account")

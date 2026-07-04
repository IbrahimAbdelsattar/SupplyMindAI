"""Auth admin router — user management endpoints.

Endpoints:
  - GET  /auth/admin/users        — List all users (admin/manager)
  - GET  /auth/admin/users/me     — Get current user profile
  - POST /auth/admin/users        — Create/invite a user (admin)
  - PATCH /auth/admin/users/{id}  — Update user role/status (admin)
  - DELETE /auth/admin/users/{id} — Deactivate user (admin)
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from backend.auth.dependencies import get_current_user, require_role
from backend.auth.domain import extract_domain, is_valid_domain, ALLOWED_DOMAIN
from backend.auth.rbac import Role, ROLE_PERMISSIONS, Permission
from backend.auth.audit import (
    log_user_created,
    log_user_deactivated,
    log_role_changed,
)
from backend.db import get_db, User
from backend.knowledge.auth import AuthUser

router = APIRouter(prefix="/auth/admin", tags=["Auth Admin"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str
    department: Optional[str] = None
    is_active: bool
    clerk_user_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str
    role: str = "analyst"
    department: Optional[str] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    users: list[UserProfile]
    total: int


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: AuthUser = Depends(get_current_user),
):
    """Return the current user's profile from the DB."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found in database")
        return _user_to_profile(user)
    finally:
        db.close()


@router.get("/users", response_model=UserListResponse)
async def list_users(
    current_user: AuthUser = Depends(require_role(Role.MANAGER)),
):
    """List all users. Requires manager or admin role."""
    db = next(get_db())
    try:
        users = db.query(User).order_by(User.created_at.desc()).all()
        return UserListResponse(
            users=[_user_to_profile(u) for u in users],
            total=len(users),
        )
    finally:
        db.close()


@router.post("/users", response_model=UserProfile, status_code=201)
async def create_user(
    req: UserCreateRequest,
    current_user: AuthUser = Depends(require_role(Role.ADMIN)),
):
    """Create a new user. Only admins can create users.

    The user will be created as active with the specified role.
    They can then sign in via Clerk with their @supplymind.tech email.
    """
    # Domain validation
    domain = extract_domain(req.email)
    if not domain or not is_valid_domain(req.email):
        raise HTTPException(
            status_code=400,
            detail=f"Only @{ALLOWED_DOMAIN} emails are permitted. Got: {req.email}",
        )

    # Role validation
    valid_roles = [r.value for r in Role]
    if req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{req.role}'. Must be one of: {valid_roles}",
        )

    db = next(get_db())
    try:
        # Check for duplicate email
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"User with email {req.email} already exists",
            )

        now = datetime.now(timezone.utc)
        new_user = User(
            id=f"manual_{req.email.split('@')[0]}_{int(now.timestamp())}",
            email=req.email,
            name=req.name,
            role=req.role,
            department=req.department,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        log_user_created(
            admin_id=current_user.id,
            new_user_id=new_user.id,
            email=req.email,
            role=req.role,
        )

        return _user_to_profile(new_user)
    finally:
        db.close()


@router.patch("/users/{user_id}", response_model=UserProfile)
async def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_user: AuthUser = Depends(require_role(Role.ADMIN)),
):
    """Update a user's role, department, or active status."""
    valid_roles = [r.value for r in Role]
    if req.role and req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role '{req.role}'. Must be one of: {valid_roles}",
        )

    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Prevent self-demotion below manager (safety)
        if user.id == current_user.id and req.role and req.role not in ("admin", "manager"):
            raise HTTPException(
                status_code=400,
                detail="Cannot set your own role below manager",
            )

        old_role = user.role

        if req.name is not None:
            user.name = req.name
        if req.role is not None:
            user.role = req.role
        if req.department is not None:
            user.department = req.department
        if req.is_active is not None:
            user.is_active = req.is_active

        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)

        if req.role and req.role != old_role:
            log_role_changed(
                admin_id=current_user.id,
                target_user_id=user_id,
                old_role=old_role,
                new_role=req.role,
            )

        return _user_to_profile(user)
    finally:
        db.close()


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: str,
    current_user: AuthUser = Depends(require_role(Role.ADMIN)),
):
    """Soft-deactivate a user (sets is_active=False)."""
    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.id == current_user.id:
            raise HTTPException(
                status_code=400,
                detail="Cannot deactivate your own account",
            )

        user.is_active = False
        user.updated_at = datetime.now(timezone.utc)
        db.commit()

        log_user_deactivated(
            admin_id=current_user.id,
            target_user_id=user_id,
            email=user.email,
        )
    finally:
        db.close()


@router.get("/roles")
async def list_roles(
    current_user: AuthUser = Depends(get_current_user),
):
    """List available roles and their permissions."""
    return {
        "roles": [
            {
                "name": role.value,
                "permissions": sorted(ROLE_PERMISSIONS[role]),
            }
            for role in Role
        ]
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _user_to_profile(user: User) -> UserProfile:
    return UserProfile(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        department=user.department,
        is_active=user.is_active,
        clerk_user_id=user.clerk_user_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr

from backend.auth.audit import log_login_failure, log_login_success
from backend.auth.dependencies import _get_client_ip, _utc_now, get_current_user
from backend.auth.passwords import verify_password, hash_password
from backend.auth.tokens import create_access_token, create_refresh_token, decode_token
from backend.db import User, RefreshToken, get_db
from backend.guardrails.rate_limiter import RateLimiter
from backend.knowledge.auth import AuthUser

logger = logging.getLogger("backend.routers.login")

router = APIRouter(prefix="/auth", tags=["Auth"])
rate_limiter = RateLimiter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
def login(request: Request, response: Response, payload: LoginRequest):
    ip = _get_client_ip(request)
    
    # Check rate limit before processing
    rl_result = rate_limiter.check(ip=ip, endpoint="login")
    if not rl_result.passed:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again shortly.")

    db = next(get_db())
    try:
        user = db.query(User).filter(User.email == payload.email).first()
        now = _utc_now()

        if user and user.locked_until and user.locked_until > now:
            raise HTTPException(
                status_code=423, 
                detail="Account temporarily locked due to repeated failed logins. Try again later."
            )

        if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = now + timedelta(minutes=15)
                db.commit()
            
            log_login_failure("Invalid email or password", email=payload.email, ip_address=ip)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account has been deactivated. Contact an administrator.")

        # Success - reset lockouts
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = now

        access_token = create_access_token(user)
        raw_refresh, refresh_hash, refresh_expires_at = create_refresh_token(user)

        user_agent = request.headers.get("User-Agent")
        new_rt = RefreshToken(
            id=raw_refresh.split(".")[1][-36:] if len(raw_refresh) > 36 else "rt-" + str(now.timestamp()), # generate an id, not strict format needed
            user_id=user.id,
            token_hash=refresh_hash,
            is_revoked=False,
            expires_at=refresh_expires_at,
            created_at=now,
            user_agent=user_agent[:255] if user_agent else None,
            ip_address=ip[:64]
        )
        # Fix id for refresh token
        import uuid
        new_rt.id = str(uuid.uuid4())

        db.add(new_rt)
        db.commit()

        response.set_cookie(
            key="refresh_token",
            value=raw_refresh,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/auth",
            max_age=int((refresh_expires_at - now).total_seconds()),
        )

        log_login_success(user.id, user.email, user.role, ip_address=ip)

        return {
            "access_token": access_token,
            "refresh_token": raw_refresh,
            "token_type": "bearer",
            "expires_in": 15 * 60,
            "must_change_password": user.must_change_password,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role
            }
        }
    finally:
        db.close()


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


@router.post("/refresh")
def refresh_token(request: Request, response: Response, payload: RefreshRequest | None = None):
    # Accept refresh token from JSON body (preferred) or cookie (fallback)
    raw_refresh = None
    if payload and payload.refresh_token:
        raw_refresh = payload.refresh_token
    else:
        raw_refresh = request.cookies.get("refresh_token")

    if not raw_refresh:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        claims = decode_token(raw_refresh, expected_type="refresh")
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    token_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
    
    db = next(get_db())
    try:
        rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if not rt or rt.is_revoked or rt.expires_at < _utc_now():
            raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

        user = db.query(User).filter(User.id == rt.user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="User inactive or deleted")

        # Refresh token rotation
        rt.is_revoked = True
        
        now = _utc_now()
        access_token = create_access_token(user)
        new_raw_refresh, new_refresh_hash, new_refresh_expires_at = create_refresh_token(user)

        import uuid
        new_rt = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user.id,
            token_hash=new_refresh_hash,
            is_revoked=False,
            expires_at=new_refresh_expires_at,
            created_at=now,
            user_agent=rt.user_agent,
            ip_address=_get_client_ip(request)[:64]
        )
        db.add(new_rt)
        db.commit()

        response.set_cookie(
            key="refresh_token",
            value=new_raw_refresh,
            httponly=True,
            secure=True,
            samesite="lax",
            path="/auth",
            max_age=int((new_refresh_expires_at - now).total_seconds()),
        )

        return {
            "access_token": access_token,
            "refresh_token": new_raw_refresh,
            "token_type": "bearer",
            "expires_in": 15 * 60
        }
    finally:
        db.close()


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


@router.post("/logout")
def logout(request: Request, response: Response, payload: LogoutRequest | None = None):
    # Accept refresh token from JSON body (preferred) or cookie (fallback)
    raw_refresh = None
    if payload and payload.refresh_token:
        raw_refresh = payload.refresh_token
    else:
        raw_refresh = request.cookies.get("refresh_token")

    if raw_refresh:
        token_hash = hashlib.sha256(raw_refresh.encode("utf-8")).hexdigest()
        db = next(get_db())
        try:
            rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
            if rt:
                rt.is_revoked = True
                db.commit()
        finally:
            db.close()

    response.delete_cookie("refresh_token", path="/auth")
    return {"success": True}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest, 
    auth_user: AuthUser = Depends(get_current_user)
):
    if len(payload.new_password) < 10:
        raise HTTPException(status_code=400, detail="New password must be at least 10 characters long")

    db = next(get_db())
    try:
        user = db.query(User).filter(User.id == auth_user.id).first()
        if not user or not user.password_hash or not verify_password(payload.current_password, user.password_hash):
            raise HTTPException(status_code=400, detail="Incorrect current password")

        user.password_hash = hash_password(payload.new_password)
        user.must_change_password = False

        # Revoke ALL existing refresh tokens for this user (forcing global re-login)
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id,
            RefreshToken.is_revoked == False
        ).update({"is_revoked": True})
        
        db.commit()
        return {"success": True}
    finally:
        db.close()

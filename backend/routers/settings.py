from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

logger = logging.getLogger(__name__)

from backend.db import SessionLocal, User, UserSettings
from backend.dependencies import _get_current_user, _utc_now
from backend.schemas.settings import UserSettingsPayload

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _uid(user) -> str:
    return user.id if hasattr(user, "id") else user["id"]


def _attr(user, key, default=None):
    """Get attribute from AuthUser dataclass or dict."""
    if hasattr(user, key):
        return getattr(user, key, default)
    return user.get(key, default) if isinstance(user, dict) else default


@router.get("")
def get_settings(user=Depends(_get_current_user)):
    uid = _uid(user)
    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == uid).first()
        return {"settings": row.settings_json if row else {}}
    finally:
        db.close()


@router.put("")
def save_settings(payload: UserSettingsPayload, user=Depends(_get_current_user)):
    uid = _uid(user)
    try:
        new_settings = payload.model_dump(exclude_none=True)
    except AttributeError:
        new_settings = payload.dict(exclude_none=True)

    db = SessionLocal()
    try:
        local_user = db.query(User).filter(User.id == uid).first()
        if not local_user:
            meta = _attr(user, "user_metadata", {})
            app_meta = _attr(user, "app_metadata", {})
            email = _attr(user, "email") or f"{uid}@supplymind.ai"
            local_user = User(
                id=uid,
                name=meta.get("name", email.split("@")[0]),
                email=email,
                role=app_meta.get("role", "admin"),
                is_active=True,
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            db.add(local_user)
            db.flush()

        row = db.query(UserSettings).filter(UserSettings.user_id == uid).first()
        if row:
            merged = {**(row.settings_json or {}), **new_settings}
            row.settings_json = merged
        else:
            row = UserSettings(user_id=uid, settings_json=new_settings)
            db.add(row)
        db.commit()
        return {"status": "ok", "settings": new_settings}
    except Exception as exc:
        db.rollback()
        logger.warning("Settings save failed (likely offline): %s", exc)
        return {"status": "offline", "settings": new_settings}
    finally:
        db.close()

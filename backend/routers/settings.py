from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

logger = logging.getLogger(__name__)

from backend.db import SessionLocal, User, UserSettings
from backend.dependencies import _get_current_user, _utc_now
from backend.schemas.settings import UserSettingsPayload

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("")
def get_settings(user: dict = Depends(_get_current_user)):
    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == user["id"]).first()
        return {"settings": row.settings_json if row else {}}
    finally:
        db.close()


@router.put("")
def save_settings(payload: UserSettingsPayload, user: dict = Depends(_get_current_user)):
    try:
        new_settings = payload.model_dump(exclude_none=True)
    except AttributeError:
        new_settings = payload.dict(exclude_none=True)

    db = SessionLocal()
    try:
        local_user = db.query(User).filter(User.id == user["id"]).first()
        if not local_user:
            local_user = User(
                id=user["id"],
                name=user["user_metadata"].get("name", (user.get("email") or user["id"]).split("@")[0]),
                email=user.get("email") or f"{user['id']}@supplymind.ai",
                role=user["app_metadata"].get("role", "admin"),
                is_active=True,
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            db.add(local_user)
            db.flush()

        row = db.query(UserSettings).filter(UserSettings.user_id == user["id"]).first()
        if row:
            merged = {**(row.settings_json or {}), **new_settings}
            row.settings_json = merged
        else:
            row = UserSettings(user_id=user["id"], settings_json=new_settings)
            db.add(row)
        db.commit()
        return {"status": "ok", "settings": new_settings}
    except Exception as exc:
        db.rollback()
        logger.warning("Settings save failed (likely offline): %s", exc)
        return {"status": "offline", "settings": new_settings}
    finally:
        db.close()

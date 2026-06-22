from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import _get_current_user, _utc_now
from backend.db import SessionLocal, UserSettings
from backend.knowledge.auth import AuthUser
from backend.schemas.settings import UserSettingsPayload

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("")
def get_settings(user: AuthUser = Depends(_get_current_user)):
    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()
        if row:
            return {"settings": row.settings_json}
        return {"settings": {}}
    finally:
        db.close()


@router.put("")
def save_settings(payload: UserSettingsPayload, user: AuthUser = Depends(_get_current_user)):
    from loguru import logger

    try:
        new_settings = payload.model_dump(exclude_none=True)
    except AttributeError:
        new_settings = payload.dict(exclude_none=True)

    db = SessionLocal()
    try:
        row = db.query(UserSettings).filter(UserSettings.user_id == str(user.id)).first()

        if row:
            merged = {**(row.settings_json or {}), **new_settings}
            row.settings_json = merged
            row.updated_at = _utc_now()
        else:
            merged = new_settings
            row = UserSettings(
                id=str(uuid.uuid4()),
                user_id=str(user.id),
                settings_json=merged,
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            db.add(row)

        db.commit()
        return {"settings": merged, "message": "Settings saved"}
    except Exception as exc:
        db.rollback()
        logger.error("save_settings error for user %s: %s", user.id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save settings") from exc
    finally:
        db.close()

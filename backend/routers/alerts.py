from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.dependencies import _get_current_user

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get("/")
def list_alerts(user: dict = Depends(_get_current_user)):
    return {"alerts": []}


@router.get("/{alert_id}")
def get_alert(alert_id: str, user: dict = Depends(_get_current_user)):
    return {"id": alert_id, "severity": "info", "message": "Alert stub — implement with real alerting logic."}

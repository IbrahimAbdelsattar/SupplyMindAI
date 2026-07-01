import sys; sys.path.insert(0, 'D:/SupplyMindAI')
from backend.db import SessionLocal, User, UserSettings
from backend.dependencies import _utc_now
import uuid, traceback

db = SessionLocal()
try:
    user = {"id": "public", "email": "public@example.com", "user_metadata": {}, "app_metadata": {}}
    new_settings = {"theme": "dark", "display": {"currency": "USD"}}

    local_user = db.query(User).filter(User.id == user["id"]).first()
    print("Existing user:", local_user)

    if not local_user:
        local_user = User(
            id=user["id"],
            name=user["user_metadata"].get("name", user["email"].split("@")[0]),
            email=user["email"],
            role=user["app_metadata"].get("role", "admin"),
            is_active=True,
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        db.add(local_user)
        db.flush()
        print("Created user")

    row = db.query(UserSettings).filter(UserSettings.user_id == user["id"]).first()
    print("Existing settings:", row)

    if row:
        merged = {**(row.settings_json or {}), **new_settings}
        row.settings_json = merged
        row.updated_at = _utc_now()
    else:
        merged = new_settings
        row = UserSettings(
            id=str(uuid.uuid4()),
            user_id=user["id"],
            settings_json=merged,
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        db.add(row)

    db.commit()
    print("SUCCESS:", merged)
except Exception as e:
    db.rollback()
    print("ERROR:", type(e).__name__)
    traceback.print_exc()
finally:
    db.close()

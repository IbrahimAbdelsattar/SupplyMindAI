"""Seed a default admin user for local development.

Usage:
    python -m backend.scripts.seed_admin

Creates an admin user if none exists with role >= manager.
Default credentials: admin@supplymind.tech / Admin1234!
"""

import sys
import uuid
from datetime import datetime, timezone

# Ensure project root is on sys.path when run directly
from pathlib import Path
_PROJECT_ROOT = str(Path(__file__).resolve().parents[2])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.db import engine, Base, User, SessionLocal  # noqa: E402
from backend.auth.passwords import hash_password  # noqa: E402

DEFAULT_EMAIL = "admin@supplymind.tech"
DEFAULT_PASSWORD = "Admin1234!"
DEFAULT_NAME = "Admin"
DEFAULT_ROLE = "admin"


def seed_admin():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
        if existing:
            print(f"[seed] Admin user already exists: {existing.email} (id={existing.id})")

            # Always ensure the password hash is updated to the working hashing scheme
            existing.password_hash = hash_password(DEFAULT_PASSWORD)
            existing.is_active = True
            db.commit()
            print("[seed] Updated admin password hash to active hashing algorithm")
            return

        now = datetime.now(timezone.utc)
        user = User(
            id=str(uuid.uuid4()),
            name=DEFAULT_NAME,
            email=DEFAULT_EMAIL,
            password_hash=hash_password(DEFAULT_PASSWORD),
            must_change_password=True,
            role=DEFAULT_ROLE,
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.commit()
        print(f"[seed] Created admin user: {DEFAULT_EMAIL} (id={user.id})")
        print(f"[seed] Default password: {DEFAULT_PASSWORD}")
        print("[seed] User must_change_password=True — they will be prompted to change on first login.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()

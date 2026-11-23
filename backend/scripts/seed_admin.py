"""Provision an initial admin from SUPPLYMIND_ADMIN_EMAIL and SUPPLYMIND_ADMIN_PASSWORD."""

import os
import uuid
from datetime import datetime, timezone

from backend.db import SessionLocal, User, create_tables
from backend.auth.domain import validate_domain_or_reject
from backend.auth.passwords import hash_password


def seed_admin() -> None:
    email = os.getenv("SUPPLYMIND_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("SUPPLYMIND_ADMIN_PASSWORD", "")
    if not email and not password:
        return

    validate_domain_or_reject(email)
    if len(password) < 12:
        raise ValueError("SUPPLYMIND_ADMIN_PASSWORD must be at least 12 characters")

    create_tables()
    with SessionLocal.begin() as db:
        if db.query(User).filter_by(email=email).first() is not None:
            return

        now = datetime.now(timezone.utc)
        db.add(User(
            id=str(uuid.uuid4()),
            name="Admin",
            email=email,
            role="admin",
            password_hash=hash_password(password),
            must_change_password=True,
            is_active=True,
            created_at=now,
            updated_at=now,
        ))


if __name__ == "__main__":
    seed_admin()

from __future__ import annotations

import argparse
import getpass
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from backend.db import SessionLocal, User, create_tables
from backend.knowledge.auth import PASSWORD_CONTEXT

VALID_ROLES = {"admin", "manager", "analyst", "viewer"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a SupplyMindAI user.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--role", choices=sorted(VALID_ROLES), default="analyst")
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")
    if len(password) < 12:
        raise SystemExit("Password must be at least 12 characters.")

    email = args.email.strip().lower()
    now = datetime.now(timezone.utc)
    create_tables()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                id=str(uuid.uuid4()),
                name=args.name.strip(),
                email=email,
                password_hash=PASSWORD_CONTEXT.hash(password),
                role=args.role,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
        else:
            user.name = args.name.strip()
            user.password_hash = PASSWORD_CONTEXT.hash(password)
            user.role = args.role
            user.is_active = True
            user.updated_at = now
        db.commit()
    print(f"Provisioned {email} with role {args.role}.")


if __name__ == "__main__":
    main()

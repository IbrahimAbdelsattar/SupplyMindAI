from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from sqlalchemy import select

from backend.db import SessionLocal, User, create_tables

VALID_ROLES = {"admin", "manager", "analyst", "viewer"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update a local SupplyMindAI user mapping linked to Clerk.")
    parser.add_argument("--email", required=True, help="User email address")
    parser.add_argument("--name", required=True, help="User display name")
    parser.add_argument("--clerk-id", required=True, help="The user's Clerk user ID (e.g., user_xxxxxxxx)")
    parser.add_argument("--role", choices=sorted(VALID_ROLES), default="analyst", help="User role")
    args = parser.parse_args()

    email = args.email.strip().lower()
    clerk_id = args.clerk_id.strip()
    if not clerk_id.startswith("user_"):
        print("Warning: Clerk user ID typically starts with 'user_'", file=sys.stderr)

    now = datetime.now(timezone.utc)
    create_tables()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.id == clerk_id))
        if user is None:
            # Also check if email exists to avoid unique constraint violations
            existing_email = db.scalar(select(User).where(User.email == email))
            if existing_email:
                raise SystemExit(f"Error: A user with email '{email}' already exists with ID '{existing_email.id}'.")

            user = User(
                id=clerk_id,
                name=args.name.strip(),
                email=email,
                role=args.role,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
            db.add(user)
            action = "Created"
        else:
            user.name = args.name.strip()
            user.email = email
            user.role = args.role
            user.is_active = True
            user.updated_at = now
            action = "Updated"
        db.commit()
    print(f"Successfully {action.lower()} local user mapping for {email} (Clerk ID: {clerk_id}, Role: {args.role}).")


if __name__ == "__main__":
    main()

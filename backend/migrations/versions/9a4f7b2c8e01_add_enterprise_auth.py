"""add enterprise auth columns and cleanup legacy

Revision ID: 9a4f7b2c8e01
Revises: 3390e1582a14
Create Date: 2026-07-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a4f7b2c8e01'
down_revision: Union[str, Sequence[str], None] = '3390e1582a14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column exists in a table (safe for SQLite + Postgres)."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    try:
        columns = [c["name"] for c in inspector.get_columns(table)]
        return column in columns
    except Exception:
        return False


def _table_exists(table: str) -> bool:
    """Check if a table exists."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table in inspector.get_table_names()


def upgrade() -> None:
    """Add enterprise auth columns, drop legacy password_hash and auth_sessions."""
    # 1. Add clerk_user_id column (nullable initially)
    if not _column_exists("users", "clerk_user_id"):
        op.add_column("users", sa.Column("clerk_user_id", sa.String(64), nullable=True))
        op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)

    # 2. Add department column
    if not _column_exists("users", "department"):
        op.add_column("users", sa.Column("department", sa.String(64), nullable=True))

    # 3. Drop password_hash if it exists (legacy from initial migration)
    if _column_exists("users", "password_hash"):
        op.drop_column("users", "password_hash")

    # 4. Drop auth_sessions table if it exists (legacy)
    if _table_exists("auth_sessions"):
        op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
        op.drop_table("auth_sessions")


def downgrade() -> None:
    """Reverse enterprise auth changes."""
    # Re-create auth_sessions
    if not _table_exists("auth_sessions"):
        op.create_table(
            "auth_sessions",
            sa.Column("id", sa.String(36), nullable=False),
            sa.Column("user_id", sa.String(36), nullable=False),
            sa.Column("refresh_token_hash", sa.String(64), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    # Re-create password_hash
    if not _column_exists("users", "password_hash"):
        op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))

    # Drop new columns
    if _column_exists("users", "department"):
        op.drop_column("users", "department")
    if _column_exists("users", "clerk_user_id"):
        op.drop_index("ix_users_clerk_user_id", table_name="users")
        op.drop_column("users", "clerk_user_id")

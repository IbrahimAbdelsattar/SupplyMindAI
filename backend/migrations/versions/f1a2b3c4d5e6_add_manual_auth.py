"""add manual auth columns and refresh tokens

Revision ID: f1a2b3c4d5e6
Revises: 9a4f7b2c8e01
Create Date: 2026-07-10 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = '9a4f7b2c8e01'
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
    """Add manual auth columns and refresh_tokens table."""
    # 1. Add manual auth columns to users table
    if not _column_exists("users", "password_hash"):
        op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))
    if not _column_exists("users", "must_change_password"):
        op.add_column("users", sa.Column("must_change_password", sa.Boolean(), server_default="1", nullable=False))
    if not _column_exists("users", "last_login_at"):
        op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    if not _column_exists("users", "failed_login_attempts"):
        op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False))
    if not _column_exists("users", "locked_until"):
        op.add_column("users", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))

    # 2. Create refresh_tokens table
    if not _table_exists("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.String(36), nullable=False),
            sa.Column("user_id", sa.String(36), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("user_agent", sa.String(255), nullable=True),
            sa.Column("ip_address", sa.String(64), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
        op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])


def downgrade() -> None:
    """Reverse manual auth changes."""
    # Drop refresh_tokens table
    if _table_exists("refresh_tokens"):
        op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
        op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
        op.drop_table("refresh_tokens")

    # Drop new columns from users table
    if _column_exists("users", "locked_until"):
        op.drop_column("users", "locked_until")
    if _column_exists("users", "failed_login_attempts"):
        op.drop_column("users", "failed_login_attempts")
    if _column_exists("users", "last_login_at"):
        op.drop_column("users", "last_login_at")
    if _column_exists("users", "must_change_password"):
        op.drop_column("users", "must_change_password")
    if _column_exists("users", "password_hash"):
        op.drop_column("users", "password_hash")

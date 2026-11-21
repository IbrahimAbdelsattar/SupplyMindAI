"""Add raw material stock balances.

Revision ID: 62a8b4c3d16e
Revises: f1a2b3c4d5e6
"""

import sqlalchemy as sa
from alembic import context, op

revision = "62a8b4c3d16e"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not context.is_offline_mode() and sa.inspect(op.get_bind()).has_table("raw_material_stock"):
        return
    op.create_table(
        "raw_material_stock",
        sa.Column("material_id", sa.String(50), primary_key=True),
        sa.Column("on_hand", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("on_hand >= 0", name="ck_raw_material_stock_on_hand"),
    )


def downgrade() -> None:
    op.drop_table("raw_material_stock")

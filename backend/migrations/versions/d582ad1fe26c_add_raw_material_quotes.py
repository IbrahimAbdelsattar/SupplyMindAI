"""Store supplier quotes used in production planning."""

from alembic import context, op
import sqlalchemy as sa

revision = "d582ad1fe26c"
down_revision = "62a8b4c3d16e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if not context.is_offline_mode() and sa.inspect(op.get_bind()).has_table("raw_material_quotes"):
        return
    op.create_table(
        "raw_material_quotes",
        sa.Column("material_id", sa.String(50), primary_key=True),
        sa.Column("supplier_name", sa.String(120), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("lead_time_days", sa.Integer(), nullable=False),
        sa.CheckConstraint("unit_price >= 0", name="ck_raw_material_quotes_unit_price"),
        sa.CheckConstraint("lead_time_days >= 0", name="ck_raw_material_quotes_lead_time"),
    )


def downgrade() -> None:
    op.drop_table("raw_material_quotes")

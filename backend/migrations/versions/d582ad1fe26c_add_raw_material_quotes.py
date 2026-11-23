"""Store supplier quotes used in production planning."""

from alembic import context, op
import sqlalchemy as sa

revision = "d582ad1fe26c"
down_revision = "62a8b4c3d16e"
branch_labels = None
depends_on = None

# A distinct constraint name identifies tables created by this revision.
CREATION_CONSTRAINT = "ck_raw_material_quotes_unit_price_d582ad1fe26c"


def upgrade() -> None:
    if not context.is_offline_mode() and sa.inspect(op.get_bind()).has_table("raw_material_quotes"):
        return
    op.create_table(
        "raw_material_quotes",
        sa.Column("material_id", sa.String(50), primary_key=True),
        sa.Column("supplier_name", sa.String(120), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("lead_time_days", sa.Integer(), nullable=False),
        sa.CheckConstraint("unit_price >= 0", name=CREATION_CONSTRAINT),
        sa.CheckConstraint("lead_time_days >= 0", name="ck_raw_material_quotes_lead_time"),
    )


def downgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError("Downgrade requires a database connection to check table ownership")
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("raw_material_quotes"):
        return
    constraints = inspector.get_check_constraints("raw_material_quotes")
    if any(constraint["name"] == CREATION_CONSTRAINT for constraint in constraints):
        op.drop_table("raw_material_quotes")

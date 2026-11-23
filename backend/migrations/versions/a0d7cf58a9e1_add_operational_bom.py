"""Store the operational bill of materials without seeding example rows."""

from alembic import context, op
import sqlalchemy as sa

revision = "a0d7cf58a9e1"
down_revision = "d582ad1fe26c"
branch_labels = None
depends_on = None

CREATION_CONSTRAINT = "ck_bom_catalog_singleton_a0d7cf58a9e1"


def upgrade() -> None:
    if not context.is_offline_mode() and sa.inspect(op.get_bind()).has_table("bom_catalog"):
        return
    op.create_table(
        "bom_catalog",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.String(36), nullable=False),
        sa.Column("products", sa.JSON(), nullable=False),
        sa.Column("materials", sa.JSON(), nullable=False),
        sa.Column("recipes", sa.JSON(), nullable=False),
        sa.CheckConstraint("id = 1", name=CREATION_CONSTRAINT),
    )


def downgrade() -> None:
    if context.is_offline_mode():
        raise RuntimeError("Downgrade requires a database connection to check table ownership")
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("bom_catalog"):
        return
    if any(item["name"] == CREATION_CONSTRAINT for item in inspector.get_check_constraints("bom_catalog")):
        op.drop_table("bom_catalog")

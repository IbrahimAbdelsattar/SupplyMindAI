from importlib import import_module

import pytest
import sqlalchemy as sa
from alembic import context
from alembic.migration import MigrationContext
from alembic.operations import Operations


@pytest.mark.parametrize(
    ("revision", "table_name", "model_name", "values"),
    [
        (
            "62a8b4c3d16e_add_raw_material_stock",
            "raw_material_stock",
            "RawMaterialStock",
            {"on_hand": 12},
        ),
        (
            "d582ad1fe26c_add_raw_material_quotes",
            "raw_material_quotes",
            "RawMaterialQuote",
            {"supplier_name": "Local Supplier", "unit_price": 5, "lead_time_days": 2},
        ),
        (
            "a0d7cf58a9e1_add_operational_bom",
            "bom_catalog",
            "BomCatalog",
            {"version": "original", "products": {}, "materials": {}, "recipes": {}},
        ),
    ],
)
@pytest.mark.parametrize("preexisting", [False, True])
def test_downgrade_drops_only_tables_created_by_revision(
    revision, table_name, model_name, values, preexisting, monkeypatch
):
    from datetime import datetime, timezone

    from backend import db

    migration = import_module(f"backend.migrations.versions.{revision}")
    monkeypatch.setattr(context, "is_offline_mode", lambda: False)
    table = getattr(db, model_name).__table__
    primary_key = next(iter(table.primary_key.columns))
    identifier = 1 if primary_key.name == "id" else "RM_PLASTIC"
    values = {primary_key.name: identifier, **values}
    if "updated_at" in table.c:
        values["updated_at"] = datetime.now(timezone.utc)

    engine = sa.create_engine("sqlite://")
    with engine.begin() as connection:
        if preexisting:
            table.create(connection)
            connection.execute(table.insert().values(values))

        with Operations.context(MigrationContext.configure(connection)):
            migration.upgrade()
            assert sa.inspect(connection).has_table(table_name)
            migration.downgrade()

        assert sa.inspect(connection).has_table(table_name) == preexisting
        if preexisting:
            assert connection.execute(sa.select(primary_key)).scalar_one() == identifier
    engine.dispose()

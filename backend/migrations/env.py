import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# ── Path & env setup ──────────────────────────────────────────────────────────
# env.py lives at backend/migrations/env.py → parents[2] is the project root.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

sys.path.insert(0, str(PROJECT_ROOT))

config = context.config

# ── Database URL: mirror db.py SQLite-first logic ────────────────────────────
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
_USE_SQLITE = ENVIRONMENT == "development" or os.getenv("DB_USE_SQLITE", "").lower() in {"1", "true", "yes", "on"}
_FORCE_POSTGRES = os.getenv("DB_FORCE_POSTGRES", "").lower() in {"1", "true", "yes", "on"}

if _USE_SQLITE and not _FORCE_POSTGRES:
    _SQLITE_PATH = PROJECT_ROOT / "backend" / "data" / "supplymind_dev.db"
    _SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    db_url = f"sqlite:///{_SQLITE_PATH}"
else:
    db_url = os.getenv("MIGRATION_DATABASE_URL") or os.getenv("DATABASE_URL")
    # Supabase pgBouncer (port 6543) does not support Alembic session-level features.
    # Auto-switch to the direct connection (port 5432) for migrations.
    if db_url and ".pooler.supabase.com:6543" in db_url:
        db_url = db_url.replace(".pooler.supabase.com:6543", ".supabase.com:5432")

if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from backend.db import Base  # noqa: E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

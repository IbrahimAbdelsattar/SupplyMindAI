from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from sqlalchemy import Boolean, DateTime, Float, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "backend" / "supplymind.db"

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://supplymind:password@localhost:5433/supplymind",
)

_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="analyst")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    product_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    period: Mapped[str] = mapped_column(String(7), nullable=False)
    predicted_demand: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_level: Mapped[float] = mapped_column(Float, nullable=False)
    demand_trend: Mapped[str] = mapped_column(String(20), nullable=False)
    current_stock: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_risk_level: Mapped[str] = mapped_column(String(10), nullable=False)
    recommended_order_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    supplier_score: Mapped[float] = mapped_column(Float, nullable=False)
    best_supplier: Mapped[str] = mapped_column(String(100), nullable=False)
    lead_time_days: Mapped[float] = mapped_column(Float, nullable=False)
    delay_risk: Mapped[str] = mapped_column(String(10), nullable=False)
    avg_delay: Mapped[float] = mapped_column(Float, nullable=False)
    profit_margin: Mapped[float] = mapped_column(Float, nullable=False)
    revenue_forecast: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns() or _ensure_postgres_extensions()


def _ensure_postgres_extensions() -> None:
    if _is_sqlite:
        return
    try:
        with engine.begin() as conn:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
    except Exception:
        pass


def _ensure_user_columns() -> bool:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return False

    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    statements: list[str] = []
    if "role" not in existing_columns:
        default = "'analyst'"
        statements.append(f"ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT {default}")
    if "is_active" not in existing_columns:
        default = "true" if not _is_sqlite else "1"
        statements.append(f"ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT {default}")
    if "updated_at" not in existing_columns:
        col_type = "TIMESTAMP WITH TIME ZONE" if not _is_sqlite else "DATETIME"
        statements.append(f"ALTER TABLE users ADD COLUMN updated_at {col_type}")

    if not statements:
        return True

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
    return True


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


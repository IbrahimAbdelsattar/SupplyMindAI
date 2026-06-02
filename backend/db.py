from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

from sqlalchemy import Boolean, DateTime, Float, Integer, String, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "backend" / "supplymind.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
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
    _ensure_user_columns()


def _ensure_user_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    dialect = engine.dialect.name

    statements: list[str] = []
    if "role" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'analyst'")
    if "is_active" not in existing_columns:
        default_value = "1" if dialect == "sqlite" else "true"
        statements.append(f"ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT {default_value}")
    if "updated_at" not in existing_columns:
        column_type = "DATETIME" if dialect == "sqlite" else "TIMESTAMP"
        statements.append(f"ALTER TABLE users ADD COLUMN updated_at {column_type}")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from __future__ import annotations

import os
import socket
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
import logging

LOGGER = logging.getLogger("backend.db")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")


def database_driver_url(url: str) -> str:
    if url.startswith("postgresql://"):
        # The project installs psycopg2. SQLAlchemy 2.1 defaults to psycopg 3.
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = database_driver_url(os.getenv("DATABASE_URL") or "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# ---------------------------------------------------------------------------
# SQLite-first mode for local development
# ---------------------------------------------------------------------------
# When ENVIRONMENT=development (or DB_USE_SQLITE=true), skip the remote
# Postgres probe entirely and use a local SQLite file. This makes backend
# startup instant instead of waiting 3-10s for a DNS/connection timeout.
_SQLITE_PATH = PROJECT_ROOT / "backend" / "data" / "supplymind_dev.db"
_USE_SQLITE = ENVIRONMENT == "development" or os.getenv("DB_USE_SQLITE", "").lower() in {"1", "true", "yes", "on"}

if _USE_SQLITE and not os.getenv("DB_FORCE_POSTGRES", "").lower() in {"1", "true", "yes", "on"}:
    _SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        f"sqlite:///{_SQLITE_PATH}",
        pool_pre_ping=True,
        connect_args={"timeout": 10},
    )
    LOGGER.info("DEV MODE — using local SQLite at %s (set DB_FORCE_POSTGRES=1 to override)", _SQLITE_PATH)
else:
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is required when not in dev/SQLite mode. "
            "Set it in .env (e.g., postgresql://user:pass@host:port/dbname)."
        )

    # -----------------------------------------------------------------------
    # Database connectivity diagnostics (production only)
    # -----------------------------------------------------------------------
    _parsed = urlparse(DATABASE_URL)
    _db_host = _parsed.hostname or "unknown"
    _db_port = _parsed.port or 5432

    LOGGER.info("Database hostname: %s", _db_host)
    LOGGER.info("Database port:     %s", _db_port)

    try:
        addrinfo = socket.getaddrinfo(_db_host, _db_port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for af, socktype, proto, canonname, sa in addrinfo:
            family = "IPv6" if af == socket.AF_INET6 else "IPv4"
            LOGGER.info("DNS %s -> %s (family=%s)", _db_host, sa[0], family)
    except socket.gaierror as exc:
        LOGGER.error(
            "DNS resolution FAILED for %s — %s. "
            "Check that the hostname is spelled correctly in DATABASE_URL "
            "and that your environment has working DNS (especially for IPv6 lookups).",
            _db_host, exc,
        )

    try:
        ipv4 = socket.getaddrinfo(_db_host, _db_port, socket.AF_INET, socket.SOCK_STREAM)
    except socket.gaierror:
        ipv4 = []
        LOGGER.warning(
            "No IPv4 (A) record found for %s — only IPv6 is available. "
            "If your runtime environment does not support IPv6, database "
            "connections will hang or fail. Ensure your local database hostname is "
            "correct or enable IPv6 in your deployment.",
            _db_host,
        )

    # -----------------------------------------------------------------------
    # Engine options with fast-fail timeouts
    # -----------------------------------------------------------------------
    DB_CONNECT_TIMEOUT = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
    DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))

    engine_options: dict = {
        "pool_pre_ping": True,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
        "pool_timeout": DB_POOL_TIMEOUT,
        "connect_args": {
            "connect_timeout": DB_CONNECT_TIMEOUT,
        },
    }

    try:
        _probe_engine = create_engine(DATABASE_URL, **{
            **engine_options,
            "pool_size": 1,
            "max_overflow": 0,
            "connect_args": {"connect_timeout": 3},
        })
        with _probe_engine.connect() as _conn:
            _conn.exec_driver_sql("SELECT 1")
        _probe_engine.dispose()
        engine = create_engine(DATABASE_URL, **engine_options)
        LOGGER.info("Primary database connected successfully: %s", DATABASE_URL)
    except Exception as _exc:
        LOGGER.warning("Primary database unavailable — falling back to local SQLite: %s", _exc)
        _SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
        engine = create_engine(
            f"sqlite:///{_SQLITE_PATH}",
            pool_pre_ping=True,
            connect_args={"timeout": 10},
        )
        LOGGER.info("Using local SQLite at %s", _SQLITE_PATH)


# ---------------------------------------------------------------------------
# Connection event listener — log slow / failed connections
# ---------------------------------------------------------------------------
@event.listens_for(engine, "connect")
def _on_connect(dbapi_connection, connection_record):
    LOGGER.debug("New DB connection established (raw).")


@event.listens_for(engine, "checkout")
def _on_checkout(dbapi_connection, connection_record, connection_proxy):
    LOGGER.debug("DB connection checked out from pool.")

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


class Base(DeclarativeBase):
    pass


class User(Base):
    """Internal user record — local auth, domain-restricted, RBAC-enforced.

    This table is the single source of truth for authorization and authentication.
    Every request verifies the self-issued JWT → domain → this table → RBAC.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # deprecated: safe to drop in a later cleanup migration once Clerk is fully retired.
    clerk_user_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="analyst")
    department: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RefreshToken(Base):
    """Server-side refresh token record, enables logout/revocation."""
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # sha256 hex of the raw refresh token
    is_revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)





class RawMaterialStock(Base):
    __tablename__ = "raw_material_stock"
    __table_args__ = (CheckConstraint("on_hand >= 0", name="ck_raw_material_stock_on_hand"),)

    material_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    on_hand: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class RawMaterialQuote(Base):
    __tablename__ = "raw_material_quotes"
    __table_args__ = (
        CheckConstraint("unit_price >= 0", name="ck_raw_material_quotes_unit_price"),
        CheckConstraint("lead_time_days >= 0", name="ck_raw_material_quotes_lead_time"),
    )

    material_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    supplier_name: Mapped[str] = mapped_column(String(120), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False)


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


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    document_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class KnowledgeEmbedding(Base):
    __tablename__ = "knowledge_embeddings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    embedding: Mapped[list] = mapped_column(JSON, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    session_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    conversation_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AgentMemory(Base):
    __tablename__ = "agent_memory"
    __table_args__ = (UniqueConstraint("user_id", "agent_type", "memory_key", name="uq_agent_memory"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    agent_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    memory_key: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list | None] = mapped_column(JSON, nullable=True)
    memory_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    settings_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()





def seed_database() -> None:
    try:
        from backend.services.sample_data_cleanup import remove_seeded_samples

        remove_seeded_samples()
        try:
            from backend.scripts.seed_admin import seed_admin
            seed_admin()
        except Exception as seed_err:
            LOGGER.error("Failed to seed admin user: %s", seed_err)
        try:
            import backend.scripts.copy_intro
        except Exception as copy_err:
            LOGGER.error("Failed to copy intro video: %s", copy_err)
    except Exception as exc:
        LOGGER.exception("Failed to seed database: %s", exc)

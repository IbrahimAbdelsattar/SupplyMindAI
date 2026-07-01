from __future__ import annotations

import os
import socket
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv
import logging

LOGGER = logging.getLogger("backend.db")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
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
            "connections will hang or fail. Consider using the Supabase "
            "connection pooler hostname or enabling IPv6 in your deployment.",
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
    """Lightweight local user record.

    This table exists so that app-specific relations (e.g. UserSettings) can
    reference a stable user_id via FK.
    """
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
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





def seed_demo_data() -> None:
    import uuid
    from datetime import datetime, timezone
    
    with SessionLocal() as db:
        # 1. Seed ForecastResult
        if db.query(ForecastResult).count() == 0:
            LOGGER.info("Seeding ForecastResult table with mock predictions...")
            mock_predictions = [
                # FAN_STD
                {"product_id": "FAN_STD", "period": "2026-06", "predicted_demand": 1200, "confidence_level": 88.0, "demand_trend": "increasing", "current_stock": 850, "stock_risk_level": "low", "recommended_order_qty": 600, "supplier_score": 89.0, "best_supplier": "Apex Logistics", "lead_time_days": 10.0, "delay_risk": "low", "avg_delay": 0.5, "profit_margin": 0.35, "revenue_forecast": 42000.0},
                {"product_id": "FAN_STD", "period": "2026-07", "predicted_demand": 1450, "confidence_level": 91.0, "demand_trend": "increasing", "current_stock": 850, "stock_risk_level": "medium", "recommended_order_qty": 900, "supplier_score": 89.0, "best_supplier": "Apex Logistics", "lead_time_days": 10.0, "delay_risk": "low", "avg_delay": 0.5, "profit_margin": 0.35, "revenue_forecast": 50750.0},
                {"product_id": "FAN_STD", "period": "2026-08", "predicted_demand": 1300, "confidence_level": 89.0, "demand_trend": "decreasing", "current_stock": 850, "stock_risk_level": "low", "recommended_order_qty": 500, "supplier_score": 89.0, "best_supplier": "Apex Logistics", "lead_time_days": 10.0, "delay_risk": "low", "avg_delay": 0.5, "profit_margin": 0.35, "revenue_forecast": 45500.0},
                # BL_KIT
                {"product_id": "BL_KIT", "period": "2026-06", "predicted_demand": 850, "confidence_level": 82.0, "demand_trend": "stable", "current_stock": 450, "stock_risk_level": "medium", "recommended_order_qty": 500, "supplier_score": 81.0, "best_supplier": "Global Logistics", "lead_time_days": 14.0, "delay_risk": "medium", "avg_delay": 1.8, "profit_margin": 0.40, "revenue_forecast": 34000.0},
                {"product_id": "BL_KIT", "period": "2026-07", "predicted_demand": 950, "confidence_level": 85.0, "demand_trend": "increasing", "current_stock": 450, "stock_risk_level": "high", "recommended_order_qty": 700, "supplier_score": 81.0, "best_supplier": "Global Logistics", "lead_time_days": 14.0, "delay_risk": "medium", "avg_delay": 1.8, "profit_margin": 0.40, "revenue_forecast": 38000.0},
                {"product_id": "BL_KIT", "period": "2026-08", "predicted_demand": 900, "confidence_level": 83.0, "demand_trend": "stable", "current_stock": 450, "stock_risk_level": "high", "recommended_order_qty": 600, "supplier_score": 81.0, "best_supplier": "Global Logistics", "lead_time_days": 14.0, "delay_risk": "medium", "avg_delay": 1.8, "profit_margin": 0.40, "revenue_forecast": 36000.0},
                # AF_5
                {"product_id": "AF_5", "period": "2026-06", "predicted_demand": 600, "confidence_level": 94.0, "demand_trend": "stable", "current_stock": 650, "stock_risk_level": "low", "recommended_order_qty": 100, "supplier_score": 95.0, "best_supplier": "Swift Delivery", "lead_time_days": 5.0, "delay_risk": "low", "avg_delay": 0.1, "profit_margin": 0.28, "revenue_forecast": 16800.0},
                {"product_id": "AF_5", "period": "2026-07", "predicted_demand": 620, "confidence_level": 93.0, "demand_trend": "increasing", "current_stock": 650, "stock_risk_level": "low", "recommended_order_qty": 150, "supplier_score": 95.0, "best_supplier": "Swift Delivery", "lead_time_days": 5.0, "delay_risk": "low", "avg_delay": 0.1, "profit_margin": 0.28, "revenue_forecast": 17360.0},
                {"product_id": "AF_5", "period": "2026-08", "predicted_demand": 580, "confidence_level": 95.0, "demand_trend": "decreasing", "current_stock": 650, "stock_risk_level": "low", "recommended_order_qty": 50, "supplier_score": 95.0, "best_supplier": "Swift Delivery", "lead_time_days": 5.0, "delay_risk": "low", "avg_delay": 0.1, "profit_margin": 0.28, "revenue_forecast": 16240.0},
            ]
            for p in mock_predictions:
                db.add(ForecastResult(
                    id=str(uuid.uuid4()),
                    product_id=p["product_id"],
                    period=p["period"],
                    predicted_demand=p["predicted_demand"],
                    confidence_level=p["confidence_level"],
                    demand_trend=p["demand_trend"],
                    current_stock=p["current_stock"],
                    stock_risk_level=p["stock_risk_level"],
                    recommended_order_qty=p["recommended_order_qty"],
                    supplier_score=p["supplier_score"],
                    best_supplier=p["best_supplier"],
                    lead_time_days=p["lead_time_days"],
                    delay_risk=p["delay_risk"],
                    avg_delay=p["avg_delay"],
                    profit_margin=p["profit_margin"],
                    revenue_forecast=p["revenue_forecast"],
                    created_at=datetime.now(timezone.utc)
                ))
            db.commit()
            LOGGER.info("ForecastResult table seeded successfully.")

        # 2. Seed KnowledgeDocuments if empty
        if db.query(KnowledgeDocument).count() == 0:
            LOGGER.info("Seeding KnowledgeDocument table...")
            try:
                from backend.knowledge.ingestion import ingest_document
                ingest_document(
                    title="Supplier Apex Logistics Profile",
                    content="Apex Logistics is our primary partner for FAN_STD. They maintain an outstanding reliability score of 89.2%. The standard lead time is 10 days, and the average delivery delay is 0.5 days. Delay risk is historically low. Their hub is located close to our primary warehouse, which minimizes transit overhead.",
                    source_type="supplier",
                    source_id="apex_logistics"
                )
                ingest_document(
                    title="Supplier Global Logistics Profile",
                    content="Global Logistics handles shipments for BL_KIT. They have a supplier reliability score of 81.0%. The standard lead time is 14 days, and the average delay is 1.8 days. Delay risk is medium. Stockouts have occurred twice in the past year due to customs processing delays.",
                    source_type="supplier",
                    source_id="global_logistics"
                )
                ingest_document(
                    title="Inventory Safety Stock Policy",
                    content="The default safety stock levels are set as follows: FAN_STD is kept at 200 units. BL_KIT is kept at 150 units. AF_5 is kept at 80 units. These buffers ensure we maintain a service level above 95% across all regional stores. Safety stock is reviewed at the end of each fiscal quarter.",
                    source_type="inventory",
                    source_id="safety_stock_policy"
                )
                LOGGER.info("KnowledgeDocument seeded successfully.")
            except Exception as exc:
                LOGGER.error("Failed to seed RAG KnowledgeDocuments: %s", exc)


def seed_database() -> None:
    try:
        seed_demo_data()
    except Exception as exc:
        LOGGER.exception("Failed to seed database: %s", exc)

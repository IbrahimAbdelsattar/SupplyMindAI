# SupplyMind AI - Application Tables (PostgreSQL)
# ==============================================================================
# Run after init-db.sql to create application-specific tables.
# These are created automatically by SQLAlchemy create_tables(),
# but this script can be used for standalone setup or migrations.

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(32) NOT NULL DEFAULT 'analyst',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Forecast Results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecast_results (
    id                  VARCHAR(36) PRIMARY KEY,
    product_id          VARCHAR(50) NOT NULL,
    period              VARCHAR(7) NOT NULL,
    predicted_demand    INTEGER NOT NULL,
    confidence_level    REAL NOT NULL,
    demand_trend        VARCHAR(20) NOT NULL,
    current_stock       INTEGER NOT NULL,
    stock_risk_level    VARCHAR(10) NOT NULL,
    recommended_order_qty INTEGER NOT NULL,
    supplier_score      REAL NOT NULL,
    best_supplier       VARCHAR(100) NOT NULL,
    lead_time_days      REAL NOT NULL,
    delay_risk          VARCHAR(10) NOT NULL,
    avg_delay           REAL NOT NULL,
    profit_margin       REAL NOT NULL,
    revenue_forecast    REAL NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_results_product_id ON forecast_results (product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_results_period ON forecast_results (period);
CREATE UNIQUE INDEX IF NOT EXISTS idx_forecast_results_product_period ON forecast_results (product_id, period);

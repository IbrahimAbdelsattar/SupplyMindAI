-- SupplyMind AI: Forecast Results Table
-- Run this in Supabase SQL Editor to create the forecast_results table.

CREATE TABLE IF NOT EXISTS forecast_results (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT DEFAULT 'default',
    product_id      TEXT NOT NULL,
    period          TEXT NOT NULL,  -- YYYY-MM format
    predicted_demand INTEGER NOT NULL,
    confidence_level REAL NOT NULL,
    demand_trend    TEXT NOT NULL,
    current_stock   INTEGER NOT NULL,
    stock_risk_level TEXT NOT NULL,
    recommended_order_qty INTEGER NOT NULL,
    supplier_score  REAL NOT NULL,
    best_supplier   TEXT NOT NULL,
    lead_time_days  REAL NOT NULL,
    delay_risk      TEXT NOT NULL,
    avg_delay       REAL NOT NULL,
    profit_margin   REAL NOT NULL,
    revenue_forecast REAL NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for product lookups
CREATE INDEX IF NOT EXISTS idx_forecast_results_product_id ON forecast_results (product_id);

-- Index for period-based queries
CREATE INDEX IF NOT EXISTS idx_forecast_results_period ON forecast_results (period);

-- Composite index for unique constraint simulation (product_id + period)
CREATE UNIQUE INDEX IF NOT EXISTS idx_forecast_results_product_period ON forecast_results (product_id, period);

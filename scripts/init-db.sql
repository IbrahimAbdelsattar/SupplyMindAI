-- ============================================================================
-- SupplyMind AI - Database Initialization Script
-- ============================================================================
-- This script initializes the PostgreSQL database with necessary extensions,
-- schemas, and configuration for production use.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- For multi-column indexes
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- For exclusion constraints

-- Create app-specific schema
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION supplymind_prod_app;

-- Set search path
ALTER ROLE supplymind_prod_app SET search_path = public, app;

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION supplymind_prod_app;

-- Store the application JWT secret in deployment secrets, not in SQL.
ALTER DATABASE supplymind_prod SET "app.jwt_secret" = 'change-me-in-production';

-- Create function to track updates
CREATE OR REPLACE FUNCTION audit.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to prevent direct app table deletions (audit)
CREATE OR REPLACE FUNCTION audit.audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.deleted_records (table_name, record_id, data, deleted_at, deleted_by)
    VALUES (TG_TABLE_NAME, OLD.id, row_to_json(OLD), CURRENT_TIMESTAMP, current_user);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create audit table
CREATE TABLE IF NOT EXISTS audit.deleted_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    data JSONB NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit
CREATE INDEX IF NOT EXISTS idx_audit_deleted_records_table_name ON audit.deleted_records(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_deleted_records_deleted_at ON audit.deleted_records(deleted_at DESC);

-- Grant permissions to app user
GRANT USAGE ON SCHEMA app TO supplymind_prod_app;
GRANT USAGE ON SCHEMA audit TO supplymind_prod_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO supplymind_prod_app;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO supplymind_prod_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO supplymind_prod_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA audit TO supplymind_prod_app;

-- Create sequence for IDs if needed
CREATE SEQUENCE IF NOT EXISTS app.id_sequence START 1000;

-- Performance configuration (set in docker-compose)
-- These are example values - adjust based on your server resources
-- shared_buffers = 256MB (1/4 of system RAM)
-- effective_cache_size = 1GB (1/2 to 1 of system RAM)
-- work_mem = 4MB (shared_buffers / max_connections)
-- maintenance_work_mem = 64MB
-- max_wal_size = 2GB

-- Create logging table
CREATE TABLE IF NOT EXISTS app.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON app.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON app.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON app.activity_logs(created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT ON app.activity_logs TO supplymind_prod_app;

-- Create stats table for monitoring
CREATE TABLE IF NOT EXISTS app.system_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_stats_metric_name ON app.system_stats(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_stats_recorded_at ON app.system_stats(recorded_at DESC);

GRANT SELECT, INSERT ON app.system_stats TO supplymind_prod_app;

-- Vacuum and analyze
VACUUM ANALYZE;

-- Show initialization status
SELECT 'Database initialization complete!' as status;

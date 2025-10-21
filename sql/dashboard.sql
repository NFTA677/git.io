-- File: /e:/N.F.T.A-CORP/sql/dashboard.sql
-- PostgreSQL schema + helper functions for a dashboard system
-- Creates schema, core tables, indexes, a view and simple helper functions
-- Adjust types and privileges to your environment as needed

BEGIN;

-- Ensure uuid generator is available before using it in defaults
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS dashboard;

-- 2. Users (lightweight)
CREATE TABLE IF NOT EXISTS dashboard.users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username     TEXT NOT NULL UNIQUE,
    email        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Dashboards
CREATE TABLE IF NOT EXISTS dashboard.dashboards (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id      UUID REFERENCES dashboard.users(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    is_public     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboard.dashboards(owner_id);

-- 4. Widgets (visual components on dashboards)
CREATE TABLE IF NOT EXISTS dashboard.widgets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id  UUID NOT NULL REFERENCES dashboard.dashboards(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,             -- e.g. "timeseries", "kpi", "table", "pie"
    title         TEXT,
    config        JSONB,                     -- widget-specific configuration
    position      JSONB,                     -- layout info: {x,y,w,h}
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_widgets_dashboard ON dashboard.widgets(dashboard_id);

-- 5. Metrics / timeseries storage (generic)
CREATE TABLE IF NOT EXISTS dashboard.metric_points (
    id            BIGSERIAL PRIMARY KEY,
    widget_id     UUID REFERENCES dashboard.widgets(id) ON DELETE CASCADE,
    metric_key    TEXT NOT NULL,             -- e.g. "revenue", "active_users"
    metric_time   TIMESTAMPTZ NOT NULL,
    metric_value  DOUBLE PRECISION,
    metadata      JSONB,
    inserted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metric_points_widget_time ON dashboard.metric_points(widget_id, metric_time DESC);
CREATE INDEX IF NOT EXISTS idx_metric_points_key_time ON dashboard.metric_points(metric_key, metric_time DESC);

-- 6. Latest snapshot table (for quick KPIs)
CREATE TABLE IF NOT EXISTS dashboard.kpi_snapshots (
    widget_id    UUID PRIMARY KEY REFERENCES dashboard.widgets(id) ON DELETE CASCADE,
    snapshot     JSONB,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Audit log (optional)
CREATE TABLE IF NOT EXISTS dashboard.audit_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      UUID,
    action       TEXT NOT NULL,
    target_type  TEXT,
    target_id    UUID,
    payload      JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON dashboard.audit_logs(user_id);

-- 8. View for dashboard overview
CREATE OR REPLACE VIEW dashboard.dashboard_overview AS
SELECT
    d.id,
    d.name,
    d.description,
    d.owner_id,
    d.is_public,
    d.created_at,
    d.updated_at,
    COALESCE(w.widget_count, 0) AS widget_count,
    mp.latest_metric_time AS latest_metric_time
FROM dashboard.dashboards d
LEFT JOIN (
    SELECT dashboard_id, count(*) AS widget_count
    FROM dashboard.widgets
    GROUP BY dashboard_id
) w ON w.dashboard_id = d.id
LEFT JOIN (
    SELECT w.dashboard_id, max(mp.metric_time) AS latest_metric_time
    FROM dashboard.metric_points mp
    JOIN dashboard.widgets w ON w.id = mp.widget_id
    GROUP BY w.dashboard_id
) mp ON mp.dashboard_id = d.id;

-- 9. Trigger helpers: keep updated_at in dashboards/widgets
CREATE OR REPLACE FUNCTION dashboard.fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboards_update ON dashboard.dashboards;
CREATE TRIGGER trg_dashboards_update
BEFORE UPDATE ON dashboard.dashboards
FOR EACH ROW EXECUTE FUNCTION dashboard.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_widgets_update ON dashboard.widgets;
CREATE TRIGGER trg_widgets_update
BEFORE UPDATE ON dashboard.widgets
FOR EACH ROW EXECUTE FUNCTION dashboard.fn_update_timestamp();

-- 10. Helper function to insert metric points (bulk-friendly)
CREATE OR REPLACE FUNCTION dashboard.insert_metric_point(
    p_widget_id UUID,
    p_metric_key TEXT,
    p_metric_time TIMESTAMPTZ,
    p_metric_value DOUBLE PRECISION,
    p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO dashboard.metric_points(widget_id, metric_key, metric_time, metric_value, metadata)
    VALUES (p_widget_id, p_metric_key, p_metric_time, p_metric_value, p_metadata);
END;
$$;

-- 11. Simple function to upsert KPI snapshot
CREATE OR REPLACE FUNCTION dashboard.upsert_kpi_snapshot(p_widget_id UUID, p_snapshot JSONB)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO dashboard.kpi_snapshots (widget_id, snapshot, updated_at)
    VALUES (p_widget_id, p_snapshot, now())
    ON CONFLICT (widget_id) DO UPDATE
        SET snapshot = EXCLUDED.snapshot,
            updated_at = EXCLUDED.updated_at;
END;
$$;

-- 12. Sample data (safe, uses IF NOT EXISTS checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dashboard.users WHERE username = 'admin') THEN
        INSERT INTO dashboard.users (username, email) VALUES ('admin', 'admin@example.com');
    END IF;
END;
$$;

-- Create a sample dashboard and widget if none exist
WITH sel AS (
    SELECT id FROM dashboard.users WHERE username = 'admin' LIMIT 1
), ins AS (
    INSERT INTO dashboard.dashboards (owner_id, name, description, is_public)
    SELECT id, 'Main Dashboard', 'Default corporate dashboard', TRUE FROM sel
    WHERE NOT EXISTS (SELECT 1 FROM dashboard.dashboards WHERE name = 'Main Dashboard')
    RETURNING id
)
INSERT INTO dashboard.widgets (dashboard_id, type, title, config, position)
SELECT id, 'kpi', 'Active Users', jsonb_build_object('aggregation','latest'), jsonb_build_object('x',0,'y',0,'w',3,'h',1)
FROM ins
ON CONFLICT DO NOTHING;

COMMIT;acion.is_feature_enabled(p_flag_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_enabled BOOLEAN;
BEGIN
    SELECT is_enabled INTO v_enabled
    FROM configuracion.feature_flags
    WHERE flag_name = p_flag_name;
    RETURN COALESCE(v_enabled, FALSE); -- Default to FALSE if flag not found
END;
$$;

-- Function to set/update a feature flag
CREATE OR REPLACE FUNCTION configuracion.set_feature_flag(
    p_flag_name TEXT,
    p_is_enabled BOOLEAN,
    p_description TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO configuracion.feature_flags (flag_name, is_enabled, description)
    VALUES (p_flag_name, p_is_enabled, p_description)
    ON CONFLICT (flag_name) DO UPDATE
    SET
        is_enabled = EXCLUDED.is_enabled,
        description = COALESCE(EXCLUDED.description, configuracion.feature_flags.description),
        updated_at = now();
END;
$$;

-- Function to get an email template
CREATE OR REPLACE FUNCTION configuracion.get_email_template(p_template_name TEXT)
RETURNS TABLE (subject TEXT, body_html TEXT, body_text TEXT) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT et.subject, et.body_html, et.body_text
    FROM configuracion.email_templates et
    WHERE et.template_name = p_template_name;
END;
$$;

-- Function to set/update an email template
CREATE OR REPLACE FUNCTION configuracion.set_email_template(
    p_template_name TEXT,
    p_subject TEXT,
    p_body_html TEXT,
    p_body_text TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO configuracion.email_templates (template_name, subject, body_html, body_text)
    VALUES (p_template_name, p_subject, p_body_html, p_body_text)
    ON CONFLICT (template_name) DO UPDATE
    SET
        subject
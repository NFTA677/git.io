-- File: /e:/N.F.T.A-CORP/sql/dashboard.sql
-- SQL Server schema + helper functions for a dashboard system
-- Creates schema, core tables, indexes, a view and simple helper functions
-- Adjust types and privileges to your environment as needed

BEGIN TRANSACTION;

-- 1. Schema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'dashboard')
BEGIN
    EXEC('CREATE SCHEMA dashboard')
END;

-- 2. Users (lightweight)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.users') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.users (
    id           UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username     NVARCHAR(255) NOT NULL UNIQUE,
    email        NVARCHAR(255),
    created_at   DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
-- 3. Dashboards
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.dashboards') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.dashboards (
    id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    owner_id      UNIQUEIDENTIFIER FOREIGN KEY REFERENCES dashboard.users(id) ON DELETE SET NULL,
    name          NVARCHAR(255) NOT NULL,
    description   NVARCHAR(MAX),
    is_public     BIT NOT NULL DEFAULT 0,
    created_at    DATETIMEOFFSET NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
);
END;
-- 4. Widgets (visual components on dashboards)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.widgets') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.widgets (
    id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    dashboard_id  UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES dashboard.dashboards(id) ON DELETE CASCADE,
    type          NVARCHAR(50) NOT NULL,     -- e.g. "timeseries", "kpi", "table", "pie"
    title         NVARCHAR(255),
    config        NVARCHAR(MAX),             -- widget-specific configuration (JSON as string)
    position      NVARCHAR(MAX),             -- layout info: {x,y,w,h} (JSON as string)
    created_at    DATETIMEOFFSET NOT NULL DEFAULT GETDATE(),
    updated_at    DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
);
END;
-- 5. Metrics / timeseries storage (generic)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.metric_points') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.metric_points (
    id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    widget_id     UNIQUEIDENTIFIER FOREIGN KEY REFERENCES dashboard.widgets(id) ON DELETE CASCADE,
    metric_key    NVARCHAR(255) NOT NULL,    -- e.g. "revenue", "active_users"
    metric_time   DATETIMEOFFSET NOT NULL,
    metric_value  FLOAT,
    metadata      NVARCHAR(MAX),
    inserted_at   DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
);
END;

-- 6. Latest snapshot table (for quick KPIs)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.kpi_snapshots') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.kpi_snapshots (
    widget_id    UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES dashboard.widgets(id) ON DELETE CASCADE,
    snapshot     NVARCHAR(MAX),
    updated_at   DATETIMEOFFSET NOT NULL DEFAULT GETDATE()
);
END;

-- 7. Audit log (optional)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.audit_logs') AND type in (N'U'))
BEGIN
CREATE TABLE dashboard.audit_logs (
    id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id      UNIQUEIDENTIFIER,
    action       NVARCHAR(255) NOT NULL,
    target_type  NVARCHAR(100),
    target_id    UNIQUEIDENTIFIER,
    payload      NVARCHAR(MAX),
-- 8. View for dashboard overview
IF EXISTS (SELECT * FROM sys.views WHERE object_id = OBJECT_ID(N'dashboard.dashboard_overview'))
    DROP VIEW dashboard.dashboard_overview;
GO
CREATE VIEW dashboard.dashboard_overview AS
SELECT
    d.id,
    d.name,
    d.description,
    d.owner_id,
    d.is_public,
    d.created_at,
    d.updated_at,
    ISNULL(w.widget_count, 0) AS widget_count,
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
-- 9. Trigger helpers: keep updated_at in dashboards/widgets
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_dashboards_update')
    DROP TRIGGER trg_dashboards_update;
GO
CREATE TRIGGER trg_dashboards_update
ON dashboard.dashboards
AFTER UPDATE
AS
BEGIN
    UPDATE dashboard.dashboards 
    SET updated_at = GETDATE()
    FROM dashboard.dashboards d
    INNER JOIN inserted i ON d.id = i.id;
END;
GO

IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_widgets_update')
    DROP TRIGGER trg_widgets_update;
GO
-- 10. Helper function to insert metric points (bulk-friendly)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.insert_metric_point') AND type in (N'P', N'PC'))
    DROP PROCEDURE dashboard.insert_metric_point;
GO
CREATE PROCEDURE dashboard.insert_metric_point
    @p_widget_id UNIQUEIDENTIFIER,
    @p_metric_key NVARCHAR(255),
    @p_metric_time DATETIMEOFFSET,
    @p_metric_value FLOAT,
    @p_metadata NVARCHAR(MAX) = '{}'
AS
BEGIN
    INSERT INTO dashboard.metric_points(widget_id, metric_key, metric_time, metric_value, metadata)
    VALUES (@p_widget_id, @p_metric_key, @p_metric_time, @p_metric_value, @p_metadata);
-- 11. Simple function to upsert KPI snapshot
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dashboard.upsert_kpi_snapshot') AND type in (N'P', N'PC'))
    DROP PROCEDURE dashboard.upsert_kpi_snapshot;
GO
CREATE PROCEDURE dashboard.upsert_kpi_snapshot
    @p_widget_id UNIQUEIDENTIFIER,
    @p_snapshot NVARCHAR(MAX)
AS
BEGIN
    MERGE dashboard.kpi_snapshots AS target
    USING (SELECT @p_widget_id AS widget_id, @p_snapshot AS snapshot, GETDATE() AS updated_at) AS source
    ON target.widget_id = source.widget_id
-- 12. Sample data (safe, uses IF NOT EXISTS checks)
IF NOT EXISTS (SELECT 1 FROM dashboard.users WHERE username = 'admin')
BEGIN
    INSERT INTO dashboard.users (username, email) VALUES ('admin', 'admin@example.com');
END;

-- Create a sample dashboard and widget if none exist
DECLARE @admin_id UNIQUEIDENTIFIER;
DECLARE @dashboard_id UNIQUEIDENTIFIER;

SELECT @admin_id = id FROM dashboard.users WHERE username = 'admin';

IF NOT EXISTS (SELECT 1 FROM dashboard.dashboards WHERE name = 'Main Dashboard')
BEGIN
    INSERT INTO dashboard.dashboards (owner_id, name, description, is_public)
    VALUES (@admin_id, 'Main Dashboard', 'Default corporate dashboard', 1);
    
    SET @dashboard_id = SCOPE_IDENTITY();
    
    INSERT INTO dashboard.widgets (dashboard_id, type, title, config, position)
    VALUES (@dashboard_id, 'kpi', 'Active Users', '{"aggregation":"latest"}', '{"x":0,"y":0,"w":3,"h":1}');
END;

COMMIT TRANSACTION;
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
-- File: /e:/N.F.T.A-CORP/sql/configuracion.sql
-- PostgreSQL schema for application configuration
-- This file defines tables for managing various application settings and configurations.

BEGIN;

-- Ensure uuid generator is available before using it in defaults
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Schema for configuration
CREATE SCHEMA IF NOT EXISTS configuracion;

-- 2. Application Settings
-- Stores global application settings as key-value pairs.
CREATE TABLE IF NOT EXISTS configuracion.app_settings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key   TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description   TEXT,
    is_sensitive  BOOLEAN NOT NULL DEFAULT FALSE, -- e.g., API keys, passwords
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by setting key
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_settings_key ON configuracion.app_settings(setting_key);

-- 3. Feature Flags
-- Manages feature toggles for dynamic enabling/disabling of features.
CREATE TABLE IF NOT EXISTS configuracion.feature_flags (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name     TEXT NOT NULL UNIQUE,
    is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    description   TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by flag name
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_name ON configuracion.feature_flags(flag_name);

-- 4. Email Templates
-- Stores various email templates used by the application.
CREATE TABLE IF NOT EXISTS configuracion.email_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL UNIQUE,
    subject       TEXT NOT NULL,
    body_html     TEXT NOT NULL,
    body_text     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by template name
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_name ON configuracion.email_templates(template_name);

-- 5. Localization Strings
-- Stores localized strings for internationalization (i18n).
CREATE TABLE IF NOT EXISTS configuracion.localization_strings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    string_key    TEXT NOT NULL,
    locale        TEXT NOT NULL, -- e.g., 'en-US', 'es-ES', 'fr-FR'
    string_value  TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (string_key, locale)
);

-- Index for quick lookup by string key and locale
CREATE UNIQUE INDEX IF NOT EXISTS idx_localization_strings_key_locale ON configuracion.localization_strings(string_key, locale);

-- 6. Audit Log for Configuration Changes (optional but recommended)
CREATE TABLE IF NOT EXISTS configuracion.config_audit_logs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID, -- References dashboard.users if applicable, or a generic user ID
    action        TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
    table_name    TEXT NOT NULL, -- e.g., 'app_settings', 'feature_flags'
    record_id     UUID,
    old_value     JSONB,
    new_value     JSONB,
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for audit logs by table and record ID
CREATE INDEX IF NOT EXISTS idx_config_audit_logs_table_record ON configuracion.config_audit_logs(table_name, record_id);

-- 7. Trigger helpers: keep updated_at in configuration tables
CREATE OR REPLACE FUNCTION configuracion.fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_settings_update ON configuracion.app_settings;
CREATE TRIGGER trg_app_settings_update
BEFORE UPDATE ON configuracion.app_settings
FOR EACH ROW EXECUTE FUNCTION configuracion.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_feature_flags_update ON configuracion.feature_flags;
CREATE TRIGGER trg_feature_flags_update
BEFORE UPDATE ON configuracion.feature_flags
FOR EACH ROW EXECUTE FUNCTION configuracion.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_email_templates_update ON configuracion.email_templates;
CREATE TRIGGER trg_email_templates_update
BEFORE UPDATE ON configuracion.email_templates
FOR EACH ROW EXECUTE FUNCTION configuracion.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_localization_strings_update ON configuracion.localization_strings;
CREATE TRIGGER trg_localization_strings_update
BEFORE UPDATE ON configuracion.localization_strings
FOR EACH ROW EXECUTE FUNCTION configuracion.fn_update_timestamp();

-- 8. Helper functions for configuration management

-- Function to get an application setting value
CREATE OR REPLACE FUNCTION configuracion.get_app_setting(p_key TEXT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
    v_value TEXT;
BEGIN
    SELECT setting_value INTO v_value
    FROM configuracion.app_settings
    WHERE setting_key = p_key;
    RETURN v_value;
END;
$$;

-- Function to set/update an application setting value
CREATE OR REPLACE FUNCTION configuracion.set_app_setting(
    p_key TEXT,
    p_value TEXT,
    p_description TEXT DEFAULT NULL,
    p_is_sensitive BOOLEAN DEFAULT FALSE
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO configuracion.app_settings (setting_key, setting_value, description, is_sensitive)
    VALUES (p_key, p_value, p_description, p_is_sensitive)
    ON CONFLICT (setting_key) DO UPDATE
    SET
        setting_value = EXCLUDED.setting_value,
        description = COALESCE(EXCLUDED.description, configuracion.app_settings.description),
        is_sensitive = EXCLUDED.is_sensitive,
        updated_at = now();
END;
$$;

-- Function to check if a feature flag is enabled
CREATE OR REPLACE FUNCTION configur
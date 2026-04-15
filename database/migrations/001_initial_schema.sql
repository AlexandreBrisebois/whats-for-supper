-- =============================================================================
-- Migration 001: Initial Schema
-- Phase 0 MVP — family_members and recipes tables
--
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS throughout).
-- Compatible with: PostgreSQL 17, Flyway, Entity Framework migrations runner.
--
-- No extensions required. gen_random_uuid() is a PostgreSQL built-in since v13.
-- pgvector and additional columns are added in their respective phase migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: family_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    -- JSON object tracking which onboarding hint tours this member has dismissed.
    -- e.g. { "capture": true, "planner": true }
    completed_tours JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Table: recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
    id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 4-point rating scale: 0=Unknown 1=Dislike 2=Like 3=Love
    rating     SMALLINT NOT NULL CHECK (rating >= 0 AND rating <= 3),
    -- NULL when the capturing family member has since been deleted.
    added_by   UUID     REFERENCES family_members(id) ON DELETE SET NULL,
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

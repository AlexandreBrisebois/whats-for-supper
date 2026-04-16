-- =============================================================================
-- Migration 001: Initial Schema
-- Phase 0 MVP — family_members and recipes tables
--
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS throughout).
-- Compatible with: PostgreSQL 17, Flyway, Entity Framework migrations runner.
--
-- pgvector and additional columns are added here to match the C# models
-- and Phase 0/1 specifications.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------------------------------------------------------------------------
-- Table: family_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Table: recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
    id           UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 4-point rating scale: 0=Unknown 1=Dislike 2=Like 3=Love
    rating       SMALLINT NOT NULL CHECK (rating >= 0 AND rating <= 3),
    -- NULL when the capturing family member has since been deleted.
    added_by     UUID     REFERENCES family_members(id) ON DELETE SET NULL,
    notes        TEXT,
    -- Number of images saved for this recipe.
    image_count  INTEGER  NOT NULL DEFAULT 0,
    -- Phase 1+ fields — populated by import worker / AI pipeline
    raw_metadata JSONB,
    ingredients  JSONB,
    -- Phase 3+: pgvector embedding
    embedding    VECTOR(1536),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


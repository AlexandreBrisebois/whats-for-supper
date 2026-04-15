-- =============================================================================
-- Migration 002: Performance Indexes
-- Phase 0 MVP — indexes for active query patterns only
--
-- Idempotent: safe to run multiple times (uses IF NOT EXISTS throughout).
-- Run after 001_initial_schema.sql.
-- =============================================================================

-- GET /api/recipes orders by created_at DESC with LIMIT/OFFSET pagination.
CREATE INDEX IF NOT EXISTS idx_recipes_created_at_desc
    ON recipes (created_at DESC);

-- Speeds up ON DELETE SET NULL cascade when a family member is deleted,
-- and any future "filter by member" queries.
CREATE INDEX IF NOT EXISTS idx_recipes_added_by
    ON recipes (added_by)
    WHERE added_by IS NOT NULL;

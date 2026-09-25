-- Task 3: extension installation is transactional and idempotent. The matching
-- GIN index is created by migrate.sh in its separate resumable concurrent step.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

BEGIN;

-- Phase 1 dietary separation: a NULL version is an explicit unknown state.
-- Do not derive it from the legacy is_vegetarian default, which historically
-- did not establish that a recipe had been classified from ingredients.
DO $$
BEGIN
    IF to_regclass('public.recipes') IS NOT NULL THEN
        ALTER TABLE public.recipes
            ADD COLUMN IF NOT EXISTS vegetarian_classification_version integer,
            ADD COLUMN IF NOT EXISTS vegetarian_classified_at timestamptz;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS recipe_search_filter_state (
    id integer PRIMARY KEY CHECK (id = 1),
    generated_at timestamptz NOT NULL,
    cuisine_payload jsonb NOT NULL
);

-- Compatibility runs before sqldef applies schema.sql. Existing installations
-- already have recipes; fresh installs receive this table from schema.sql.
DO $$
BEGIN
    IF to_regclass('public.recipes') IS NOT NULL THEN
        CREATE TABLE IF NOT EXISTS recipe_search_affinity_facts (
            recipe_id uuid PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
            affinity integer NOT NULL,
            last_cooked_on date,
            generated_at timestamptz NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_recipe_search_affinity_facts_generated_at
            ON recipe_search_affinity_facts (generated_at);
    END IF;
END
$$;

-- Task 2 search sidecar lifecycle is additive. Existing vectors have no
-- trustworthy content fingerprint and are deliberately made semantically
-- ineligible until reconciliation rebuilds them.
DO $$
BEGIN
    IF to_regclass('public.recipe_search_documents') IS NOT NULL THEN
        ALTER TABLE public.recipe_search_documents
            ADD COLUMN IF NOT EXISTS embedding_status text NOT NULL DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS embedding_fingerprint text;
        ALTER TABLE public.recipe_search_documents
            ALTER COLUMN schema_version SET DEFAULT 2;
        UPDATE public.recipe_search_documents
        SET embedding_status = CASE WHEN embedding_json IS NULL THEN 'pending' ELSE 'pending' END,
            embedding_fingerprint = NULL
        WHERE embedding_fingerprint IS NULL;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_recipe_search_documents_index_status') THEN
            ALTER TABLE public.recipe_search_documents ADD CONSTRAINT "CK_recipe_search_documents_index_status" CHECK (index_status IN ('pending', 'indexing', 'ready', 'failed'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CK_recipe_search_documents_embedding_status') THEN
            ALTER TABLE public.recipe_search_documents ADD CONSTRAINT "CK_recipe_search_documents_embedding_status" CHECK (embedding_status IN ('pending', 'indexing', 'ready', 'failed'));
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.recipe_import_reports') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.recipe_import_reports'::regclass
          AND conname IN (
              'recipe_import_reports_reasons_nonempty_check',
              'recipe_import_reports_reasons_allowed_check',
              'recipe_import_reports_reasons_unique_check'
          )
    ) THEN
        ALTER TABLE public.recipe_import_reports
            DROP CONSTRAINT IF EXISTS recipe_import_reports_reasons_nonempty_check,
            DROP CONSTRAINT IF EXISTS recipe_import_reports_reasons_allowed_check,
            DROP CONSTRAINT IF EXISTS recipe_import_reports_reasons_unique_check;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.recipe_import_reports'::regclass
          AND conname = 'recipe_import_reports_reasons_check'
          AND pg_get_constraintdef(oid) NOT LIKE '%duplicate%'
    ) THEN
        ALTER TABLE public.recipe_import_reports
            DROP CONSTRAINT recipe_import_reports_reasons_check;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.recipe_import_reports'::regclass
          AND conname = 'recipe_import_reports_reasons_check'
    ) THEN
        ALTER TABLE public.recipe_import_reports
            ADD CONSTRAINT recipe_import_reports_reasons_check CHECK (
                cardinality(reasons) > 0
                AND reasons <@ ARRAY['ingredients', 'steps', 'duplicate']::text[]
                AND cardinality(array_positions(reasons, 'ingredients'::text)) <= 1
                AND cardinality(array_positions(reasons, 'steps'::text)) <= 1
                AND cardinality(array_positions(reasons, 'duplicate'::text)) <= 1
            );
    END IF;
END
$$;

COMMIT;

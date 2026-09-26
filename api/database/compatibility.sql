-- Task 3: extension installation is transactional and idempotent. The matching
-- GIN index is created by migrate.sh in its separate resumable concurrent step.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

BEGIN;

-- Vegetarian classification is a nullable recipe fact. Existing rows without a
-- classifier version were legacy defaults, not confirmed non-vegetarian recipes.
DO $$
BEGIN
    IF to_regclass('public.recipes') IS NOT NULL THEN
        IF col_description('public.recipes'::regclass, (
            SELECT attnum FROM pg_attribute
            WHERE attrelid = 'public.recipes'::regclass AND attname = 'is_vegetarian'
        )) IS DISTINCT FROM 'wfs-vegetarian-classification-nullable-v1' THEN
            ALTER TABLE public.recipes
                ALTER COLUMN is_vegetarian DROP NOT NULL;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'recipes'
                  AND column_name = 'vegetarian_classification_version'
            ) THEN
                UPDATE public.recipes
                SET is_vegetarian = NULL
                WHERE vegetarian_classification_version IS NULL;
            ELSE
                UPDATE public.recipes SET is_vegetarian = NULL;
            END IF;

            COMMENT ON COLUMN public.recipes.is_vegetarian IS 'wfs-vegetarian-classification-nullable-v1';
        END IF;

        ALTER TABLE public.recipes
            DROP COLUMN IF EXISTS vegetarian_classification_version,
            DROP COLUMN IF EXISTS vegetarian_classified_at,
            DROP COLUMN IF EXISTS vegetarian_classification_failed_at,
            DROP COLUMN IF EXISTS vegetarian_classification_failure_reason;
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

-- Phase 3 dietary separation is intentionally irreversible: these stores contain
-- retired nutritional interpretation only. The dependency order keeps the
-- discovery view valid while psqldef reconciles the final schema.
DROP VIEW IF EXISTS public.vw_discovery_recipes;
DROP TABLE IF EXISTS public.health_events;
DROP TABLE IF EXISTS public.health_recipe_profiles;
DROP TABLE IF EXISTS public.health_week_summaries;

DO $$
BEGIN
    IF to_regclass('public.recipes') IS NOT NULL THEN
        ALTER TABLE public.recipes
            DROP COLUMN IF EXISTS is_healthy_choice,
            DROP COLUMN IF EXISTS dietary_profile;
    END IF;

    IF to_regclass('public.weekly_plans') IS NOT NULL THEN
        ALTER TABLE public.weekly_plans
            DROP COLUMN IF EXISTS balance_summary;
    END IF;
END
$$;

COMMIT;

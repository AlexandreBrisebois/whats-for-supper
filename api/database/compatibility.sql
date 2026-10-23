-- Task 3: extension installation is transactional and idempotent. The matching
-- GIN index is created by migrate.sh in its separate resumable concurrent step.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

BEGIN;

CREATE TABLE IF NOT EXISTS grocery_extra_occurrences (
    id uuid PRIMARY KEY,
    lineage_id uuid NOT NULL,
    predecessor_id uuid REFERENCES grocery_extra_occurrences(id) ON DELETE RESTRICT,
    week_start_date date NOT NULL,
    name text NOT NULL,
    normalized_key text NOT NULL,
    grocery_section text NOT NULL DEFAULT 'Grocery',
    checked boolean NOT NULL DEFAULT false,
    removed_at timestamptz,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT grocery_extra_occurrences_lineage_week_unique UNIQUE (lineage_id, week_start_date),
    CONSTRAINT grocery_extra_occurrences_predecessor_unique UNIQUE (predecessor_id),
    CONSTRAINT grocery_extra_occurrences_monday CHECK (EXTRACT(ISODOW FROM week_start_date) = 1),
    CONSTRAINT grocery_extra_occurrences_name CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 200),
    CONSTRAINT grocery_extra_occurrences_version CHECK (version >= 1),
    CONSTRAINT grocery_extra_occurrences_section CHECK (grocery_section IN ('Produce','Meat','Seafood','Dairy & Eggs','Frozen','Bakery','Pantry','Beverages','Deli','Grocery'))
);
CREATE INDEX IF NOT EXISTS idx_grocery_extra_occurrences_week ON grocery_extra_occurrences (week_start_date);
CREATE INDEX IF NOT EXISTS idx_grocery_extra_occurrences_normalized ON grocery_extra_occurrences (normalized_key);

-- Additive weekly-interest/rotation upgrade. No historical preference backfill;
-- a legacy false flag has unknown provenance, never inferred Human intent.
DO $$
BEGIN
    IF to_regclass('public.recipes') IS NOT NULL THEN
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rotation_human_off boolean NOT NULL DEFAULT false;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rotation_source text NOT NULL DEFAULT 'Unknown';
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cooked_suppressed boolean NOT NULL DEFAULT false;
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS supper_suitable boolean;
        CREATE TABLE IF NOT EXISTS weekly_household_interest (
            week_start_date date NOT NULL,
            recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
            positive_count integer NOT NULL,
            selected boolean NOT NULL,
            captured_at timestamptz NOT NULL,
            close_id uuid NOT NULL,
            PRIMARY KEY (week_start_date, recipe_id),
            CONSTRAINT weekly_interest_positive CHECK (positive_count > 0),
            CONSTRAINT weekly_interest_monday CHECK (EXTRACT(ISODOW FROM week_start_date) = 1)
        );
        CREATE TABLE IF NOT EXISTS voting_round_state (
            id integer PRIMARY KEY CHECK (id = 1), round_id uuid NOT NULL,
            week_start_date date, history_generation uuid NOT NULL,
            requires_round_identity boolean NOT NULL DEFAULT false
        );
    END IF;
    IF to_regclass('public.weekly_plans') IS NOT NULL THEN
        ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS voting_round_id uuid;
        ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS last_closed_round_id uuid;
        ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS requires_round_identity boolean NOT NULL DEFAULT false;
    END IF;
    IF to_regclass('public.recipe_search_affinity_facts') IS NOT NULL THEN
        ALTER TABLE recipe_search_affinity_facts ADD COLUMN IF NOT EXISTS live_vote_contribution integer;
    END IF;
END
$$;

-- Optional non-cooking metadata preserves all existing calendar rows.
DO $$
BEGIN
    IF to_regclass('public.calendar_events') IS NOT NULL THEN
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS non_cooking_kind text;
        ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS non_cooking_label text;
        -- Widen preset notes once; retain and validate existing rows. Accept the
        -- previous constraint marker while moving it to a sqldef-supported column.
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_non_cooking_check'
            AND conrelid = 'calendar_events'::regclass AND obj_description(oid, 'pg_constraint') IS DISTINCT FROM 'wfs-non-cooking-optional-notes-v1'
            AND col_description(conrelid, (SELECT attnum FROM pg_attribute WHERE attrelid = conrelid AND attname = 'non_cooking_label')) IS DISTINCT FROM 'wfs-non-cooking-optional-notes-v1') THEN
            ALTER TABLE calendar_events DROP CONSTRAINT calendar_events_non_cooking_check;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_non_cooking_check' AND conrelid = 'calendar_events'::regclass) THEN
            ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_non_cooking_check CHECK ((non_cooking_kind IS NULL AND non_cooking_label IS NULL) OR (non_cooking_kind IS NOT NULL AND status = 3 AND recipe_id IS NULL AND ((non_cooking_kind IN ('order_in', 'eating_out') AND (non_cooking_label IS NULL OR (char_length(btrim(non_cooking_label)) >= 1 AND char_length(btrim(non_cooking_label)) <= 80))) OR (non_cooking_kind = 'mystery' AND non_cooking_label IS NULL) OR (non_cooking_kind = 'custom' AND non_cooking_label IS NOT NULL AND char_length(btrim(non_cooking_label)) >= 1 AND char_length(btrim(non_cooking_label)) <= 80))));
        END IF;
        COMMENT ON COLUMN calendar_events.non_cooking_label IS 'wfs-non-cooking-optional-notes-v1';
        -- sqldef 3.11.23 exports constraint comments but panics when diffing them.
        COMMENT ON CONSTRAINT calendar_events_non_cooking_check ON calendar_events IS NULL;
    END IF;
END
$$;

-- Compatibility runs before sqldef. A fresh installation receives this table
-- from schema.sql after family_members is created; existing installations can
-- safely receive it here.
DO $$
BEGIN
    IF to_regclass('public.family_members') IS NOT NULL THEN
        ALTER TABLE family_members ADD COLUMN IF NOT EXISTS cooking_view_mode text;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_cooking_view_mode_check' AND conrelid = 'family_members'::regclass) THEN
            ALTER TABLE family_members ADD CONSTRAINT family_members_cooking_view_mode_check CHECK (cooking_view_mode IS NULL OR cooking_view_mode IN ('step-by-step', 'all-steps'));
        END IF;
        CREATE TABLE IF NOT EXISTS feature_flag_overrides (
            member_id uuid NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
            flag_key text NOT NULL,
            enabled boolean NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            PRIMARY KEY (member_id, flag_key)
        );
        -- These previews graduated to unconditional production behavior. Remove
        -- only their obsolete member choices; the reusable override store remains.
        DELETE FROM feature_flag_overrides
        WHERE flag_key = 'planner-hold-to-move'
           OR flag_key = 'preview-pdf-recipe-import'
           OR flag_key = 'single-page-recipe-steps';
        CREATE UNIQUE INDEX IF NOT EXISTS family_members_trimmed_lower_name_idx ON family_members (lower(trim(name)));
    END IF;
END
$$;

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
    IF to_regclass('public.maintenance_commands') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_maintenance_commands_terminal_completed
            ON public.maintenance_commands (completed_at, id)
            WHERE status IN ('completed', 'skipped');
    END IF;
END
$$;

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

BEGIN;

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
          AND pg_get_constraintdef(oid) NOT LIKE '%array_positions%'
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
                AND reasons <@ ARRAY['ingredients', 'steps']::text[]
                AND cardinality(array_positions(reasons, 'ingredients'::text)) <= 1
                AND cardinality(array_positions(reasons, 'steps'::text)) <= 1
            );
    END IF;
END
$$;

COMMIT;

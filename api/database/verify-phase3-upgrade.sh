#!/bin/sh
set -eu

# This is deliberately a self-contained disposable PostgreSQL cluster. It never
# uses the compose service, its named volume, a host port, or operator settings.
pre_schema_ref='b21beba266144668ded790bbdb9db3a7f5376fc6'
pre_schema_sha='6edfd3241cb4bde79354e0c1ca62abfb1a2dc52ecd5224261b2ac4d9e11cd6c7'
run_id="wfs-phase3-$$"
image="${run_id}-migration"
network="${run_id}-network"
postgres="${run_id}-postgres"
work_dir="$(mktemp -d)"
dry_plan="$work_dir/sqldef-dry-run.sql"

cleanup() {
    docker rm -f "$postgres" >/dev/null 2>&1 || true
    docker network rm "$network" >/dev/null 2>&1 || true
    rm -rf "$work_dir"
}
trap cleanup EXIT INT TERM

test "$(git show "${pre_schema_ref}:api/database/schema.sql" | shasum -a 256 | awk '{print $1}')" = "$pre_schema_sha"
git show "${pre_schema_ref}:api/database/schema.sql" > "$work_dir/pre-phase3-schema.sql"

docker build --tag "$image" api/database
docker network create "$network" >/dev/null
docker run --rm --detach --name "$postgres" --network "$network" \
    -e POSTGRES_USER=recipe_app \
    -e POSTGRES_PASSWORD=phase3_fixture_password \
    -e POSTGRES_DB=postgres \
    pgvector/pgvector:pg18-trixie >/dev/null

attempt=0
until docker exec "$postgres" pg_isready -U recipe_app -d postgres >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    test "$attempt" -lt 30 || { echo 'fixture PostgreSQL did not become ready' >&2; exit 1; }
    sleep 1
done

for database in phase3_dry phase3_upgrade; do
    docker exec "$postgres" createdb -U recipe_app "$database"
    docker exec -i "$postgres" psql -v ON_ERROR_STOP=1 -U recipe_app -d "$database" < "$work_dir/pre-phase3-schema.sql"
    docker exec -i "$postgres" psql -v ON_ERROR_STOP=1 -U recipe_app -d "$database" <<'SQL'
INSERT INTO family_members (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Phase 3 fixture');
INSERT INTO recipes (
    id, rating, added_by, name, is_discoverable, is_ready, is_vegetarian,
    vegetarian_classification_version, vegetarian_classified_at, ingredients,
    is_healthy_choice, dietary_profile
) VALUES (
    '00000000-0000-0000-0000-000000000010', 3, '00000000-0000-0000-0000-000000000001',
    'Vegetarian fixture', true, true, true, 7, '2026-09-25T12:00:00Z',
    '["lentils","tomato"]', true, '{"legacy":"discarded"}'::jsonb
);
INSERT INTO weekly_plans (id, week_start_date, grocery_state, grocery_items, balance_summary)
VALUES ('00000000-0000-0000-0000-000000000020', '2026-09-21', '{"lentils":"Pantry"}', '[{"name":"lentils"}]', '{"legacy":true}'::jsonb);
INSERT INTO calendar_events (id, recipe_id, date, status)
VALUES ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000010', '2026-09-22', 2);
INSERT INTO family_settings (id, key, value)
VALUES ('00000000-0000-0000-0000-000000000040', 'search-preferences', '{"cuisine":"Italian"}'::jsonb);
INSERT INTO recipe_search_documents (recipe_id, document_text, search_metadata, embedding_model)
VALUES ('00000000-0000-0000-0000-000000000010', 'Vegetarian fixture. Ingredients: lentils, tomato.', '{"isVegetarian":true}'::jsonb, 'fixture');
INSERT INTO health_events (id, event_type, entity_id) VALUES ('00000000-0000-0000-0000-000000000050', 'recipe_changed', '00000000-0000-0000-0000-000000000010');
INSERT INTO health_recipe_profiles (recipe_id, dietary_profile, fop_flags) VALUES ('00000000-0000-0000-0000-000000000010', '{"legacy":true}'::jsonb, '{"highSodium":true}'::jsonb);
INSERT INTO health_week_summaries (week_start_date, balance_summary, fop_week_summary) VALUES ('2026-09-21', '{"legacy":true}'::jsonb, '{"legacy":true}'::jsonb);
SQL
done

# The actual migration image's sqldef binary previews the candidate schema before
# compatibility.sql is applied. This gives an auditable destructive DDL plan.
docker run --rm --network "$network" -e PGPASSWORD=phase3_fixture_password --entrypoint /usr/local/bin/sqldef "$image" \
    -h "$postgres" -U recipe_app phase3_dry --enable-drop --dry-run -f /schema.sql > "$dry_plan"
cat "$dry_plan"
for expected in health_events health_recipe_profiles health_week_summaries is_healthy_choice dietary_profile balance_summary; do
    grep -qi "$expected" "$dry_plan" || { echo "dry-run plan omitted expected destructive target: $expected" >&2; exit 1; }
done
if grep -Eqi 'DROP (TABLE|COLUMN).*(family_members|calendar_events|recipe_search_documents|family_settings|recipes.*is_vegetarian)' "$dry_plan"; then
    echo 'dry-run plan attempts to drop a retained core store or vegetarian fact' >&2
    exit 1
fi

# Apply only to the named isolated fixture database; compatibility.sql performs
# the ordered view/table/column removal and sqldef recreates the final view.
docker run --rm --network "$network" \
    -e PGPASSWORD=phase3_fixture_password \
    -e POSTGRES_HOST="$postgres" \
    -e POSTGRES_USER=recipe_app \
    -e POSTGRES_DB=phase3_upgrade \
    "$image" \
    -h "$postgres" -U recipe_app phase3_upgrade --enable-drop -f /schema.sql

assert_final_schema() {
    database="$1"
    diagnostics_file="$work_dir/${database}-diagnostics.txt"
    docker exec -i "$postgres" psql -v ON_ERROR_STOP=1 -U recipe_app -d "$database" -tA <<'SQL' > "$diagnostics_file"
WITH checks AS (
    SELECT 'retired_tables_absent' AS name, (SELECT count(*) FROM unnest(ARRAY['health_events', 'health_recipe_profiles', 'health_week_summaries']) object_name WHERE to_regclass('public.' || object_name) IS NULL) = 3 AS passed
    UNION ALL SELECT 'retired_columns_absent', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'recipes' AND column_name IN ('is_healthy_choice', 'dietary_profile')) OR (table_name = 'weekly_plans' AND column_name = 'balance_summary')))
    UNION ALL SELECT 'discovery_view_clean', pg_get_viewdef('public.vw_discovery_recipes'::regclass) !~* '(is_healthy_choice|dietary_profile)'
    UNION ALL SELECT 'vegetarian_classifier_retained', (SELECT count(*) FROM recipes WHERE is_vegetarian AND vegetarian_classification_version = 7) = 1
    UNION ALL SELECT 'schedule_retained', (SELECT count(*) FROM calendar_events) = 1
    UNION ALL SELECT 'grocery_state_retained', (SELECT grocery_state FROM weekly_plans) = '{"lentils":"Pantry"}'::jsonb
    UNION ALL SELECT 'preference_retained', (SELECT count(*) FROM family_settings WHERE key = 'search-preferences') = 1
    UNION ALL SELECT 'search_document_retained', (SELECT search_metadata->>'isVegetarian' FROM recipe_search_documents) = 'true'
)
SELECT name || '=' || CASE WHEN passed THEN 'ok' ELSE 'failed' END FROM checks
UNION ALL
SELECT 'overall=' || CASE WHEN bool_and(passed) THEN 'ok' ELSE 'failed' END FROM checks;
SQL
    test -s "$diagnostics_file"
    cat "$diagnostics_file"
    grep -qx 'overall=ok' "$diagnostics_file"
}

assert_final_schema phase3_upgrade

# Clean creation travels the same migration image/path independently of upgrade.
docker exec "$postgres" createdb -U recipe_app phase3_clean
docker run --rm --network "$network" \
    -e PGPASSWORD=phase3_fixture_password \
    -e POSTGRES_HOST="$postgres" \
    -e POSTGRES_USER=recipe_app \
    -e POSTGRES_DB=phase3_clean \
    "$image" \
    -h "$postgres" -U recipe_app phase3_clean --enable-drop -f /schema.sql
docker exec -i "$postgres" psql -v ON_ERROR_STOP=1 -U recipe_app -d phase3_clean <<'SQL'
INSERT INTO family_members (id, name) VALUES ('00000000-0000-0000-0000-000000000101', 'Clean fixture');
INSERT INTO recipes (id, rating, added_by, name, is_discoverable, is_ready, is_vegetarian, vegetarian_classification_version, ingredients)
VALUES ('00000000-0000-0000-0000-000000000110', 3, '00000000-0000-0000-0000-000000000101', 'Clean vegetarian fixture', true, true, true, 7, '["lentils"]');
INSERT INTO weekly_plans (id, week_start_date, grocery_state, grocery_items)
VALUES ('00000000-0000-0000-0000-000000000120', '2026-09-21', '{"lentils":"Pantry"}', '[{"name":"lentils"}]');
INSERT INTO calendar_events (id, recipe_id, date, status)
VALUES ('00000000-0000-0000-0000-000000000130', '00000000-0000-0000-0000-000000000110', '2026-09-22', 2);
INSERT INTO family_settings (id, key, value)
VALUES ('00000000-0000-0000-0000-000000000140', 'search-preferences', '{"cuisine":"Italian"}'::jsonb);
INSERT INTO recipe_search_documents (recipe_id, document_text, search_metadata, embedding_model)
VALUES ('00000000-0000-0000-0000-000000000110', 'Clean vegetarian fixture. Ingredients: lentils.', '{"isVegetarian":true}'::jsonb, 'fixture');
SQL
assert_final_schema phase3_clean
echo 'Phase 3 isolated populated upgrade and clean-chain verification passed.'

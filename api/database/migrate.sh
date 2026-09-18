#!/bin/sh
set -eu

: "${PGPASSWORD:?PGPASSWORD is required}"

db_host="${POSTGRES_HOST:-postgres}"
db_user="${POSTGRES_USER:-recipe_app}"
db_name="${POSTGRES_DB:-recipe_app_db}"

# pg_trgm is additive. The GIN index must be built outside the compatibility
# transaction so populated installations do not take a table-writing lock.
psql \
    --host "$db_host" \
    --username "$db_user" \
    --dbname "$db_name" \
    --set ON_ERROR_STOP=1 \
    --command "CREATE EXTENSION IF NOT EXISTS pg_trgm"

if [ "$(psql --host "$db_host" --username "$db_user" --dbname "$db_name" --tuples-only --no-align --command "SELECT to_regclass('public.recipe_search_documents') IS NOT NULL")" = "t" ]; then
    if [ "$(psql --host "$db_host" --username "$db_user" --dbname "$db_name" --tuples-only --no-align --command "SELECT EXISTS (SELECT 1 FROM pg_index index_state JOIN pg_class index_class ON index_class.oid = index_state.indexrelid JOIN pg_namespace index_schema ON index_schema.oid = index_class.relnamespace WHERE index_schema.nspname = 'public' AND index_class.relname = 'idx_recipe_search_documents_document_trgm' AND NOT index_state.indisvalid)")" = "t" ]; then
        psql \
            --host "$db_host" \
            --username "$db_user" \
            --dbname "$db_name" \
            --set ON_ERROR_STOP=1 \
            --command "DROP INDEX CONCURRENTLY IF EXISTS idx_recipe_search_documents_document_trgm"
    fi
    psql \
        --host "$db_host" \
        --username "$db_user" \
        --dbname "$db_name" \
        --set ON_ERROR_STOP=1 \
        --command "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipe_search_documents_document_trgm ON recipe_search_documents USING gin (document_text gin_trgm_ops) WHERE index_status = 'ready'"
fi

psql \
    --host "$db_host" \
    --username "$db_user" \
    --dbname "$db_name" \
    --set ON_ERROR_STOP=1 \
    --file /compatibility.sql

exec sqldef "$@"

#!/bin/sh
set -eu

: "${PGPASSWORD:?PGPASSWORD is required}"

db_host="${POSTGRES_HOST:-postgres}"
db_user="${POSTGRES_USER:-recipe_app}"
db_name="${POSTGRES_DB:-recipe_app_db}"

psql \
    --host "$db_host" \
    --username "$db_user" \
    --dbname "$db_name" \
    --set ON_ERROR_STOP=1 \
    --file /compatibility.sql

exec sqldef "$@"

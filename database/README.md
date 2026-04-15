# Database

PostgreSQL 17. All schema changes are plain SQL migrations in `migrations/`, applied in filename order.

No extensions are required for Phase 0. `gen_random_uuid()` is a PostgreSQL built-in (v13+). pgvector is added in the Phase 3 migration when semantic search is introduced.

---

## Schema

```
┌─────────────────────────────────┐
│         family_members          │
├─────────────────────────────────┤
│ id              UUID       PK   │
│ name            VARCHAR(100) NN │
│ completed_tours JSONB  NN  '{}'│
│ created_at      TIMESTAMPTZ NN  │
│ updated_at      TIMESTAMPTZ NN  │
└─────────────────────────────────┘
             │
             │ added_by  FK  ON DELETE SET NULL
             ▼
┌─────────────────────────────────┐
│            recipes              │
├─────────────────────────────────┤
│ id         UUID        PK       │
│ rating     SMALLINT NN (0–3)    │
│ added_by   UUID     FK nullable │
│ notes      TEXT                 │
│ created_at TIMESTAMPTZ NN       │
│ updated_at TIMESTAMPTZ NN       │
└─────────────────────────────────┘

Indexes
  idx_recipes_created_at_desc  ON recipes(created_at DESC)
  idx_recipes_added_by         ON recipes(added_by) WHERE added_by IS NOT NULL
```

Columns for future phases are added in their own migrations, not pre-declared here:

| Column | Table | Added in |
|--------|-------|----------|
| `raw_metadata JSONB` | recipes | Phase 1 (import worker) |
| `ingredients JSONB` | recipes | Phase 1 (import worker) |
| `embedding VECTOR(1536)` | recipes | Phase 3 (semantic search) |

---

## Migration Files

| File | Contents |
|------|----------|
| `001_initial_schema.sql` | `family_members`, `recipes` |
| `002_add_indexes.sql` | List and FK indexes |

---

## Running Migrations Manually

```bash
# Against a running container
docker compose exec postgres \
  psql -U postgres -d recipes \
  -f /path/to/database/migrations/001_initial_schema.sql

# Via connection string from the host
psql "$POSTGRES_CONNECTION_STRING" -f database/migrations/001_initial_schema.sql
psql "$POSTGRES_CONNECTION_STRING" -f database/migrations/002_add_indexes.sql
```

Both files are idempotent — re-running them is safe.

---

## Auto-run on API Startup

The .NET API applies all `database/migrations/*.sql` files in filename order at
startup, before accepting traffic. Files already recorded in the internal
`_migrations` table are skipped. No manual migration step is needed after
`docker compose up`.

---

## Rollback

Migrations are forward-only. There are no down scripts.

**Development** — recreate from scratch:
```bash
docker compose down -v   # destroys the postgres volume
docker compose up        # schema recreated on next startup
```

**Staging / production** — write a new forward migration that undoes the change
and deploy it normally.

# Session 1: Database Schema & Migrations

**Artifact:** `database/migrations/` folder with SQL files

**Context needed:** Just the Phase 0 spec

**What to build:**
- `database/migrations/001_initial_schema.sql` — Create tables (family_members, recipes)
- `database/migrations/002_add_indexes.sql` — Add required indexes
- `database/README.md` — How to run migrations

**Success:** 
- Tables created correctly
- Indexes optimize query performance
- Migration files are idempotent

---

## Prompt

```
Task: Create Phase 0 database schema and migrations

You are building the database foundation for Phase 0 MVP of "What's For Supper".

Read these requirements:
- Phase 0 spec: src/specs/phase0-mvp.spec.md (section 1.3: PostgreSQL Schema)
- Use PostgreSQL 17 with pgvector extension
- Create two tables: family_members and recipes
- Add required indexes for performance

Deliverables:
1. database/migrations/001_initial_schema.sql
   - family_members table (id, name, created_at, updated_at, completed_tours JSONB)
   - recipes table (id, rating, added_by, notes, raw_metadata, ingredients, embedding, created_at, updated_at)
   - Foreign key: recipes.added_by → family_members.id
   - Constraints: rating check (0-3)
   - Extensions: uuid-ossp, pgvector

2. database/migrations/002_add_indexes.sql
   - Index on recipes.created_at DESC (for list queries)
   - Any other performance indexes

3. database/README.md
   - How to run migrations manually
   - How migrations are auto-run on API startup
   - How to rollback if needed
   - Schema diagram (ASCII art)

Requirements:
- Use standard PostgreSQL syntax (compatible with Flyway/Entity Framework migrations)
- Make migrations idempotent (safe to run multiple times)
- Include comments explaining complex parts
- Timestamp fields use TIMESTAMPTZ NOT NULL DEFAULT NOW()
- All IDs use UUID with DEFAULT gen_random_uuid()

Start by creating the migration files. Verify they are syntactically correct.
```

---

## What to Expect

After this session, you should have:
- ✅ Two SQL migration files ready to version control
- ✅ Migration files that can be run via `psql` or Entity Framework
- ✅ Clear documentation on how migrations work
- ✅ A schema ready for Session 2 (API Foundation)

## Next Steps

1. Verify migrations are syntactically correct (can be parsed by PostgreSQL)
2. Commit: `git commit -m "session 1: database schema and migrations"`
3. Move to Session 2


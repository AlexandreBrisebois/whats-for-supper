---
name: database
description: Procedural guidance for managing PostgreSQL schema and migrations using psqldef and EF Core.
---

# Database and schema evolution

Follow [contract/testing](../../core/contract-testing.md) and the selected scope:
approved schema/API intent → regression tests → implementation. Persistence has
its own representation: API DTOs need not match tables, views, JSONB or workflow
rows one-to-one. Verify conversions, constraints, nullability and EF mappings in
`api/src/RecipeApi/Data/RecipeDbContext.cs` and the affected Models/Dto files.
Do not copy an API schema into storage or guess vector dimensions from examples.

`api/database/schema.sql` owns clean-install declarative DDL;
`api/database/compatibility.sql` handles existing-database transitions;
`api/database/migrate.sh` runs the migration sequence. Update all affected SQL,
EF mappings and tests, including backup/restore dependencies when applicable.
Use the repository's fluent EF configuration and existing mapping conventions.

## Preview and application

Run from the repository root after verifying the target database, Compose inputs
and authorized effects. Inspect generated SQL before applying it.

| Operation | Command | Coverage / effect |
|---|---|---|
| Schema preview | `task db:schema:push DRY_RUN=true` | psqldef dry-run of schema.sql only; does not preview compatibility.sql |
| Apply migration | `task migrate` | Compose migration sidecar, including compatibility SQL; changes the configured DB |
| Start database | `task dev:db` | Starts configured PostgreSQL service |
| Database shell | `task shell:db` | Interactive access to configured DB |
| Export schema | `task db:schema:pull` | Overwrites schema.sql from live DB; inspect and preserve local edits first |

Review compatibility SQL separately; schema-only preview cannot establish safety
of the full migration. Declarative tooling can still produce destructive changes.
Schema application must never silently reset data. Reset, DROP, truncate, volume
removal, reseeding or restore require explicit authorization covering the data and
environment; routine schema authorization does not imply them. Never substitute
`task dev:clean:sync` for schema apply: it removes volumes and images. No implicit
fallback to reset when migration fails. Report the failure and continue only safe,
authorized work. Do not overwrite approved DDL to match incidental live drift.

Verify clean-install and existing-data paths when applicable. Assert persisted
rows and constraints as well as API behavior. In-memory tests and static SQL/EF
comparison do not establish live PostgreSQL parity. Record unavailable DB checks
as blocked. Use the shared execution harness for applicable completion checks.

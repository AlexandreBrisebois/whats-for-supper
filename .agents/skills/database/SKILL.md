---
name: database
description: Change or review WFS PostgreSQL schema, migrations, EF mappings, queries, indexes and persistence concurrency. Use when PostgreSQL storage or provider behavior is in scope.
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

## Select evidence and versions

Start with the affected requirement under `openspec/specs/`, then its regression
assertions and current SQL/service code. Search and indexing have separate owners;
backup/recovery distinguishes merge restore from exact replacement. Preserve their
qualifications rather than inferring guarantees from test names or code comments.

Resolve PostgreSQL/pgvector from the selected Compose files, migration tooling from
`api/database/Dockerfile`, and EF/Npgsql/Pgvector.NET from the affected `.csproj`,
`api/Directory.Build.props` and `packages.lock.json` files. Image tags and locks
declare inputs; they do not establish installed extensions or running versions.
Use matching [PostgreSQL manuals](https://www.postgresql.org/docs/),
[Npgsql provider documentation](https://www.npgsql.org/efcore/) and
[pgvector release documentation](https://github.com/pgvector/pgvector#readme).
Check the selected package/release metadata before adopting a current-doc example.

Load only the evidence relevant to the selected persistence decision:

| Decision | Existing evidence to inspect |
|---|---|
| Schema transitions and constraints | `SchemaIntegrityTests.cs` (static/model assertions) and `NonCookingPostgresTests.cs`, `RecipeImportReportPostgresTests.cs` (database assertions) |
| Search SQL, filtering, vectors or plans | `recipe-search` and `search-indexing` specs; `RecipeLexicalSearchPostgresTests.cs` and `RecipeSearchFilterMaterializerPostgresTests.cs` |
| Concurrent grocery writes | `grocery-shopping` spec; `GroceryCheckConcurrencyPostgresTests*.cs`; `GroceryCheckCoordinator.cs` for the single-instance processing boundary |
| Backup/restore dependencies | `data-backup-and-recovery` spec; `OnlineRecoveryPostgresTests.cs` and the affected merge/sidecar tests |

Tests above live under `api/src/RecipeApi.Tests/Integration/`; service owners live
under `api/src/RecipeApi/Services/`. For query work, inspect parameter binding,
provider translation and index/operator compatibility in the actual execution path.
The existing search repositories use bound `NpgsqlParameter` values. Do not infer
plan use or recall from an index declaration. PostgreSQL-specific transactions,
isolation and lock effects belong here; .NET scope/cancellation/disposal belong to
[dotnet-dev](../dotnet-dev/SKILL.md).

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
Inspect `migrate.sh` end to end: extension and concurrent-index presteps run before
the compatibility transaction, followed by psqldef. The full sequence is not atomic.
For affected populated tables, review lock scope/duration, partial completion and
retry behavior. Preserve concurrent-index work outside transaction blocks and its
invalid-index recovery; consult the selected PostgreSQL major's `CREATE INDEX`
and explicit-locking documentation. Plan experiments belong in authorized isolated
fixtures; `EXPLAIN ANALYZE` executes the query and is not a read-only preview.

Schema application must never silently reset data. Reset, DROP, truncate, volume
removal, reseeding or restore require explicit authorization covering the data and
environment; routine schema authorization does not imply them. Never substitute
`task dev:clean:sync` for schema apply: it removes volumes and images. No implicit
fallback to reset when migration fails. Report the failure and continue only safe,
authorized work. Do not overwrite approved DDL to match incidental live drift.

Verify clean-install and existing-data paths when applicable. Assert persisted
rows and constraints as well as API behavior. In-memory tests and static SQL/EF
comparison do not establish live PostgreSQL parity. Record unavailable DB checks
as blocked. Select PostgreSQL feedback through the shared
[database runner guidance](../../core/execution-harness.md#effects-blockers-and-supporting-commands),
including `task test:database`; its prerequisites, effects and completion checks
remain owned there. Reading a fixture or a static assertion is not a passing run.

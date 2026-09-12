# ADR 021: Transition to State-Based Schema Management (psqldef)

## Context
As the project moves toward more complex database features (pgvector, custom views, and non-destructive migrations), Entity Framework (EF) Migrations have become a source of friction. The declarative nature of EF often obscures the raw SQL and makes it difficult to manage complex Postgres-specific extensions and views.

## Decision
We have officially replaced EF Migrations with `psqldef`. 

- **State-of-Truth**: [api/database/schema.sql](file:///Users/alex/Code/whats-for-supper/api/database/schema.sql) is the authoritative DDL.
- **Automation**: Database migrations are applied automatically on `task up` via a sidecar container in Docker Compose.
- **Non-Destructive**: `psqldef` is configured to perform "safe" diffs, ensuring migrations are non-destructive by default.
- **ORM Role**: EF Core remains our Data Access Layer (DAL) and Mapper, but its "Migration" features are strictly disabled.

## Consequences
- **Developer Workflow**: Schema changes MUST be made in `api/database/schema.sql` first.
- **C# Models**: Developers must manually keep C# Entities in sync with the SQL schema (POCO-first, but Schema-authoritative).
- **Tooling**: Developers must have the `psqldef` container running or `psqldef` binary installed for local schema updates.

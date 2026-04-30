---
name: database
description: Procedural guidance for managing PostgreSQL schema and migrations using psqldef and EF Core.
---

# Skill: Database & Schema Evolution (PostgreSQL)

This skill provides the operational logic for modifying the PostgreSQL database schema using a declarative, non-destructive approach with `psqldef`.

## 1. The Database Integrity Mission
**Objective**: Maintain a consistent, version-controlled database schema that aligns perfectly with Backend models.
- **Principle**: `api/database/schema.sql` is the Source of Truth for the schema (Declarative DDL).
- **Tooling**: `psqldef` is used to synchronize the database with the schema file.
- **PostgreSQL Focus**: We leverage `pgvector` for vector-based recipe searches and advanced indexing.
- **Safety**: Migrations must be non-destructive. Avoid dropping columns or tables unless absolutely necessary and approved.

## Sequence of Work
Follow this strict sequence for every database or model change:

1.  **Authoritative Schema Update**: Update `api/database/schema.sql` first to reflect the desired state (new tables, columns, indexes). Use `IF NOT EXISTS` for new objects.
2.  **Model & DbContext Alignment**: Update C# entity classes and `RecipeDbContext.cs` to match the schema. Use `[Table]` and `[Column]` attributes to ensure 1:1 parity with snake_case database names.
3.  **Dry Run**: Verify the impact of the changes without applying them:
    -   `task db:schema:push DRY_RUN=true`
4.  **Application**: Apply the changes to the development database (runs `psqldef` via the migration sidecar):
    -   `task migrate`
5.  **Drift Audit**: Verify that the C# models and the database schema are in perfect sync. No missing properties, type mismatches, or naming discrepancies.

## Definition of Done
- [ ] `schema.sql` contains the new DDL and is the Source of Truth.
- [ ] All new objects use `IF NOT EXISTS` and no unintended `DROP` statements are present.
- [ ] C# Models have explicit `[Table]` and `[Column]` attributes mapping to snake_case database names.
- [ ] `RecipeDbContext` identifies all entities and views correctly.
- [ ] `task db:schema:push DRY_RUN=true` reports no pending changes (Database matches `schema.sql`).
- [ ] The API builds and starts successfully, and the changes are reflected in the database.

## 2. Operations & Commands
Execute these commands from the project root.

| Operation | Tool / Command |
| :--- | :--- |
| **Apply Migrations** | `task migrate` |
| **Dry Run Migration** | `task db:schema:push DRY_RUN=true` |
| **Pull Schema from DB** | `task db:schema:pull` |
| **Database Shell** | `task shell:db` |
| **Start Database** | `task dev:db` |
| **Seed Test Data** | `task seed` |

## 3. Operational Directives
1.  **Monorepo Pathing**: Always run migration commands from the project root.
2.  **Declarative Priority**: Never manually edit the database schema using a shell unless you immediately sync the changes back to `schema.sql` using `task db:schema:pull`.
3.  **Vector Support**: Always ensure `CREATE EXTENSION IF NOT EXISTS vector;` is at the top of the schema file.
4.  **Non-Destructive**: Avoid `DROP` statements in the primary schema file unless decommissioning a feature or specifically approved.
5.  **C# Standards**: Maintain parity between `schema.sql` (snake_case) and C# Models (PascalCase with explicit mapping).

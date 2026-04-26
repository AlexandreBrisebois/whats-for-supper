---
name: database-schema-evolution
description: Procedural guidance for managing PostgreSQL database schema and migrations using Entity Framework Core (EF Core).
---

# Skill: Database & Schema Evolution (PostgreSQL)

This skill provides the operational logic for modifying the PostgreSQL database schema and ensuring data integrity across environments.

## 1. The Database Integrity Mission
**Objective**: Maintain a consistent, version-controlled database schema that aligns perfectly with the Backend models.
- **Principle**: The code is the Source of Truth for the schema (Code-First).
- **PostgreSQL Focus**: We leverage PostgreSQL-specific features including `pgvector` for vector-based recipe searches and advanced indexing.

## 2. Schema Evolution Workflow
Follow this sequence for every model or schema change:

1.  **Model Modification**: Update the C# entity classes in the `api/` project.
2.  **Migration Creation**: Generate a new migration file that captures the changes using the local `dotnet ef` tool.
3.  **Snapshot Review**: Inspect the generated migration `.cs` files and the `DbContextModelSnapshot` to ensure intent matches output.
4.  **Application**: Apply the migration to the PostgreSQL development database.
5.  **Validation**: Verify that the API starts successfully and the schema changes are reflected in the database.

## 3. Operations & Commands
Execute these commands from the project root.

| Operation | Tool / Command |
| :--- | :--- |
| **Start Database** | `task dev:db` |
| **Apply Migrations** | `task migrate` (Runs against the API container) |
| **Add New Migration** | `dotnet ef migrations add [Name] --project api/src/RecipeApi --startup-project api/src/RecipeApi` |
| **Seed Test Data** | `task seed` |
| **Database Shell** | `task shell:db` |
| **Health Check** | `task health` |

## 4. Operational Directives
1.  **Monorepo Pathing**: Always run migration commands from the project root. Do not change directories into the `api/` folder.
2.  **Tooling Recovery**: If `dotnet ef` is not found, run `dotnet tool restore` in the `api/` directory to re-initialize the local tools.
3.  **Snapshot Protection**: Never manually edit the `DbContextModelSnapshot`. If a migration is incorrect, remove it using `dotnet ef migrations remove` and try again.
4.  **Container Dependency**: Ensure the PostgreSQL container is healthy (`task health`) before attempting to apply migrations or seed data.
5.  **C# Standards**: Use Primary Constructors and File-Scoped Namespaces for all new Entity models to maintain consistency with the .NET 10 stack.

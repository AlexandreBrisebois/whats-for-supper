# Skill: Database & EF Core Migrations

Procedural guidance for managing the PostgreSQL database schema using Entity Framework Core.

## 1. Migration Workflow
Always run EF migrations from the root directory to utilize the monorepo paths correctly.

### Add a Migration
```bash
dotnet ef migrations add [MigrationName] \
  --project api/src/RecipeApi/RecipeApi.csproj \
  --startup-project api/src/RecipeApi/RecipeApi.csproj
```

### Apply Migrations
The API auto-migrates on startup, but to apply manually:
```bash
dotnet ef database update \
  --project api/src/RecipeApi/RecipeApi.csproj \
  --startup-project api/src/RecipeApi/RecipeApi.csproj
```

## 2. Troubleshooting
- **Missing Tool**: If `dotnet ef` fails, run `dotnet tool restore` in the `api/` directory.
- **Connection Errors**: Ensure the Docker daemon is running and the database container is healthy before applying migrations.
- **Namespace Issues**: Use primary constructors and file-scoped namespaces (C# 12/13+ standards) for new model entities.

## 3. Verification
- After adding a migration, check `api/src/RecipeApi/Data/Migrations/` for the new `.cs` files.
- Verify `RecipeDbContextModelSnapshot` was updated.

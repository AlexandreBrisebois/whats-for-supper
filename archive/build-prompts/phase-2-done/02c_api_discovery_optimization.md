# Prompt 02c: Optimization - Partial Discovery Index (SQL)

**Context:** The discovery system is operational, but we want to ensure it stays performant as the recipe library grows. Since "Discoverable" recipes are a subset of the total library, a standard index on the `IsDiscoverable` column is less efficient than a **Partial Index**.

**Goal:** Implement a PostgreSQL Partial Index in `RecipeDbContext` and remove redundant indexes.

**Instructions:**

1. **DbContext Configuration:**
   - Update `api/src/RecipeApi/Data/RecipeDbContext.cs`.
   - Locate the existing index for `IsDiscoverable`:
     ```csharp
     entity.HasIndex(e => e.IsDiscoverable)
           .HasDatabaseName("idx_recipes_is_discoverable");
     ```
   - **Replace** it with a more targeted **Partial Index** on `Category` and `Id` where `is_discoverable` is true:
     ```csharp
     entity.HasIndex(e => new { e.Category, e.Id })
           .HasFilter("is_discoverable = TRUE")
           .HasDatabaseName("idx_recipes_discovery_lookup");
     ```
   - *Rationale:* This makes the index much smaller and specifically optimizes the `GetRecipesForDiscoveryAsync` and `GetAvailableCategoriesAsync` queries which filter by `IsDiscoverable` and `Category`.

2. **Database Migration:**
   - Create a new migration: `dotnet ef migrations add OptimizationPartialDiscoveryIndex`.
   - Verify that the migration:
     - Drops `idx_recipes_is_discoverable`.
     - Creates `idx_recipes_discovery_lookup` with the `WHERE is_discoverable = TRUE` filter.

3. **Execution:**
   - Run the migration: `task db:migrate` (or `dotnet ef database update`).

4. **Verification:**
   - Run the API in development mode.
   - Run `dotnet test api/src/RecipeApi.Tests` to ensure no regressions in discovery logic.
   - (Optional) Use a tool like `pgAdmin` or `psql` to verify the index exists:
     `SELECT * FROM pg_indexes WHERE indexname = 'idx_recipes_discovery_lookup';`

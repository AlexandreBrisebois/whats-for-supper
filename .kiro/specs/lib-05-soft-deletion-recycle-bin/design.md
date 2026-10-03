# LIB-05 — Soft deletion and recycle bin: design

`RecipeDetailSheet` initiates soft delete through `deleteRecipe`. `RecycleBinSheet` owns an isolated mounted list, restoring ID set, and PIN dialog state; it removes local items only after accepted restore/purge. It has no global invalidation or fetch retry.

The generated client provides trash/restore; purge uses native fetch so non-2xx handling is explicit. `RecipeController` delegates delete/restore to recipe service and purge to `RecipePurgeService`; OpenAPI defines the public shapes.

Evidence: `RecycleBinSheet.tsx`, `RecipeDetailSheet.tsx`, `recipes.ts`, `soft-delete-contract.test.ts`, `RecipeSoftDeleteIntegrationTests.cs`, `RecipeController.cs`, `RecipePurgeService.cs`, and OpenAPI.

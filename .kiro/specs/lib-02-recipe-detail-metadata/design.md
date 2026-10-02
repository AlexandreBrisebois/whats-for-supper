# LIB-02 — Recipe detail and metadata: design

`RecipeDetailSheet.tsx` owns a fetched `Recipe`, view/edit controls, drafts, notes/rating, and per-action flags. `getRecipe` and `updateRecipe` in `recipes.ts` use the generated client and map DTOs to the screen model. `RecipeController` delegates retrieval/update to `RecipeService`, which owns persistence and update semantics.

The edit submit awaits PATCH before committing the composed local record. Notes and rating take different optimistic paths: notes schedule an unawaited PATCH and display Saved; rating sets local state then awaits PATCH without recovery. Future consistency work must decide server-response reconciliation and request ordering at this seam.

Evidence: `RecipeDetailSheet.tsx/.test.tsx`, `recipes.ts/.test.ts`, `RecipeController.cs`, `RecipeService.cs`, and `specs/openapi.yaml`.

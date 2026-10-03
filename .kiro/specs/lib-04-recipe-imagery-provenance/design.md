# LIB-04 — Recipe imagery and provenance: design

`RecipeDetailSheet` opens `OriginalPhotosViewer` from recipe image count/index, invokes native-fetch upload through `uploadRecipeOriginal`, and invokes generated-client regeneration. The viewer derives `/api/recipes/{recipeId}/original/{photoIndex}` directly and does not fetch metadata or retain load state.

`RecipeController` delegates original upload and hero regeneration to `ImageService`/workflow machinery; the client receives start feedback, not a completion contract. Image URL normalization lives in `imageUtils` for display surfaces.

Evidence: `OriginalPhotosViewer.tsx`, `RecipeDetailSheet.tsx`, `recipes.ts`, `imageUtils.ts/.test.ts`, `RecipeController.cs`, `ImageService.cs`, workflows, and OpenAPI.

# SEARCH-04 — Context-aware search: design
> Status: **Implemented capability baseline**.

`RecipesPage` reads `addToDay`, `weekOffset`, `open`, and initial `similarTo`. It passes context to `searchRecipes` and selected recipes to `slotAssignment.ts`. That helper reads `GET /api/schedule`, assigns via `POST /api/schedule/assign`, and resolves occupancy with day DELETE or move/defer POST. The page owns recovery dialog/navigation. `RecipeSearchService` selects similar retrieval for a source ID and planner-aware reranking only when week and day are both present. Evidence: `page.test.tsx`, `slotAssignment.test.ts`, `RecipeSearchIntegrationTests`, and similarity evaluation tests. SEARCH-01 owns common search; planner owns mutations/SSE reconciliation.

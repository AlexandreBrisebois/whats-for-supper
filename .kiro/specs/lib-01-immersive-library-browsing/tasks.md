# LIB-01 — Immersive library browsing: follow-up candidates

- [ ] **T1 — Distinguish initial search failure from no results.**

  **Test seam:** unit/API: `recipes.test.ts`, `page.test.tsx`, search integration tests; Playwright: initial search 5xx versus empty response and retry; mock owner: Recipes page/search slice; route/method: `POST /api/recipes/search`; contract: `RecipeSearchRequestDto` to `RecipeSearchResponseDto` and documented 400/409/5xx shapes.

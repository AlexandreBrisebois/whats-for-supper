# LIB-02 — Recipe detail and metadata: follow-up candidates

- [ ] **T1 — Make notes/rating persistence recoverable.** Decide pending/error/rollback and response ordering for rapid edits.

  **Test seam:** unit/API: `RecipeDetailSheet.test.tsx`, `recipes.test.ts`, recipe update integration tests; Playwright: edit notes/rating rapidly, then force PATCH failure and remote change; mock owner: detail metadata slice; route/method: `PATCH /api/recipes/{id}`; contract: partial `UpdateRecipeDto` request and updated recipe success/error response.

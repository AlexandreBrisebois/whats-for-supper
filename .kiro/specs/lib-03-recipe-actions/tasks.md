# LIB-03 — Recipe actions: follow-up candidates

- [ ] **T1 — Audit action eligibility and failure feedback.** Make unavailable action policy server-aligned and expose bin/action failures consistently.

  **Test seam:** unit/API: `RecipeDetailSheet.test.tsx`, `ActionGearMenu.test.tsx`, recipe action integration tests; Playwright: ineligible recipe and failed delete/discovery/GOTO actions; mock owner: recipe-action vertical slice; route/method: `PATCH`/`DELETE /api/recipes/{id}` and `PUT /api/goto`; contract: partial update, delete success/non-success, and `{ items: GoToItem[] }` GOTO request.

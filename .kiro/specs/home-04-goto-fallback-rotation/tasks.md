# HOME-04 — GOTO fallback rotation: follow-up candidates

- [ ] **T1 — Decide whether GOTO needs genuine rotation semantics.** If needed, define server-owned selection policy and durable state; do not place it in Home.

  **Test seam:** unit/API: `GoToIntegrationTests.cs` and `GotoSynthesisIntegrationTests.cs`; Playwright: repeated empty-night Home visits with ready entries; mock owner: GOTO service plus HOME-02 consumer slice; route/method: `GET /api/goto/active`; contract: `{ data: GoToItem }` or 404, with approved metadata added contract-first.

- [ ] **T2 — Resolve concurrent replacement and legacy migration.** Decide version/merge and a bounded migration for legacy GOTO shapes.

  **Test seam:** unit/API: `GoToIntegrationTests.cs`, `FamilyGOTOSettings.test.tsx`, and `RecipeDetailSheet.test.tsx`; Playwright: two settings/recipe-detail editors change a list; mock owner: GOTO list slice; route/method: `GET`/`PUT /api/goto`; contract: `{ items: GoToItem[] }` request and `{ data: GoToListDto }` response, plus approved conflict shape if introduced.

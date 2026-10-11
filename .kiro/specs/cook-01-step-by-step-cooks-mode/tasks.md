# COOK-01 — Step-by-step Cook's Mode future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **COOK-01-T1 — Guard or cancel stale recipe-detail loads.** Define the expected behavior when Cook's Mode changes recipe or closes while its detail fetch is pending.
  - **Test seam:** `CooksMode.test.tsx` and recipe API mock tests; Playwright: open recipe A, switch/close, then resolve A after recipe B is active and confirm B remains visible; mock owner: this COOK-01 vertical slice; `GET /api/recipes/{id}`; response is the existing recipe-detail object or documented failure.

- [ ] **COOK-01-T2 — Complete verification of recipe-specific cooking.** The authorized behavior is implemented: both entries record the viewed recipe's cooking history, and only a matching current-day meal is completed. Focused PWA tests, TypeScript, and affected-file lint passed; API/database tests, browser acceptance, and regenerated-client verification remain blocked by missing .NET and environment restrictions. This task remains open for those checks.
  - **Test seam:** `CooksMode.test.tsx`, `todayStore.test.ts`, `cooking-contract.test.ts`, `ScheduleServiceTests.cs`, and `RecipeCookingIntegrationTests.cs`; Playwright: `cook-mode-steps.spec.ts`, complete from each entry with matching/different/no planned supper and exercise failed-save retry; mock owner: this COOK-01/Home vertical slice; `POST /api/schedule/day/{date}/validate`; request `{ status: 2, recipeId }`, response `{ data: { message, mealMarkedCooked } }`. Verify that lunch changes its filtering/rotation timestamp without completing a different supper, and matching supper completion remains available.

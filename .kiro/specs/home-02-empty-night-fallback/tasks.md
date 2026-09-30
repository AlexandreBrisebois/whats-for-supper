# HOME-02 — Empty-night fallback: follow-up candidates

- [ ] **T1 — Resolve Quick Find exhaustion behavior.** Decide whether exhausted suggestions must stop at the nudge/search action; retain API cardinality as authority.

  **Test seam:** unit/API: `QuickFindModal.test.tsx`, `ScheduleIntegrationTests`; Playwright: Home Quick Find at 0, 1, 2, 4, and 5 suggestions; mock owner: Quick Find/Home slice; route/method: `GET /api/schedule/fill-the-gap?weekOffset=0`; contract: `{ data: ScheduleRecipeDto[] }`, maximum five records.

- [ ] **T2 — Distinguish lookup/assignment failure from empty fallback.** Define recovery and confirmation without duplicating HOME-04 eligibility.

  **Test seam:** unit/API: `HomeCommandCenter.test.tsx`, `todayStore.test.ts`, GOTO/schedule integration tests; Playwright: active-GOTO 404, 5xx, and rejected assignment; mock owner: Home fallback slice; route/method: `GET /api/goto/active`, `POST /api/schedule/assign`; contract: active `{ data: GoToItem }`/404 and `AssignScheduleDto` to `{ message, displacedRecipe? }`.

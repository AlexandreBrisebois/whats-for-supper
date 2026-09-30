# PLAN-02 — Meal assignment and replacement: follow-up candidates

- [ ] **T1 (optional) — Reconcile the assignment-displacement contract.** Decide whether every occupied assignment must return an explicit disposition or whether Sunday-only carry-forward is the intended contract; update client behavior and OpenAPI together only after that decision.
  **Test seam:** `slotAssignment.test.ts`, `weekStore.test.ts`, `ScheduleIntegrationTests.cs`; Playwright scenario: replace occupied weekday and Sunday slots from Quick Find; mock owner: planner assignment vertical slice; route/method: `POST /api/schedule/assign`; expected contract: `{ data: { message, displacedRecipe?: { id, name?, movedToWeekOffset, movedToDayIndex } } }`.

- [ ] **T2 (optional) — Make recovery outcome explicit.** Design recovery for “old meal moved, assignment failed”, including whether compensation is possible or the refreshed plan is the final outcome.
  **Test seam:** planner-page and slot-assignment tests plus API integration tests; Playwright scenario: defer succeeds and assignment fails; mock owner: planner replacement vertical slice; route/method: `POST /api/schedule/defer` then `POST /api/schedule/assign`; expected contracts: `DeferScheduleResultDto` then assignment envelope/error.

- [ ] **T3 (optional) — Localize and audit replacement interaction.** Replace literal pivot/Quick Find copy and verify keyboard/focus behavior according to the shared accessibility packet.
  **Test seam:** `QuickFindModal.test.tsx`, `PlanningPivotSheet.test.tsx`; Playwright scenario: keyboard open, choose, and dismiss replacement UI in each locale; mock owner: planner replacement vertical slice; route/method: `GET /api/schedule/fill-the-gap`; expected contract: `{ data: ScheduleRecipeDto[] }`.

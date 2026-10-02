# HOME-03 — Changed-plan recovery: follow-up candidates

- [ ] **T1 — Specify recoverable partial-failure UX.** Decide user-visible state for validation followed by failed move/defer/drop, including whether an atomic server command is warranted.

  **Test seam:** unit/API: `HomeCommandCenter.test.tsx`, `ScheduleIntegrationTests`; Playwright: Ordering In then failed second-step operations; mock owner: Home recovery slice; route/method: validate, move, defer, remove; contract: `{ status: 3 }`, `MoveScheduleDto`, `{ sourceDate, recipeId }` (200/404/409), and 204 removal.

- [ ] **T2 — Decide replacement/displacement confirmation.** Preserve the original outcome and expose displacement without moving schedule policy into Home.

  **Test seam:** unit/API: `HomeCommandCenter.test.tsx`, `todayStore.test.ts`, schedule assignment integration tests; Playwright: replacement after move/defer/drop including Sunday displacement; mock owner: Home recovery/assignment slice; route/method: `POST /api/schedule/assign`; contract: `AssignScheduleDto` to `{ message, displacedRecipe? }`.

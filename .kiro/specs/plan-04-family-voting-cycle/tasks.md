# PLAN-04 — Family voting cycle: follow-up candidates

- [ ] **T1 (optional) — Decide household isolation for voting.** Reconcile the product’s household language with globally queried `RecipeVotes`, thresholds, and lock purge before changing schema or service behavior.
  **Test seam:** `DiscoveryServiceTests.cs`, `ScheduleServiceTests.cs`, discovery/schedule integration tests; Playwright scenario: two households vote and lock independently; mock owner: voting vertical slice; route/method: `POST /api/discovery/{id}/vote`, `POST /api/schedule/lock`; expected contracts: `{ vote }` request and `{ data: { message } }` responses, with approved household scoping semantics.

- [ ] **T2 (optional) — Make close-voting promotion atomic or recoverable.** Decide the intended outcome when one pending assignment fails before lock, then implement and document the transaction/recovery boundary.
  **Test seam:** `weekStore.test.ts`, `ScheduleServiceTests.cs`, schedule integration tests; Playwright scenario: one smart-default promotion fails while closing voting; mock owner: planner voting vertical slice; route/method: `POST /api/schedule/assign` then `POST /api/schedule/lock`; expected contracts: assignment `displacedRecipe?` envelope and lock `{ data: { message } }`.

- [ ] **T3 (optional) — Support or explicitly reject future-week consensus updates.** Align threshold event publication and client offset filtering with the approved planning-week policy.
  **Test seam:** `useScheduleStream.test.ts`, `weekStore.test.ts`, API event tests; Playwright scenario: open next-week voting and cross threshold from another member; mock owner: voting/SSE vertical slice; route/method: `GET /api/schedule/{weekOffset}/smart-defaults`, `GET /api/stream`; expected contract: `SmartDefaultsDto` and `smart_defaults_updated { weekOffset, defaults }`.

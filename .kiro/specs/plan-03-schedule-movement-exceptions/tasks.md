# PLAN-03 — Schedule movement and exceptions: follow-up candidates

- [ ] **T1 (optional) — Specify failed/full move feedback and result shape.** Decide whether a full target week or ignored source is a conflict and expose a user-recoverable result instead of a silent no-op.
  **Test seam:** `weekStore.dragDebounce.test.ts`, `slotAssignment.test.ts`, `ScheduleIntegrationTests.cs`; Playwright scenario: drag to full target week and invoke Plan Later; mock owner: planner movement vertical slice; route/method: `POST /api/schedule/move`; expected contract: current `{ data: { message } }` or an approved conflict envelope with no ambiguous success.

- [ ] **T2 (optional) — Reconcile grocery state after same-week moves.** Establish whether grocery derivation must change when schedule dates swap and add recomputation only if evidence supports it.
  **Test seam:** ScheduleService/API tests and grocery tests; Playwright scenario: swap scheduled recipes and inspect the current week grocery list; mock owner: schedule-movement vertical slice; route/method: `POST /api/schedule/move`; expected contract: success envelope followed by updated `ScheduleDays.groceryItems`/approved SSE snapshot.

- [ ] **T3 (optional) — Surface direct move failure.** Add a localized, accessible error path that preserves the pre-drag snapshot without double-submitting.
  **Test seam:** `weekStore.test.ts` and planner-page tests; Playwright scenario: reject move during drag then retry; mock owner: planner movement vertical slice; route/method: `POST /api/schedule/move`; expected contract: `{ data: { message } }` on acceptance and existing API error envelope on rejection.

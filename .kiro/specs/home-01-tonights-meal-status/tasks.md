# HOME-01 — Tonight's meal status: follow-up candidates

- [ ] **T1 — Make current-day mutation outcome explicit.** Decide whether cooking validation needs pending UI, response confirmation, rollback, and actionable failure recovery.

  **Test seam:** unit/API: `todayStore.test.ts`, `ScheduleIntegrationTests`; Playwright: mark tonight cooked with success and rejected/network responses; mock owner: Home/todayStore vertical slice; route/method: `POST /api/schedule/day/{date}/validate`; contract: `{ status: 2 }` request and `{ message }` success/non-success response.

- [ ] **T2 — Define stream-disconnect and competing-update behavior.** Specify failed-stream behavior and remote update during a local mutation.

  **Test seam:** unit/API: `todayStore.test.ts`, schedule/SSE integration tests; Playwright: two Home sessions receive a conflicting `slot_updated` or reconnect snapshot; mock owner: Home stream/todayStore slice; route/method: `GET /api/stream` plus schedule mutation; contract: `connected` snapshot and `slot_updated` `{ date, recipe, status }` events.

# HOME-01 — Tonight's meal status: follow-up candidates

- [ ] **T1 — Verify current-day cooking outcome.** Recipe-specific validation, pending completion controls, response-confirmed success, and failed-save retry are implemented. Complete the blocked API/database, browser, and regenerated-client checks tracked in [COOK-01-T2](../cook-01-step-by-step-cooks-mode/tasks.md); do not treat their added tests as passing runtime evidence.

  **Test seam:** unit/API: `todayStore.test.ts`, `ScheduleServiceTests`, `RecipeCookingIntegrationTests`; Playwright: complete matching supper or different lunch and exercise rejected/network responses; mock owner: Home/todayStore vertical slice; route/method: `POST /api/schedule/day/{date}/validate`; contract: `{ status: 2, recipeId }` request and `{ data: { message, mealMarkedCooked } }` success/non-success response. A stale local recipe must not produce a cooked acknowledgement when the server reports no matching meal.

- [ ] **T2 — Define stream-disconnect and competing-update behavior.** Specify failed-stream behavior and remote update during a local mutation.

  **Test seam:** unit/API: `todayStore.test.ts`, schedule/SSE integration tests; Playwright: two Home sessions receive a conflicting `slot_updated` or reconnect snapshot; mock owner: Home stream/todayStore slice; route/method: `GET /api/stream` plus schedule mutation; contract: `connected` snapshot and `slot_updated` `{ date, recipe, status }` events.

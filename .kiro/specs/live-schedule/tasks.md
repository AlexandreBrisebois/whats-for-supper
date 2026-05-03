# Implementation Plan — Live Schedule (SSE Push Model)

## Overview

Work follows the contract-first vertical slice pattern: OpenAPI spec first, then backend, then frontend, then E2E tests. Each group is independently verifiable before moving to the next.

The goal is to make every family member's view of the schedule authoritative and real-time, and to fix the cross-page persistence problem that caused the `today-slot-persistence` spec to skip a test.

---

## Tasks

### Group A — Contract & Infrastructure

- [ ] 1. Add SSE event schemas and `/api/stream` endpoint to `specs/openapi.yaml`
  - Add `ScheduleStreamEvent`, `SlotUpdatedEvent`, `WeekUpdatedEvent`, `VoteUpdatedEvent`, `RecipeReadyEvent` to `components/schemas`
  - Add `GET /api/stream` path with `text/event-stream` response
  - Run `task agent:reconcile` — verify Kiota generates no breaking changes to existing types
  - Run `task agent:drift` — zero drift

- [ ] 2. Add Traefik SSE middleware to `docker/compose/traefik_dynamic.yml`
  - Add `sse-headers` middleware that sets `X-Accel-Buffering: no` and `Cache-Control: no-cache`
  - Add `api-stream` router rule for `Host('api.wfs.localhost') && Path('/api/stream')`
  - This is infrastructure-only — no code changes, no tests needed

---

### Group B — Backend: SSE Infrastructure

- [ ] 3. Implement `SseConnectionManager` singleton
  - File: `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs`
  - `ConcurrentDictionary<string, HttpResponse>` for active connections
  - `AddConnection(HttpResponse)` → returns connection ID
  - `RemoveConnection(string id)`
  - `BroadcastAsync(string eventType, object payload)` → serialises and writes to all active connections, removes dead connections on write failure
  - Register as singleton in `Program.cs`
  - Unit test: `SseConnectionManagerTests` — broadcast to 2 connections, verify both receive; dead connection removed on next broadcast

- [ ] 4. Implement `IScheduleEventPublisher` and `SseEventPublisher`
  - File: `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`
  - Interface: `PublishSlotUpdatedAsync`, `PublishWeekUpdatedAsync`, `PublishVoteUpdatedAsync`, `PublishRecipeReadyAsync`
  - Implementation resolves `SseConnectionManager` singleton and calls `BroadcastAsync`
  - Register as scoped in `Program.cs`
  - Unit test: publisher calls `BroadcastAsync` with correct event type and serialised payload

- [ ] 5. Implement `StreamController`
  - File: `api/src/RecipeApi/Controllers/StreamController.cs`
  - `GET /api/stream` — sets SSE headers, registers connection, sends `connected` event with current `ScheduleDays` snapshot, runs heartbeat loop
  - Removes connection on client disconnect (`CancellationToken` cancelled)
  - Integration test: `StreamControllerTests`
    - Connect → receive `connected` event → verify schedule snapshot present
    - Disconnect → verify connection removed from manager

---

### Group C — Backend: Publish Events from Mutations

- [ ] 6. Inject `IScheduleEventPublisher` into `ScheduleService`
  - Add constructor parameter `IScheduleEventPublisher publisher`
  - Update `AssignRecipeAsync` → publish `slot_updated` after `SaveChangesAsync`
  - Update `ValidateDayAsync` → publish `slot_updated` after `SaveChangesAsync`
  - Update `RemoveRecipeAsync` → publish `slot_updated` (recipe: null, status: 0) after `SaveChangesAsync`
  - Update `MoveScheduleEventAsync` → publish `week_updated` with fresh `GetScheduleAsync` snapshot
  - Update `LockScheduleAsync` → publish `week_updated`
  - Update `OpenVotingAsync` → publish `week_updated`
  - Integration tests (add to `ScheduleIntegrationTests.cs`):
    - `AssignRecipe_PublishesSlotUpdatedEvent`
    - `ValidateDay_PublishesSlotUpdatedEvent`
    - `LockSchedule_PublishesWeekUpdatedEvent`

- [ ] 7. Publish `vote_updated` from vote endpoint
  - File: `api/src/RecipeApi/Controllers/DiscoveryController.cs` (or `DiscoveryService`)
  - After recording a vote, publish `VoteUpdatedEvent` with current vote count for the recipe
  - Integration test: `Vote_PublishesVoteUpdatedEvent`

- [ ] 8. Publish `recipe_ready` from `RecipeReadyProcessor`
  - File: `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs`
  - After marking recipe as ready, publish `RecipeReadyEvent { recipeId }`
  - Integration test: `RecipeReady_PublishesRecipeReadyEvent`

- [ ] 9. Run `dotnet test` — all backend tests pass

---

### Group D — Frontend: Store Changes

- [ ] 10. Add `applyServerUpdate` to `todayStore`
  - File: `pwa/src/store/todayStore.ts`
  - `applyServerUpdate({ recipe, status })` — applies server push, skips if within 2-second echo window
  - Unit test (Vitest): `applyServerUpdate updates currentRecipe`; `applyServerUpdate skips within echo window`

- [ ] 11. Add `applySnapshot`, `applySlotUpdate`, `applyVoteUpdate` to `weekStore`
  - File: `pwa/src/store/weekStore.ts`
  - `applySnapshot(schedule)` — replaces schedule with server snapshot, clears optimisticWriteAt
  - `applySlotUpdate({ date, recipe, status })` — updates matching day in schedule
  - `applyVoteUpdate({ recipeId, voteCount })` — updates vote count on matching day
  - Do NOT change `buildScheduleDays()`, `init()`, or `sync()`
  - Unit tests (Vitest): one test per new method

---

### Group E — Frontend: useScheduleStream Hook

- [ ] 12. Implement `useScheduleStream` hook
  - File: `pwa/src/hooks/useScheduleStream.ts`
  - Creates `EventSource` to `${NEXT_PUBLIC_API_BASE_URL}/api/stream`
  - Handles `connected`, `slot_updated`, `week_updated`, `vote_updated`, `recipe_ready` events
  - Dispatches to `todayStore.applyServerUpdate` and `weekStore.applySlotUpdate` / `applySnapshot` / `applyVoteUpdate`
  - Closes `EventSource` on unmount
  - Unit test (Vitest): mock `EventSource`, verify each event type dispatches to correct store method

- [ ] 13. Mount `useScheduleStream` at app layout level
  - File: `pwa/src/app/(app)/layout.tsx`
  - Add `'use client'` directive if not present
  - Call `useScheduleStream()` — hook survives page navigation within the app shell
  - Verify existing layout tests still pass

- [ ] 14. Move `todayStore` initialisation to layout level
  - Create `pwa/src/components/TodayStoreInitializer.tsx`
  - Accepts `todaysRecipe` and `todayStatus` props from SSR
  - Calls `useTodayStore.getState().init()` once on mount
  - Update `HomeCommandCenter` to remove its `init()` call (store is already initialised)
  - Update home page server component to render `TodayStoreInitializer` with SSR props
  - Verify existing home page E2E tests still pass

---

### Group F — Mock API & E2E Tests

- [ ] 15. Add SSE mock to `setupCommonRoutes` in `pwa/e2e/mock-api.ts`
  - Default mock: returns `connected` event with empty schedule
  - Export `mockSseWithSlotUpdate(page, slotUpdate)` helper
  - Export `mockSseWithWeekUpdate(page, schedule)` helper

- [ ] 16. E2E: SSE `slot_updated` → `TonightMenuCard` appears on home without navigation
  - Add to `pwa/e2e/home-recipe.spec.ts`
  - Mock SSE to emit `slot_updated` for today with a recipe
  - Navigate to `/home`, assert `tonight-menu-card` visible without any assign action
  - _Verifies: SSE → todayStore → HomeCommandCenter reactive update_

- [ ] 17. E2E: SSE `slot_updated` → planner day card updates
  - Add to `pwa/e2e/planner-full-cycle.spec.ts`
  - Mock SSE to emit `slot_updated` for today with a recipe after page load
  - Assert planner day card shows recipe name without poll
  - _Verifies: SSE → weekStore → PlannerDayCard reactive update_

- [ ] 18. E2E: SSE `recipe_ready` → GOTO confirm button appears
  - Add to `pwa/e2e/home-goto.spec.ts`
  - Mock GOTO setting with a recipe ID, mock status endpoint to return `pending`
  - Mock SSE to emit `recipe_ready` for that recipe ID
  - Assert `confirm-goto-btn` appears without waiting for poll interval
  - _Verifies: SSE → HomeCommandCenter GOTO status update_

- [ ] 19. Re-enable skipped test: Planner Quick Find for today → home shows TonightMenuCard
  - File: `pwa/e2e/home-recipe.spec.ts`
  - Remove `test.skip` and TODO comment
  - Replace stateful schedule mock with `mockSseWithSlotUpdate` after assign
  - The test is now deterministic: SSE event arrives before navigation, store is populated
  - _Verifies: the original today-slot-persistence requirement that was blocked_

---

### Group G — Remove Polling

- [ ] 20. Remove 30-second poll from `useWeekStore`
  - File: `pwa/src/app/(app)/planner/page.tsx`
  - Remove the `setInterval` that calls `useWeekStore.getState().sync()`
  - Keep `sync()` method itself — it is still used on initial load and as SSE fallback
  - Verify planner E2E tests still pass

- [ ] 21. Remove GOTO synthesis polling from `HomeCommandCenter`
  - File: `pwa/src/components/home/HomeCommandCenter.tsx`
  - Remove the `setInterval(fetchStatus, 5000)` polling loop
  - Replace with subscription to `useGotoStore` (or equivalent) that `useScheduleStream` updates via `recipe_ready` event
  - Verify GOTO E2E tests still pass (the `recipe_ready` SSE mock replaces the poll)

---

### Group H — Final Checkpoint

- [ ] 22. Run `task agent:drift` — zero schema drift
- [ ] 23. Run `dotnet test` — all 147+ backend tests pass
- [ ] 24. Run `task review` — formatting, linting, typecheck, all E2E tests pass
  - All tests in `planner-full-cycle.spec.ts`, `home-goto.spec.ts`, `home-recipe.spec.ts` pass
  - Previously-skipped test (task 19) now passes
  - No polling intervals remain in production code paths

---

## Notes

- `SseConnectionManager` is in-memory and per-process. In a multi-instance deployment, events would only reach clients connected to the same instance. For this app (single-family, single-instance), this is acceptable. A future Redis pub/sub layer would fix this for multi-instance.
- The `EventSource` API does not support custom headers. The `X-Family-Member-Id` auth header cannot be sent with `EventSource`. Use a query parameter instead: `GET /api/stream?memberId={id}`, or use a cookie (the app already sets `x-family-member-id` as a cookie — `EventSource` sends cookies automatically with `withCredentials: true`).
- Playwright's `page.route()` can intercept `EventSource` requests because they are standard HTTP GET requests. The mock returns the full SSE body as a string, which the browser parses as an event stream.
- The `connected` event snapshot is for `weekOffset=0` only. The planner's `init()` still fetches the correct week on load. SSE keeps it current after that.

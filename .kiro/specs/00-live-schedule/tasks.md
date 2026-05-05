# Implementation Plan — Live Schedule (SSE Push Model)

## Overview

Work follows the contract-first vertical slice pattern: OpenAPI spec first, then backend, then frontend, then E2E tests. Each group is independently verifiable before moving to the next.

The goal is to make every family member's view of the schedule authoritative and real-time, and to fix the cross-page persistence problem that caused the `today-slot-persistence` spec to skip a test.

---

## Resolved Blind Spots (pre-execution review)

These gaps were identified in a Tracer Bullet review before coding begins. Each task below incorporates these fixes. Do not re-open them without a design discussion.

> **BS-1 — Dual `init()` fire**: `HomeCommandCenter` calls `init()` on its own mount AND `TodayStoreInitializer` will call it at layout level. Both fire unless the `HomeCommandCenter` call is removed. Guard: remove `init()` from `HomeCommandCenter` entirely in Task 14; `TodayStoreInitializer` is the sole initializer.
>
> **BS-2 — `weekStore` silent-drop on pre-load SSE event**: `schedule: []` on a fresh planner mount means `applySlotUpdate`'s `inCurrentWeek` check always returns false, silently dropping any SSE event that arrives before `init()` completes. Fix: pre-seed `weekStore` at layout level with `weekOffset=0` on app load (Task 13b); planner's page-level `init(weekOffset)` can still re-init for different weeks.
>
> **BS-3 — `NEXT_PUBLIC_API_BASE_URL` undefined at mount**: If the env var is undefined at mount, `EventSource` connects to `undefined/api/stream`. Fix: validate the URL in `useScheduleStream` before creating `EventSource`; log a hard warning and skip connection if undefined (Task 12).
>
> **BS-4 — SSE auth: cookie vs header**: `EventSource` cannot send custom headers. The auth check must use the `x-family-member-id` cookie (already set by onboarding) AND the `h_access` HMAC cookie (already checked by `HearthAuthenticationHandler`). The `StreamController` must read `X-Family-Member-Id` from `Request.Cookies`, not `Request.Headers`. E2E mocks must verify the cookie is present on the intercepted SSE request (Task 5).
>
> **BS-5 — Concurrent write contention on `HttpResponse.Body`**: `BroadcastAsync` (called from a mutation-triggered scoped service) and the heartbeat loop (inside the controller) both write to the same `Response.Body` without synchronization. Fix: add a `SemaphoreSlim(1,1)` per connection in `SseConnectionManager`; `BroadcastAsync` acquires it before writing (Task 3).
>
> **BS-6 — Stale `HttpResponse` after disconnect**: `BroadcastAsync` iterates `_connections` and may hit a disposed `HttpResponse` from a completed request. The design's try-catch is correct but must specifically catch `ObjectDisposedException` and remove the connection immediately (not defer). Fix: verify the catch block in Task 3 removes immediately on any exception.
>
> **BS-7 — `discoveryStore` is a stub**: Current `discoveryStore.ts` only has `hasPendingCards`. The design's `fillTheGapVersion` counter does not exist. `QuickFindModal` is not coupled to it. Fix: extend `discoveryStore` with `fillTheGapVersion` in Task 10b; wire `QuickFindModal` to watch it in Task 14b.
>
> **BS-8 — Next-week voting not in SSE stream**: `HomeCommandCenter` fetches `weekOffset: 1` to show `VotingNudgeCard`. The SSE `week_updated` event covers only `weekOffset=0`. Next-week voting status is never pushed. Fix: the `VotingNudgeCard` fetch-on-mount stays as-is (polling is acceptable for a secondary nudge); document this gap explicitly and do NOT attempt to replace it with SSE in this spec (Task 21 scope note).
>
> **BS-9 — `applySnapshot` strips smart defaults on reconnect**: `buildScheduleDays(schedule)` without `defaultsData` clears pending slots. Fix: `applySnapshot` must preserve existing `_isPending`/`_voteCount`/`_unanimousVote` metadata for any slot where `_isPending === true` and the reconnect snapshot has no recipe (Task 11).
>
> **BS-10 — Playwright `route.fulfill()` closes SSE response**: `route.fulfill()` closes the response immediately, causing the browser's `EventSource` to see a dropped connection and reconnect in a loop. Fix: E2E mock helpers emit all needed events in a single body string, then let the connection close. Tests must account for the reconnect by asserting UI state AFTER the `connected` event is processed, not by waiting for an open connection. Document this in mock-api.ts (Task 15).

---

## Tasks

### Group A — Contract & Infrastructure

- [x] 1. Add SSE event schemas and `/api/stream` endpoint to `specs/openapi.yaml`
  - Add `ScheduleStreamEvent`, `SlotUpdatedEvent`, `WeekUpdatedEvent`, `VoteUpdatedEvent`, `SmartDefaultsUpdatedEvent`, `FillTheGapInvalidatedEvent`, `RecipeReadyEvent` to `components/schemas`
  - Add `GET /api/stream` path with `text/event-stream` response and `X-Family-Member-Id` cookie param (not header — EventSource cannot send custom headers)
  - Run `task agent:reconcile` — verify Kiota generates no breaking changes to existing types
  - Run `task agent:drift` — zero drift

- [ ] 2. Add Traefik SSE middleware to `docker/compose/traefik_dynamic.yml`
  - Add `sse-headers` middleware: `X-Accel-Buffering: no`, `Cache-Control: no-cache`
  - Add `api-stream` router rule: `Host('api.wfs.localhost') && Path('/api/stream')`
  - Infrastructure-only — no code changes, no tests needed

---

### Group B — Backend: SSE Infrastructure

- [ ] 3. Implement `SseConnectionManager` singleton
  - File: `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs`
  - `ConcurrentDictionary<string, (HttpResponse Response, SemaphoreSlim Lock)>` — each connection gets its own write lock (BS-5)
  - `AddConnection(HttpResponse)` → returns connection ID
  - `RemoveConnection(string id)` — disposes the `SemaphoreSlim`
  - `BroadcastAsync(string eventType, object payload)`:
    - For each connection: acquire the per-connection `SemaphoreSlim` with `WaitAsync()`
    - Write and flush inside try-finally that releases the semaphore
    - Catch any exception (including `ObjectDisposedException`) → `RemoveConnection` immediately (BS-6)
  - Register as singleton in `Program.cs`
  - Unit test: broadcast to 2 connections, verify both receive; dead connection (disposed response) removed immediately on broadcast

- [ ] 4. Implement `IScheduleEventPublisher` and `SseEventPublisher`
  - File: `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs`
  - Interface methods: `PublishSlotUpdatedAsync`, `PublishWeekUpdatedAsync`, `PublishVoteUpdatedAsync`, `PublishSmartDefaultsUpdatedAsync`, `PublishFillTheGapInvalidatedAsync`, `PublishRecipeReadyAsync`
  - Implementation resolves singleton `SseConnectionManager` and calls `BroadcastAsync`
  - Register as scoped in `Program.cs`
  - Unit test: each publisher method calls `BroadcastAsync` with correct event type and serialised payload

- [ ] 5. Implement `StreamController`
  - File: `api/src/RecipeApi/Controllers/StreamController.cs`
  - `GET /api/stream` — sets SSE headers, registers connection, sends `connected` event, runs heartbeat loop
  - **Auth**: read `X-Family-Member-Id` from `Request.Cookies["x-family-member-id"]`, not from `Request.Headers` — `EventSource` cannot send custom headers (BS-4). Return `400` if cookie is missing.
  - Removes connection on client disconnect (`CancellationToken` cancelled)
  - Integration tests:
    - Connect with valid `x-family-member-id` cookie → receive `connected` event → verify schedule snapshot present
    - Connect without cookie → `400`
    - Disconnect → connection removed from manager

---

### Group C — Backend: Publish Events from Mutations

- [ ] 6. Inject `IScheduleEventPublisher` into `ScheduleService`
  - Add constructor parameter `IScheduleEventPublisher publisher`
  - `AssignRecipeAsync` → publish `slot_updated` + `fill_the_gap_invalidated` after `SaveChangesAsync`
  - `ValidateDayAsync` → publish `slot_updated` after `SaveChangesAsync`
  - `RemoveRecipeAsync` → publish `slot_updated` (recipe: null, status: 0) + `fill_the_gap_invalidated` after `SaveChangesAsync`
  - `MoveScheduleEventAsync` → publish `week_updated` with fresh `GetScheduleAsync` snapshot
  - `LockScheduleAsync` → publish `week_updated`
  - `OpenVotingAsync` → publish `week_updated`
  - Integration tests (add to `ScheduleIntegrationTests.cs`):
    - `AssignRecipe_PublishesSlotUpdatedAndFillTheGapEvents`
    - `ValidateDay_PublishesSlotUpdatedEvent`
    - `LockSchedule_PublishesWeekUpdatedEvent`
    - `RemoveRecipe_PublishesSlotUpdatedAndFillTheGapEvents`

- [ ] 7. Publish vote events from `DiscoveryService` / `DiscoveryController`
  - After recording a vote, publish `VoteUpdatedEvent` with current like count
  - Check smart-defaults threshold; if vote crosses or drops below threshold, publish `SmartDefaultsUpdatedEvent` (see design.md §2.5)
  - Integration tests:
    - `Vote_PublishesVoteUpdatedEvent`
    - `VoteThresholdCrossed_PublishesSmartDefaultsUpdatedEvent`

- [ ] 8. Publish `recipe_ready` from `RecipeReadyProcessor`
  - After marking recipe as ready, publish `RecipeReadyEvent { recipeId }`
  - Integration test: `RecipeReady_PublishesRecipeReadyEvent`

- [ ] 9. Run `dotnet test` — all backend tests pass

---

### Group D — Frontend: Store Changes

- [ ] 10. Add `applyServerUpdate` and `clearOptimisticGuard` to `todayStore`
  - File: `pwa/src/store/todayStore.ts`
  - `applyServerUpdate({ recipe, status })` — applies server push; skips if within 2-second echo window
  - `clearOptimisticGuard()` — clears `optimisticWriteAt` unconditionally (called on SSE reconnect)
  - Add `skipCookedCelebration: false` state field
  - Unit tests (Vitest):
    - `applyServerUpdate updates currentRecipe`
    - `applyServerUpdate skips within 2s echo window`
    - `clearOptimisticGuard clears optimisticWriteAt`

- [ ] 10b. Extend `discoveryStore` with fill-the-gap invalidation signal (BS-7)
  - File: `pwa/src/store/discoveryStore.ts`
  - Add `fillTheGapVersion: number` field (starts at 0)
  - Add `invalidateFillTheGap(weekOffset: number)` action — increments `fillTheGapVersion`
  - Do NOT remove `hasPendingCards` — it is used by the Navigation pulse signal
  - Unit test: `invalidateFillTheGap increments fillTheGapVersion`

- [ ] 11. Add `applySnapshot`, `applySlotUpdate`, `applyVoteUpdate`, `applySmartDefaultsUpdate` to `weekStore`
  - File: `pwa/src/store/weekStore.ts`
  - `applySnapshot(schedule: ScheduleDays)`:
    - Calls `buildScheduleDays(schedule)` for the base structure
    - **Preserve smart defaults**: for any day where `_isPending === true` in the current store AND the reconnect snapshot has no recipe for that date, keep the existing `_isPending`/`_voteCount`/`_unanimousVote` values (BS-9)
    - Clears `optimisticWriteAt`
  - `applySlotUpdate({ date, recipe, status })`:
    - Checks `inCurrentWeek = prev.some(d => d.date === date)`
    - **If `schedule` is empty (`[]`), silently return** — this handles the pre-init SSE event drop case; the `connected` event snapshot will seed the store correctly (BS-2 partial mitigation)
  - `applyVoteUpdate({ recipeId, voteCount })` — updates vote count on matching day
  - `applySmartDefaultsUpdate(defaults: SmartDefaultsDto)` — merges pre-selected recipes into pending slots only
  - Do NOT change `buildScheduleDays()`, `init()`, or `sync()`
  - Unit tests (Vitest): one test per new method; include a test that `applySlotUpdate` is a no-op when `schedule` is `[]`

---

### Group E — Frontend: `useScheduleStream` Hook

- [ ] 12. Implement `useScheduleStream` hook
  - File: `pwa/src/hooks/useScheduleStream.ts`
  - **URL validation (BS-3)**: before creating `EventSource`, check `process.env.NEXT_PUBLIC_API_BASE_URL`. If falsy or not starting with `http`, log a `console.warn` and return early — do not attempt to connect. This prevents silent failures.
  - Creates `EventSource` to `${NEXT_PUBLIC_API_BASE_URL}/api/stream` with `{ withCredentials: true }` — cookies (`x-family-member-id`, `h_access`) are sent automatically (BS-4)
  - On `connected`: call `useTodayStore.getState().clearOptimisticGuard()`, then `useWeekStore.getState().applySnapshot(schedule)`
  - On `slot_updated`: update `todayStore` if date matches today; update `weekStore.applySlotUpdate`
  - On `week_updated`: `weekStore.applySnapshot(schedule)`
  - On `vote_updated`: `weekStore.applyVoteUpdate`
  - On `smart_defaults_updated`: `weekStore.applySmartDefaultsUpdate(defaults)`
  - On `fill_the_gap_invalidated`: `useDiscoveryStore.getState().invalidateFillTheGap(weekOffset)`
  - On `recipe_ready`: `useGotoStore.getState().markReady(recipeId)` (or equivalent signal — see Task 21)
  - `source.onerror`: no manual handling — `EventSource` reconnects automatically
  - Cleanup: `return () => source.close()`
  - Unit test (Vitest): mock `EventSource`, verify each event type dispatches to the correct store method; verify no `EventSource` is created when `NEXT_PUBLIC_API_BASE_URL` is undefined

- [ ] 13. Mount `useScheduleStream` at app layout level
  - File: `pwa/src/app/(app)/layout.tsx`
  - Add `'use client'` directive if not already present
  - Call `useScheduleStream()` — hook survives page navigation within the app shell
  - Verify existing layout tests still pass

- [ ] 13b. Pre-seed `weekStore` at layout level for `weekOffset=0` (BS-2)
  - In the same layout component (or a `WeekStoreInitializer` sibling to `TodayStoreInitializer`), call `useWeekStore.getState().init(0)` once on mount
  - This ensures `schedule` is never `[]` when the first SSE events arrive
  - Guard: if `weekStore.weekOffset !== 0` (user navigated to next week), do NOT re-init — the planner page owns next-week init
  - **No new SSR props needed** — `init(0)` fetches from the client side; the `connected` SSE event will also seed the store immediately after connection
  - Verify planner page's `init(weekOffset)` still overrides correctly for non-zero offsets

- [ ] 14. Move `todayStore` initialisation to layout level; remove duplicate `init()` from `HomeCommandCenter`
  - Create `pwa/src/components/TodayStoreInitializer.tsx`
  - Accepts `todaysRecipe` and `todayStatus` props from SSR
  - Calls `useTodayStore.getState().init()` once on mount
  - **Remove `init()` call from `HomeCommandCenter`** (line ~118) — this is the BS-1 fix. The store is already initialised before `HomeCommandCenter` mounts.
  - `HomeCommandCenter` still calls `loadSetting('family_goto')` and `sync()` on its own mount — those are unchanged
  - Update home page server component to render `TodayStoreInitializer` with SSR props
  - Verify existing home page E2E tests still pass

- [ ] 14b. Wire `QuickFindModal` to `discoveryStore.fillTheGapVersion` (BS-7)
  - File: `pwa/src/components/planner/QuickFindModal.tsx`
  - Add `const fillTheGapVersion = useDiscoveryStore(s => s.fillTheGapVersion)`
  - Add `useEffect(() => { fetchSuggestions(); }, [fillTheGapVersion])` — refetch when another client assigns a recipe
  - The `fetchSuggestions` call must be guarded: only fire if the modal is currently open (check a local `isOpen` ref or the existing open state)
  - Unit test (Vitest): mock `useDiscoveryStore`, increment `fillTheGapVersion`, assert `fetchSuggestions` is called

---

### Group F — Mock API & E2E Tests

- [ ] 15. Add SSE mock to `setupCommonRoutes` in `pwa/e2e/mock-api.ts`
  - Default mock returns `connected` event with a full 7-day empty schedule, then closes
  - **Document the reconnect loop behaviour (BS-10)**: add a comment explaining that `route.fulfill()` closes the connection, causing `EventSource` to reconnect. Tests that assert on UI state must do so AFTER the `connected` event is processed (use `waitFor` on the resulting DOM state, not on connection state). The reconnect loop is harmless because every reconnect receives the same `connected` event.
  - Export helper `mockSseWithSlotUpdate(page, slotUpdate)`
  - Export helper `mockSseWithWeekUpdate(page, schedule)`
  - Export helper `mockSseWithOrderIn(page, date)`
  - Export helper `mockSseWithFillTheGapInvalidated(page, weekOffset?)`
  - Export helper `mockSseWithSmartDefaultsUpdated(page, defaults)`
  - All helpers include the `connected` event first, then the target event, in a single body string

- [ ] 16. E2E: SSE `slot_updated` → `TonightMenuCard` appears on home without navigation
  - Add to `pwa/e2e/home-recipe.spec.ts`
  - Mock SSE to emit `slot_updated` for today with a recipe
  - Navigate to `/home`, assert `tonight-menu-card` visible
  - Assert: no `sync()` race dependency — the card must be visible before any poll fires

- [ ] 17. E2E: SSE `slot_updated` → planner day card updates
  - Add to `pwa/e2e/planner-full-cycle.spec.ts`
  - Mock SSE to emit `slot_updated` for today with a recipe after page load
  - Assert planner day card shows recipe name without poll

- [ ] 18. E2E: SSE `recipe_ready` → GOTO confirm button appears
  - Add to `pwa/e2e/home-goto.spec.ts`
  - Mock GOTO setting with a recipe ID, mock status endpoint to return `pending`
  - Mock SSE to emit `recipe_ready` for that recipe ID
  - Assert `confirm-goto-btn` appears — replaces polling test

- [ ] 19. Re-enable skipped test: Planner Quick Find for today → home shows TonightMenuCard
  - File: `pwa/e2e/home-recipe.spec.ts`
  - Remove `test.skip` and TODO comment
  - Replace stateful schedule mock with `mockSseWithSlotUpdate` after assign
  - Test is now deterministic: SSE event arrives before navigation, store is populated

---

### Group G — Remove Polling

- [ ] 20. Remove 30-second poll from `useWeekStore`
  - File: `pwa/src/app/(app)/planner/page.tsx` (or wherever the interval lives)
  - Remove the `setInterval` that calls `useWeekStore.getState().sync()`
  - Keep `sync()` method itself — still used on initial load
  - Verify planner E2E tests still pass

- [ ] 21. Remove GOTO synthesis polling from `HomeCommandCenter`
  - File: `pwa/src/components/home/HomeCommandCenter.tsx`
  - Remove the `setInterval(fetchStatus, 5000)` polling loop
  - Replace with a subscription to a `gotoStore` (or lightweight signal) that `useScheduleStream` sets via `recipe_ready`
  - **Scope note (BS-8)**: the `VotingNudgeCard` fetch-on-mount for `weekOffset: 1` (next-week voting status) is intentionally NOT replaced by SSE in this spec. The `week_updated` event covers only `weekOffset=0`. The nudge card's one-time fetch-on-mount is the correct pattern for this secondary display. Do not remove it.
  - Verify GOTO E2E tests still pass (the `recipe_ready` SSE mock replaces the poll)

---

### Group H — Final Checkpoint (Phase 1)

- [ ] 22. Run `task agent:drift` — zero schema drift
- [ ] 23. Run `dotnet test` — all 147+ backend tests pass
- [ ] 24. Run `task review` — formatting, linting, typecheck, all E2E tests pass
  - All tests in `planner-full-cycle.spec.ts`, `home-goto.spec.ts`, `home-recipe.spec.ts` pass
  - Previously-skipped test (task 19) now passes
  - No polling intervals remain in production code paths
  - No `init()` call in `HomeCommandCenter` (BS-1 confirmed removed)
  - `weekStore.schedule` is never `[]` when SSE connects (BS-2 confirmed via WeekStoreInitializer test)

---

## Phase 2 — Extended SSE Flows

These tasks build on Phase 1 infrastructure. Do not start Phase 2 until Group H passes.

---

### Group I — Backend: New Event Types

- [ ] 25. Add `recipe_failed` SSE event to `IScheduleEventPublisher`
  - Add `PublishRecipeFailedAsync(Guid recipeId, string errorMessage, string failedStep, object? partialData)` to interface and `SseEventPublisher`
  - File: `api/src/RecipeApi/Services/WorkflowWorker.cs`
  - **CRITICAL GUARD**: Publish ONLY when the workflow INSTANCE reaches `WorkflowStatus.Failed` — see the block at the bottom of `ExecuteAsync` where the instance status is written. Do NOT publish inside the per-task retry/backoff paths, inside the 429 handler, or on `TaskStatus.Failed` alone. A failed task triggers retries; a failed instance means all retries are exhausted.
  - `partialData` should include whatever the `Recipe` row has at failure time: `{ name, imageUrl? }` — fetch from DB before publishing
  - Add to `specs/openapi.yaml`: `RecipeFailedEvent` schema with `{ recipeId, errorMessage, failedStep, partialData? }`
  - Integration test: `WorkflowFatalFailure_PublishesRecipeFailedEvent`
  - Integration test: `WorkflowTransientFailure_DoesNotPublishRecipeFailedEvent` (verify no event on retry path)

- [ ] 26. Extend `recipe_ready` payload with name and imageUrl
  - `PublishRecipeReadyAsync` currently takes only `Guid recipeId`. Add `string name` and `string? imageUrl` parameters.
  - Fetch these from DB inside `RecipeReadyProcessor` before calling the publisher
  - Update `RecipeReadyEvent` schema in `specs/openapi.yaml`
  - Update callers of `PublishRecipeReadyAsync` — verify no other callers exist that need updating
  - Integration test: `RecipeReady_PublishesEnrichedPayload`

---

### Group J — Frontend: New Stores

- [ ] 27. Create `captureStore`
  - File: `pwa/src/store/captureStore.ts`
  - State: `pendingRecipes: Array<{ recipeId: string; name?: string; submittedAt: number }>`
  - Actions:
    - `addPending({ recipeId, name? })` — called after successful recipe submit, before navigation
    - `removePending(recipeId)` — called when `recipe_ready` or `recipe_failed` SSE event arrives for this recipe
    - `getPending(recipeId)` — returns the pending entry if present (for SSE handler to check)
  - Unit tests: add/remove/get pending recipe

- [ ] 28. Create `libraryStore` (notification queue)
  - File: `pwa/src/store/libraryStore.ts`
  - State: `notifications: Array<{ recipeId: string; name: string; imageUrl?: string; type: 'ready' | 'failed'; errorMessage?: string; failedStep?: string; partialData?: object }>`
  - Actions:
    - `pushNotification(n)` — adds to queue
    - `dismissNotification(recipeId)` — removes from queue
  - Unit tests: push/dismiss notifications

- [ ] 29. Extend `discoveryStore` with live stack management
  - File: `pwa/src/store/discoveryStore.ts`
  - Add `discoveryStack: DiscoveryRecipe[]` — lift state from Discovery page's local `useState`, owned by store so SSE can update it
  - Add `setStack(recipes: DiscoveryRecipe[])` — replaces the stack (called by Discovery page on fetch)
  - Add `applyVoteUpdate({ recipeId, voteCount })`:
    - Updates `hasFamilyInterest` on matching recipe
    - **Re-rank rule**: if `hasFamilyInterest` flips to `true` AND recipe is at position 1, 2, or 3 (NOT position 0 — top card is LOCKED), move up by at most 2 positions, never to position 0
    - Cards at position 4+ are outside the visible stack; update `hasFamilyInterest` in-place but do NOT re-rank
  - Add `removeFromStack(recipeId)` — removes by ID, called after fill-the-gap refetch diff
  - **Note**: This is lift-and-shift only. Do NOT refactor Discovery page fetch logic. Do NOT change how `hasPendingCards` works (it reads `discoveryStack.length`).
  - Unit tests:
    - `applyVoteUpdate sets hasFamilyInterest true`
    - `applyVoteUpdate moves position-2 card to position-1 (not position-0)`
    - `applyVoteUpdate does NOT move position-0 card`
    - `applyVoteUpdate does NOT move position-4+ card`
    - `removeFromStack removes by id`
  - **See flow doc**: `docs/flows/user-flows/sse-discovery-live-updates.md`

---

### Group K — Frontend: SSE Hook Extensions

- [ ] 30. Extend `useScheduleStream` to handle new event types
  - File: `pwa/src/hooks/useScheduleStream.ts`
  - Add `recipe_ready` enriched handler:
    - Call `captureStore.getPending(recipeId)` — if present: call `captureStore.removePending(recipeId)` and `libraryStore.pushNotification({ recipeId, name, imageUrl, type: 'ready' })`
    - Always call `useGotoStore.getState().markReady(recipeId)` (existing GOTO flow)
  - Add `recipe_failed` handler:
    - If `captureStore.getPending(recipeId)` exists: call `captureStore.removePending(recipeId)` and `libraryStore.pushNotification({ recipeId, ..., type: 'failed' })`
  - Add `vote_updated` extension: also call `useDiscoveryStore.getState().applyVoteUpdate({ recipeId, voteCount })`
  - Unit tests: verify each new handler dispatches to the correct store

---

### Group L — Frontend: UI Components

- [ ] 31. Update `MinimalCapture` success screen — honest async state
  - File: `pwa/src/components/capture/MinimalCapture.tsx`
  - After successful `submitRecipe()` / `submitUrl()` / describe submit:
    - Call `useCaptureStore.getState().addPending({ recipeId, name: describeName || undefined })`
    - Change success heading: photo/URL paths → "Recipe queued"; describe (non-GOTO) → "Synthesizing…"; GOTO → "Your GOTO is being prepared" (unchanged)
    - Change subtext per path — see `docs/flows/user-flows/sse-capture-async-feedback.md` for exact copy
  - **REMOVE the 4-second `setTimeout(() => router.replace(ROUTES.HOME), 4000)` entirely** — Mère-Designer ruling: auto-redirect breaks the multi-submit batch flow. Parents add multiple recipes in sequence; auto-redirect forces unwanted re-navigation between each one.
  - Replace with explicit CTAs: "Add Another" (primary, resets form) and "Done" (secondary, navigates to /home)
  - When SSE `recipe_ready` fires while user is still on this screen: transition heading to "[Name] is ready!", show "Add to this week" CTA
  - Update E2E mock: `mock-api.ts` capture route mocks should return a valid `recipeId` so `captureStore.addPending` is called
  - **See flow doc**: `docs/flows/user-flows/sse-capture-async-feedback.md`

- [ ] 32. Create notification components — `LibraryToast` and `RecipeFailureBanner`

  **`LibraryToast`** (auto-dismiss, success events):
  - File: `pwa/src/components/capture/LibraryToast.tsx`
  - Reads `libraryStore.notifications` where `type === 'ready'`
  - Shows ONE toast at a time (most recent). If >1 pending: shows "+N more" count badge below
  - Toast content: 40×40 thumbnail (imageUrl or utensils fallback) + "✓ [Name] is ready!" + progress bar auto-dismiss (5s)
  - **No transactional CTA in the toast itself** — tap opens a bottom drawer with "Add to this week" and "View recipe"
  - Animation: slide-in from bottom, Framer Motion spring `stiffness: 300, damping: 30`
  - Style: `bg-sage/10`, `border border-sage/30`, left 4px sage accent bar
  - **See flow doc**: `docs/flows/user-flows/sse-recipe-ready-notification.md`

  **`RecipeFailureBanner`** (persistent, failure events):
  - File: `pwa/src/components/capture/RecipeFailureBanner.tsx`
  - Reads `libraryStore.notifications` where `type === 'failed'`
  - **Persistent — does NOT auto-dismiss.** Sits in thumb zone, below page content, above nav bar. Never overlays cards.
  - Copy: "Recipe couldn't be saved — [name or 'your recipe']. Tap to try again." + ✕ dismiss link
  - Tap → navigate to `/capture?recipeId={id}&mode=retry`
  - Style: `bg-terracotta/10`, `border border-terracotta/30`, small ! icon (not red, not skull)
  - Max 2 banners visible simultaneously (oldest dismissed first if 3+ failures)
  - Animation: slide-in from bottom, same spring profile
  - **See flow doc**: `docs/flows/user-flows/sse-recipe-failure-flow.md`

  Both components mounted in `pwa/src/app/(app)/layout.tsx` — same level as `useScheduleStream`.

- [ ] 33. Update Discovery page to use `discoveryStore.discoveryStack`
  - File: `pwa/src/app/(app)/discovery/page.tsx`
  - Replace local `const [recipes, setRecipes] = useState<DiscoveryRecipe[]>([])` with `const recipes = useDiscoveryStore(s => s.discoveryStack)`
  - Replace `setRecipes(...)` calls with `useDiscoveryStore.getState().setStack(...)` action
  - Add `fillTheGapVersion` subscription:
    ```typescript
    const fillTheGapVersion = useDiscoveryStore(s => s.fillTheGapVersion);
    useEffect(() => {
      if (fillTheGapVersion === 0) return; // skip initial mount
      refetchCurrentCategory(); // silent refetch
    }, [fillTheGapVersion]);
    ```
  - `refetchCurrentCategory`: fetch current category stack, diff IDs against current `discoveryStack`, call `removeFromStack` for any IDs absent from new response. Do NOT flash loading state — keep existing cards visible until diff is applied.
  - After refetch completes, if any card was removed AND it was in the visible top 4: show micro-badge "Just planned ✓" (sage green, 2s auto-fade, inline at top of card stack — NOT a toast)
  - `hasPendingCards` is driven by `discoveryStack.length > 0` (already tied to `recipes.length` — this just moves the source)
  - E2E test: mock SSE `fill_the_gap_invalidated` + mock API to return stack without recipe X → assert recipe card fades out; assert micro-badge visible
  - **See flow doc**: `docs/flows/user-flows/sse-discovery-live-updates.md`

- [ ] 34. Add family interest ring to `DiscoveryCard`
  - File: `pwa/src/components/discovery/DiscoveryCard.tsx`
  - When `hasFamilyInterest === true`: render a **2px sage-green pulsing ring on the card border**
    ```typescript
    // Framer Motion pulse on card wrapper
    animate={hasFamilyInterest ? { scale: [1, 1.03, 1] } : {}}
    transition={{ duration: 1.5, repeat: Infinity }}
    // Plus: add ring class: 'ring-2 ring-sage'
    ```
  - **No badge, no ♥ overlay** — the ring is structural, part of the card's border identity. Sage green. Not ochre, not terracotta.
  - When `hasFamilyInterest` flips from `false → true` via SSE: Framer Motion `layout` prop handles smooth position change if card also re-ranks
  - E2E test: mock SSE `vote_updated` for a recipe at position 2 → assert ring class on card; assert position-0 card unchanged
  - **See flow doc**: `docs/flows/user-flows/sse-discovery-live-updates.md`

---

- [ ] 34b. Add processing indicator dot to Capture nav icon
  - File: `pwa/src/components/common/Navigation.tsx` (or wherever nav items are rendered)
  - When `useCaptureStore(s => s.pendingRecipes).length > 0`: render a **6px sage-green dot** on the top-right corner of the Capture nav icon
  - No animation on the dot itself — it is ambient, not urgent. Static filled circle.
  - Disappears when `captureStore.pendingRecipes` is empty (all resolved)
  - Unit test: dot appears when pendingRecipes non-empty; disappears when empty
  - **See flow doc**: `docs/flows/user-flows/sse-capture-async-feedback.md`

---

### Group L2 — Grocery List: Jitter Fix + SSE Sync

These tasks are grouped together because Part 1 (jitter fix) is a prerequisite for Part 2 (SSE). Both touch the same contract zone. Execute sequentially.

**See flow doc:** `docs/flows/data-flows/grocery-sse-sync.md`

- [ ] 35b. Fix the OpenAPI contract — add `groceryState` to `ScheduleDays`
  - File: `specs/openapi.yaml`
  - Add `groceryState` property to the `ScheduleDays` schema:
    ```yaml
    groceryState:
      type: object
      additionalProperties: { type: boolean }
      nullable: true
    ```
  - Run `task agent:reconcile` — verify Kiota regenerates `ScheduleDays` with a typed `groceryState` field
  - Run `task agent:drift` — zero drift
  - **This is a non-breaking addition.** Existing callers that ignore `groceryState` are unaffected.

- [ ] 35c. Add `groceryState` to `.NET` `ScheduleDays` DTO and `GetScheduleAsync`
  - File: `api/src/RecipeApi/Dto/ScheduleDays.cs`
  - Add `Dictionary<string, bool>? GroceryState` parameter to the `ScheduleDays` record
  - File: `api/src/RecipeApi/Services/ScheduleService.cs` — `GetScheduleAsync`
  - Deserialize `WeeklyPlan.GroceryState` jsonb and include in the return value:
    ```csharp
    var groceryState = plan?.GroceryState != null
        ? JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)
        : null;
    return new ScheduleDays(weekOffset, isLocked, status, days, groceryState);
    ```
  - Unit test: `GetScheduleAsync_IncludesGroceryState` — verify response includes the stored grocery map
  - Unit test: `GetScheduleAsync_ReturnsNullGroceryState_WhenNoWeeklyPlan`

- [ ] 35d. Remove `additionalData` grocery hack from `weekStore`
  - File: `pwa/src/store/weekStore.ts`
  - In `init()`: replace the `(scheduleData as any).additionalData?.groceryState` block with a typed read from `scheduleData.groceryState`
  - In `applySnapshot()`: add the same typed read — when applying a server snapshot (SSE `connected` or `week_updated`), call `usePlannerStore.getState().setGroceryState(schedule.groceryState ?? {})` **atomically in the same update call**, not as a trailing effect
  - This eliminates the two-render gap that causes the jitter
  - Regression test (Vitest): `applySnapshot sets groceryState atomically` — verify `groceryState` is set in the same tick as `schedule`

- [ ] 35e. Add `grocery_updated` SSE event to backend
  - Add `PublishGroceryUpdatedAsync(int weekOffset, Dictionary<string, bool> groceryState)` to `IScheduleEventPublisher` and `SseEventPublisher`
  - File: `api/src/RecipeApi/Services/ScheduleService.cs` — `UpdateGroceryStateAsync`
  - After `SaveChangesAsync()`, call `_publisher.PublishGroceryUpdatedAsync(weekOffset, groceryState)`
  - Add to `specs/openapi.yaml`: `GroceryUpdatedEvent` schema with `{ weekOffset, groceryState }`
  - Integration test: `UpdateGroceryState_PublishesGroceryUpdatedEvent`

- [ ] 35f. Handle `grocery_updated` in `useScheduleStream`
  - File: `pwa/src/hooks/useScheduleStream.ts`
  - Add handler:
    ```typescript
    source.addEventListener('grocery_updated', (e) => {
      const { weekOffset, groceryState } = JSON.parse(e.data);
      // Only apply if this is the currently-loaded week
      if (weekOffset === useWeekStore.getState().weekOffset) {
        usePlannerStore.getState().setGroceryState(groceryState);
      }
    });
    ```
  - No echo suppression needed — applying the same full state is idempotent
  - Unit test: `grocery_updated event updates plannerStore.groceryState`
  - Unit test: `grocery_updated for different weekOffset is ignored`

- [ ] 35g. Remove `isSaving` global spinner from `GroceryList`
  - File: `pwa/src/components/planner/GroceryList.tsx`
  - Remove the `isSaving` state and the `<Loader2>` spinner that blocks ALL items during a single save
  - The optimistic toggle + SSE confirmation is the UX feedback — no global spinner needed
  - On PATCH failure: revert the single toggled item only (`setGroceryItemToggle(ingredientName, !newState)`) — already in the catch block, keep it
  - Add a per-item error indicator (small inline "!" icon, terracotta, next to the reverted item) that auto-clears after 3 seconds — so the parent knows that specific item failed to save
  - E2E test: `grocery PATCH failure → single item reverts, no global spinner`

- [ ] 35h. Add SSE mock for grocery to `mock-api.ts`
  - Export `mockSseWithGroceryUpdated(page, weekOffset, groceryState)`
  - E2E tests:
    - `grocery_updated SSE → checklist updates without navigation`
    - `week_updated SSE → grocery checkboxes do not flash (jitter regression test)`

---

### Group N — GOTO: SSE-driven "Ready" state

- [ ] 38. Wire GOTO settings card to `recipe_ready` SSE event
  - **Context:** `FamilyGOTOSettings` currently polls every 5 seconds for recipe status when `recipeStatus === 'pending'`. This is the same polling anti-pattern being eliminated everywhere else.
  - File: `pwa/src/components/profile/FamilyGOTOSettings.tsx`
  - Remove the `setInterval(fetchStatus, 5000)` poll. Keep the initial `fetchStatus()` call on mount to seed the status.
  - Subscribe to `useGotoStore` (or `libraryStore.notifications`) for `recipe_ready` events targeting `currentGoto.recipeId`
  - When `recipe_ready` fires for the current recipeId: `setRecipeStatus('ready')`
  - The card transitions from spinner → recipe name without a poll
  - **Pending state UX fix (Mère-Designer ruling)**:
    - Add subtitle beneath spinner: `"Usually ready in under 10 seconds"` — `text-xs text-charcoal/40`
    - Show the description/name text the user typed BELOW the spinner as a muted echo: confirms the right thing was submitted
    - Add a muted "Change" link (already exists) — no cancel link needed; Change is the escape hatch
  - When recipe transitions to `ready`: replace spinner with a `CheckCircle2` (sage, 20px) for 2 seconds, then collapse to show only recipe name and "Change" link
  - E2E test: mock SSE `recipe_ready` for GOTO recipeId → assert spinner replaced by recipe name without poll firing

---

### Group O — Profile & Settings: Accessibility + Hierarchy Fixes

**Mère-Designer review findings:** Two contrast failures (below WCAG AA), a dead-end trap on the profile page, and a misleading title. All low-effort, high-impact.

- [ ] 39. Fix Profile page — title, contrast, and dead-end
  - File: `pwa/src/app/(app)/profile/page.tsx`
  - **Title fix**: Change `"Family Profile"` → `"Who's Eating?"` — removes corporate jargon, aligns with app warmth
  - **Subtitle fix**: Change `"Switch active family member to see what they think."` → `"Pick a family member to get started."` — clearer, warmer
  - **Contrast fix**: `text-charcoal-300/60` on hint text → `text-charcoal/60` (minimum for WCAG AA on cream)
  - **Dead-end fix**: Add a `"Skip"` / `"Continue as [current member]"` button in the footer, only rendered when `selectedFamilyMemberId` is already set. Style: ghost/outline, terracotta, full-width below the ProfileDropdown. Tapping it calls `router.push(ROUTES.HOME)` without changing the selected member.
  - E2E test: profile page with existing member → "Continue as Alex" button visible; tapping it navigates to /home

- [ ] 40. Fix Settings page — contrast and section headers
  - File: `pwa/src/app/(app)/profile/settings/page.tsx` and settings section components
  - **Contrast fix**: `text-indigo/60` on section icon labels → `text-indigo` (full opacity). Applies to "Manage Family" and "Language" headers.
  - **Contrast fix**: `text-ochre/60` on GOTO section icon label → `text-ochre` (full opacity). These labels are wayfinding markers — they must read as signage, not decoration.
  - **GOTO card pending state** (in `FamilyGOTOSettings.tsx`):
    - Add `"Usually ready in under 10 seconds"` subtitle below spinner (see Task 38)
    - Display the user's submitted description text in muted type below spinner as confirmation echo
  - Run contrast audit: `text-charcoal/40`, `text-charcoal-300`, `text-indigo/60`, `text-ochre/60` — verify all are ≥ 4.5:1 against their actual rendered backgrounds using DevTools or a contrast checker. Fix any that fail.
  - Unit test: no visual regression on language toggle active state (`bg-indigo text-lavender`)

---

### Group P — Database schema validation

**Skill:** `.agents/skills/database/SKILL.md`

This task validates that the `ScheduleDays.groceryState` addition (Task 35b/35c) and the SSE infrastructure don't require schema changes, and that the existing schema is fully in sync with the C# models.

- [ ] 41. Database schema audit and drift check
  - Run `task db:schema:push DRY_RUN=true` — verify output is "no changes" or identify pending drift
  - Verify `WeeklyPlan.GroceryState` column: must be `jsonb`, NOT NULL with default `'{}'` — check `api/database/schema.sql` and the model attribute `[Column("grocery_state", TypeName = "jsonb")]`
  - If the column is `text` instead of `jsonb` in the schema file: update `schema.sql` to use `jsonb` type. Run `task db:schema:push DRY_RUN=true` to preview. Then `task migrate` to apply.
  - Verify `WeeklyPlan` has all columns mapped: `id`, `week_start_date`, `status`, `grocery_state`, `created_at`, `updated_at`
  - Verify no orphan columns exist in the DB that are absent from the model (run `task db:schema:pull` and diff against `schema.sql`)
  - Verify `CalendarEvent`, `Recipe`, `RecipeVote`, `WorkflowInstance`, `WorkflowTask` tables match their C# models — pay attention to `[Column]` attribute names vs snake_case DB columns
  - Document any drift found in `HANDOVER.md`
  - **Definition of done**: `task db:schema:push DRY_RUN=true` reports "No changes" and all C# model `[Column]` attributes match the schema file column names exactly

---

### Group Q — Documentation, Flow docs, Test coverage audit

- [ ] 42. Build missing flow documents
  - **`docs/flows/user-flows/profile-member-selection.md`**: Document the "Who's Eating?" flow — member selection, the "Continue as [name]" escape hatch, navigation to home. Include the edge case of first-time use (no member selected) vs returning use.
  - **`docs/flows/user-flows/goto-lifecycle.md`**: Document the full GOTO recipe lifecycle — set (library pick / describe / capture) → pending → ready → "Make This Tonight" → cooked. Include SSE touchpoints (recipe_ready) and the FamilyGOTOSettings card states.
  - **`docs/flows/data-flows/week-lifecycle.md`**: Extend or replace `planner-week-lifecycle.md` with the SSE-aware version — draft → voting open → locked → cooked, showing which SSE events fire at each transition and which stores update.
  - Cross-reference each new flow doc in the spec's requirements.md under the relevant requirement (R10–R16).

- [ ] 43. E2E test coverage audit and missing tests
  - File: review all `pwa/e2e/*.spec.ts` files against the full task list
  - **Missing tests to add:**
    - `profile.spec.ts`: "Who's Eating?" title visible; "Continue as [name]" button when member exists; member selection navigates to /home
    - `settings.spec.ts`: GOTO pending state shows "Usually ready" subtitle; GOTO ready state shows recipe name; language toggle persists on navigation
    - `cooks-mode.spec.ts` (new file): ingredient checklist is interactive (tap to check); dietary badge NOT present; "Let's Cook →" CTA on card 0; step instruction visible at large size; Done → celebration moment visible before redirect
    - `grocery.spec.ts`: jitter regression test (week_updated does not flash grocery state); grocery_updated SSE updates checklist; PATCH failure reverts single item only
  - For each new test: follow the established `page.route()` mock pattern, use `setupCommonRoutes()`, mock SSE with the helpers from mock-api.ts
  - **Do NOT** add tests that duplicate existing coverage — audit first, add only gaps

- [ ] 44. Unit test coverage audit
  - Run `task test:unit` (or equivalent Vitest command) and capture the coverage report
  - Identify files with 0% or <50% coverage that are part of this spec's scope:
    - `useScheduleStream.ts` (new file — must have 100% handler coverage)
    - `todayStore.ts` — verify `applyServerUpdate`, `clearOptimisticGuard` are tested
    - `weekStore.ts` — verify `applySnapshot`, `applySlotUpdate`, `applyVoteUpdate`, `applySmartDefaultsUpdate` are tested
    - `discoveryStore.ts` — verify `applyVoteUpdate`, `removeFromStack`, `invalidateFillTheGap` are tested
    - `captureStore.ts` (new) — 100% required
    - `libraryStore.ts` (new) — 100% required
  - Add any missing unit tests. Keep them co-located with the source file (`*.test.ts`)

---

### Group R — Cook's Mode redesign

**Mère-Designer ruling.** See full brief: `docs/flows/user-flows/cooks-mode-redesign.md`

- [ ] 45. Ingredient pre-flight checklist — Card 0 interactivity
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - Add local state `const [gathered, setGathered] = useState<Record<string, boolean>>({})`
  - Replace the static `CheckCircle2` icon with a toggle button per ingredient:
    - Unchecked: hollow `Circle` icon, `bg-terracotta/10 border-2 border-terracotta/20 text-terracotta/40`
    - Checked: filled `CheckCircle2`, `bg-sage text-white`
    - Row: checked → `bg-sage/10 border-sage/20 text-charcoal/40` + strikethrough
  - Add progress counter above the grid: `"X of Y ready"` in `text-xs font-bold text-sage`
  - Change the "Next →" label on Card 0 to `"Let's Cook →"`
  - State is local to CooksMode — no store, no API. Resets when CooksMode is reopened.
  - E2E test: open CooksMode → tap an ingredient → assert checked state; tap again → assert unchecked

- [ ] 46. Remove dietary badge from Card 0
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - Delete the entire `<div>` block containing the `Sparkles` icon and "Plant-Powered Choice!" / "Healthy Pick!" text (approximately lines 204–212 in current source)
  - The recipe identity is already communicated in the header — this is redundant noise in mission mode

- [ ] 47. Card 0 zone differentiation and ingredient contrast
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - Card 0 heading (step title): change `"Check & Prep"` to `"Let's get everything together"` — warmer, directive
  - Add `bg-terracotta/[0.02]` to the Card 0 content area wrapper — subtle zone tint to distinguish from step cards
  - Ingredient label text: `text-charcoal/80` (currently `text-charcoal/80` already — verify; if still `/60`, bump it)
  - Card 0 instruction text (above ingredient grid): `text-charcoal/80` (currently `text-charcoal/60`)

- [ ] 48. Step instruction readability fix (Cards 1–N)
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - Change step instruction paragraph from `text-charcoal/60 font-medium` to `text-charcoal/80 font-bold`
  - This is a one-line change. Verify with visual check at arm's-length distance.
  - Step indicator pill: simplify from `UtensilsCrossed icon + "Step X of Y"` to `"X / Y"` with the same terracotta pill style — removes icon noise, keeps context

- [ ] 49. Navigation button proportion fix
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - Change footer grid from `grid-cols-2 gap-6` to `grid-cols-[2fr_3fr] gap-4`
  - Back button: `text-lg` (shrink from `text-xl`), keep `variant="secondary"`
  - Next/Done button: `text-2xl font-black` (increase from `text-xl font-bold`), keep terracotta + shadow
  - This is a Tailwind-only change. No logic changes.

- [ ] 50. Done moment — micro-celebration
  - File: `pwa/src/components/planner/CooksMode.tsx`
  - On last step, when user taps "Done", before calling `onCooked()`:
    - Set local state `const [showCelebration, setShowCelebration] = useState(false)`
    - Render an absolute-positioned overlay inside the CooksMode wrapper:
      ```tsx
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-cream z-10"
          >
            <Sparkles size={48} className="text-ochre mb-4" />
            <p className="font-heading text-3xl font-black text-charcoal">Supper's done!</p>
            <p className="text-charcoal/60 mt-2 font-medium">Nice work.</p>
          </motion.div>
        )}
      </AnimatePresence>
      ```
    - `nextStep()` on last card: `setShowCelebration(true)`, then after 600ms: `onCooked(); onClose(); router.push('/home')`
  - E2E test: complete last step → assert "Supper's done!" text visible briefly before navigation

---

### Group S — README and User Guide

- [ ] 51. Update `README.md`
  - File: `/Users/alex/Code/whats-for-supper/README.md`
  - Audit current README: remove any references to outdated architecture (polling, 30-second sync, `today-slot-persistence` workaround)
  - Add SSE architecture section: explain the `GET /api/stream` endpoint, cookie auth, event types, and why it's direct-to-API (not proxied through Next.js)
  - Update "How it works" section to reflect current state: SSE push model, real-time family sync, grocery collaboration
  - Add development setup note: `NEXT_PUBLIC_API_BASE_URL` must be set for SSE connection to work in local dev
  - Keep the README under 300 lines — it is a project entry point, not a spec document

- [ ] 52. Build user guide in docs
  - File: `docs/user-guide.md`
  - Audience: a new family member joining the household's WFS instance — not a developer
  - Sections:
    1. **Getting Started** — how to join (invite link), pick your name, what the app does
    2. **What's for Supper? (Home)** — reading the home screen, the GOTO recipe, Cook's Mode
    3. **The Weekly Planner** — planning meals, moving recipes, the grocery list
    4. **Discovering New Recipes** — swiping, voting, how family consensus works
    5. **Adding Recipes** — photo, URL, describe-it methods; what "queued" means; notifications
    6. **Real-time Sync** — explain that all family members see the same state; grocery list is shared in real time
  - Tone: warm, plain language, no technical jargon. Mère-Designer voice.
  - Include one sentence per section explaining what this feature saves you from doing (the anxiety-reduction angle)
  - Max 500 words. Use headers and short paragraphs — mobile-readable.

---

### Group M — Phase 2 Final Checkpoint

- [ ] 35. Add new SSE event schemas to `specs/openapi.yaml`
  - `RecipeFailedEvent`: `{ recipeId, errorMessage, failedStep, partialData? }`
  - `RecipeReadyEvent` (updated): `{ recipeId, name, imageUrl? }`
  - Run `task agent:reconcile` — zero drift
  - Run `task agent:drift` — zero drift

- [ ] 36. Run `dotnet test` — all backend tests pass including new event publisher tests
- [ ] 37. Run `task review` — all E2E tests pass including:
  - `capture.spec.ts`: recipe queued state, library toast on `recipe_ready`, retry toast on `recipe_failed`
  - `discovery.spec.ts`: `fill_the_gap_invalidated` removes card; `vote_updated` shows family interest badge
  - No regressions in Phase 1 tests

---

## Notes

- `SseConnectionManager` is in-memory and per-process. In a multi-instance deployment, events would only reach clients connected to the same instance. For this app (single-family, single-instance), this is acceptable. A future Redis pub/sub layer would fix this for multi-instance — the `IScheduleEventPublisher` interface makes this swap transparent.
- The `EventSource` API does not support custom headers. `x-family-member-id` and `h_access` must be present as HTTP cookies. Both are set during onboarding. `EventSource` sends cookies automatically with `withCredentials: true`. The `StreamController` reads both from `Request.Cookies`.
- Playwright's `page.route()` can intercept `EventSource` requests because they are standard HTTP GET requests. The mock closes immediately after sending the body — this is expected. Tests must assert on DOM state, not connection state.
- The `connected` event snapshot covers `weekOffset=0` only. The planner's `init()` still fetches the correct week on load. SSE keeps it current after that.
- Smart defaults are NOT included in the `connected` snapshot. The `applySnapshot` method in `weekStore` must preserve existing `_isPending` metadata during reconnect to avoid flicker.
- **Multi-week correctness (R14)**: `applySlotUpdate`'s `inCurrentWeek` guard correctly handles any week offset because the loaded `schedule` array always contains the dates for the currently-viewed week. No special handling needed in `useScheduleStream` — pass all events through.
- **Discovery stack ownership (Task 29/33)**: The migration of local `recipes` state to `discoveryStore.discoveryStack` is a lift-and-shift. The Discovery page's fetch logic is unchanged — only the state location moves. This is the minimal invasive change to enable SSE-driven updates without rewriting the component.
- **`recipe_failed` timing (Task 25)**: Publish ONLY on `WorkflowStatus.Failed` (all retries exhausted), NOT on individual `TaskStatus.Failed` (transient). The `WorkflowWorker` currently sets the instance to `WorkflowStatus.Paused` on 429 and `WorkflowStatus.Failed` on fatal. Publish on the fatal path only.

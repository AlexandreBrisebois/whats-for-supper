# Requirements — Live Schedule (Server-Sent Events Push Model)

## Mission Alignment

The WFS mission is to deliver a premium, high-performance meal planning PWA for the whole family. A core part of that experience is that every family member always sees the same state — when Alex assigns a recipe on the planner, Jordan's home page updates immediately. When a meal is marked cooked, everyone transitions together.

The current architecture cannot deliver this. State is fragmented across Zustand stores that are isolated per page load. Cross-page persistence requires gymnastics (optimistic writes, 30-second polls, SSR bypass workarounds). The `today-slot-persistence` spec exposed this directly: the test `Planner Quick Find for today → home shows TonightMenuCard` had to be skipped because `page.goto('/home')` resets all store state and there is no reliable way to propagate a planner assignment to the home page across a navigation.

This spec fixes that at the architectural level. The .NET API becomes the single source of truth. Every mutation publishes a push event. Every connected client — every family member, every page — receives it and updates immediately.

---

## Problem Statement

### What is broken today

1. **Cross-page state does not survive navigation.** Assigning a recipe on `/planner` and navigating to `/home` shows the pivot card, not the menu card. The Zustand store is reset on `page.goto()`. The only recovery is a background `sync()` fetch that races against the loader.

2. **Cross-member state does not propagate at all.** When Alex assigns a recipe, Jordan's browser has no idea until the 30-second poll fires — if it fires. If Jordan is on `/home`, she sees stale state indefinitely.

3. **Polling is fragile and wasteful.** `useWeekStore` polls every 30 seconds. `HomeCommandCenter` polls GOTO synthesis status every 5 seconds. These are band-aids over the absence of push.

4. **The SSR bypass problem is unsolvable with the current model.** `/home` is a Next.js Server Component. SSR fetches bypass Playwright mocks. E2E tests cannot reliably assert on cross-page state transitions because the initial render always uses SSR props, not client-side store state.

### Why this matters for the product

The app is designed for a family. "What's for Supper?" is a shared question. The answer must be the same for everyone, in real time. The current polling model means the answer can be different for different family members for up to 30 seconds — or indefinitely if a member's browser is on a page that doesn't poll.

---

## Solution: Server-Sent Events from the .NET API

The .NET API is the write authority. Every mutation — assign, validate, move, lock, order-in — happens there. The API publishes a push event immediately after each write. Every connected browser receives it and updates its local state.

### Why SSE, not WebSockets

SSE is unidirectional (server → client), which is exactly what this use case requires. Clients write via REST (existing pattern, unchanged). The server pushes state snapshots when writes occur. SSE is native HTTP, works through Traefik without special configuration (with buffering disabled), reconnects automatically, and is simpler to implement and test than WebSockets.

### Why the push originates from .NET, not Next.js

Next.js SSR runs per-request and has no persistent connection. It cannot know when the .NET API writes to the database. Proxying SSE through Next.js `/backend` would require buffering-aware proxy configuration and adds latency. The browser connects directly to the .NET API SSE endpoint, bypassing the `/backend` proxy for this one connection type.

### Why this is not proxied through `/backend`

The `/backend` Next.js rewrite proxy buffers responses before forwarding. SSE requires a persistent, unbuffered connection. Direct browser-to-API SSE sidesteps this entirely. CORS configuration on the .NET API (already in place) allows the browser to connect directly.

---

## User Flows

### Flow 1: Alex assigns a recipe on the planner → Jordan's home page updates

```
Alex (browser A, /planner)
  → clicks Quick Find, selects recipe
  → POST /api/schedule/assign
  → .NET API writes CalendarEvent
  → .NET API publishes ScheduleEvent { type: "slot_updated", date, recipe, status }
  → SSE stream pushes event to all subscribers

Jordan (browser B, /home)
  ← receives SSE event
  ← todayStore.handleScheduleEvent() updates currentRecipe
  ← TonightMenuCard renders with the assigned recipe
  ← no navigation, no reload, no poll wait
```

### Flow 2: Alex marks meal as cooked → Jordan's home page transitions

```
Alex (browser A, /home)
  → completes Cook's Mode
  → POST /api/schedule/day/{date}/validate { status: 2 }
  → .NET API writes CalendarEvent.Status = Cooked
  → .NET API publishes ScheduleEvent { type: "slot_updated", date, recipe: null, status: 2 }

Jordan (browser B, /home)
  ← receives SSE event
  ← todayStore.handleScheduleEvent() sets status = 2
  ← CookedSuccessCard renders
```

### Flow 3: Alex orders in with no recipe → Jordan's pivot card disappears

```
Alex (browser A, /home)
  → taps "Order In" with no recipe
  → POST /api/schedule/day/{date}/validate { status: 3 }
  → .NET API writes CalendarEvent with Guid.Empty sentinel
  → .NET API publishes ScheduleEvent { type: "slot_updated", date, recipe: null, status: 3 }

Jordan (browser B, /home)
  ← receives SSE event
  ← todayStore.handleScheduleEvent() sets status = 3, currentRecipe = null
  ← TonightPivotCard disappears (isSkipped = true)
```

### Flow 4: Alex assigns on planner → Alex navigates to home → menu card is immediate

```
Alex (browser A, /planner)
  → assigns recipe via Quick Find
  → POST /api/schedule/assign
  → .NET API publishes ScheduleEvent
  ← SSE event received by same browser
  ← todayStore updated with currentRecipe

Alex navigates to /home
  → page.goto('/home') — store is reset on navigation
  → SSR renders with whatever the real backend has (may be stale)
  → HomeCommandCenter.init() called with SSR props
  → client-side sync() fires
  → GET /api/schedule?weekOffset=0 returns the assigned recipe (backend has it)
  → todayStore.currentRecipe set from sync()
  → TonightMenuCard renders

NOTE: This flow still depends on sync() completing after navigation.
The SSE connection re-establishes after navigation and will push the
current state snapshot on connect, which also resolves this.
```

### Flow 5: Voting — Jordan votes → Alex's planner vote count updates live

```
Jordan (browser B, /planner)
  → votes on a recipe
  → POST /api/discovery/{id}/vote
  → .NET API writes RecipeVote
  → .NET API publishes VoteEvent { type: "vote_updated", recipeId, voteCount }

Alex (browser A, /planner)
  ← receives SSE event
  ← weekStore.handleVoteEvent() updates voteCount on the matching day
  ← vote badge updates without poll
```

### Flow 6: GOTO synthesis completes → home page transitions from pending to ready

```
.NET API (background workflow)
  → RecipeReadyProcessor marks recipe as synthesized
  → publishes RecipeEvent { type: "recipe_ready", recipeId }

Alex (browser A, /home)
  ← receives SSE event
  ← HomeCommandCenter checks if recipeId matches gotoRecipeId
  ← setGotoRecipeStatus('ready')
  ← confirm-goto-btn appears
  ← 5-second polling interval removed
```

---

## Requirements

### R1 — SSE endpoint

- The .NET API MUST expose `GET /api/stream` as a Server-Sent Events endpoint
- The endpoint MUST require `X-Family-Member-Id` header (same auth as all other endpoints)
- The endpoint MUST send a `connected` event immediately on connection with the current `ScheduleDays` snapshot for `weekOffset=0`
- The endpoint MUST keep the connection open indefinitely, sending a heartbeat comment (`: ping`) every 15 seconds to prevent proxy timeouts
- The endpoint MUST send events when any of the following mutations occur:
  - `POST /api/schedule/assign`
  - `POST /api/schedule/day/{date}/validate`
  - `POST /api/schedule/move`
  - `DELETE /api/schedule/day/{date}/remove`
  - `POST /api/schedule/lock`
  - `POST /api/schedule/voting/open`
  - `POST /api/discovery/{id}/vote`
  - Recipe synthesis completion (RecipeReadyProcessor)

### R2 — Event schema

All events MUST follow the SSE format:

```
event: <event-type>
data: <json-payload>

```

Event types and their payloads:

| Event type | Payload schema | Trigger |
|---|---|---|
| `connected` | `{ schedule: ScheduleDays }` | On SSE connection established |
| `slot_updated` | `{ date: string, recipe: ScheduleRecipeDto \| null, status: number }` | Any schedule mutation affecting a specific day |
| `week_updated` | `{ schedule: ScheduleDays }` | Lock, voting open, move (affects multiple days) |
| `vote_updated` | `{ recipeId: string, voteCount: number }` | Vote cast or purged |
| `recipe_ready` | `{ recipeId: string }` | Recipe synthesis workflow completes |

### R3 — Client SSE connection

**Flow doc:** [`docs/flows/user-flows/profile-member-selection.md`](../../docs/flows/user-flows/profile-member-selection.md) — documents how `x-family-member-id` is set via member selection, and the "Continue as [name]" escape hatch

- The PWA MUST establish an SSE connection to `/api/stream` on app mount. `NEXT_PUBLIC_API_BASE_URL` is intentionally **empty** in all deployed environments — Traefik routes `/api/` directly to the .NET API, so no origin prefix is needed. When the env var is set (e.g. in local dev with a direct API port), it is used as the origin prefix; otherwise the hook connects via the relative path `/api/stream`. The hook MUST NOT skip the connection or warn when the env var is absent — that is the normal production case.
- The connection MUST be established in a singleton hook (`useScheduleStream`) that is mounted once at the app layout level
- The hook MUST reconnect automatically on disconnect (native `EventSource` reconnect behaviour)
- The hook MUST NOT be mounted inside individual page components — it lives at the layout level so it survives page navigation
- On `slot_updated` event: update `todayStore` if the date matches today; update `weekStore` if the date is in the current week
- On `week_updated` event: update `weekStore.schedule` with the full snapshot
- On `vote_updated` event: update `weekStore` vote counts
- On `recipe_ready` event: notify any component polling GOTO status

### R4 — todayStore persistence across navigation

- `todayStore` MUST be mounted at the layout level (not page level) so it survives `page.goto()` navigation
- The store MUST NOT be re-initialised on every page mount — `init()` is called once on app load
- Individual pages (`HomeCommandCenter`) subscribe to `todayStore` state reactively
- This eliminates the SSR bypass problem: the store is already populated when `/home` renders

### R5 — Remove polling

- `useWeekStore` 30-second poll interval MUST be removed once SSE is active
- `HomeCommandCenter` GOTO synthesis 5-second poll MUST be replaced by `recipe_ready` SSE event
- Polling MAY be retained as a fallback if the SSE connection is not established (graceful degradation)

### R6 — OpenAPI contract

The `GET /api/stream` endpoint MUST be documented in `specs/openapi.yaml`:

```yaml
/api/stream:
  get:
    summary: Server-Sent Events stream for real-time schedule updates
    description: >
      Establishes a persistent SSE connection. Sends a 'connected' event with
      the current schedule snapshot on connect, then pushes events for all
      schedule mutations. Heartbeat comments sent every 15 seconds.
    security: [{ FamilyMemberId: [] }]
    responses:
      '200':
        description: SSE stream
        content:
          text/event-stream:
            schema:
              type: string
```

And the event payload schemas MUST be added to `components/schemas`:

```yaml
ScheduleStreamEvent:
  type: object
  required: [type]
  discriminator:
    propertyName: type
  properties:
    type: { type: string }

SlotUpdatedEvent:
  allOf:
    - $ref: '#/components/schemas/ScheduleStreamEvent'
    - type: object
      required: [date, status]
      properties:
        date: { type: string, format: date }
        recipe: { $ref: '#/components/schemas/ScheduleRecipeDto', nullable: true }
        status: { type: integer }

WeekUpdatedEvent:
  allOf:
    - $ref: '#/components/schemas/ScheduleStreamEvent'
    - type: object
      required: [schedule]
      properties:
        schedule: { $ref: '#/components/schemas/ScheduleDays' }

VoteUpdatedEvent:
  allOf:
    - $ref: '#/components/schemas/ScheduleStreamEvent'
    - type: object
      required: [recipeId, voteCount]
      properties:
        recipeId: { type: string, format: uuid }
        voteCount: { type: integer }

RecipeReadyEvent:
  allOf:
    - $ref: '#/components/schemas/ScheduleStreamEvent'
    - type: object
      required: [recipeId]
      properties:
        recipeId: { type: string, format: uuid }
```

### R7 — Mock API (Playwright E2E)

The `setupCommonRoutes()` helper in `pwa/e2e/mock-api.ts` MUST be updated to mock the SSE endpoint:

```typescript
// SSE stream — returns a minimal EventSource-compatible response
// Tests that need specific push events can override this route
await page.route(/\/(?:backend\/)?api\/stream/, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'text/event-stream',
    headers: {
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
    body: 'event: connected\ndata: {"type":"connected","schedule":{"weekOffset":0,"locked":false,"status":0,"days":[]}}\n\n',
  });
});
```

Tests that need to simulate a push event (e.g. the skipped cross-page test) can override this route to emit a `slot_updated` event after a delay, making the test deterministic without any polling or timing dependency.

### R8 — CORS

The .NET API MUST allow direct browser connections from the PWA origin for the SSE endpoint. CORS is already configured via `Cors:AllowedOrigins` in `appsettings.json` and environment variables. No additional CORS work is required beyond what was done in the `today-slot-persistence` spec.

### R9 — Traefik buffering

The Traefik dynamic configuration MUST disable response buffering for the `/api/stream` route:

```yaml
# docker/compose/traefik_dynamic.yml
http:
  middlewares:
    sse-no-buffer:
      headers:
        customResponseHeaders:
          X-Accel-Buffering: "no"
  routers:
    api-stream:
      rule: "Host(`api.wfs.localhost`) && Path(`/api/stream`)"
      middlewares: [sse-no-buffer]
      service: api
```

---

## What this unblocks

Once this spec is implemented:

1. The skipped test `Planner Quick Find for today → home shows TonightMenuCard` can be re-enabled. The test mocks the SSE endpoint to emit a `slot_updated` event after the assign call, and the home page updates deterministically.

2. The 30-second planner poll is removed. The planner is always current.

3. The GOTO synthesis polling loop is removed. The home page transitions immediately when synthesis completes.

4. All family members see the same state in real time. The app delivers on its core promise.

---

## Out of scope

- WebSocket bidirectional communication (not needed — clients write via REST)
- Per-family-member filtering of events (all family members share the same schedule state)
- Offline support / service worker caching of SSE events
- Event replay / catch-up for reconnecting clients (the `connected` event provides current snapshot; full history is not needed)

---

## Extended Flows — Phase 2 (discovered in gap review)

These flows were identified after the initial spec was written. They are part of this spec — same SSE infrastructure, same client hook, same backend publisher. They represent the full value of the SSE transition: not just schedule sync, but live feedback across every async operation the app performs.

---

### Flow 7: Recipe import failure → actionable retry with pre-filled form

```
User submits a URL/photo/describe recipe
  → .NET API creates Recipe stub, queues workflow
  → User sees success screen, navigates to /home
  → WorkflowWorker processes tasks
  → A task fails (e.g. AI extraction error, image download error)
  → WorkflowWorker sets TaskStatus.Failed + ErrorMessage

  Current state: user never knows. Recipe sits in limbo.

  With SSE:
  .NET API WorkflowWorker on fatal task failure
    → publishes RecipeFailedEvent { recipeId, errorMessage, failedStep, partialData? }

  User's browser (wherever they are)
    ← receives SSE event
    ← captureStore.handleRecipeFailed() stores the failure
    ← toast notification appears: "We couldn't process your recipe. Tap to review."
    ← user taps → navigates to /capture?recipeId={id}&mode=retry
    ← capture form pre-filled with whatever partial data was recovered
    ← user edits and resubmits → PATCH /api/recipes/{id} (updates existing, no new ID)
```

**Why this matters:** Today, failed recipes silently vanish. The user re-adds from scratch, creating duplicates. The retry-with-same-ID pattern prevents that and makes the library trustworthy.

**R10 — Recipe failure SSE event**

**Flow doc:** [`docs/flows/user-flows/goto-lifecycle.md`](../../docs/flows/user-flows/goto-lifecycle.md) — see "FamilyGOTOSettings Card States" and "SSE Touchpoints Summary"

- The `WorkflowWorker` MUST publish a `recipe_failed` SSE event when a workflow instance transitions to `WorkflowStatus.Failed` (all retries exhausted)
- Payload: `{ recipeId, errorMessage, failedStep, partialData: { name?, imageUrl? } }`
- The PWA MUST handle `recipe_failed` in `useScheduleStream` and push the failure into a `captureStore` or notification queue
- A non-blocking toast or banner MUST appear wherever the user is, with a CTA to review the failed recipe
- The retry navigation MUST route to `/capture?recipeId={id}&mode=retry` and pre-fill the form with `partialData`
- The retry submit MUST use `PATCH /api/recipes/{id}` — same ID, no new stub created

---

### Flow 8: Recipe synthesis complete → library notification toast

```
User submits a recipe (any path — photo, URL, describe)
  → navigates away to /home or /planner
  → WorkflowWorker completes synthesis
  → RecipeReadyProcessor fires
  → publishes RecipeReadyEvent { recipeId, name, imageUrl }

  Current state: user never knows the recipe is ready until they visit /recipes.

  With SSE:
  User's browser (wherever they are)
    ← receives recipe_ready event
    ← toast appears: "✓ [Recipe Name] added to your library"
    ← toast has optional CTA: "Add to this week" → opens QuickFindModal pre-filled
```

**Why this matters:** The success screen currently says "Your recipe is safe in the library" — that's a lie. It's queued, not saved. SSE lets us tell the truth: show a pending state, then a real confirmation when synthesis is done.

**R11 — recipe_ready event enriched payload**

**Flow doc:** [`docs/flows/user-flows/goto-lifecycle.md`](../../docs/flows/user-flows/goto-lifecycle.md) — see "Path 2: Describe It (Pending → Ready via SSE)" and "SSE Touchpoints Summary"

- The existing `recipe_ready` event payload MUST be extended to include `{ recipeId, name, imageUrl }` (currently only `{ recipeId }`)
- The PWA `useScheduleStream` handler MUST:
  - Continue to call `useGotoStore.getState().markReady(recipeId)` for GOTO flow (existing R requirement)
  - Also push a library notification: `useLibraryStore.getState().markReady({ recipeId, name, imageUrl })`
- A `LibraryToast` component renders in the layout when `libraryStore.pendingNotifications` is non-empty
- The toast auto-dismisses after 5 seconds; tapping "Add to this week" opens `QuickFindModal`

---

### Flow 9: Discovery stack — live removal when a recipe is planned

```
Jordan is swiping in Discovery
  Alex (or Jordan on planner) assigns Recipe X to this week's plan
  → POST /api/schedule/assign fires
  → .NET API publishes fill_the_gap_invalidated

  Current state: Jordan continues to see Recipe X in her discovery stack,
  votes on it, but it's already planned — wasted swipe.

  With SSE:
  Jordan's browser (on /discovery)
    ← receives fill_the_gap_invalidated
    ← discoveryStore.invalidateFillTheGap() increments fillTheGapVersion
    ← Discovery page watches fillTheGapVersion → triggers silent refetch of current category
    ← server returns stack without Recipe X (already planned, filtered server-side)
    ← Recipe X card slides out of Jordan's stack silently
```

**Why this matters:** Voting on already-planned recipes wastes the family's discovery bandwidth and inflates vote counts incorrectly.

**R12 — Discovery stack invalidation on plan assignment**

**Flow doc:** [`docs/flows/data-flows/week-lifecycle.md`](../../docs/flows/data-flows/week-lifecycle.md) — see "Draft → Slot Assigned" and "Store Update Summary"

- The Discovery page (`pwa/src/app/(app)/discovery/page.tsx`) MUST subscribe to `useDiscoveryStore((s) => s.fillTheGapVersion)`
- When `fillTheGapVersion` changes (SSE `fill_the_gap_invalidated` received), the Discovery page MUST refetch the current category's stack silently (no loading spinner — merge new results, removing newly-planned recipes from current local state by ID diff)
- The API `GET /api/discovery/items?category={cat}` MUST filter out recipes that are currently assigned to any slot in `weekOffset=0` — this is the server-side responsibility; the client only needs to refetch
- Do NOT flash an empty state during the refetch — keep current cards visible until new stack arrives, then diff

---

### Flow 10: Discovery stack — vote bubbling (live re-rank on incoming votes)

```
Jordan votes ♥ on Recipe X in her Discovery stack
  → POST /api/discovery/{id}/vote
  → .NET API publishes VoteUpdatedEvent { recipeId, voteCount }
  → .NET API checks smart-defaults threshold → may publish SmartDefaultsUpdatedEvent

  Alex is also on /discovery
  Current state: Alex's stack order never changes.

  With SSE:
  Alex's browser (on /discovery)
    ← receives vote_updated { recipeId, voteCount }
    ← discoveryStore.applyVoteUpdate({ recipeId, voteCount })
    ← if Recipe X is in Alex's current stack AND voteCount now indicates family interest,
       move it toward the top (re-sort by family interest signal)
    ← hasFamilyInterest flag updated on the card → card shows family interest indicator
```

**Why this matters:** The current stack is fetched once and never updated. When family members vote simultaneously, the person with the highest-interest recipe gets buried under unseen cards. Re-ranking bubbles consensus candidates to the top, accelerating the family decision.

**R13 — Discovery vote bubbling**

**Flow doc:** [`docs/flows/data-flows/week-lifecycle.md`](../../docs/flows/data-flows/week-lifecycle.md) — see "VotingOpen → Vote Cast" and "Store Update Summary"

- `useDiscoveryStore` MUST add `applyVoteUpdate({ recipeId, voteCount })` action
- `useScheduleStream` MUST also call `useDiscoveryStore.getState().applyVoteUpdate(...)` on `vote_updated` events (in addition to `weekStore.applyVoteUpdate`)
- `applyVoteUpdate` updates `hasFamilyInterest` on the matching recipe in a local `discoveryStack` state field
- When `hasFamilyInterest` transitions from `false` to `true`, the recipe MUST be moved toward the front of the stack (not necessarily position 0 — move up by 2 positions max to avoid jarring reorder while the user is swiping)
- The Discovery card MUST visually indicate `hasFamilyInterest` (a small family indicator — design system choice)
- Do NOT refetch the entire stack for a single vote — update in-place

---

### Flow 11: Multi-week planner SSE — live updates beyond week 0

```
User is viewing week 1 (next week's plan) on the planner
  Alex assigns a recipe to week 1, day 3 from another device
  → POST /api/schedule/assign (weekOffset=1)
  → .NET API publishes slot_updated { date: "2026-05-12", recipe, status }

  Current state with naïve weekStore SSE: applySlotUpdate checks if date is in
  currently-loaded schedule. If user is on week 1, schedule has week 1 dates → update applied ✓.
  BUT: applySlotUpdate also checks against weekStore.weekOffset — the SSE hook currently
  only calls applySlotUpdate without knowing which week the user is viewing.

  Two-source-of-truth gap: plannerStore.currentWeekOffset drives what week is rendered.
  weekStore.weekOffset is set by weekStore.init(). They must stay in sync.
```

**Why this matters:** The planner lets users navigate weeks. SSE must work for any week the user is viewing, not just week 0. Dropping events for non-zero weeks silently breaks multi-week planning.

**R14 — Multi-week SSE correctness**

**Flow doc:** [`docs/flows/data-flows/week-lifecycle.md`](../../docs/flows/data-flows/week-lifecycle.md) — see "Multi-Week Correctness (R14)" section

- `weekStore.weekOffset` MUST be the single source of truth for which week is loaded. `plannerStore.currentWeekOffset` drives navigation but MUST call `weekStore.init(weekOffset)` on change — this is already the case (planner page `useEffect` on `currentWeekOffset`).
- `applySlotUpdate` checks `inCurrentWeek` against the loaded schedule dates — this naturally handles any offset, because `init(1)` loads week 1 dates into `schedule`.
- When the user is on week 1 and receives `slot_updated` for a week 0 date → correctly silently ignored (week 0 data will be fresh on `init(0)`).
- When the user is on week 1 and receives `slot_updated` for a week 1 date → correctly applied.
- **New gap**: the `connected` event snapshot is week 0 only. If user navigates to week 1, they get no SSE snapshot for week 1 — `init(1)` REST fetch is the source of truth. SSE events keep it current after that. This is acceptable and MUST be documented as the intended behaviour.
- **New requirement**: `useScheduleStream` MUST pass all `slot_updated` events to `weekStore.applySlotUpdate` regardless of offset — `applySlotUpdate`'s `inCurrentWeek` guard is the correct filter.

---

### Flow 12: Capture form success screen — honest async feedback

```
Current state:
  User submits recipe → sees "Captured!" screen → redirected to /home in 4s.
  Recipe is actually QUEUED, not ready. The success screen is a lie.

  Better flow with SSE:
  User submits recipe
    → API returns { recipeId } immediately
    → Success screen shows "Recipe queued — we'll notify you when it's ready"
    → captureStore.setPendingRecipe({ recipeId, submittedAt })
    → User navigates away
    → SSE: recipe_ready → toast "✓ [Name] is ready in your library"
    → SSE: recipe_failed → toast "Recipe couldn't be processed — tap to retry"
```

**R15 — Honest capture success state**

**Flow doc:** [`docs/flows/user-flows/goto-lifecycle.md`](../../docs/flows/user-flows/goto-lifecycle.md) — see "Path 2: Describe It" and "FamilyGOTOSettings Card States"
**Flow doc:** [`docs/flows/user-flows/sse-capture-async-feedback.md`](../../docs/flows/user-flows/sse-capture-async-feedback.md) — full capture async feedback flow

- The capture success screen MUST distinguish between "queued" (immediately after submit) and "ready" (after `recipe_ready` SSE event)
- The success screen for photo/URL paths MUST show: "Processing your recipe… we'll let you know when it's ready." with a dismiss/home CTA — not "Recipe saved!"
- The describe path (synchronous synthesis) MAY show "Recipe saved!" if the API confirms synthesis inline — needs verification of response contract
- `captureStore` MUST track `pendingRecipes: Array<{ recipeId, name?, submittedAt }>` so the SSE handler knows which `recipe_ready` events are relevant to this user's session
- On `recipe_ready`: if `recipeId` is in `captureStore.pendingRecipes`, show the library toast (Flow 8 / R11) AND remove from pending
- On `recipe_failed`: if `recipeId` is in `captureStore.pendingRecipes`, show the retry toast (Flow 7 / R10) AND remove from pending

---

## Revised event table (full set)

| Event type | Payload | Trigger | New? |
|---|---|---|---|
| `connected` | `{ schedule: ScheduleDays }` | On SSE connect | Existing |
| `slot_updated` | `{ date, recipe\|null, status }` | Any slot mutation | Existing |
| `week_updated` | `{ schedule: ScheduleDays }` | Lock, voting open, move | Existing |
| `vote_updated` | `{ recipeId, voteCount }` | Vote cast | Existing |
| `smart_defaults_updated` | `{ weekOffset, defaults }` | Vote crosses threshold | Existing |
| `fill_the_gap_invalidated` | `{ weekOffset }` | Slot assigned or removed | Existing |
| `recipe_ready` | `{ recipeId, name, imageUrl }` | Synthesis/import complete | **Extended payload** |
| `recipe_failed` | `{ recipeId, errorMessage, failedStep, partialData? }` | Workflow fatal failure | **New** |
| `grocery_updated` | `{ weekOffset, groceryState: Record<string, boolean> }` | Any grocery PATCH | **New** |

---

### Flow 13: Grocery list — real-time cross-member sync

```
Alex checks "Onions" in the grocery list
  → PATCH /api/schedule/{weekOffset}/grocery { Onions: true }
  → .NET API writes to WeeklyPlan.GroceryState
  → publishes grocery_updated { weekOffset, groceryState }

Jordan's phone (also in the grocery store)
  ← receives grocery_updated
  ← plannerStore.setGroceryState(groceryState)
  ← Onions checkbox updates silently — no navigation, no flash
```

**Why this matters:** Two family members splitting the grocery store can share a live checklist. Without SSE, they each see their own version and risk buying duplicates.

**R16 — Grocery list SSE sync**

**Flow doc:** [`docs/flows/data-flows/grocery-sse-sync.md`](../../docs/flows/data-flows/grocery-sse-sync.md) — full grocery SSE sync and jitter fix
**Flow doc:** [`docs/flows/data-flows/week-lifecycle.md`](../../docs/flows/data-flows/week-lifecycle.md) — see "Store Update Summary" for `grocery_updated` handler

- The `ScheduleDays` DTO MUST include `groceryState: Dictionary<string, bool>?` as a typed first-class field (not via `additionalData`)
- `weekStore.applySnapshot()` MUST call `plannerStore.setGroceryState()` atomically in the same update — no trailing side-effect that causes a two-render gap (jitter fix)
- `ScheduleService.UpdateGroceryStateAsync` MUST publish `grocery_updated { weekOffset, groceryState }` after `SaveChangesAsync()`
- `useScheduleStream` MUST handle `grocery_updated`: apply only if `weekOffset` matches the currently-loaded week
- The `isSaving` global spinner in `GroceryList` MUST be removed — optimistic toggle + SSE confirmation is the UX feedback
- On PATCH failure: revert the single toggled item only; show a per-item inline error indicator (not a global spinner)

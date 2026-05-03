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

- The PWA MUST establish an SSE connection to `${NEXT_PUBLIC_API_BASE_URL}/api/stream` on app mount
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

# ADR 011: Real-Time Sync Strategy

## Status: Proposed

## Context

"What's For Supper" is a multi-device household app where family members interact with shared data (recipe library, meal planner, inspiration pool) from different devices simultaneously. Changes made on one device must become visible on others with acceptable latency.

[sharing-collaboration.spec.md](../sharing-collaboration.spec.md) specifies polling as the current real-time sync strategy with a "future" WebSocket/SSE upgrade deferred. However, the spec leaves several questions unresolved:
- How long is "acceptable latency" for a polling interval?
- How do clients detect when their local view is stale?
- How does a veto (left-swipe in discovery) propagate across devices when there's no push mechanism?
- When (and why) should the app upgrade from polling to WebSocket?

This ADR resolves the polling strategy for Phases 0–4 and defines the forcing function for the Phase 5 WebSocket upgrade.

## Decision

### 1. Polling-First Architecture for Phases 0–4

**Decision:** Real-time sync uses HTTP polling (client → server). No WebSocket or Server-Sent Events in Phases 0–4.

**Rationale:**
- **Simplicity:** Polling is trivial to implement (timer + fetch loop in browser). No new infrastructure (no WebSocket server).
- **Reliability on LAN:** Polling is robust on home LAN; no connection keepalive complexity.
- **Mobile-friendly PWA:** Service Workers can be scheduled to poll in the background without maintaining a WebSocket connection.
- **NAS resource budget:** No need for persistent connections or WebSocket server overhead on NAS hardware.
- **Adequate for household:** Latencies of 15–30 seconds are acceptable for household meal planning and discovery voting. Not every swipe needs instant visibility across devices.

### 2. Polling Intervals: Hard Numbers

| Context | Endpoint | Interval | Why |
|---------|----------|----------|-----|
| **Planner screen** | `GET /api/schedule` | 30 seconds | User is calmly planning meals; changes (add/move/delete) are infrequent. 30s latency is imperceptible. |
| **Discovery screen** | `GET /api/discovery/pool` | 15 seconds | User is actively swiping. Family veto (left-swipe on one device) should be visible on another device within 15s for a smooth feeling. |
| **Settings screen** | `GET /api/family` | 60 seconds | Family member list is rarely changed; longer interval acceptable. |
| **Other routes** | No polling | — | Onboarding, capture, confirmation screens are single-user workflows; no shared state. |

**Not configurable in Phase 4.** These intervals are baked into the PWA code. In Phase 5+, they can be surfaced as `NEXT_PUBLIC_*_SYNC_INTERVAL_MS` env vars if needed.

### 3. Staleness Detection: `updatedAt` Timestamps

**Decision:** Every response from a polled endpoint includes an `updatedAt` timestamp. The client tracks the timestamp of its last local state and compares it on each poll to detect when the server state has changed.

**Implementation:**

**API Response Format (e.g., `GET /api/schedule`):**
```json
{
  "updatedAt": "2026-04-14T15:30:45.123Z",
  "events": [
    { "id": "...", "date": "2026-04-15", "slot": "Supper", "recipeId": "..." },
    ...
  ]
}
```

**Client Zustand Store:**
```typescript
// In `lib/store.ts` (Zustand)
const usePlannerStore = create((set) => ({
  schedule: [],
  scheduleSyncedAt: null,  // Timestamp of the last polled updatedAt
  setSchedule: (data) => set({ 
    schedule: data.events, 
    scheduleSyncedAt: data.updatedAt 
  }),
}));

// In polling logic (useEffect)
useEffect(() => {
  const poll = async () => {
    const response = await fetch('/api/schedule');
    const data = await response.json();
    if (data.updatedAt !== store.scheduleSyncedAt) {
      // Server has changed data; update local state
      store.setSchedule(data);
      showStaleBanner(false);
    }
  };
  const interval = setInterval(poll, 30_000);
  return () => clearInterval(interval);
}, []);
```

**`updatedAt` contract on API responses:**

Affected endpoints:
- `GET /api/schedule` — `updatedAt` reflects the most recent `CalendarEvent.updated_at` in the response range
- `GET /api/discovery/pool` — `updatedAt` reflects the most recent `inspirationPool.updated_at`
- `GET /api/recipes` — `updatedAt` reflects the most recent `recipes.updated_at` in the page
- `GET /api/recipes/{id}` — `updatedAt = recipes.updated_at`
- `GET /api/family` — `updatedAt` reflects the most recent `family_members.updated_at`

**Database requirement:** All relevant tables must have an `updated_at TIMESTAMPTZ` column, auto-updated on any mutation (INSERT, UPDATE).

### 4. Stale-Data Banner: UI Feedback

**Scenario:** User is looking at the planner on Device A. On Device B (another family member), a meal is added to Monday Supper. After ≤30 seconds, Device A should detect the change.

**Implementation:**

**Detection logic:**
```typescript
useEffect(() => {
  const poll = async () => {
    const response = await fetch('/api/schedule');
    const data = await response.json();
    
    if (data.updatedAt && data.updatedAt !== store.scheduleSyncedAt) {
      // Local view is stale
      setIsStale(true);
      // Optionally auto-refresh if user hasn't interacted recently
    } else {
      setIsStale(false);
    }
  };
  const interval = setInterval(poll, 30_000);
  return () => clearInterval(interval);
}, []);
```

**UI Presentation:**
- A sticky banner at the top: **"The schedule was updated on another device. [Refresh]"**
- Color: Amber/yellow (informational, not alarming).
- Action: User can click [Refresh] to reload, or the banner auto-dismisses after they edit something locally (optimistic update).
- Non-blocking: User can continue planning; stale data does not prevent edits.

**Dismissal:**
- Clicking [Refresh] → re-fetch and update local state → dismiss banner.
- After a local mutation (`PATCH /api/schedule` succeeds) → dismiss banner (user's change is now the source of truth).
- After 60 seconds of inactivity → auto-dismiss (assume user has stopped interacting).

### 5. Veto Propagation: Immediate Write, Poll-Cycle Delivery

**Scenario:** Family member A is on the Discovery screen (swiping). They left-swipe a recipe (veto). Family member B is also on Discovery. What happens?

**Decision:** Veto is written to the database immediately (on member A's swipe). Member B sees the veto on the next poll cycle (≤15 seconds).

**Implementation:**

**On left-swipe (member A's device):**
1. Frontend calls `DELETE /api/discovery/pool/{recipeId}` immediately (no delay).
2. API writes `inspirationPool.vetoed_by = member_A` and `deleted = true`.
3. API returns `updatedAt = now()`.
4. Member A's device updates local state and dismisses the card from the stack.

**On discovery poll (member B's device, 15 seconds later):**
1. `GET /api/discovery/pool` returns the updated list (veto-removed recipe is absent).
2. `updatedAt` has changed, triggering a local refresh.
3. Member B's device detects the recipe is missing and removes it from their stack.
4. No special notification needed; the card simply disappears on the next poll.

**Why not instant push?**
- Polling is one-way (client → server) by design. No push mechanism exists in Phase 0–4.
- 15-second latency is acceptable for a household app ("pretty responsive").
- The alternative (WebSocket push) is deferred to Phase 5.

**Note:** This means Member B might swipe the same recipe in the 15-second window before the veto arrives. Their swipe will be recorded, then the veto will overwrite it on the next poll. This is acceptable behavior; conflicts are resolved in favor of the veto (Last-Veto-Wins, not Last-Write-Wins, for inspiration pool).

### 6. Conflict Resolution Summary

| Data | Conflict Type | Resolution |
|------|---------------|-----------|
| **Planner (CalendarEvents)** | Simultaneous edits to the same slot | Last-Write-Wins (later `PATCH` overwrites) + stale-data banner to warn |
| **Inspiration Pool (Right-swipes)** | Simultaneous right-swipes by different members | Additive (both are recorded; no conflict) |
| **Inspiration Pool (Veto)** | Right-swipe then veto, or simultaneous swipes then veto | Last-Veto-Wins (veto overwrites swipe) |
| **Recipe edits** | N/A | Out of scope; recipes immutable after capture |

### 7. WebSocket Upgrade Path: Phase 5+ with Agent Push

**Current state (Phases 0–4):** Polling only. Client pulls data on a fixed schedule.

**Upgrade trigger (Phase 5):** `CoordinateFamilyAgent` generates notifications (e.g., "Shopping list ready", "Meal suggestion for this week"). These are time-sensitive and should be pushed, not polled.

**Forcing function:**
- If notifications are polled on a 30-second cycle, users may miss time-sensitive alerts ("Shopping list ready" must be delivered within seconds, not half a minute).
- Therefore, Phase 5 deploys a WebSocket server and transitions real-time sync to push-based.

**Phase 5 Implementation (TBD):**
- Add a WebSocket server to the Recipe API (.NET 10 signalR or custom handler).
- Update PWA to open a WebSocket connection on app load.
- Agents and planner mutations publish events to the WebSocket server.
- Clients receive updates instantly (push model).
- Fallback to polling if WebSocket disconnects (hybrid model).

**Why not sooner?**
- Polling is sufficient for Phases 0–4. WebSocket adds complexity without enough payoff in those phases.
- Phase 5 agents create the need (push notifications), justifying the infrastructure investment.

---

## Consequences

### Positive
- Simple to implement and test (no WebSocket framework, no connection management).
- Works reliably on home LAN with modest client device resources.
- Scaling is transparent (polling is stateless; multiple API instances handle it naturally).
- Progressive enhancement: polling works immediately; WebSocket can be layered on top in Phase 5+ without disrupting polling.

### Negative
- 15–30 second latency is noticeable if a family member expects instant sync (e.g., "I swiped on my phone, why doesn't the TV see it?").
- Polling consumes slightly more bandwidth than push (many requests, even if data hasn't changed). On mobile data, this could drain battery.
- Phase 5 WebSocket upgrade will require client and server changes; not a backwards-compatible addition.

---

## Testing

**Unit tests:**
- `scheduleSyncedAt` updates correctly when `updatedAt` changes.
- Stale-data banner appears/disappears correctly based on timestamp comparison.

**Integration tests:**
- Two clients polling the same endpoint; one edits → second client detects change within 30 seconds.
- Veto on Device A; Device B detects veto on next poll cycle.

**Manual testing (Phase 3+):**
- Open the app on two devices side-by-side.
- Make changes on Device A (e.g., add a meal); observe change appear on Device B within polling interval.
- Verify stale-data banner appears and disappears correctly.

---

## Participants
- **Architect Alex** — Decision owner
- **Frontend Lead** — Polling + staleness detection implementation (TBD)

---

## Implementation Checklist (Phases 1–4)

**Phase 1 (Foundation):**
- [ ] Add `updated_at` timestamp to `recipes` table (migration)
- [ ] Add `updated_at` timestamp to `family_members` table (migration)

**Phase 2 (Planner intro):**
- [ ] Add `updated_at` timestamp to `calendar_events` table (migration)
- [ ] Add `updated_at` timestamp to `inspiration_pool` table (migration)
- [ ] Implement `GET /api/schedule` endpoint with `updatedAt` in response

**Phase 3 (Discovery):**
- [ ] Implement `GET /api/discovery/pool` endpoint with `updatedAt` in response
- [ ] Implement polling logic in PWA (`lib/hooks/useSchedulePolling.ts`)
- [ ] Implement polling logic for discovery (`lib/hooks/usePoolPolling.ts`)
- [ ] Implement stale-data banner UI component (`components/StaleDataBanner.tsx`)

**Phase 4+ (Optional):**
- [ ] Add `NEXT_PUBLIC_PLANNER_SYNC_INTERVAL_MS` env var (default 30000)
- [ ] Add `NEXT_PUBLIC_DISCOVERY_SYNC_INTERVAL_MS` env var (default 15000)
- [ ] Document polling intervals in frontend-pwa.spec.md

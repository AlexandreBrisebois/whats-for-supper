# Data Flow: Planner Drag-and-Drop & SSE Echo Suppression

**Related:** [`week-lifecycle.md`](./week-lifecycle.md), [`client-domain-model.md`](../client-domain-model.md)

---

## Symptoms that prompted this work

- Dragging a recipe to the top of the list landed it at index 1, not 0.
- Dragging past multiple cards landed the recipe one position short of the target.
- The `X-SSE-Connection-ID` echo suppression (BS-11) and a 10-second wall-clock guard (`optimisticWriteAt`) had been added in previous attempts but the jank persisted.

---

## Three bugs, one root cause chain

### Bug 1 — Framer Motion `onReorder` never fires for the terminal slot

`Reorder.Group.onReorder` fires only when the dragged card crosses another card's midpoint. At the top (index 0) and bottom (index 6), there is no further midpoint to cross, so `onReorder` stops firing one step before the boundary.

The previous code stored the Framer-reported order in `lastReorderRef`:

```ts
const handleReorder = (newSchedule) => {
  lastReorderRef.current = newSchedule;  // never updated for terminal position
};
```

`onDragEnd` then read `lastReorderRef` to compute `finalTo`. When dragging to index 0, `lastReorderRef` held the order with the card at index 1 — the last midpoint crossing Framer reported. The API call sent `toIndex: 1` instead of `toIndex: 0`.

The same off-by-one applied to the bottom and to any multi-step drag where the final midpoint crossing was one position short of the release point.

**Fix:** `handleReorder` now calls `reorderLocally(from, to)` directly, keeping the store in sync with Framer's visual order on every midpoint crossing. `onDragEnd` reads `getState().schedule` instead of the stale ref. Since the store is always current — including intermediate positions — the final `getState().schedule` reflects the true terminal position.

```ts
// NEW
const handleReorder = (newSchedule) => {
  const current = useWeekStore.getState().schedule;
  // find which item moved by comparing positions
  for (let i = 0; i < newSchedule.length; i++) {
    const currentIdx = current.findIndex((d) => d._uiId === newSchedule[i]._uiId);
    if (currentIdx !== i) {
      useWeekStore.getState().reorderLocally(currentIdx, i);
      break;
    }
  }
};

// onDragEnd reads store, not stale ref
const finalOrder = useWeekStore.getState().schedule;
const finalTo = finalOrder.findIndex((d) => d._uiId === day._uiId);
```

`lastReorderRef` is removed entirely.

### Bug 2 — `preDragSnapshot` captured optimistic state, not server state

`preDragSnapshotRef` was set in `onDragStart` from `getState().schedule`. If a previous drag had applied `reorderLocally` within the 10-second `optimisticWriteAt` window, the snapshot reflected the optimistic order rather than the server's confirmed order. The `from` index derived from it could differ from what the server expected, causing back-to-back moves to compound the error.

This is a secondary contributor — Bug 1 was sufficient to cause all reported symptoms. Fix 1 also reduces the blast radius here because the store is now updated during drag, making the snapshot taken at `onDragStart` the authoritative pre-drag state.

### Bug 3 — Wall-clock optimistic guard expired regardless of server confirmation

`applySnapshot` used a 10-second window:

```ts
const optimisticIsRecent = optimisticWriteAt !== null && Date.now() - optimisticWriteAt < 10_000;
if (optimisticIsRecent) { skip update; }
```

Flaws:
- The window expired by time, not by server acknowledgement. A `week_updated` arriving at `T + 10.1s` would apply unconditionally, even if the server's stored order was wrong due to Bug 1.
- Multiple rapid moves within 10 seconds extended the window implicitly (each `reorderLocally` reset `optimisticWriteAt`) but there was no way to know which SSE event corresponded to which move.
- Another family member's legitimate move arriving just after 10 seconds would clobber the local state.

---

## The epoch fix: monotonic move sequence

`optimisticWriteAt` is replaced with a monotonic counter pair in `plannerStore`:

```ts
localMoveSeq: number      // incremented before every moveRecipe API call
confirmedMoveSeq: number  // contiguous sequence settled by local HTTP completion
```

**Flow:**

1. User drags. `commitMove` calls `moveRecipe`.
2. `moveRecipe` captures `plannerStore.nextMoveSeq()` for this request.
3. `HearthAuthProvider` sends `X-Move-Seq` while moves are pending.
4. The server excludes the originating SSE connection and broadcasts the schedule
   with optional `echoSeq` to other connections. That number does not identify a
   receiving client's requests.
5. `moveRecipe` settles its captured sequence in the HTTP `finally` handler,
   including rejection. Another pending request remains guarded.
6. `applySnapshot` treats incoming schedules identically with or without `echoSeq`:
   reject another week; defer during an active drag or pending local movement;
   otherwise apply normally. An event never acknowledges local movement.
7. After outstanding movements settle, the latest committed selected-week context
   owns one fresh read. The read captures its generation, week and schedule identity;
   later movement, editing or an accepted authoritative event retires its result.
   A new active preview postpones reconciliation until it ends; stale snapshots
   queued before settlement are replaced by this fresh read.

**Key property:** optimistic movement is guarded until its HTTP request settles,
without relying on a clock or an origin inference from incoming metadata.

### Active drag freeze and deferred reconciliation

While a card is actively being dragged, `plannerStore.isDragActive` blocks `applySnapshot()` from replacing the visible schedule. This keeps remote SSE updates from fighting the pointer and snapping the card away from where the user is placing it.

Instead of dropping those remote `week_updated` events on the floor, the client stores the latest one in `plannerStore.deferredWeekSnapshot`.

- If the drag ends without producing a pending move, the deferred snapshot is applied immediately.
- If the drag ends with a move still awaiting confirmation, the snapshot remains guarded until local HTTP completion and authoritative reconciliation.
- Safe drag cancellation can replay the queued snapshot when no movement reconciliation is outstanding. If a new preview interrupts a movement read, cancellation resumes a fresh read instead of replaying a snapshot that predates settlement.

This gives the planner the local stability of a "freeze during drag" policy without permanently hiding cross-device updates.

### What the server sends

The `week_updated` SSE payload must include `echoSeq` when the event was triggered by a move request that carried `X-Move-Seq`:

```json
{ "schedule": { ... }, "echoSeq": 5 }
```

---

## `optimisticWriteAt` is kept for non-move operations

`assignRecipe`, `removeRecipe`, and `sync()` still use `optimisticWriteAt`. For those operations, even if the SSE echo applies, it sets the same recipe data that the optimistic update already set. The failure mode is a harmless identity update, not a positional displacement. The added complexity of per-operation sequence counters is not justified.

---

## Verification tests

1. Drag index 3 → index 0. Card must land at the top. API `toIndex` must be `0`.
2. Drag index 3 → index 6. Card must land at the bottom. API `toIndex` must be `6`.
3. Drag index 0, pass over index 3, release at index 5. Card lands at 5 (was landing at 4 before this fix).
4. Two rapid moves before HTTP completion. Final order matches the second move, not a server clobber.
5. A remote `week_updated` arriving during an active drag does not replace the visible order until the drag ends and local move confirmation is settled.

---

## Files changed

| File | Change |
|---|---|
| `pwa/src/app/(app)/planner/page.tsx` | `handleReorder` calls `reorderLocally`; `onDragEnd` reads store; drag start/end set the active-drag boundary and flush deferred remote snapshots when safe |
| `pwa/src/store/weekStore.ts` | `applySnapshot` signature adds `echoSeq?`; HTTP-settled sequence guard replaces wall-clock; remote snapshots are deferred during active drag or pending move confirmation |
| `pwa/src/store/plannerStore.ts` | Added `localMoveSeq`, `confirmedMoveSeq`, `nextMoveSeq()`, `confirmMoveSeq()`, `isDragActive`, and `deferredWeekSnapshot` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | Parses `X-Move-Seq` and threads it into move processing |
| `api/src/RecipeApi/Services/ScheduleService.cs` | Publishes `week_updated` with `echoSeq` for move-driven updates |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | Serializes `echoSeq` only when present |
| `pwa/src/lib/api/api-client.ts` | `HearthAuthProvider` injects `X-Move-Seq` when moves are pending |
| `pwa/src/lib/api/planner.ts` | `moveRecipe` calls `nextMoveSeq()` before the API call |
| `pwa/src/hooks/useScheduleStream.ts` | `week_updated` handler passes `echoSeq` to `applySnapshot` |

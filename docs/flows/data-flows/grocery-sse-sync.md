# Data Flow: Grocery List — SSE Sync & Jitter Fix

**Spec:** `.kiro/specs/00-live-schedule` — Flow 13 / R16
**Reviewed by:** The Mère-Designer (UX), Full-stack review (architecture)

---

## Root cause of the current jitter

The grocery checklist jitters because grocery state reaches the client through two disconnected channels that arrive at different times:

**Channel 1 — Schedule fetch** (`GET /api/schedule?weekOffset=0`)
Returns `ScheduleDays`. The `ScheduleDays` DTO does NOT include `groceryState` as a typed field. The state leaks through Kiota's `additionalData` bag — an untyped side-channel that only exists because of how `WeeklyPlan.GroceryState` was bolted on without updating the OpenAPI contract.

**Channel 2 — weekStore.init() side-effect**
```typescript
const serverGroceryState =
  (scheduleData as any).groceryState ?? (scheduleData as any).additionalData?.groceryState;
if (serverGroceryState) {
  usePlannerStore.getState().setGroceryState(serverGroceryState);
}
```
This fires inside `weekStore.init()`. Every time init() runs — on planner mount, on week navigation, on SSE `week_updated`, on sync() — the grocery state is overwritten with whatever the server returned. If the user has checked 3 items and the SSE `week_updated` fires (e.g. someone opens voting), `init()` re-runs, `buildScheduleDays()` fires, the render happens, and then `setGroceryState()` fires a beat later restoring the checked items. That beat is the jitter — a frame where checkboxes appear unchecked before snapping back.

**Why it will get worse with SSE:**
Without SSE, `week_updated` events are rare (manual poll every 30s). With SSE, every slot assignment, lock, or voting-open event triggers `weekStore.applySnapshot()` → which calls `buildScheduleDays()` → which does NOT restore grocery state (it has no access to it). The jitter becomes continuous.

---

## The fix: two parts, same spec

### Part 1 — Add `groceryState` to the OpenAPI contract and `ScheduleDays` DTO

`ScheduleDays` must carry `groceryState` as a typed, first-class field. This eliminates the `additionalData` leak.

**OpenAPI addition** (in `specs/openapi.yaml`, under `ScheduleDays` schema):
```yaml
ScheduleDays:
  type: object
  properties:
    weekOffset: { type: integer }
    locked: { type: boolean }
    status: { type: integer }
    days:
      type: array
      items: { $ref: '#/components/schemas/ScheduleDayDto' }
    groceryState:
      type: object
      additionalProperties: { type: boolean }
      description: >
        Map of ingredient name → checked boolean for the grocery checklist.
        Persisted on WeeklyPlan. Included in every ScheduleDays response so
        the client never needs a separate fetch.
```

**.NET DTO change** (`api/src/RecipeApi/Dto/ScheduleDays.cs`):
```csharp
public record ScheduleDays(
    [property: JsonPropertyName("weekOffset")] int WeekOffset,
    [property: JsonPropertyName("locked")] bool Locked,
    [property: JsonPropertyName("status")] int Status,
    [property: JsonPropertyName("days")] List<ScheduleDayDto> Days,
    [property: JsonPropertyName("groceryState")] Dictionary<string, bool>? GroceryState = null);
```

**ScheduleService.GetScheduleAsync** must deserialize `WeeklyPlan.GroceryState` jsonb and include it:
```csharp
var groceryState = plan?.GroceryState != null
    ? JsonSerializer.Deserialize<Dictionary<string, bool>>(plan.GroceryState)
    : null;

return new ScheduleDays(weekOffset, isLocked, status, days, groceryState);
```

**Result:** `groceryState` arrives in the same response as the schedule. No second channel. No timing gap. No `additionalData` hack.

### Part 2 — SSE `grocery_updated` event for cross-member sync

When Alex checks off "Onions" on his phone in the grocery store, Jordan's phone (also in the store) updates immediately.

**Current state:** Jordan's phone never updates unless she manually navigates away and back.

**With SSE:**
```
Alex checks "Onions" in GroceryList
  → setGroceryItemToggle('Onions', true) [optimistic]
  → PATCH /api/schedule/{weekOffset}/grocery { ..., Onions: true }
  → ScheduleService.UpdateGroceryStateAsync() writes to DB
  → publishes grocery_updated { weekOffset, groceryState: { ...all items... } }

Jordan's phone:
  ← grocery_updated received
  ← plannerStore.setGroceryState(groceryState)
  ← checklist updates silently (no flash, no navigation)
```

**Event payload:**
```json
{
  "type": "grocery_updated",
  "weekOffset": 0,
  "groceryState": {
    "Onions": true,
    "Garlic": false,
    "Pasta": true
  }
}
```

The full state is sent (not a delta) — same pattern as `slot_updated`. Idempotent. Safe to apply twice.

---

## Jitter elimination: why Part 1 fixes it

After Part 1, `weekStore.applySnapshot()` receives `groceryState` inline with the schedule data. The `weekStore` passes it to `plannerStore.setGroceryState()` atomically — in the same state update, not as a trailing side-effect. There is no longer a two-render gap.

The `(scheduleData as any).additionalData?.groceryState` hack in `weekStore.init()` is removed entirely. Clean.

**The SSE path (Part 2) is jitter-free by design:** `grocery_updated` is a targeted event that only updates `plannerStore.groceryState`. It does not trigger `buildScheduleDays()`, does not re-render the planner schedule, and does not touch `weekStore`. It is the smallest possible update.

---

## Echo suppression for the grocery list

The same user who checked an item will receive their own `grocery_updated` SSE event back. Unlike `slot_updated` (which uses a 2-second `optimisticWriteAt` window), the grocery toggle is already applied optimistically. The echo is harmless — applying the same full state again produces identical UI. No special guard needed.

---

## `isSaving` spinner: remove it

Currently `GroceryList` shows a `<Loader2>` spinner on ALL items while any single item is saving. With SSE, this is wrong — the optimistic update is instant and the SSE confirmation arrives within milliseconds. The spinner should be removed. The toggle animation itself (circle → checkmark) is the confirmation.

If the PATCH fails, revert the toggle and show an inline error on that specific item only — not a global spinner.

---

## Multi-person grocery shopping: the real value

Two family members in the same grocery store, both with the app open:

- **Before SSE:** They each see their own version of the list. One checks Onions, the other doesn't know. They either coordinate by text or they buy two bags of onions.
- **After SSE:** Alex checks Onions → Jordan's phone updates in under 1 second. They can split the store (Alex handles Produce, Jordan handles Meat) and watch the shared list converge in real time.

This is the product-level value. The jitter fix is a prerequisite; the SSE sync is the payoff.

---

## What does NOT change

- `PATCH /api/schedule/{weekOffset}/grocery` — endpoint unchanged, same contract
- `GroceryList` component structure — same aisle grouping, same layout
- `plannerStore.groceryState` — same store, same shape (`Record<string, boolean>`)
- Ingredient list source — still comes from `weekStore.schedule[].recipe.ingredients`

---

## SSE event table addition

| Event type | Payload | Trigger |
|---|---|---|
| `grocery_updated` | `{ weekOffset, groceryState: Record<string, boolean> }` | Any `PATCH /api/schedule/{weekOffset}/grocery` |

---

## E2E test specifications

```typescript
test('grocery check → SSE grocery_updated → other member sees update', async ({ page }) => {
  // 1. navigate to /planner, open grocery tab
  // 2. mock SSE to emit grocery_updated with Onions: true
  // 3. assert Onions checkbox is checked (even without user interaction)
});

test('grocery check → no jitter (checkbox does not flash)', async ({ page }) => {
  // 1. navigate to /planner, open grocery tab with 3 pre-checked items
  // 2. mock SSE to emit week_updated (e.g. voting opened)
  // 3. assert all 3 items REMAIN checked immediately after week_updated
  // (no intermediate unchecked flash)
  // This test catches the applySnapshot → grocery state gap regression
});

test('grocery PATCH failure → revert single item only', async ({ page }) => {
  // 1. mock PATCH /grocery to return 500
  // 2. tap an item to check it
  // 3. assert item reverts to unchecked
  // 4. assert no global spinner visible on other items
});
```

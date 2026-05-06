# Data Flow: Grocery List — SSE Sync & Concurrent Toggle Safety

**Related:** [`week-lifecycle.md`](./week-lifecycle.md), [`client-domain-model.md`](../client-domain-model.md)

---

## What was built

Two family members can be in the same grocery store, both with the app open, checking off items simultaneously. Their lists converge in real time via the `grocery_updated` SSE event.

The critical safety property: **each toggle is an independent per-item PATCH**. Mom checking Carrots and Dad checking Onions at the same moment cannot overwrite each other's work.

---

## The race condition this fixes

The original `handleToggle` sent the entire grocery map with one item changed:

```ts
// OLD — do not restore this pattern
await updateGroceryState(weekOffset, {
  ...groceryState,   // stale closure snapshot of the whole map
  [ingredientName]: newState,
});
```

If Mom and Dad both open the list when it is empty and each tap one item:

1. Mom taps Carrots → reads `{}` → sends `{ Carrots: true }`
2. Dad taps Onions  → reads `{}` → sends `{ Onions: true }`
3. Server applies Mom → stored state: `{ Carrots: true }`
4. Server applies Dad → stored state: `{ Onions: true }` — **Carrots is gone**

This happens on one device too with rapid successive taps: two async handlers in flight both read the same stale closure.

---

## The fix: per-item PATCH merged server-side

### API contract

```
PATCH /api/schedule/{weekOffset}/grocery/item
Body: { "ingredientName": "Carrots", "checked": true }
Response: 204 No Content
```

Each tap is one atomic operation. The server owns the merge.

The original whole-map endpoint still exists for bulk state restore:

```
PATCH /api/schedule/{weekOffset}/grocery
Body: { "Carrots": true, "Onions": false, ... }
Response: 200 { data: { ... } }
```

### Server merge (ScheduleService.ToggleGroceryItemAsync)

```csharp
var current = Deserialize(weekPlan.GroceryState) ?? new Dictionary<string, bool>();
current[ingredientName] = checked_;          // single key merge
weekPlan.GroceryState = Serialize(current);
await _dbContext.SaveChangesAsync();
await _publisher.PublishGroceryUpdatedAsync(weekOffset, current, excludeConnectionId);
```

The server reads the current persisted state, sets exactly one key, writes back, and broadcasts the full merged map. The database row is the serialisation point — no client can corrupt another client's toggle regardless of arrival order.

### Client (GroceryList.handleToggle)

```ts
// Optimistic update — instant UI response
setGroceryItemToggle(ingredientName, newState);

// Per-item API call — no stale closure
await toggleGroceryItem(weekOffset, ingredientName, newState);
// throws on failure → reverts single item + shows per-item error indicator
```

---

## SSE broadcast

After every per-item toggle, the server publishes:

```json
{
  "type": "grocery_updated",
  "weekOffset": 0,
  "groceryState": { "Carrots": true, "Onions": true }
}
```

The full merged state is sent (not a delta). All connected clients call `plannerStore.setGroceryState(groceryState)`. Idempotent — applying the same state twice produces no visual change.

The originating client receives their own echo (no `X-SSE-Connection-ID` suppression — `schedule.ts` uses raw `fetch` which bypasses `HearthAuthProvider`). The echo is harmless: it confirms a state the client already has.

---

## Why echo suppression is not needed here

The toggle is applied optimistically before the API call. When the echo arrives and calls `setGroceryState`, it sets the same values already in the store. No visual change, no guard needed.

This contrasts with the planner move, where the echoed `week_updated` snapshot carried a wrong `toIndex` due to a separate drag bug. See [`planner-drag-sse.md`](./planner-drag-sse.md) for that pattern.

---

## SSE event table

| Event | Payload | Trigger | Store updated |
|---|---|---|---|
| `grocery_updated` | `{ weekOffset, groceryState }` | `PATCH /grocery/item` or `PATCH /grocery` | `plannerStore.groceryState` |

---

## Files

| File | Change |
|---|---|
| `specs/openapi.yaml` | Added `PATCH /api/schedule/{weekOffset}/grocery/item` |
| `api/src/RecipeApi/Dto/ToggleGroceryItemDto.cs` | New DTO: `IngredientName`, `Checked` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | New `ToggleGroceryItem` action |
| `api/src/RecipeApi/Services/ScheduleService.cs` | New `ToggleGroceryItemAsync` — server-side merge |
| `pwa/src/lib/api/schedule.ts` | New `toggleGroceryItem` — replaces `updateGroceryState` for per-tap calls |
| `pwa/src/components/planner/GroceryList.tsx` | `handleToggle` calls `toggleGroceryItem` instead of full-map `updateGroceryState` |

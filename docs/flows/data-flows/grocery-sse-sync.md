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
  ...groceryState, // stale closure snapshot of the whole map
  [ingredientName]: newState,
});
```

If Mom and Dad both open the list when it is empty and each tap one item:

1. Mom taps Carrots → reads `{}` → sends `{ Carrots: true }`
2. Dad taps Onions → reads `{}` → sends `{ Onions: true }`
3. Server applies Mom → stored state: `{ Carrots: true }`
4. Server applies Dad → stored state: `{ Onions: true }` — **Carrots is gone**

This happens on one device too with rapid successive taps: two async handlers in flight both read the same stale closure.

---

## The fix: per-item PATCH merged server-side

### API contract

```
PATCH /api/schedule/{weekOffset}/grocery/item[?referenceWeekStartDate=YYYY-MM-DD]
Body: GroceryItemMutationDto
Response: 200 OK { data: GroceryMutationResult }
```

Each tap is one atomic operation. The server owns the merge.

The original whole-map endpoint still exists for bulk state restore:

```
PATCH /api/schedule/{weekOffset}/grocery
Body: { "Carrots": true, "Onions": false, ... }
Response: 200 { data: { ... } }
```

### Server merge (`ScheduleService.MutateGroceryItemAsync`)

```csharp
// ScheduleService.MutateGroceryItemAsync merges the item mutation into
// the week's persisted grocery state, increments GroceryListVersion,
// records GroceryMutationOutcome, and broadcasts via SseEventPublisher.
```

The server reads the current persisted state, applies the single item mutation, writes back, and broadcasts the merged grocery snapshot. The database row is the serialisation point — no client can corrupt another client's toggle regardless of arrival order.

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
  "weekStartDate": "2026-11-23",
  "groceryListVersion": 4,
  "groceryState": { "Carrots": true, "Onions": true },
  "groceryItems": [...],
  "presentationVersion": 2,
  "presentationEpoch": "..."
}
```

The merged snapshot is sent (not a single-key delta). Connected clients handle `grocery_updated` in `useScheduleStream.ts` via `useWeekStore.getState().applyGrocerySnapshot(payload)` followed by `refreshGroceries()`.

`pwa/src/lib/api/schedule.ts` calls the generated Kiota `apiClient` (`apiClient.api.schedule.byWeekOffset(offset).grocery.item.patch`), so `HearthAuthProvider` handles auth and connection headers consistently.

---

## Why echo suppression is not needed here

The toggle is applied optimistically before the API call. When the echo arrives and calls `setGroceryState`, it sets the same values already in the store. No visual change, no guard needed.

This contrasts with the planner move, where the echoed `week_updated` snapshot carried a wrong `toIndex` due to a separate drag bug. See [`planner-drag-sse.md`](./planner-drag-sse.md) for that pattern.

---

## SSE event table

| Event             | Payload                                                                                       | Trigger                                   | Store updated                                        |
| ----------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| `grocery_updated` | `{ weekOffset, weekStartDate, groceryListVersion, groceryState, groceryItems, presentation* }` | `PATCH /grocery/item` or `PATCH /grocery` | `weekStore.applyGrocerySnapshot` + `refreshGroceries` |

---

## Files

| File                                                  | Role                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `specs/openapi.yaml`                                  | Defines `PATCH /api/schedule/{weekOffset}/grocery/item` and `GroceryMutationResult` |
| `api/src/RecipeApi/Dto/ScheduleDtos.cs`               | `GroceryItemMutationDto` and `GroceryMutationResult`                              |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | Grocery item mutation endpoint                                                    |
| `api/src/RecipeApi/Services/ScheduleService.cs`       | `MutateGroceryItemAsync` — server-side merge & presentation version tracking      |
| `pwa/src/lib/api/schedule.ts`                         | Uses Kiota `apiClient.api.schedule.byWeekOffset(...).grocery.item.patch`          |
| `pwa/src/hooks/useScheduleStream.ts`                  | Handles `grocery_updated` via `weekStore.applyGrocerySnapshot` & `refreshGroceries` |

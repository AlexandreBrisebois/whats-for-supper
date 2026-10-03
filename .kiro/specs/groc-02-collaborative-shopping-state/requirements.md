# GROC-02 — Collaborative shopping state: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.

## Outcome

Household shoppers can mark a displayed grocery item checked or unchecked, with the accepted state persisted for the selected week and broadcast to connected clients.

## Implemented behavior

- **GROC-02-AC-01 — Individual toggle.** A row immediately toggles its local `plannerStore.groceryState`, then `GroceryList` sends `PATCH /api/schedule/{weekOffset}/grocery/item` with `{ ingredientName, checked }`. On a non-success response it reverses that row and displays a temporary error icon.
- **GROC-02-AC-02 — Durable merge.** `ScheduleService.ToggleGroceryItemAsync` loads the week's JSON map, changes only the supplied `ingredientName`, saves it, and publishes the complete map. The route returns `204 No Content`.
- **GROC-02-AC-03 — Snapshot and stream convergence.** `GET /api/schedule` returns the persisted `groceryState` alongside grocery lines. Matching `week_updated` snapshots update it through `weekStore`; a `grocery_updated` SSE event updates `plannerStore` only when its `weekOffset` matches the currently loaded one.
- **GROC-02-AC-04 — Bulk route.** `PATCH /api/schedule/{weekOffset}/grocery` replaces the complete state map and returns `{ data: Record<string, boolean> }`; the PWA wrapper exposes it, but `GroceryList` uses the item route rather than bulk replacement.
- **GROC-02-AC-05 — Interaction.** Rows are buttons with checkbox role/state and keyboard handling; completed aisles collapse when the document becomes visible again. Check states are grouped by aisle and checked rows move after unchecked rows.

## Scope and boundaries

This packet owns persisted checklist state and its collaboration behavior. GROC-01 owns the derived rows that provide the present display-name key; `plat-01-shared-real-time-state` owns SSE connection and delivery mechanics. It does not own aisle corrections, schedule membership, household authorization, or a generalized conflict model.

## Current limitations

- The state key is `displayName`, so duplicate display names share one check state even if represented by separate normalized/unit rows.
- A single-item update is a read-modify-write of a JSON map. It prevents the browser from submitting its whole stale map, but there is no database concurrency token or per-item conflict protocol for simultaneous writes to the same plan.
- The component has no pending-toggle guard; rapid toggles can resolve out of order. Remote `grocery_updated` events replace the whole displayed map without a local-write version guard.
- Failure feedback is an icon auto-cleared after three seconds, without localized explanatory copy or a retry control.
- The client sends the selected-family-member header, while these controller methods themselves do not consume it; authenticated household scoping is platform behavior, not specified here.

## Preserved behavior

Accepted server state, not the optimistic row change, is durable. Events for another week are ignored. The legacy bulk endpoint remains contract-supported but is not the normal browser path.

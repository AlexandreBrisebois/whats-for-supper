# GROC-02 — Collaborative shopping state: design baseline

## Integration map

`GroceryList` reads and changes `plannerStore.groceryState`; `useSchedule().toggleGroceryItem` performs the explicit fetch. `ScheduleController` forwards the request to `ScheduleService`, which serializes `WeeklyPlan.GroceryState` and calls `IScheduleEventPublisher.PublishGroceryUpdatedAsync`. `useScheduleStream`, mounted at the authenticated application layout, listens for `grocery_updated` and writes the received map into `plannerStore` for the active week.

The same map is included in the `ScheduleDays` response. `weekStore.applySnapshot` extracts the Kiota additional-data map and synchronously updates `plannerStore` when it accepts a matching snapshot.

## Contract boundary

`PATCH /api/schedule/{weekOffset}/grocery/item` consumes `{ ingredientName: string, checked: boolean }` and responds `204`. `PATCH /api/schedule/{weekOffset}/grocery` consumes `Record<string, boolean>` and responds `{ data: Record<string, boolean> }`. `grocery_updated` carries `{ weekOffset, groceryState }`. These keys are display names, not grocery-line IDs.

## Failure and concurrency behavior

The local toggle is optimistic and rolls back only its requested key on request failure. The service persists before publishing. An SSE echo may replace the map with the accepted state; delivery has no sequence/version field. `weekOffset` filtering avoids applying a different week, but no stronger late-result ordering is implemented for this capability.

## Evidence seams and dependencies

`GroceryList.test.tsx` covers optimistic success/rollback and row behavior; `useScheduleStream.test.ts` and `weekStore.test.ts` cover active-week stream/snapshot handling. `ScheduleIntegrationTests` exercise map persistence and event publication. The OpenAPI schedule routes and `GroceryUpdatedEvent` are the contract source. This packet depends on GROC-01 for line keys and `plat-01-shared-real-time-state` for transport/reconnect; neither dependency makes delivery exactly-once.

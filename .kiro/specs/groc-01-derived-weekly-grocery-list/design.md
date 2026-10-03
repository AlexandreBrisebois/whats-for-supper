# GROC-01 — Derived weekly grocery list: design baseline

## Integration map

`planner/page.tsx` initializes `weekStore` for the selected offset and supplies its `groceryItems` to `GroceryList`. The store calls the generated schedule client for `GET /api/schedule?weekOffset={n}` and accepts matching `week_updated` snapshots from `useScheduleStream`.

`ScheduleController` delegates schedule mutations to `ScheduleService`. Those paths call `GroceryRecomputeService`, which reads calendar events and recipes, resolves normalized-key categories from `IngredientCategories` (falling back to `AisleMapper`), groups quantities and provenance, and persists `WeeklyPlan.GroceryItems`. `ScheduleService.GetScheduleAsync` deserializes both grocery JSON columns into `ScheduleDays`; the OpenAPI `GroceryLineItemDto` contract carries `displayName`, `normalizedKey`, `section`, optional quantity/unit, and `recipeIds`.

## Data and state flow

```text
schedule command / category change
  -> GroceryRecomputeService -> WeeklyPlan.grocery_items
  -> GET /api/schedule or week_updated snapshot
  -> weekStore.groceryItems -> GroceryList aisle grouping
```

`GroceryRecomputeService` publishes `grocery_updated` only when its check-state transition changes. Section-only recomputation is therefore normally observed by the initiating browser's explicit schedule load or local item update, not by a dedicated grocery-line event.

## Failure and recovery

Recompute ignores recipe-less days and tolerates absent structured supply by falling back to ingredient text. An empty source persists an empty list. A `week_updated` snapshot is ignored for a non-current week; `weekStore` also has move-specific optimistic snapshot guards. No feature-specific retry or error UI exists for failed list acquisition/recomputation.

## Evidence seams

- API/service: `GroceryItemsIntegrationTests`, `GroceryRecomputeServiceTests`, and schedule integration tests cover assignment/move/remove, aggregation, persisted state, and returned schedule data.
- Browser/store: `GroceryList.test.tsx` covers ordering, duplicate-row rendering, quantity presentation and optimistic checklist rendering; `weekStore.test.ts` covers snapshot item replacement.
- Contract: `specs/openapi.yaml` `ScheduleDays` and `GroceryLineItemDto` are authoritative.

## Dependencies

This packet consumes the schedule owner packets and `plat-04-ingredient-categorization`; it relies on `plat-01-shared-real-time-state` only for whole-week refresh delivery. It deliberately does not duplicate their policies.

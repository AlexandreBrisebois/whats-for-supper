# GROC-03 — Ingredient aisle correction: design baseline

## Integration map

`GroceryList.handleReclassify` obtains `item.normalizedKey`, calls `reclassifyIngredient`, then uses `weekStore.reclassifyGroceryItem` for the still-current week. The API wrapper uses explicit fetch and the selected-family-member header.

`IngredientsController.ReclassifyCategory` validates the path/body and delegates to `IngredientCategoryService`. The service upserts `ingredient_categories`, saves it, and calls `GroceryRecomputeService.RecomputeForIngredientAsync`. That service finds affected `WeeklyPlan.GroceryItems`, recomputes ingredient lines from scheduled recipes, and persists them. The canonical contract is `ReclassifyIngredientRequest` and `PATCH /api/ingredients/{normalizedKey}/category` in `specs/openapi.yaml`.

## State and asynchronous boundary

```text
row normalizedKey + selected section
  -> PATCH category -> IngredientCategories manual row
  -> recompute persisted weekly grocery_items
  -> initiating current week: local item section replacement
```

There is no response payload, invalidation event, or refetch in this path. Recompute emits `grocery_updated` only if checklist-state transitions change, and that event contains the map rather than rebuilt lines. Consequently real-time line convergence is intentionally not claimed.

## Failure and recovery

The component serializes a correction per normalized key, avoiding duplicate clicks for that key. It does not optimistically change the line until the route succeeds. API validation returns a problem response for an invalid section; the wrapper turns any non-OK status into an error and the component leaves the picker open with a timed error indicator. Recompute failures after the category save can leave the category durable while propagation has failed; the route has no compensating transaction or recovery response.

## Evidence seams and dependencies

`IngredientCategoryIntegrationTests`, `IngredientCategoryServiceTests`, and `GroceryRecomputeServiceTests` cover the category/recompute boundary. `GroceryList.test.tsx` and `weekStore.test.ts` cover the current-week UI/store update. The packet depends on `plat-04-ingredient-categorization` for canonical-key/category semantics, GROC-01 for recomputation, and `plat-01` only if a future refresh event is introduced.

# GROC-03 — Ingredient aisle correction: future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **GROC-03-T1 — Make category change and list propagation recoverable.** Decide whether the route must be transactional, retryable, or return affected-week status when recompute fails after the manual category save.
  - **Test seam:** `IngredientCategoryServiceTests`, `IngredientCategoryIntegrationTests`, and `GroceryRecomputeServiceTests`; Playwright: a failed correction keeps the previous rendered aisle and offers the approved recovery; mock owner: this GROC-03 vertical slice; `PATCH /api/ingredients/{normalizedKey}/category`; request `{ grocerySection }`, response is `204` only after approved propagation or a documented problem/status body identifying incomplete propagation.

- [ ] **GROC-03-T2 — Deliver corrected grocery lines to all affected open planners.** Coordinate an authoritative invalidation/snapshot contract with GROC-01 and `plat-01`; preserve the current week filter and do not treat `grocery_updated` check-state maps as line data.
  - **Test seam:** `GroceryRecomputeServiceTests`, stream integration, `useScheduleStream.test.ts`, and `weekStore.test.ts`; Playwright: a second device shows the corrected aisle without reload; mock owner: this GROC-03 vertical slice; `PATCH /api/ingredients/{normalizedKey}/category` plus the selected SSE event; request `{ grocerySection }`, response/event carries affected week offsets and refreshed `groceryItems` or an authoritative version for refetch.

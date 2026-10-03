# GROC-01 — Derived weekly grocery list: future work

This implemented baseline has no implementation backlog. Select and authorize a task before changing application behavior.

- [ ] **GROC-01-T1 — Replace display-name check-state identity if distinct rows must be independently checked.** Decide the durable line identity and migration/compatibility behavior jointly with GROC-02 and the schedule contract owner; do not silently reinterpret existing maps.
  - **Test seam:** `GroceryRecomputeServiceTests`, `ScheduleIntegrationTests`, and `GroceryList.test.tsx`; Playwright: two same-named, different-unit rows can be checked independently and survive refresh; mock owner: the grocery vertical slice's schedule-route mock; `PATCH /api/schedule/{weekOffset}/grocery/item`; request has a line identity and `checked`, response is `204` or an explicitly versioned replacement state.

- [ ] **GROC-01-T2 — Define refresh delivery for grocery-line-only changes.** If an aisle/category or recipe edit must update other open devices immediately, choose a versioned snapshot or grocery-line event with `plat-01` and GROC-03.
  - **Test seam:** `GroceryRecomputeServiceTests`, `useScheduleStream.test.ts`, and an SSE API/integration test; Playwright: a second planner updates after a category change without navigation; mock owner: the same GROC-03 vertical slice; `PATCH /api/ingredients/{normalizedKey}/category` and the chosen stream event; request is `{ grocerySection }`, response/event carries affected `weekOffset` and refreshed `groceryItems` or a fetchable version.

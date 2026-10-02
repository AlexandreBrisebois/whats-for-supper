# Ingredient Categorization — Future work

- [ ] **PLAT-04-T1 — Deliver approved section-only changes to affected open grocery lists.**
  - **Test seam:** category/recompute and stream integration tests, `useScheduleStream`/week-store tests; Playwright: second planner receives corrected aisle; mock owner: GROC-03/PLAT-04 vertical slice; `PATCH /api/ingredients/{normalizedKey}/category` plus selected stream event; request `{ grocerySection }`, event/response carries affected `weekOffset` and refreshed `groceryItems` or refetch version.

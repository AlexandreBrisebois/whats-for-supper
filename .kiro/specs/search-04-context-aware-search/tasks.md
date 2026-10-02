# SEARCH-04 — Context-aware search: future work
## T1 — Validate planner URL context before Search or assignment
**Test seam:** unit: `page.test.tsx`, `slotAssignment.test.ts`; API: `RecipeSearchIntegrationTests` and planner controller tests if API validation changes; Playwright: malformed context issues no invalid assignment and stays recoverable; mock owner: page Search/planner mocks and Playwright Search/schedule routes; route/method: `POST /api/recipes/search`, `GET /api/schedule`, `POST /api/schedule/assign`; contract: optional integer week/day for Search, required `{weekOffset,dayIndex,recipeId}` for assignment, never non-finite/out-of-range.

## T2 — Decide whether similar context should be durable and visible
**Test seam:** unit: `page.test.tsx`; API: `RecipeSearchIntegrationTests`; Playwright: Find Similar shows focus and reload preserves it if URL durability is approved; mock owner: page Search mock and Playwright Search route; route/method: `POST /api/recipes/search`; contract: `{query:"",similarToRecipeId:uuid}` returns `{searchMode:"similar",resultPath:"similar",topPick,results,appliedFilters,nextCursor}`.

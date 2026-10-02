# SEARCH-01 — Conversational hybrid search: future work
No implementation of this baseline is pending.

## T1 — Decide whether initial-search failure needs distinct recovery
**Test seam:** unit: `page.test.tsx`, `search-contract.test.ts`; API: `RecipeSearchIntegrationTests`; Playwright: failed initial search preserves query and offers retry rather than claiming empty results; mock owner: page `searchRecipes` mock and `search-hardening.spec.ts` route; route/method: `POST /api/recipes/search`; contract: request `{query,limit,weekOffset?,dayIndex?,similarToRecipeId?,filters?,preferences?,continuationToken?}`, 200 `{topPick,results,appliedFilters,searchMode,resultPath,nextCursor}`, non-2xx remains an error.

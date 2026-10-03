# SEARCH-02 — Browse and incremental results: future work
## T1 — Decide whether browsers without IntersectionObserver need manual continuation
**Test seam:** unit: `page.test.tsx`; API: `RecipeSearchIntegrationTests`; Playwright: unavailable observer still exposes and completes a user-requested next page; mock owner: page `searchRecipes` mock and `search-hardening.spec.ts` route; route/method: `POST /api/recipes/search`; contract: continuation repeats original context plus opaque `continuationToken`, 200 retains `{results,nextCursor}`, 409 preserves cards for restart.

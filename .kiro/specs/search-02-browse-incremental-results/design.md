# SEARCH-02 — Browse and incremental results: design
> Status: **Implemented capability baseline**.

`RecipesPage` owns cards, sentinel and continuation generation; `searchRecipes` throws status-carrying errors. `RecipeSearchService.BrowseAsync` orders browse candidates, selects eligible/report-free Top Pick and stores a `BrowsePosition`; `ContinueBrowseAsync` rechecks eligibility. The controller maps expired tokens to 409. Promotion-store invalidation refreshes browse while retaining query, filters, preferences and context. This is a dependency on promotion, not SSE handling here. Evidence: continuation, observer, expiry, invalidation and Surprise Me tests in `page.test.tsx` and API cases in `RecipeSearchIntegrationTests`.

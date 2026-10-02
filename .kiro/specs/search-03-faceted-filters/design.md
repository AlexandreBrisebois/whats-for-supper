# SEARCH-03 — Faceted filters: design
> Status: **Implemented capability baseline**.

`RecipesPage` owns applied filters, preferences and metadata cache; `RecipeFiltersSheet` owns copied draft state. `RecipeController.GetSearchFilters` reads singleton `RecipeSearchFilterState`, deserializes materialized cuisine state, and falls back to `RecipeSearchFilterOptions`. The materializer/processor is outside request flow. Search controller/service own POST filtering. Evidence: sheet/page tests, filter option/materializer tests and `RecipeSearchFilterDiscoveryIntegrationTests`.

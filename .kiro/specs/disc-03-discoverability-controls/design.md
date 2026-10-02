# DISC-03 — Discoverability controls design

`RecipeDetailSheet` uses the recipe update client for discoverable state. Recipe controller/service persists the recipe field; `RecipeSearchPredicate` and search services consume it when producing candidates/results. Search indexing/reconciliation is PLAT-03 work. Evidence: RecipeDetailSheet/action tests, recipe API tests, search predicate/service/integration tests, and OpenAPI recipe PATCH schema. No dedicated discoverability SSE event is owned here.

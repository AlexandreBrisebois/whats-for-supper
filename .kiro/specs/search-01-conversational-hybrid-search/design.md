# SEARCH-01 — Conversational hybrid search: design
> Status: **Implemented capability baseline**.

`pwa/src/app/(app)/recipes/page.tsx` owns query, debounce, result state and generation guards. `pwa/src/lib/api/recipes.ts#searchRecipes` POSTs and maps the response. `RecipeController.Search` validates limit and unsupported excluded ingredients then calls `RecipeSearchService.SearchAsync`. The service applies eligibility, lexical/semantic retrieval, reranking, report-status Top Pick choice and `RecipeSearchContinuationStore` paging. `specs/openapi.yaml` owns the DTO contract.

Semantic provider/vector work shares a 300 ms budget; caller cancellation propagates and timeout/provider failures use lexical candidates. SEARCH-02 defines continuation recovery, SEARCH-03 supplies filters/preferences, and SEARCH-04 supplies week/day/similar context. Relevant evidence: `RecipeSearchIntegrationTests`, hybrid evaluation tests, `search-contract.test.ts`, `page.test.tsx`, and `search-hardening.spec.ts`.

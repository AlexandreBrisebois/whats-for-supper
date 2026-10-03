# LIB-01 — Immersive library browsing: design

`pwa/src/app/(app)/recipes/page.tsx` owns page-local query, result, filter, continuation, modal, and assignment-recovery state. `searchRecipes` in `pwa/src/lib/api/recipes.ts` maps generated DTOs; the page uses a monotonically increasing generation and `searchPromotionStore.version` to discard stale responses. Continuations preserve the original generation and can be invalidated/expired.

The client calls `RecipeController.Search`, which validates limit/filter restrictions and delegates to `RecipeSearchService`; that service/repositories own ready/deleted eligibility, ranking, search continuation, and filter materialization. Detail and planning callbacks are handoffs, not library-owned mutations.

Evidence: `recipes/page.tsx`, `recipes.ts`, `RecipeDetailSheet.tsx`, `RecipeSearchService.cs`, `RecipeController.cs`, `specs/openapi.yaml`, page tests, and browse/search E2E coverage.

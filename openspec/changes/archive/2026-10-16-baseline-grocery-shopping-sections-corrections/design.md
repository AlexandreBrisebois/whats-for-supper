# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-003](../../../../docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-003). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable sections and manual corrections slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs, aggregation-quantities. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: GroceryList.handleReclassify → pwa/src/lib/api/ingredients.ts:reclassifyIngredient (direct fetch; generated category builder exists but is not used) → specs/openapi.yaml PATCH /api/ingredients/{normalizedKey}/category → IngredientsController.ReclassifyCategory → IngredientCategoryService.ReclassifyAsync → IngredientCategories save → GroceryRecomputeService.RecomputeForIngredientAsync → WeeklyPlan.GroceryItems → 204 → weekStore.reclassifyGroceryItem → rendered aisles.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: IngredientCategoryServiceTests assert insert/update source manual, confidence 1, timestamp and one mocked recompute invocation (CallBase=false). IngredientCategoryIntegrationTests assert 204/manual persistence and invalid section 400 using auth-disabled InMemory factory. GroceryRecomputeServiceTests assert DB override, mapper fallback and legacy category retention. GroceryList tests assert aisle movement only after success, retained checked state, no duplication, same-section no request, pending aria-busy/disabled controls, retry after failure and no stale success mutation after changing offset. API and planner store are substituted; E2E grocery.spec.ts uses route-owned categoryOverrides and mocked schedule/SSE.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

OpenAPI category description says source human, source and assertions persist manual: withhold normative source-marker spelling. DB save precedes affected-week recomputation; failure can leave category saved. PostgreSQL JSON containment branch is not established by InMemory string-contains tests. Configured aisle order accepts partial/duplicate lists; complete unique section visibility under arbitrary configuration is not promised. Case-insensitive API acceptance does not canonicalize stored casing.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

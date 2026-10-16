# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-007](../../../../docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-007). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable category defaults from processing slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs, aggregation-quantities, sections-corrections, individual-checks, week-refresh-boundaries, bulk-check-map-api. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: API-only generic POST /api/workflows/{workflowId}/trigger (background-processing owner) → WorkflowController.Trigger → WorkflowOrchestrator.TriggerAsync → persisted WorkflowTask → recategorize-ingredients.yaml or import workflow categorize_ingredients task → CategorizeIngredientsProcessor.ExecuteAsync/CategorizeAsync → recipe RawMetadata supply names → IngredientNormalizer → IngredientCategories cache → IChatClient batch → validated section rows → later GroceryRecomputeService category lookup. No generated client participates in processor execution; workflow trigger client/contract belongs to the accepted background owner.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: CategorizeIngredientsProcessorTests uses TestDbContextFactory EF InMemory plus Moq IChatClient. AllIngredientsCached_NoLlmCall verifies Times.Never; SomeUncached_LlmCalledWithOnlyUncachedNames captures prompt, asserts uncached names present/cached tomato absent and one call; LlmReturnsInvalidSection_InvalidDiscarded_ValidUpserted checks stored valid row and missing invalid row; LlmCallFails_ProcessorCompletesWithoutThrowing asserts no exception and no saved olive-oil category. No current model call or workflow run. Manual-overwrite protection and deferred grocery propagation are supported by source, not explicit assertions in that file.
- Reuse [background processing](../../../specs/background-processing/spec.md), “Bind generic workflow trigger parameters without an API schedule”, “Record processor execution and successful task completion” and “Promote dependencies after successful task completion”. No lifecycle or retry rule is redefined here.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

No model output correctness or provider qualification. Returned normalizedKey is not checked against requested names; confidence is not range-validated. These defects are withheld, not specified as desired behavior. Categorization saves no weekly lines and invokes no recompute. Import/goto-synthesis definitions run sync_recipe before categorization, while recategorize-ingredients runs category then RecipeReady only; withhold immediate propagation or force-refresh semantics. Generic trigger acceptance, retries and completion stay with background-processing.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

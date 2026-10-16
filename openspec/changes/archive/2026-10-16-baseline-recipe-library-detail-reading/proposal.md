# Proposal

## Why

Main recipe-library covers list visibility through requesting a detail sheet, but does not yet describe the connected detail read and dismissal. Extract the supported ordinary-household path into a reviewable baseline without changing application behavior.

## What Changes

- Add only missing detail retrieval, returned-content presentation, pending feedback and dismissal requirements to recipe-library in an ADDED delta.
- Record the actual detail readiness/deletion query, optional fields, formatting/fallbacks, absent inline instructions and failure/recovery limitations outside normative requirements.
- Provide extraction design, documentation validation tasks and scenario-to-source/assertion mapping in BSL-recipe-library-004–006 of the [durable plan](../../../../docs/openspec-baseline-plan.md), under A50.
- Stop at a validated draft; no acceptance, promotion, archival or successor extraction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: Add detail reading after the existing loaded-recipe activation boundary; retain all existing list requirements verbatim. Reuse household-identity access/member context and approved shared owners.

## Impact

Documentation only: this proposal, recipe-library delta, extraction design/tasks and durable plan. Evidence traces BrowseAllStackPage → RecipeDetailSheet → getRecipe/generated GET/OpenAPI → RecipeController.Detail → RecipeService.GetRecipeDetail/EF → DTO/adapter/local state → visible sheet. No application, test, contract, generated-client, SQL or configuration changes.

Excluded: editing, rating/notes submission, reporting/re-import, sharing, original-photo browsing, hero generation, cooking mode, planning, search ranking, capture, restore/purge, preference policy and demo/preview/deployment variants. Source/test discrepancies are recorded without repairs. Evidence is implementation-supported under A10; runtime/database qualification remains not-run under A34. Historical limitations and U23–U31 remain preserved; this draft makes no content completeness, asset-delivery, freshness or synchronization guarantee.

# Proposal

## Why

Cooking readers can correct instructions and hand content problems to quality reporting without leaving their current cooking context. Extract those local consequences after entry and reading.

## What Changes

- Document explicit step Save/Cancel and targeted source-array replacement for supported instructions.
- Document single-page editing feedback and bounded retry.
- Document cooking-local report entry and return, referencing quality-owned eligibility, validation, persistence and retry policy.
- Map all scenarios to BSL-cooking-008–009; withhold fallback-edit and concurrent-write guarantees.

## Capabilities

### New Capabilities

- `cooking`: Disjoint ADDED handoff requirements for the absent main cooking capability; depends on baseline-cooking-entry-preparation and baseline-cooking-instruction-reading.

### Modified Capabilities

None.

## Impact

Documentation only. Read-only CooksMode → updateRecipe → generated PATCH /api/recipes/{id} → RecipeController.Update → RecipeService.UpdateRecipe → raw metadata/EF save → index-dispatch attempt → ImageService/recipe.info. Recipe library owns update persistence and its separate failure boundaries. Report handoff uses RecipeImportIssueSheet and existing POST/DELETE import-report operations; recipe quality owns that policy. The pre-existing untracked baseline-recipe-quality-cooking-feedback/proposal.md is preserved and not duplicated as a quality delta. Cooking describes only its caller and local state; acceptance of that other proposal is not assumed. Optional design omitted; no technical change or decision. See docs/openspec-baseline/cooking.md for exclusions and mappings.

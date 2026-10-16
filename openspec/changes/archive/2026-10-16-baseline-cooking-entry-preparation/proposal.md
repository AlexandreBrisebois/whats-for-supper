# Proposal

## Why

Cooking already opens a recipe-specific preparation view, but has no cooking baseline. Extract this first observable slice as a source-supported draft for human review.

## What Changes

- Document Home and detail entry, recipe detail loading and the ingredient checklist.
- Describe close and recipe-detail handoffs with their local state boundaries.
- Map all requirements and scenarios to BSL-cooking-001–003 in the cooking plan.
- Keep generated fallback content and loading recovery limitations non-normative.

## Capabilities

### New Capabilities

- `cooking`: Recipe-specific preparation, reading and completion; this slice covers entry/preparation only.

### Modified Capabilities

None.

## Impact

Documentation only. Read-only trace: HomeCommandCenter/RecipeDetailSheet → CooksMode → recipes.getRecipe/generated GET /api/recipes/{id} → RecipeController.Detail → RecipeService.GetRecipeDetail → RecipeDbContext/RecipeImportReports. Household identity owns access and member transport; recipe library owns recipe availability and persisted content. No shared-owner deltas. Later authorized cooking slices add disjoint ADDED requirements to this same absent main capability. Human review remains pending; A34 applies. See docs/openspec-baseline/cooking.md for evidence and uncertainty disposition.

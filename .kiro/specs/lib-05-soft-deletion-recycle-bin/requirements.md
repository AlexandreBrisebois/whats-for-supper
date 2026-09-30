# LIB-05 — Soft deletion and recycle bin: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Accidental recipe removal is reversible, while permanent destruction requires elevated confirmation.

## Scope

- Specify the current family-facing **soft deletion and recycle bin** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/RecycleBinSheet.tsx`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/lib/api/recipes.ts`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `pwa/e2e/browse-all-stack.spec.ts`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `DELETE /api/recipes/{id}`, `GET /api/recipes/trash`, `POST /api/recipes/{id}/restore`, `DELETE /api/recipes/{id}/purge`.

## Acceptance criteria

### LIB-05-AC1

Move to bin soft-deletes a recipe and removes it from active library/search/discovery views without purging its record.

### LIB-05-AC2

The recycle bin lists deleted recipes with loading, empty, error, and refresh states and Restore returns a selected recipe to eligible library state.

### LIB-05-AC3

Purge is unavailable until the elevated PIN is confirmed and, once accepted, permanently deletes only the identified binned recipe.

### LIB-05-AC4

Delete/restore/purge controls prevent duplicate requests, reconcile concurrent list changes, clearly distinguish reversible and permanent effects, and restore focus after dialogs.

## Preserved behavior

- Household/member credentials remain required where the current contract requires them; data must not cross household boundaries.
- Unsupported or ineligible records remain excluded rather than made actionable by presentation state.
- Existing routes and unrelated state remain stable on cancellation or failure.
- English and French copy continue through the repository localization layer; no new hard-coded user-facing copy is implied.

## Decisions

- **Derivation:** behavior-first from the inventory, verified current source, OpenAPI, and tests.
- **Cadence:** accelerated; requirements, design, and tasks are delivered together without an approval gate.
- **Baseline:** proposed documentation of current behavior, not approval to preserve every behavior or begin work.

## Open questions

- Product must confirm whether every observed behavior is intended before an implementation packet is authorized.
- Accessibility wording, performance budgets, telemetry retention, and destructive-operation policy require explicit product/security acceptance if changed.
- Any contract divergence found during a future audit must be resolved against approved intent; implementation alone is not authority.

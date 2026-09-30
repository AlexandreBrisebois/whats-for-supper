# SEARCH-03 — Faceted filters: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members narrow results using facts actually present in the current library.

## Scope

- Specify the current family-facing **faceted filters** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/RecipeFiltersSheet.tsx`
- `pwa/src/app/(app)/recipes/page.tsx`
- `pwa/src/lib/api/recipes.ts`
- `api/src/RecipeApi/Services/RecipeSearchService.cs`
- `api/src/RecipeApi/Services/RecipeSearchFilterOptions.cs`
- `pwa/src/components/recipes/RecipeFiltersSheet.test.tsx`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/recipes/search/filters`, `POST /api/recipes/search`.

## Acceptance criteria

### SEARCH-03-AC1

Opening filters loads server-discovered meal type, cuisine, and main-ingredient options plus confirmed vegetarian support rather than a hard-coded catalog.

### SEARCH-03-AC2

Applying a valid combination sends the corresponding contract filters and visibly summarizes active selections; Clear removes them and reruns the search.

### SEARCH-03-AC3

A zero-result combination explains that filters caused the empty state and retains a direct way to clear or revise them.

### SEARCH-03-AC4

Stale filter-metadata or search responses cannot replace newer choices; filter controls have programmatic labels, selected state, focus handling, and localized copy.

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

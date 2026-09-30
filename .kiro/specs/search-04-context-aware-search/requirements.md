# SEARCH-04 — Context-aware search: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Search preserves planning or similarity intent through selection and navigation.

## Scope

- Specify the current family-facing **context-aware search** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/app/(app)/recipes/page.tsx`
- `pwa/src/lib/planner/slotAssignment.ts`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `api/src/RecipeApi/Services/RecipeSearchService.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.Similar.cs`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `POST /api/recipes/search`, `GET/POST/PATCH schedule operations used by slotAssignment`.

## Acceptance criteria

### SEARCH-04-AC1

Planner entry parameters identify a valid target day/week, are carried into search, and a selected recipe uses occupied-slot recovery rather than overwrite.

### SEARCH-04-AC2

Search ranking may demote recipes already planned in the target week while retaining them as eligible results.

### SEARCH-04-AC3

A similarity action supplies the source recipe identifier and displays a visible focus concept until the user clears or replaces it.

### SEARCH-04-AC4

Malformed context is safely ignored or rejected; stale assignment/search responses cannot mutate a newer target, and completion returns to the correct week/day.

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

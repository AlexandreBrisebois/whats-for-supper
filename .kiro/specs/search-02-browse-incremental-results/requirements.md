# SEARCH-02 — Browse and incremental results: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members can browse and progressively extend a stable eligible result set.

## Scope

- Specify the current family-facing **browse and incremental results** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/app/(app)/recipes/page.tsx`
- `pwa/src/lib/api/recipes.ts`
- `api/src/RecipeApi/Services/RecipeSearchService.cs`
- `pwa/e2e/search-hardening.spec.ts`
- `pwa/src/app/(app)/recipes/page.test.tsx`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `POST /api/recipes/search`.

## Acceptance criteria

### SEARCH-02-AC1

With no query or usable preference concepts, Search opens in browse mode with eligible recommendations and no fabricated query explanation.

### SEARCH-02-AC2

Approaching the result boundary requests the contract cursor once, appends deduplicated results, and preserves already rendered cards during loading or failure.

### SEARCH-02-AC3

A 409 expired continuation is identified separately and offers restart/recovery without silently clearing current cards.

### SEARCH-02-AC4

Surprise Me chooses another eligible displayed result when possible, avoids duplicate concurrent activation, and has a labeled keyboard-operable control.

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

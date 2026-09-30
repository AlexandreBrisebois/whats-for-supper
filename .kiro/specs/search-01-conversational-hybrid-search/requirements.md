# SEARCH-01 — Conversational hybrid search: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Natural-language intent produces understandable, resilient recipe ranking.

## Scope

- Specify the current family-facing **conversational hybrid search** behavior and its direct API/state seams.
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
- `api/src/RecipeApi/Services/RecipeSemanticSearchRepository.cs`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `api/src/RecipeApi.Tests/Integration/RecipeLexicalSearchPostgresTests.cs`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `POST /api/recipes/search`.

## Acceptance criteria

### SEARCH-01-AC1

A non-empty natural-language query searches eligible recipe names and facts and returns a ranked result set with an explained top pick when one exists.

### SEARCH-01-AC2

When semantic retrieval is enabled and healthy, ranking combines semantic and lexical evidence; when unavailable it degrades to the contract’s lexical-only result path.

### SEARCH-01-AC3

The response preserves the submitted query semantics, exposes search mode/result path, and never returns unready or soft-deleted recipes.

### SEARCH-01-AC4

Loading, empty, validation, service-error, and late-response states are distinct; a superseded response never replaces newer results and explanations remain accessible text.

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

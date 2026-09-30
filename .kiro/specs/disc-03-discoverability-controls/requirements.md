# DISC-03 — Discoverability controls: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Households control which eligible recipes participate in voting and can inspect that subset.

## Scope

- Specify the current family-facing **discoverability controls** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/DiscoveryToggleCard.tsx`
- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/app/(app)/browse-all-stack/page.tsx`
- `api/src/RecipeApi/Services/DiscoveryService.cs`
- `api/src/RecipeApi/Controllers/RecipeController.cs`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `PATCH /api/recipes/{id}`, `GET /api/recipes?discoverableOnly=…`, `GET /api/discovery`.

## Acceptance criteria

### DISC-03-AC1

A supported recipe detail exposes its current discoverability state and an identified user can toggle it with pending, success, and rollback feedback.

### DISC-03-AC2

Discoverable-only library browsing returns only records currently marked discoverable while the all-recipes mode remains available.

### DISC-03-AC3

Discovery never returns soft-deleted, unready, or otherwise ineligible recipes even if a stale discoverable flag exists.

### DISC-03-AC4

Concurrent toggle/list responses cannot overwrite a newer state; controls expose name, state, disabled/busy semantics, and keyboard operation.

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

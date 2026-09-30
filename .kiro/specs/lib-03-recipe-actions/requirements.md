# LIB-03 — Recipe actions: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Recipe details expose only safe, state-compatible next actions.

## Scope

- Specify the current family-facing **recipe actions** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/components/recipes/ActionGearMenu.tsx`
- `pwa/src/components/recipes/RecipeImportIssueSheet.tsx`
- `pwa/src/lib/api/recipes.ts`
- `pwa/src/components/recipes/ActionGearMenu.test.tsx`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `PATCH /api/recipes/{id}`, `POST/DELETE /api/recipes/{id}/import-report`, `DELETE /api/recipes/{id}`.

## Acceptance criteria

### LIB-03-AC1

An eligible recipe offers Cook Tonight, Plan Later, Find Similar, and GOTO toggle and carries the required recipe/context into each destination.

### LIB-03-AC2

Edit, import-issue reporting, and move-to-bin are exposed only where recipe readiness/source/state permits them.

### LIB-03-AC3

Every mutation has disabled/pending and success/failure recovery behavior; rapid repeat activation causes at most one effective request.

### LIB-03-AC4

Unavailable actions are omitted or explained rather than failing after activation, and menus/dialogs support keyboard focus, escape, accessible names, and destructive confirmation.

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

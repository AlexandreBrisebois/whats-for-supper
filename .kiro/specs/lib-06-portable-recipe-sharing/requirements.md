# LIB-06 — Portable recipe sharing: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

A ready recipe can move between households through an explicit, integrity-preserving bundle exchange.

## Scope

- Specify the current family-facing **portable recipe sharing** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/components/capture/MinimalCapture.tsx`
- `pwa/src/lib/api/recipes.ts`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `pwa/src/components/capture/MinimalCapture.recipe-import.test.tsx`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/recipes/{id}/share`, `POST /api/recipes/import-bundle`.

## Acceptance criteria

### LIB-06-AC1

Export is offered only for an eligible ready recipe and retrieves a bundle containing contract recipe data and imagery from the recipe share endpoint.

### LIB-06-AC2

While preparing or invoking device sharing, repeated export is disabled; cancellation, unsupported share capability, and preparation failure leave the recipe unchanged with recoverable feedback.

### LIB-06-AC3

Capture can ingest a supported bundle, show a preview before mutation, and create/import only after explicit acceptance; rejection has no persisted effect.

### LIB-06-AC4

Malformed, oversized, or incompatible bundles are rejected safely; imported content is treated as untrusted, and controls/previews are keyboard accessible and localized.

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

# LIB-02 — Recipe detail and metadata: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members can inspect and maintain the household-owned facts attached to a recipe.

## Scope

- Specify the current family-facing **recipe detail and metadata** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/components/recipes/RecipeDetailSheet.tsx`
- `pwa/src/lib/api/recipes.ts`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `pwa/src/components/recipes/RecipeDetailSheet.test.tsx`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/recipes/{id}`, `PATCH /api/recipes/{id}`.

## Acceptance criteria

### LIB-02-AC1

Detail displays name, hero, description, cuisine, meal types, time, ingredients, instructions, notes, rating, and readiness/import state when supplied, with explicit absence states.

### LIB-02-AC2

Edit mode validates and saves supported name, description, cuisine, meal types, and ingredient changes through recipe update, then reconciles the displayed record.

### LIB-02-AC3

Notes auto-save after change and ratings save on selection/toggle; pending, saved, and failed states do not claim persistence prematurely.

### LIB-02-AC4

Closing, switching recipes, or overlapping saves cannot apply data to the wrong recipe; fields and rating controls have labels, errors, focus order, and localized text.

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

# LIB-01 — Immersive library browsing: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members explore the whole library in their preferred view without losing position or context.

## Scope

- Specify the current family-facing **immersive library browsing** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/app/(app)/browse-all-stack/page.tsx`
- `pwa/src/store/browseStackStore.ts`
- `pwa/src/components/recipes/RecipeStackCard.tsx`
- `api/src/RecipeApi/Controllers/RecipeController.cs`
- `pwa/e2e/browse-all-stack.spec.ts`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/recipes`, `GET /api/recipes/library-summary`.

## Acceptance criteria

### LIB-01-AC1

The library supports card-stack and list views, paginates ready non-deleted recipes, and orders them using the API explore ordering intended to resurface less-recently-cooked recipes.

### LIB-01-AC2

The member can switch All/Discoverable and view modes; the selected view preference persists and a stale page response cannot cross-contaminate the active filter.

### LIB-01-AC3

Opening and closing details or invoking supported planning/cooking/management actions preserves the applicable browse position and context.

### LIB-01-AC4

Initial loading, empty library, filter-empty, pagination, wrap, and retry states are distinct and all navigation/actions are keyboard operable and labeled.

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

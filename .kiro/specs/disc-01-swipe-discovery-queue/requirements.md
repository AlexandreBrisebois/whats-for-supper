# DISC-01 — Swipe discovery queue: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

Members can work through a category-scoped stack without losing cards already on screen.

## Scope

- Specify the current family-facing **swipe discovery queue** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/app/(app)/discovery/page.tsx`
- `pwa/src/components/discovery/DiscoveryCard.tsx`
- `pwa/src/store/discoveryStore.ts`
- `pwa/src/lib/api/discovery.ts`
- `api/src/RecipeApi/Controllers/DiscoveryController.cs`
- `api/src/RecipeApi/Services/DiscoveryService.cs`
- `pwa/e2e/discovery.spec.ts`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `GET /api/discovery/categories`, `GET /api/discovery`, `POST /api/discovery/{id}/vote`.

## Acceptance criteria

### DISC-01-AC1

Given an identified member, loading Discovery returns eligible cards for the active category and renders loading, populated, empty, and recoverable-error states.

### DISC-01-AC2

A member can like or pass the top card by gesture or by labeled controls; one vote is submitted and the card advances only after the action is accepted.

### DISC-01-AC3

A refresh or fill-the-gap signal reconciles eligibility without replacing the currently visible top cards or applying a stale response.

### DISC-01-AC4

Keyboard and assistive-technology users can identify the card and invoke equivalent Like, Pass, and Refresh actions with visible focus.

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

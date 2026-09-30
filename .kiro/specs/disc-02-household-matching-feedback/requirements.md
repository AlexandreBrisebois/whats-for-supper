# DISC-02 — Household matching feedback: requirements

> Status: **Proposed current-behavior specification**. Behavior-first, accelerated cadence.
> Source: `docs/feature-inventory.md`. This documents observed behavior; it does not authorize implementation.

## Outcome

A vote produces trustworthy household feedback and a useful next step when the queue ends.

## Scope

- Specify the current family-facing **household matching feedback** behavior and its direct API/state seams.
- Specify observable loading, empty, success, failure, retry, concurrency, navigation, localization, and accessibility behavior.
- Preserve household isolation, active-member attribution, ready/non-deleted eligibility, and unrelated planner/library state.

## Non-goals

- Approving UI, API, schema, ranking, workflow, or persistence changes.
- Defining adjacent capture, planner, identity, or operations features except where this feature hands off to them.
- Treating implementation comments, tests, or this proposed baseline as a product decision.

## Verified baseline

- `pwa/src/app/(app)/discovery/page.tsx`
- `pwa/src/components/recipes/EndCard.tsx`
- `pwa/src/store/discoveryStore.ts`
- `pwa/src/hooks/useScheduleStream.ts`
- `api/src/RecipeApi/Services/DiscoveryService.cs`
- `pwa/e2e/discovery.spec.ts`

The current OpenAPI authority is `specs/openapi.yaml`; relevant operations are: `POST /api/discovery/{id}/vote`, `GET /api/discovery`, `GET /api/stream`.

## Acceptance criteria

### DISC-02-AC1

Each accepted vote is associated with the active member and subsequent reads reflect household vote count and interest.

### DISC-02-AC2

When server-driven reconciliation removes a visible matched card because it was planned, the member sees bounded “just planned” feedback exactly once.

### DISC-02-AC3

An exhausted queue reports the session match outcome and offers labeled routes to Planner, Capture, or feed refresh as applicable.

### DISC-02-AC4

Duplicate events, retries, navigation, and vote failure do not double-count, falsely claim planning, or discard the actionable card.

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

# Proposal

## Why

The baseline has no recipe-library requirements despite a connected household library list. Document its supported visibility and list outcomes so later capabilities can reuse the library's eligibility owner without importing search or capture policy.

## What Changes

- Add a bounded baseline for Browse Library entry, list presentation, server ready/non-deleted eligibility and optional Discovery filtering.
- Describe the connected explore ordering, paginated response, display and append of returned items, loading, All-mode empty feedback and initial-load Retry.
- Reuse household-identity access/member context and member-preference ownership; do not duplicate their policy.
- Keep U29–U31 non-normative under the confirmed boundary: no readiness derivation, badge enrichment, complete/fresh/stable pagination, Discovery-empty feedback or universal recovery guarantees.
- Map requirements/scenarios to BSL-recipe-library-001/002 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md).

## Capabilities

### New Capabilities

- `recipe-library`: maintain the household's reusable recipe collection; this first slice documents only ordinary-household library list visibility and its connected UI outcome.

### Modified Capabilities

None. Household-identity requirements are consumed unchanged.

## Impact

Documentation only: this proposal, ADDED recipe-library delta, extraction design/tasks and plan. The inspected journey is Home → Browse Library → list view → generated GET `/api/recipes` → controller/service/EF → DTO/store → named grid items. Summary is a connected read dependency. No application, tests, contracts, generated clients, SQL, configuration or runtime behavior changes. No services, database access or mutations. Main identity and its three promoted active changes remain intact. Acceptance, promotion and archival require separate authorization.

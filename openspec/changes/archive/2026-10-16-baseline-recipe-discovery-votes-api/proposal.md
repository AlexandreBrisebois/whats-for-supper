# Proposal

## Why

Vote identity and totals need an explicit baseline separate from local match copy. This is a source-supported brownfield documentation draft, authorized on 2026-10-16; it changes no application behavior.

## What Changes

- Extract like/pass submission, sequential replacement, like totals and API-only filtering/categories into a reviewable delta.
- Link evidence and withheld claims in `docs/openspec-baseline/recipe-discovery.md`.
- Keep human acceptance, main-spec promotion and runtime qualification pending.

## Capabilities

### New Capabilities

- `recipe-discovery`: like/pass submission, sequential replacement, like totals and API-only filtering/categories. No main spec exists; companion discovery deltas add disjoint requirements to this same capability.

### Modified Capabilities

None. Existing identity, library, meal-planning and household-live-updates requirements retain ownership.

## Impact

Documentation only: this change's proposal, design, tasks and delta, plus the discovery capability plan. Source, SQL, approved OpenAPI, generated clients and tests are read-only evidence. No dependencies, API changes, deployment, migration, implementation or archival.

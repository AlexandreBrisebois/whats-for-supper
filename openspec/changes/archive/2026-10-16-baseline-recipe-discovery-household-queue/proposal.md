# Proposal

## Why

The ordinary household discovery journey lacks an extracted baseline. This is a source-supported brownfield documentation draft, authorized on 2026-10-16; it changes no application behavior.

## What Changes

- Extract member entry, queue eligibility/filtering/ordering, card controls, empty states and local refresh consumption into a reviewable delta.
- Link evidence and withheld claims in `docs/openspec-baseline/recipe-discovery.md`.
- Keep human acceptance, main-spec promotion and runtime qualification pending.

## Capabilities

### New Capabilities

- `recipe-discovery`: member entry, queue eligibility/filtering/ordering, card controls, empty states and local refresh consumption. No main spec exists; companion discovery deltas add disjoint requirements to this same capability.

### Modified Capabilities

None. Existing identity, library, meal-planning and household-live-updates requirements retain ownership.

## Impact

Documentation only: this change's proposal, design, tasks and delta, plus the discovery capability plan. Source, SQL, approved OpenAPI, generated clients and tests are read-only evidence. No dependencies, API changes, deployment, migration, implementation or archival.

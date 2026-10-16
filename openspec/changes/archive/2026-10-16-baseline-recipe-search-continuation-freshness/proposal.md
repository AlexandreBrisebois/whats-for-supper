# Proposal

## Why

Existing ordinary-household recipe search needs a reviewable, source-supported brownfield baseline. This documentation-only slice records continuation, expiry, stale-response suppression and received invalidation; it adds no application behavior.

## What Changes

- Draft the settled observable requirements and scenarios for this slice.
- Map every requirement and all of its scenarios to BSL-recipe-search evidence in the capability plan.
- Preserve disputed and incomplete behavior as non-normative limitations.
- Stop before human acceptance, main-spec promotion, archival or runtime qualification.

## Capabilities

### New Capabilities

- `recipe-search`: Continuation, expiry, stale-response suppression and received invalidation. This is one additive slice of the approved shared recipe-search capability; its sibling drafts use the same path with distinct requirement names.

### Modified Capabilities

None. Existing main owner requirements are referenced, not rewritten.

## Impact

Documentation only: this change and `docs/openspec-baseline/recipe-search.md`. The traced UI, client, API, service and persistence remain unchanged. No contracts, dependencies, tests or runtime configuration change. Demo, preview, Synology and separately scoped operator/API-only journeys remain deferred.

Evidence: BSL-recipe-search-018, BSL-recipe-search-019, BSL-recipe-search-020, BSL-recipe-search-021, BSL-recipe-search-022. Read the capability plan for discrepancies, source identity, assertion substitutions and runtime-not-run qualifications. The user authorized all recipe-search successor draft slices on 2026-10-16; no acceptance or promotion is implied.

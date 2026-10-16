# Proposal

## Why

The recipe-library baseline covers listing, reading, field editing, ratings and notes, but omits the discoverability control available in loaded library detail. Extract its supported behavior so review can distinguish local display from persisted recipe state.

## What Changes

- Add only loaded-detail discoverability initialization, activation, partial persistence, pending feedback and successful/rejected completion requirements.
- Record source and actual assertion mappings in BSL-recipe-library-016–018 of the durable baseline plan, with U41–U43 limitations non-normative.
- Preserve existing Purpose and requirements, approved shared ownership, historical limitations and all prior artifacts. No application behavior changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add missing discoverability-control/update behavior after successful ordinary-household library detail loading; reuse existing list eligibility, filters, fact/read/update and household-identity owners.

## Impact

Documentation only: this proposal, recipe-library ADDED delta, extraction design/tasks and `docs/openspec-baseline-plan.md`. The inspected path is the library caller → RecipeDetailSheet/DiscoveryToggleCard → recipes adapter/generated PATCH/OpenAPI → controller/service/EF save → local result. Tests use substitutions; runtime/database qualification remains deferred under A34 and source-supported extraction allowed under A10.

No consequential intent choice blocks these source-supported assertions. U41–U43 withhold stronger recovery, concurrency, file synchronization and contract claims. Detail editing, ratings/notes submission, discovery votes/consensus/ranking, reporting/re-import, sharing, originals, hero generation, cooking, planning, capture, deletion lifecycle, preferences and environment variants remain excluded. Stop at validated draft for review; acceptance, main promotion, archival and successor extraction require separate authorization.

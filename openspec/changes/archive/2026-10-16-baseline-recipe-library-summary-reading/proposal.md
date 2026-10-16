# Proposal

## Why

The recipe-library coverage audit (BSL-recipe-library-028, G02) found no provider requirement for existing library-summary counts or their bounded initial Browse consumption. Document this implemented behavior for human review without changing the application or treating separate count/page reads as a snapshot.

## What Changes

- Add a documentation-only recipe-library baseline for GET `/api/recipes/library-summary`: stored readiness/deletion eligibility, total, never-cooked and four rating counts, empty result and actual response envelope.
- Add the missing summary-before-page sequence and initial All versus Discovery total selection, including missing-value defaults and first-page pagination-state assignment.
- Reuse existing library list eligibility, page-response, loading, initial-failure and Retry requirements; do not redefine them.
- Record exact source/assertion mappings, substitutions, contract disagreements and source-only scenarios in the capability plan. Preserve U29–U52, audit F01–F08 and deferred A34 qualification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add the missing summary provider and bounded initial count-consumption requirements. This extends specification coverage of existing behavior; it requests no runtime behavior change.

## Impact

Only this CLI-scaffolded change and the recipe-library baseline plan (plus a small index summary correction) are edited. Source evidence spans the summary controller/service/DTO/EF predicates, success wrapping and household access configuration, OpenAPI and generated mappings, Browse first-page consumer, API assertions and mocked UI/browser assertions. No code, tests, contracts, clients, SQL, dependencies, configuration or main specs change.

The installed spec-driven schema requires an extraction design and documentation tasks. Draft validation does not establish acceptance, promotion or runtime verification. Stop at a validated draft for human review; do not sync, archive, implement fixes or begin another slice. Stack navigation, additional-page traversal, preferences, mutations, assets, algorithms, synchronization and environment qualification remain excluded. Readiness prose and member-header access disagreements remain non-normative observations rather than repairs or new access policy.

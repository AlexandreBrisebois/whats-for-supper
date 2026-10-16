# Proposal

## Why

Saved recipe issues remain available for human review after reporting or contextual processing. The baseline needs to describe finding those reports and explicitly clearing one, without equating re-import completion with recipe correction or resolution.

## What Changes

- Add the review-filter entry, overlapping membership and immediate review-result consequences to the existing recipe-quality baseline.
- Document manual resolution availability, request identity, active-attempt rejection, persisted report removal, repeat requests, local acknowledgement and error retry.
- Trace subsequent successful reads separately from already loaded parent results; record missing refresh and contract/test limitations.
- Record A75, BSL-recipe-quality-007–010, source identities and complete scenario mappings in `docs/openspec-baseline-plan.md`.
- Produce documentation-extraction tasks only. No application behavior changes or runtime qualification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-quality`: Add finding saved issues, reviewing their state and manually resolving them. Reuse the promoted 13 requirements/35 scenarios for issue entry/form initialization, reason/note behavior, Save, contextual policy, import-ID polling, indicators and conditional outcomes.

## Impact

Documentation only: this change's proposal/design/recipe-quality delta/tasks/CLI metadata and the durable plan. Evidence spans RecipesPage/RecipeFiltersSheet, issue sheet/detail/gear/badge, API wrapper/generated DELETE/OpenAPI, controller/report service, persistence/detail/search projections and inspected tests/mocks.

Household-identity owns household access and member context; recipe-library owns detail reads and dismissal. The uncreated `recipe-search` capability owns general search, ranking, Top Pick policy, promotion eligibility, continuation, retrieval and planner eligibility. This slice documents only review-filter inputs, membership and immediate presentation; no recipe-search placeholder or broader requirements are created. Cooking-mode callers are entry dependencies only. Generic/bulk re-import and Settings failed-capture retry/clear remain outside scope.

Preserve all five main specs, feature-enabled PDF boundaries/U70–U74, A69's description-status caveat, U01/U75–U79, deferred A34 qualification and prior historical qualifications. Initial capture, manual editing, hero generation, planning/cooking, demo, broader preview features, installation and deployment are excluded. Stop at a validated draft for human review; no promotion, archive, implementation or successor slice.

Disputed claims are withheld: household-wide access qualification, automatic resolution/correction, typed DELETE conflict parity, immediate parent refresh and guaranteed recovery. No consequential unresolved decision blocks the bounded extraction.

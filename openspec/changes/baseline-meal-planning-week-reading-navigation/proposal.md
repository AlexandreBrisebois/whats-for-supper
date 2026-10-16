# Proposal

## Why

The promoted baseline covers household access, recipes and conditional live snapshots, but planner entry, week navigation and ordinary schedule reads have no meal-planning baseline. Extracting this bounded journey makes its current read behavior and freshness limits reviewable before later planning operations.

## What Changes

- Draft existing planner initialization ownership, URL week selection/navigation, UTC schedule boundaries, GET response mapping and displayed read states.
- Distinguish stored assignments, pending suggestions and content retained by live reconciliation.
- Record unsuccessful and overlapping read consequences without inventing recovery, cancellation, atomicity or freshness guarantees.
- Add evidence, complete requirement/scenario mappings, source identities and uncertainties to the durable baseline plan under A83.
- Documentation extraction only; stop at human review. Do not promote, archive, implement or begin another slice.

## Capabilities

### New Capabilities

- `meal-planning`: Initial bounded slice for planner week reading and navigation. CLI inventory confirms this capability is absent; other planning operations remain deferred.

### Modified Capabilities

None. Reuse household-identity access/member context, household-live-updates connection and snapshot reconciliation, recipe-library visibility and background-processing lifecycle ownership without changing their requirements.

## Impact

Only this change's metadata, proposal, design, meal-planning delta and extraction tasks, plus `docs/openspec-baseline-plan.md`, are selected for edits. Source inspection spans app layout/initializer → planner URL/store → wrapper/generated GET → OpenAPI → global access/result filters → controller/service/EF projection → store/rendering, with substituted assertions reviewed separately from runtime evidence.

Assignment/removal/move/defer, voting/locking transitions, non-cooking mutations, groceries, cooking, discovery/ranking/consensus generation, capture, notifications, administration, maintenance, demo and deployment are excluded. Smart defaults are inspected only for read composition. U95–U101, A34, A69, feature-enabled PDF/U70–U74, U01/U75–U94 and historical qualifications remain intact. Known read gaps are documented, not repaired; disputed guarantees are withheld.

# Proposal

## Why

Main recipe-library covers loaded detail and its field editor but leaves the connected rating and notes controls undocumented. Extract only their source-supported ordinary-household behavior, separating stored recipe facts from optimistic state and local feedback.

## What Changes

- Add initialized rating/notes controls, rating selection and clearing, timed exact-text notes submission, and bounded partial persistence requirements.
- Record premature Saved feedback, baseline-comparison, timer, overlapping-request, failure and contract limitations without repairs or unsupported guarantees.
- Map every added requirement/scenario to source and actual assertion coverage in the durable plan; stop with a validated draft for review.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-library`: add only missing ratings/notes behavior from successfully loaded library detail. Preserve its Purpose and all 25 requirements/48 scenarios; reuse existing retrieval, persisted-fact and partial-update ownership and household-identity access/member context.

## Impact

Documentation only: this change's metadata, proposal, recipe-library delta, extraction design/tasks and `docs/openspec-baseline-plan.md`. Evidence follows the connected library caller, RecipeDetailSheet state/timers, adapter/generated PATCH/OpenAPI, controller/validation/service, database update, directly connected indexing/file effects and local display. No application, test, contract, generated client or SQL changes; no mutations, database access or service launch.

Detail-field editing, discoverability changes, discovery votes/consensus, reporting/re-import, sharing, originals, hero generation, cooking mode, planning, ranking, capture, deletion/restore/purge, preference policy and demo/preview/deployment variants are excluded. A54 authorizes this draft; A10 permits source-supported extraction and A34 defers implementation/database qualification. Disputed guarantees stay non-normative under A12. Acceptance, promotion, archival and successor extraction require separate authorization.

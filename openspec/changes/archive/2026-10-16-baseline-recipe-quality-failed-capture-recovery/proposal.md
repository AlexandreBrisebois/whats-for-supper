# Proposal

## Why

Settings already lets households inspect failed captures, request another attempt and clear failures. This journey is missing from the general recipe-quality baseline; documenting its actual acknowledgement and background-work boundaries avoids treating a retry as completed recovery or a clear as completed cleanup.

## What Changes

- Extract existing Settings list visibility, eligibility, presentation, retry and confirmed clear behavior into recipe-quality requirements.
- Record persisted changes, subsequent-read behavior and conditional residue cleanup without specifying general workflow administration.
- Preserve source-supported limitations: hidden loading/list errors, post-response retry feedback, no mounted refresh, contract discrepancies and unqualified concurrency.
- Add evidence, complete scenario mappings and documentation-extraction tasks to the durable baseline plan under A77.
- Documentation only: no application behavior or contract changes, promotion, archival or runtime qualification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `recipe-quality`: add the existing household Settings failed-capture review, retry and clear journey. Existing issue reporting, contextual re-import, review and manual resolution remain unchanged.

## Impact

Only this change's CLI metadata, proposal, design, recipe-quality delta, extraction tasks and `docs/openspec-baseline-plan.md` change. Evidence spans Profile/Settings, FailedCapturesSection, generated capture-failure operations/OpenAPI, CapturesController, CaptureFailureService, workflow/task persistence, WorkflowWorker and the queued ManagementService cleanup consumer.

Dependencies: household-identity owns shared access and identity transport; recipe-capture owns acquisition, extraction, readiness, session notifications and the promoted feature-enabled PDF recovery requirements. Recipe-library owns ordinary deletion/Recycle Bin. General workflow/maintenance scheduling is a dependency, not a new capability here. Clearing a failure does not mean manually resolving a saved recipe issue; retrying does not submit contextual feedback.

Technical discrepancies are recorded in U84–U88 of the plan; disputed guarantees are withheld. No unresolved product choice is needed to extract the supported subset. Stop at a validated draft for human review.

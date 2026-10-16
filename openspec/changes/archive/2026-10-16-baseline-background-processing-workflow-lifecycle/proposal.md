# Proposal

## Why

Capture and contextual re-import already depend on persisted background workflows, but their shared acceptance, task progression and automatic retry rules have no baseline owner. Extract the implemented lifecycle so accepting work, executing a task and completing a workflow remain distinguishable.

## What Changes

- Draft the existing shared definition lookup/validation, parameter snapshot, transactional initial persistence, dependency progression, due selection, processor dispatch, automatic retry scheduling and terminal failure behavior.
- Describe subsequent successful instance reads using stored task and instance states; retain partial-completion and delivery limits.
- Record source identities, inspected assertions, discrepancies and every requirement/scenario mapping in the durable plan under BSL-background-processing-001–005 and authorization A79.
- Preserve promoted capture/quality journey requirements. No application behavior changes, main-spec promotion, archival or implementation.

## Capabilities

### New Capabilities

- `background-processing`: Persisted workflow acceptance, task dependencies, execution outcomes and automatic retry lifecycle. CLI inventory confirms this capability is absent.

### Modified Capabilities

None. Capture acquisition/readiness/failure notification and quality feedback/recovery remain with their existing owners.

## Impact

Documentation only: this change's proposal, design, delta and extraction tasks plus `docs/openspec-baseline-plan.md`. Evidence follows callers through WorkflowOrchestrator, stored YAML, EF/SQL, WorkflowWorker, RetryScheduler and status DTOs/controllers. Existing contracts, tests, generated clients, source, SQL and configuration are read-only inputs.

Withhold disputed missing-definition HTTP status, atomic completion/side effects, parent-state execution gating, exactly-once/concurrency guarantees and automatic issue resolution. Record these as qualifications rather than changing behavior. Runtime/database/model qualification remains deferred under A34; stop at a validated draft for human review.

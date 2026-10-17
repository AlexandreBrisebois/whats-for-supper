# Design

## Context and Existing Ownership

`RecipeImportReportService.SubmitAsync` validates and saves reports, selects the workflow and constructs parameters. `WorkflowOrchestrator.TriggerAsync` validates the packaged definition before persisting tasks. `url-import.yaml` requires `url`; contextual parameters currently omit it. Ordinary URL import already supplies this field.

## Decisions and Tradeoffs

Add the recipe's existing SourceUrl only when nonempty to the existing parameter builder. Do not accept another client URL, change eligibility, or weaken required workflow parameters. Clarify the existing POST contract description without changing wire shapes. Exercise the real orchestrator with packaged YAML and isolated persistence; external fetching/model processing is beyond launch acceptance.

## First Observable Slice

Report service → real workflow repository/orchestrator → persisted instance/tasks and report link. Observe the missing-URL red before adding the field, then verify exact fetch payload, normalized feedback, one active launch and terminal retry rules. Existing HTTP integration covers controller/projection; add browser launch-failure/retry acceptance with method-sensitive stateful handlers.

## State, Concurrency and Recovery

Preserve the existing per-recipe in-process lock and saved-report-before-launch ordering. Verify failed launch leaves no linked attempt and unchanged feedback can be retried after infrastructure recovery. No cross-replica or exactly-once claim. Existing terminal unchanged feedback suppression remains authoritative.

## Persistence and Side Effects

The orchestrator persists instance/tasks in its existing transaction; report linking is a later operation. Test packaged launch with isolated database and relational repository qualification. Provider execution and correction quality remain untested by these launch checks.

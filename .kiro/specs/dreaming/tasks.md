# Dreaming Workflow Implementation Tasks

Build this spec in phases with a fresh agent context for each phase. Each phase should load only this spec, the active phase, and the directly impacted workflow/API files. Do not carry implementation context from one phase into the next except through committed code, updated spec notes, and the phase handoff summary.

## Phase 1: Engine Scheduling Primitive (Backend)
Extend the workflow engine so a workflow instance can be triggered with a future start time using the existing task-level `WorkflowTask.ScheduledAt` mechanism.

- [ ] 1. **Engine - Support Scheduled Triggers**
    - Update `IWorkflowOrchestrator` and `WorkflowOrchestrator` to accept `scheduledAt` in `TriggerAsync`.
    - Apply `scheduledAt` only to root workflow tasks that would otherwise be `Pending`; dependent tasks stay `Waiting`.
    - Confirm `WorkflowWorker` already respects `WorkflowTask.ScheduledAt` in both EF and `SKIP LOCKED` paths, and adjust only if tests expose a gap.
    - _Requirements: [AC-2]_

- [ ] 2. **Test - Scheduled Trigger Unit Tests**
    - Add or update `WorkflowOrchestratorTests` to verify a scheduled trigger assigns `ScheduledAt` to root pending tasks.
    - Verify dependent tasks remain `Waiting` without `ScheduledAt`.
    - Verify unscheduled triggers preserve current behavior.
    - _Requirements: [AC-2]_

## Phase 2: StartWorkflow Processor & UTC Cron Scheduling (Backend)
Add an engine-level workflow processor that can spawn another workflow immediately or at the next occurrence of a UTC cron expression.

- [ ] 3. **Engine - Implement `StartWorkflow` Processor**
    - Create `WorkflowProcessor.cs` or equivalent with processor name `StartWorkflow`.
    - Read `payload.workflowId`, optional `payload.parameters`, and optional `payload.schedule.cron`.
    - Resolve `${VAR:-default}` schedule expressions from configuration/environment at task execution time.
    - When `schedule.cron` is present, calculate the next UTC occurrence and call `TriggerAsync(..., scheduledAt)`.
    - Register the processor in `Program.cs`.
    - _Requirements: [AC-8, AC-9]_

- [ ] 4. **Test - Cron & Spawn Workflow Unit Tests**
    - Write tests for the UTC cron occurrence calculator using `DREAMING_CRON_UTC`-style expressions.
    - Write tests for immediate `StartWorkflow`.
    - Write tests for scheduled `StartWorkflow` using `cron: "${DREAMING_CRON_UTC:-0 3 * * *}"`.
    - _Requirements: [AC-2, AC-8, AC-9]_

## Phase 3: Maintenance Logic & Dreaming Workflow (Backend)
Implement the maintenance tasks and the Dreaming workflow.

- [ ] 5. **Management - Create Dreaming Workflow YAML**
    - Create `api/src/RecipeApi/Workflows/dreaming.yaml` with `prune`, `backup` (`StartWorkflow`), `report`, and `reschedule` (`StartWorkflow` targeting `dreaming` with `schedule.cron`).
    - Use `depends_on` to match the existing workflow YAML convention.
    - Use `cron: "${DREAMING_CRON_UTC:-0 3 * * *}"` for the self-reschedule task.
    - _Requirements: [AC-1, AC-8, AC-9]_

- [ ] 6. **Management - Implement Pruning & Reporting**
    - Add `PruneWorkflowsAsync` and `GenerateDreamingReportAsync` to `ManagementService`.
    - Update `ManagementProcessor` to handle these tasks.
    - _Requirements: [AC-3, AC-5, AC-6]_

- [ ] 7. **Test - Maintenance Logic Tests**
    - Unit tests for pruning (verify only old terminal workflows are removed).
    - Integration test for the full report generation.
    - _Requirements: [AC-3, AC-5, AC-6]_

## Phase 4: Initialization & Verification
Ensure the cycle starts automatically and verify the end-to-end flow.

- [ ] 8. **Infrastructure - Initial Dreaming Seeder**
    - Update `WorkflowWorker` or create a startup task to trigger the first `dreaming` workflow if none are pending, processing, or scheduled.
    - Use the same `DREAMING_CRON_UTC` defaulting behavior as the YAML self-reschedule task.
    - _Requirements: [AC-1]_

- [ ] 9. **Verification - Full Cycle Execution**
    - Trigger the `dreaming` workflow through the existing generic workflow trigger API or test harness.
    - Verify it triggers `db-backup`.
    - Verify it creates a new `dreaming` instance whose root task is scheduled for the next `DREAMING_CRON_UTC` occurrence.
    - Verify the Markdown report is generated correctly.
    - _Requirements: [AC-1, AC-4, AC-8, AC-9]_

- [ ] 10. **Documentation - Update Project Assets**
    - [ ] 10.1 Update `README.md` with maintenance and backup details.
    - [ ] 10.2 Update deployment documentation with `DREAMING_CRON_UTC`.
    - [ ] 10.3 Update `HANDOVER.md` with maintenance cycle logic.
    - _Requirements: All_

# Dreaming Workflow Implementation Tasks

## Wave 1: Engine Extensions & Seeding (Backend)
Extend the workflow engine to support scheduled triggers and the new processor.

- [ ] 1. **Engine - Support Scheduled Triggers**
    - Update `IWorkflowOrchestrator` and `WorkflowOrchestrator` to accept `scheduledAt` in `TriggerAsync`.
    - Update `WorkflowWorker`'s `QueryWithSkipLocked` (if needed) to ensure `scheduled_at` is respected.
    - _Requirements: [AC-2]_

- [ ] 2. **Engine - Implement WorkflowProcessor**
    - Create `WorkflowProcessor.cs` with `StartWorkflow` and `RescheduleSelf` logic.
    - `RescheduleSelf` must use a utility to calculate the next 3 AM based on a time and offset.
    - Register `WorkflowProcessor` in `Program.cs`.
    - _Requirements: [AC-8, AC-9]_

- [ ] 3. **Test - Scheduling & Rescheduling Unit Tests**
    - Write tests for the `NextOccurrenceCalculator` utility.
    - Write tests for `WorkflowProcessor.RescheduleSelf`.
    - _Requirements: [AC-8]_

## Wave 2: Maintenance Logic & Workflow (Backend)
Implement the maintenance tasks and the Dreaming workflow.

- [ ] 4. **Management - Create Dreaming Workflow YAML**
    - Create `api/src/RecipeApi/Workflows/dreaming.yaml` with `prune`, `backup` (StartWorkflow), `report`, and `reschedule` (RescheduleSelf).
    - _Requirements: [AC-1, AC-8, AC-9]_

- [ ] 5. **Management - Implement Pruning & Reporting**
    - Add `PruneWorkflowsAsync` and `GenerateDreamingReportAsync` to `ManagementService`.
    - Update `ManagementProcessor` to handle these tasks.
    - _Requirements: [AC-3, AC-5, AC-6]_

- [ ] 6. **Test - Maintenance Logic Tests**
    - Unit tests for pruning (verify only old terminal workflows are removed).
    - Integration test for the full report generation.
    - _Requirements: [AC-3, AC-5, AC-6]_

## Wave 3: Initialization & Verification
Ensure the cycle starts automatically and verify the end-to-end flow.

- [ ] 7. **Infrastructure - Initial Dreaming Seeder**
    - Update `WorkflowWorker` or create a startup task to trigger the *first* `dreaming` workflow if none are pending/scheduled.
    - _Requirements: [AC-1]_

- [ ] 8. **Verification - Full Cycle Execution**
    - Manually trigger the `dreaming` workflow.
    - Verify it triggers `db-backup`.
    - Verify it creates a new `dreaming` instance for the next night.
    - Verify the Markdown report is generated correctly.
    - _Requirements: [AC-1, AC-8, AC-9]_

- [ ] 9. **Documentation - Update Project Assets**
    - [ ] 9.1 Update `README.md` with maintenance and backup details.
    - [ ] 9.2 Update deployment documentation (how to configure `DREAMING_TIME`).
    - [ ] 9.3 Update mermaid flows in `design.md`.
    - [ ] 9.4 Update `HANDOVER.md` with maintenance cycle logic.
    - _Requirements: All_

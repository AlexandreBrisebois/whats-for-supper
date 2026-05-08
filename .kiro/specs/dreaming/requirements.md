# Dreaming Workflow Requirements

## Vision
The "Dreaming" workflow is a nightly maintenance routine designed to keep the "What's For Supper" system healthy, lean, and recoverable. It automates the pruning of transient state, ensures database backups are flushed to disk for NAS versioning, and provides human-readable visibility into workflow health.

## Product Decisions
- **Retention**: Only 7 days of completed or failed workflow history is retained in the database.
- **Reporting**: Reports are stored as Markdown files in the `DataRoot/reports/` directory, allowing simple text-based monitoring.
- **Trigger**: Dreaming is strictly an automatic, time-based event to prevent manual interference with maintenance cycles.
- **Failure Visibility**: Failed and "stuck" (long-running) workflows are surfaced in the report for human intervention.

## Acceptance Criteria
1. **[AC-1] Nightly Execution**: The system must trigger the "Dreaming" workflow automatically every night.
2. **[AC-2] Configurable Schedule**: The execution time must be configurable via environment variables (`DREAMING_TIME_UTC` and `DREAMING_TIME_OFFSET`), defaulting to 03:00 UTC-4.
3. **[AC-3] Workflow Pruning**: `WorkflowInstance` and `WorkflowTask` records older than 7 days (based on `UpdatedAt`) that are in `Completed` or `Failed` status must be deleted.
4. **[AC-4] State Persistence (Backup)**: The workflow must trigger the full database backup logic (`ManagementService.BackupAsync`) to ensure all database state is flushed to the filesystem.
5. **[AC-5] Health Evaluation**: The workflow must identify:
    - **Failed**: Any workflow instance that reached the `Failed` status in the last 24 hours.
    - **Stuck**: Any workflow instance that has been in `Processing` or `Pending` (if scheduled in the past) for more than 1 hour.
6. **[AC-6] Markdown Report**: A report must be generated and saved to `DataRoot/reports/dreaming-yyyy-MM-dd.md` containing:
    - Summary of pruned records.
    - Backup status.
    - List of Failed workflows (with error messages).
    - List of Stuck workflows (marked as "Keep an eye on these").
7. **[AC-7] No API Trigger**: There shall be no public API endpoint to trigger "Dreaming" on demand.
8. **[AC-8] Self-Rescheduling**: The Dreaming workflow must include a final task that schedules a new instance of itself for the next occurrence of the configured time.
9. **[AC-9] Nested Workflows**: The workflow must demonstrate the ability to trigger the existing `db-backup` workflow rather than reimplementing its logic.

## Glossary
- **Dreaming**: The collective name for nightly maintenance and reporting tasks.
- **Pruning**: The permanent deletion of old database records to prevent table bloat.
- **Stuck Workflow**: A workflow that has not updated its state for more than 1 hour despite being in a non-terminal status.
- **DataRoot**: The root directory for all persistent app data (managed by `DataRootResolver`).

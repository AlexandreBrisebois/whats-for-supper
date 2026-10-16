# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

### Requirement: Seed packaged demo workflow definitions at startup

Startup SHALL attempt to copy packaged YAML workflow definitions, including demo-capture and demo-restore when present, into the configured workflow root, replacing existing files of the same names. Missing packaged workflow directories or copy errors SHALL be logged without a successful-seeding guarantee.

#### Scenario: Packaged definitions available
- **WHEN** the packaged workflow directory contains demo definitions and copying succeeds
- **THEN** the target workflow root contains those definitions, replacing same-named files

#### Scenario: Definition source unavailable
- **WHEN** neither packaged workflow directory exists
- **THEN** startup definition seeding logs a warning and returns without copying definitions

### Requirement: Execute demo management workflows through their declared tasks

demo-capture SHALL execute its capture task; demo-restore SHALL execute restore followed by dependent reschedule. Successful capture and restore processor results SHALL contain message and member, recipe and search-document counts. Result persistence SHALL follow background-processing requirement `Persist returned processor results without clearing prior results on null`.

#### Scenario: Capture execution result
- **WHEN** the capture task completes successfully
- **THEN** its returned result reports Demo state captured. and the three core record counts

#### Scenario: Restore execution result
- **WHEN** the restore task completes successfully
- **THEN** its returned result reports Demo state restored. and the three core record counts

#### Scenario: Startup seed meaning
- **WHEN** automatic demo seeding accepts a workflow
- **THEN** it schedules restoring the existing snapshot rather than creating sample members or recipes

### Requirement: Read latest management workflow diagnostics

GET /api/management/status SHALL select the newest created instance among db-backup, db-restore, db-disaster-recovery, demo-capture and demo-restore. When found, it SHALL return its identity, workflow type, persisted status and timestamps, plus the newest updated completed-task result with a nonnull stored result, if present.

#### Scenario: Latest management selection
- **WHEN** several selected management workflows exist and status is read successfully
- **THEN** the newest by createdAt is returned even if it differs from the caller's earlier taskId

#### Scenario: Completed task result
- **WHEN** the selected instance has completed tasks with stored results
- **THEN** result is taken from the newest updated such task, which can be reschedule rather than restore

### Requirement: Report snapshot-file and cron diagnostics with management status

A successful management status response SHALL report demoSnapshotReady and demoSnapshotMissing from presence of the four required core files. It SHALL report demoRestoreSeederHealthy from cron validity and demoRestoreSeederErrorCode as INVALID_CRON when invalid or null when valid. These fields SHALL NOT certify asset integrity or successful startup seeding.

#### Scenario: Missing core snapshot
- **WHEN** status finds a management instance but required core files are missing
- **THEN** demoSnapshotReady is false and demoSnapshotMissing lists absent required filenames

#### Scenario: Valid cron with missing snapshot
- **WHEN** cron is valid while required files are absent
- **THEN** demoRestoreSeederHealthy is true and its error code null independently of demoSnapshotReady

#### Scenario: Invalid restore cron
- **WHEN** status finds an instance and cron calculation fails
- **THEN** demoRestoreSeederHealthy is false and its error code is INVALID_CRON

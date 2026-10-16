# Spec Delta

## Purpose

Describe existing application data export, reconstruction and operational recovery with explicit partial-failure and asynchronous boundaries.

## ADDED Requirements

### Requirement: Accept ordinary management requests through household access

Management operations SHALL apply the household-identity requirement “Authenticate protected API requests independently”. Successful ordinary workflow acceptance SHALL return HTTP 202 with a flat message and taskId identifying the accepted workflow instance.

#### Scenario: Backup acceptance
- **WHEN** an authenticated POST /api/management/backup successfully accepts db-backup
- **THEN** the response contains message “Backup task enqueued.” and the accepted instance identity as taskId

#### Scenario: Restore acceptance
- **WHEN** an authenticated POST /api/management/seed successfully accepts db-restore
- **THEN** the response contains message “Restore task enqueued.” and the accepted instance identity as taskId

#### Scenario: Recovery acceptance
- **WHEN** an authenticated POST /api/management/disaster-recovery successfully accepts db-disaster-recovery
- **THEN** the response contains message “Disaster recovery task enqueued.” and the accepted instance identity as taskId

### Requirement: Keep management acceptance separate from recovery completion

Management acceptance SHALL use the background-processing persisted lifecycle and automatic retry rules. A successful HTTP acceptance SHALL identify accepted work without asserting that export or recovery side effects have completed.

#### Scenario: Accepted work
- **WHEN** a management request returns its accepted instance identity
- **THEN** later workflow/task state remains independently observable through the shared background-processing lifecycle

### Requirement: Project the latest selected management result

When the latest selected management instance is an ordinary management workflow, GET /api/management/status SHALL return its instance identity as workflowId, workflowType, status, createdAt and updatedAt, with the most recently updated completed task result that is non-null, or a null result.

#### Scenario: Completed result
- **WHEN** the selected ordinary instance has multiple completed tasks with non-null results
- **THEN** the response result comes from the most recently updated such task

#### Scenario: No completed result
- **WHEN** the selected ordinary instance has no completed task with a non-null result
- **THEN** the response result is null

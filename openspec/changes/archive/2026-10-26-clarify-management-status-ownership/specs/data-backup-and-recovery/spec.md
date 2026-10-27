## MODIFIED Requirements

### Requirement: Project the latest selected management result

GET /api/management/status SHALL select the newest created instance among db-backup, db-restore, db-disaster-recovery, demo-capture and demo-restore. When found, it SHALL return its instance identity as workflowId, workflowType, persisted status, createdAt and updatedAt, with the most recently updated completed task result that is non-null, or a null result.

#### Scenario: Completed result
- **WHEN** the selected ordinary instance has multiple completed tasks with non-null results
- **THEN** the response result comes from the most recently updated such task

#### Scenario: No completed result
- **WHEN** the selected ordinary instance has no completed task with a non-null result
- **THEN** the response result is null

#### Scenario: Latest management selection
- **WHEN** several selected management workflows exist and status is read successfully
- **THEN** the newest by createdAt is returned even if it differs from the caller's earlier taskId

#### Scenario: Completed task result
- **WHEN** the selected instance has completed tasks with stored results
- **THEN** result is taken from the newest updated such task, which can be reschedule rather than restore

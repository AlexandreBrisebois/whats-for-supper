# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

### Requirement: Accept demo snapshot restore as background work

An authorized POST /api/management/demo-restore SHALL trigger demo-restore with empty parameters and return 202 containing message Demo restore task enqueued. and taskId identifying the accepted workflow instance. Accepted work SHALL use background-processing lifecycle requirements rather than imply completed restore.

#### Scenario: Restore accepted
- **WHEN** shared household authorization and workflow acceptance succeed
- **THEN** 202 returns the restore enqueue message and instance identity

#### Scenario: Missing snapshot at acceptance
- **WHEN** demo snapshot files are absent but orchestration accepts demo-restore
- **THEN** the action returns acceptance; snapshot validation occurs during execution

### Requirement: Check core snapshot presence before destructive restore

Demo restore SHALL require manifest.json, family-members.json, recipes.json and recipe-search-documents.json before deleting active database state. Missing required files SHALL fail execution before deletion. Core JSON deserialization SHALL occur before the deletion transaction.

#### Scenario: Required artifact absent
- **WHEN** restore executes with one or more required core snapshot files absent
- **THEN** execution fails with a missing-or-incomplete snapshot error before active data deletion

#### Scenario: Malformed core JSON
- **WHEN** a required core data file cannot be deserialized
- **THEN** execution fails before beginning destructive database replacement

### Requirement: Replace supported core state during successful restore

For a valid compatible snapshot, no concurrent writes and active recipes without soft-deleted-row conflicts, successful restore SHALL replace members, active recipe rows and search documents with captured core records. Database replacement SHALL commit before recipe-file replacement. A database replacement exception SHALL attempt transaction rollback and propagate failure.

#### Scenario: Restore captured records
- **WHEN** supported core replacement and subsequent file copy complete successfully
- **THEN** captured members, recipe facts and search documents are restored and temporary members are absent

#### Scenario: Database replacement fails
- **WHEN** an exception occurs within the replacement transaction
- **THEN** rollback is attempted and execution fails without advancing to recipe-file replacement

### Requirement: Clear transient activity when restoring core state

Without concurrent writes, on successful database replacement demo restore SHALL clear recipe import reports, recipe votes, weekly plans and calendar events rather than restore them from the snapshot. Clearing weekly plans SHALL also remove the grocery state and items stored within those rows.

#### Scenario: Activity cleared
- **WHEN** restore successfully commits after votes, reports, weekly plans and calendar events have accumulated
- **THEN** those collections are empty at that commit, before subsequent concurrent activity

#### Scenario: Grocery state cleared with plans
- **WHEN** weekly plans contain stored grocery state and items when restore commits
- **THEN** the removed plans no longer retain those grocery values

### Requirement: Retain active workflow instances during activity clearing

During successful demo restore, workflow instances whose status is neither Pending nor Processing SHALL be removed with their tasks. Pending and Processing instances SHALL remain eligible under shared background-processing rules; restore SHALL NOT cancel or quiesce that active work.

#### Scenario: Remove nonactive history
- **WHEN** restore processes Completed, Failed or Paused workflow history
- **THEN** those instances and their related tasks are removed when database replacement commits

#### Scenario: Keep active work
- **WHEN** Pending or Processing instances exist during restore
- **THEN** restore does not remove those instances as stale history or cancel their processors

### Requirement: Replace active recipe files after database commit

After core database replacement commits, successful demo restore SHALL replace the active recipe-root files with recursively copied snapshot recipe files at their relative paths. This boundary SHALL NOT promise rollback of committed database state when file replacement fails.

#### Scenario: Files restored
- **WHEN** the snapshot recipe directory exists and post-commit file replacement completes
- **THEN** active recipe files correspond to the copied snapshot files, replacing prior destination files

#### Scenario: File replacement fails
- **WHEN** an I/O exception occurs during post-commit file replacement
- **THEN** execution propagates failure after the database has already committed, without automatic database compensation

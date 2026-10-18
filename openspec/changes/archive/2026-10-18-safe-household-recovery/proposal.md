# Proposal

## Why

Issue #244 requires household recovery that reproduces a complete saved snapshot with media. At the stacked #281 baseline, ordinary export still retains stale member values and recipe content and skips empty plan/calendar exports; this is source evidence, not a production-loss claim.

## Outcome and Scope

Deliver the agreed #244 scope on a review branch based on verified main after the user merged #281. The owner selected online operation. Independent exact snapshots and staged restoration coordinate cooperating HTTP/background writes while the app remains running; whole-set preflight precedes mutation and journal/commit identity makes publication recoverable.

## What Changes

- Refresh current member values and membership, recipe content, plans and calendar exports including empty state.
- Round-trip quoted multiline ingredient categories with invariant numeric formatting.
- Add an independent versioned recovery set with actual media inventory and hashes, whole-set preflight and explicit exact restore, distinct from intentional merge/import.
- Define interrupted publication/restore and retry behavior and qualify it against disposable PostgreSQL and file roots.
- Preserve version-1 aggregate history, empty/absent semantics, stale-round invalidation and affinity rebuilding. Permanent purge removes recipe history; no #264 retention work.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `data-backup-and-recovery`: freshness, independent snapshot verification and recoverable exact restoration.

## Impact

Existing ownership: ManagementService, LocalRecipeStore, history partial, PostgreSQL mappings and management regression tests. RecoveryController, RecoverySnapshotService, PostgreSQL coordination, generation resolution and journal reconciliation own the online exact path. User documentation and recovery specifications accompany each implemented slice. No merge, deployment, production restore, provider/account setup, history UI or individual history records.

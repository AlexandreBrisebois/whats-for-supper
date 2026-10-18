# Design

## Context and Existing Ownership

ManagementService.BackupAsync writes in-place exports. Its append-only member helper also serves the existing attribution-repair operation, so that helper must not change. Recipe serialization already excludes retired fields. LocalRecipeStore owns metadata and media file access. The history partial owns the version-1 sidecar and restore invalidation.

## Decisions and Tradeoffs

First implement only settled freshness corrections: replace the member file from an AsNoTracking query, always serialize included recipe content, always write planning arrays, and read category CSV as logical records with invariant confidence. Preserve the existing recipe eligibility predicate and merge semantics. A version-1 recipe-content marker distinguishes the database envelope from raw legacy JSON; its shared decoder serves merge restore and the existing SyncRecipe processor so repeated restore/sync does not nest metadata or lose ingredients. Do not mistake these in-place corrections for staged independent recovery. No media deletion or unrelated metadata cleanup is included in this slice.

Pending essential decision for subsequent slices: offline operator command versus online backup/restore. Proposed minimal default is explicit offline operation and an operator-supplied destination outside live roots, with no accounts, provider or schedule. Offline exclusion must prevent API/workers from overlapping capture/restore; online operation instead requires a shared write boundary across file writers. Do not implement either branch until resolved. No dependent exact-recovery task breakdown is approved by this document.

## First Observable Slice

Integration tests invoke ManagementService against the existing isolated fixture database and real temporary recipe store, export twice after changes/deletions/empty transitions, and inspect bytes. Category tests restore multiline and decimal-culture exports into an emptied disposable fixture. Existing history/demo regressions remain required. These tests do not prove PostgreSQL or disk-loss recovery; subsequent exact recovery requires both.

## Compatibility, Rollout and Reversal

Ordinary merge continues to preserve absent legacy history and unrelated target rows; explicit empty history still replaces aggregates. Export updates are automatic whenever the existing backup workflow runs, and are documented with the existing controls. Existing endpoint acceptance and status contracts remain unchanged. The legacy member-attribution repair stays append-only.

## State, Concurrency and Recovery

This first slice retains the existing VotingBoundary and recipe-table lock. It makes no whole-set publication or cross-store atomicity claim. The remaining #244 acceptance includes full membership/media validation, independent verified publication, interruption/resume, version compatibility and nonempty/fresh PostgreSQL round trips. It remains unimplemented and must not be archived as complete.

## Online decision (supersedes pending/offline paragraphs above)

The owner selected online operation. Exact recovery uses separate authenticated management endpoints; existing merge and attribution-repair endpoints keep their semantics. `Recovery:BackupRoot` is an operator-configured absolute directory outside both live roots; no storage provider or credentials are provisioned. A second directory on the same device is not disk-loss protection.

A PostgreSQL advisory boundary spans HTTP operations and background processors across cooperating application instances. Ordinary reads retain availability during snapshot copying. Existing writes drain; new writes wait only a bounded interval and receive an explicit retryable busy response if the lease cannot be acquired. Snapshot duration is bounded and cancellable; expiration leaves prior published snapshots intact. Restore validates and copies into an inactive generation while the app continues operating. Only final publication coordinates reads and writes. Health/recovery status remain accessible. In-flight work drains before replacement; work queued against the superseded state is invalidated, not replayed into the restored household. Direct database/filesystem editing and mixed application versions are outside this cooperating boundary.

Exact version 1 covers every row (including explicit empty tables and soft-deleted recipes) in family_members, feature_flag_overrides, recipes, recipe_import_reports, weekly_plans, calendar_events, family_settings, ingredient_categories, and aggregate weekly history. Permanent purges are absent, including their history; no purge tombstones are added. Workflow execution, live votes/round identities/continuations and computed search data are not portable facts. Restore invalidates their old generation and rebuilds derived affinity/search. The complete version-1 history sidecar remains mandatory in exact snapshots; legacy omission is accepted only by existing merge/import behavior.

Snapshots contain typed PostgreSQL row arrays, schema compatibility identity, history version/generation, and an inventory of actual recipe media bytes with length/SHA-256. Inventory belongs only to recipe IDs in the snapshot; stale directories and derived search sidecars are excluded. Metadata is regenerated from authoritative rows. Expected originals/page counts, PDF source and hero expectations are checked; missing required bytes fail capture. Whole-set validation checks paths/symlinks, inventory equality, hashes, format versions, row shapes/identities/constraints and relationships before any live mutation. PostgreSQL temporary staging tables permit database-native type/constraint validation without changing live rows.

Recipe files publish through an inactive generation beneath the configured recipe root, so mounted roots need not be renamed. A durable journal records the old/new generation and operation ID before pointer publication. The same operation ID commits with restored database facts. A restart/retry compares the committed ID to reconcile the pointer: commit selects the new generation; rollback selects the old generation. A database transaction alone is not cross-store atomicity. Until reconciliation succeeds, household operations fail closed while recovery status/resume remain accessible. Staged copies and the prior generation remain recoverable through interruption. All roots and journal paths are controlled by server configuration, never arbitrary request paths.

Failure tests must cover before/after staging, pointer publication, database commit, cleanup, cancellation and retry; concurrency tests must prove overlapping media/database writes cannot split a snapshot and superseded workers cannot overwrite a restored generation. Disposable PostgreSQL and file roots are required. No production restore is authorized by this implementation task.

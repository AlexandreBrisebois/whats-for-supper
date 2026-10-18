# Online exact household recovery

Exact recovery restores a saved household snapshot, including explicit empty collections and absence of permanently deleted recipes. It is separate from intentional merge/import (`POST /api/management/seed`) and the attribution-repair operation. Existing scheduled in-place exports are not independent exact snapshots.

## Configure independent storage

Set `Recovery:BackupRoot` (`Recovery__BackupRoot` as an environment variable) to an absolute, writable directory outside both `DataRoot` and the configured recipe root. Ancestor/descendant paths and symbolic links are rejected. Provisioning or mounting storage is an operator responsibility; this feature creates no account, credentials, provider or automatic backup schedule. Use a different failure domain, such as an independently backed-up mounted device, for disk-loss protection. Another directory on the same disk does not protect against disk loss.

Exact publication currently requires the Linux storage host used by the application containers, with working file and directory `fsync`. Unsupported hosts/filesystems fail rather than silently claiming durable publication.

All API instances sharing a household must run this version with matching recovery configuration and shared file roots. PostgreSQL advisory leases coordinate requests and background processors across those instances. Direct SQL/file edits and older application instances do not participate; do not use them during recovery operations.

## Controls and operation results

Use the existing authenticated API access mechanism for these endpoints:

| Operation | Endpoint | Result |
| --- | --- | --- |
| Capture | `POST /api/management/recovery/snapshots` | `200` only after a complete independent set is published; retain `snapshotId` |
| Exact restore | `POST /api/management/recovery/restore/{snapshotId}` | Validates the entire saved set, then replaces supported household state |
| Status | `GET /api/management/recovery/status` | Reports availability or reconciliation required, plus the last committed restore's snapshot ID |
| Resume | `POST /api/management/recovery/resume` | Reconciles an interrupted publication; safe to repeat |

These operations are synchronous. Request acceptance alone is not success. Snapshot directories use the returned UUID without hyphens. Keep their contents together and unchanged; the manifest inventories every required artifact with length and SHA-256. Published snapshots are immutable to the application; a failed new capture does not replace an older snapshot. Operators control retention and copying to another device. An older explicit backup remains an older snapshot until the operator removes it; permanently purged recipes/history are absent from live state and subsequent snapshots.

`400` rejects invalid/incompatible content before live mutation. `409` means another recovery operation or unresolved journal needs attention. Household requests that cannot enter the coordination boundary return `503` with `errorCode: RECOVERY_BUSY` and `Retry-After: 5`; they have not run their controller mutation. Recovery `503` reports configuration or timeout problems. If a connection fails during restore, inspect status/resume before retrying: commit may have succeeded even when a response was lost.

## Availability while operating

The app stays running. Capture drains in-flight writers and coordinates new writes while copying the coherent set; ordinary reads continue. Restore performs copying and full validation while normal operations continue, then briefly coordinates household reads and writes for publication. Long-lived SSE connections remain open; their initial database snapshot participates in read coordination. Health and recovery status remain available. Refresh clients after exact restore to replace their cached household view.

`Recovery:WaitSeconds` defaults to 5 (range 1–60): this bounds waiting for a lease before returning busy. `Recovery:MaxFreezeSeconds` defaults to 30 (range 1–3600): this limits capture and the cancellable part of restore publication. A larger library may require a deliberately larger operator setting. I/O cancellation is cooperative; database commit and journal reconciliation finish or fail closed rather than aborting an unknown commit outcome. Do not assume a particular storage device can copy within the default interval.

Existing requests/workers finish before publication. Queued work against superseded recipes is marked failed instead of running into restored state. Existing recurring Dreaming and demo schedules remain scheduled and operate on the new state. Search repair is durably queued in the restore transaction and uses the existing bounded reconciliation batches. Import-report execution links are cleared; a report that was reimporting becomes reimport-failed with an explicit retry explanation. Unfinished capture/AI jobs are not replayed from the snapshot: unavailable recipes retain their saved facts/media; use existing reimport controls where further processing is needed.

## Authoritative coverage and compatibility

Version 1 requires every supported table as an explicit array, including empty arrays: family members/preferences, feature-flag overrides, recipes (including notes, ratings and soft deletion), import reports, weekly plans/grocery state, calendar events, family settings, ingredient categories, and weekly household-interest aggregates. It includes the complete version-1 history sidecar, including explicit empty history. It copies actual original images, PDF sources/pages and hero images belonging to those recipe IDs. Expected original/page counts are verified; present PDF/hero bytes are inventoried and hashed. No byte can be reconstructed if it was already absent before capture and has no recorded presence expectation: operators must investigate missing source assets rather than assume row counts prove their existence.

Workflow execution, live votes, round/continuation identities, and computed search/affinity are not portable household facts. Exact restore invalidates old round identities and all search continuations, rebuilds affinity, discards stale search sidecars, and queues fresh search reconciliation. Soft-deleted recipes retain required history dependencies; a permanently purged recipe has no row/history tombstone. A new snapshot excludes stale directories for absent recipe IDs.

Exact version 1 accepts only matching supported table schema/constraints and complete verified inventory. It validates types, keys, native constraints and foreign keys in temporary PostgreSQL tables before changing live rows. For an incompatible schema, use the matching application version or migrate a separate copy through an explicitly supported conversion; do not edit a manifest to bypass validation. Legacy in-place exports are merge-only and cannot be interpreted as complete exact snapshots. Ordinary missing-history preservation, explicit-empty history replacement, and demo missing-history clearing remain unchanged.

## Interruption and recovery

Restore stages a new recipe generation beneath the configured recipe root. A durable journal records the old/new generation before activation; a publication ID commits in the same database transaction as restored facts. Reconciliation reads that database ID to select the committed generation or roll the file pointer back. This is a recoverable boundary, not a claim that a database transaction makes file changes atomic.

The background reconciler retries every five seconds when a journal remains. Until reconciliation succeeds, household operations fail closed; status and explicit resume remain available. Do not delete the journal or generations to force access. After successful publication, the superseded live generation is removed; independent saved snapshots are unaffected. A process killed before journaling can leave an inactive staging directory (`.pending-*` in backup storage or an unreferenced `.recovery-generations` directory). Those are not published snapshots. Remove abandoned staging only after confirming no recovery operation is running and that the directory is neither active nor journal-referenced.

Qualification uses disposable PostgreSQL databases and file roots, including removal of the original root and deterministic interruption states. It is not a production restore or a power-cut test of the operator's device, network filesystem, durability guarantees or independent backup destination. Verify a copied snapshot on disposable infrastructure before relying on it for household recovery.

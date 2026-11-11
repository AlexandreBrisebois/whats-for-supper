# Design

## Context and Existing Ownership

Current `ManagementService`, `RecipeExportContent`, `SyncRecipeProcessor`, `RecipeRepository` and online recovery owners span database, disk/media and durable workflows. Existing ordinary restore supports legacy arrays and missing artifacts; several main requirements must change together. Recipe-only fallback must not invoke general seed/disaster recovery unchanged because those owners also mutate household data.

The implemented foundation includes `CanonicalRecipeContentStore.ConvertAsync`,
the current recipe codec, `ManagementService.CanonicalBackup` and guarded
publication-backed seed/sync. Existing conversion and publication PostgreSQL
tests establish bounded behavior; they are not an operator batch entry point.
`ManagementService.CurrentRecovery` exposes inspection/preflight, not activation
of its complete staged inventory. The existing exact snapshot/recovery owner is
also reusable and distinct from ordinary merge. Local existing-operation evidence
is recorded in `.task/canonical-existing-flows-20261110/outcome.json` against its
own candidate; current release qualification remains open.

## Decisions and Tradeoffs

Default in-place preserves live recipes and stable IDs. Capture source/current facts and protected hashes, convert only proven associations with one owner per recipe and publish atomically guarded. Ambiguous trusted measurements that cannot be represented safely keep legacy read access until manual reconciliation; do not erase them for a migration completion percentage.

Current-format ordinary merge and explicitly selected exact replacement are separate. Version and timestamps cannot establish precedence. An old backup is unsupported, not implicitly convertible inside restore. The one-time forward importer accepts only its manifest's input list; legacy source readability during this process does not promise continued old-backup support. Existing historical voter privacy, extras, report state and preparation/serving recovery remain intact.

Baseline recovery covers the final persisted portions, binding, check and household
contracts. It preserves every food/category reference already present, without
requiring adoption of the deferred bilingual catalogue. A null mapping remains
null; a present mapping requires its referenced meaning to survive offline recovery.
No translation, catalogue ingestion or speculative identity merge occurs during
conversion or restore. Workstream C can inventory and exercise existing recovery
now; final binding round-trip acceptance waits for workstream B's persisted contract.
Changes to the shared canonical store/publication hooks are coordinated with their
workstream A owner rather than edited by competing writers.

## Existing operations own canonical backup and seed

Dreaming’s db-backup step invokes BackupDatabase and the same `ManagementService.BackupAsync` as POST `/api/management/backup`. POST `/api/management/seed` invokes `RestoreAsync`; evolve these owners to write/read the existing version-2 canonical recipe codec. Keep the existing disk layout and management routes. Any necessary format/integrity inventory is internal to these operations, not a second recovery API or user-facing package. Whole-installation database plus asset backup remains a separate protection against disk loss and migration rollback.

Preflight canonical input before household mutation. New destination recipes retain exported IDs and exact canonical content; repeated identical seed is idempotent. A divergent current destination is not authority to overwrite newer human facts: preserve it and report conflict unless the existing captured revision/publication owner proves authority. Sync remains recipe-only and uses captured input, revision guards and durable publication/retry ownership; it must never invoke household seed or infer permission from timestamps. Legacy readability before activation is not a promise of permanent old-backup support; cutover remains fenced until the current-only boundary is qualified.

## First Observable Slice

The next operational tracer is disposable PostgreSQL plus copied recipe/media
store → no-write selected-ID manifest → invoke the existing guarded converter for
one four-portion 1/3-cup recipe → interrupt/resume → independent read-back of exact
facts, stable IDs and protected household hashes. Unrepresentable content remains
usable and is reported as deferred. This establishes the missing invocation and
resume path without rebuilding the converter.

Then extend the already qualified edit → existing Dreaming/management backup →
seed into an isolated destination → compare → repeat seam to the final baseline
contract, including an ordinarily produced partial-step relationship when available.
Compare every canonical field, source/media hash, relationship and protected
household field. Keep seed merge distinct from whole-installation exact restore;
rehearse interrupted activation/commit and prove unsupported old format preflight
has zero writes before widening batches or enabling current-only cutover.

## Compatibility, Rollout and Reversal

Frontend, backend and database are deployed together as one coordinated release,
as confirmed by Alex. Do not add an independent rolling-version compatibility
program or legacy string-write translation. Already-open older tabs remain possible:
reject their incompatible canonical writes atomically and retain recoverable drafts
through refresh and reconciliation. Unconverted recipe readability and current-app
review-material editing are data-transition behavior, not support for old app versions.
The deployment unit includes its schema migration; durable older workflow results
still need captured-revision validation before they can publish.

Planned downtime is accepted. Reuse `RecoveryBoundary`,
`RecoveryBoundaryMiddleware`, `WorkflowWorker` participation and the existing
`RecoverySnapshotService` durability/reconciliation owners used by the demo loop
and online recovery. Their source establishes cross-process PostgreSQL leases,
bounded busy responses and interrupted-publication reconciliation; it does not
already qualify a schema deployment across process restarts. Determine the smallest
reuse needed to hold writes/workers across shutdown/startup, preserve a verified
pre-upgrade recovery point, publish the coordinated release, read back its state
and reopen only after required checks pass. Measure the maintenance interval in
rehearsal. Reuse applicable client refresh behavior while retaining upgrade drafts;
do not invoke demo baseline replacement, activity clearing or draft-discard policy.

Use [rollout](../canonical-ingredient-correction/rollout.md). All old writers, workers, background sync and tabs must be fenced. Export unsaved drafts locally through the supported upgrade route before refresh; old full editor payloads with ingredients cannot masquerade as unrelated updates. Prepared counts, dates, history, family members, votes, assignments, human rotation/discoverability and grocery-extra lineages are protected.

Alex confirms there will be no active grocery list during update; the next recipe-derived list is new. Do not migrate old name-level checks or infer individual row intent. New recipe rows start unchecked without demand baselines. Preserve historical lists/check maps and extra occurrences/history, with extras retaining their existing lifecycle. No active-check conversion decision or special shopping acknowledgement UI is needed. Unexpected active-list evidence stops assessment for reporting, not automatic deletion.

A verified independent pre-cutover snapshot plus exact old executable/schema is the emergency rollback pair. After new writes, simply rolling back an image is unsafe; choose compatible full-state recovery or forward fix. Fresh current-format backup after conversion is separately read back and verified before routine operations resume; it cannot protect the migration interval retroactively.

### Slice 1 persistent maintenance hold

The user extended 3.1 beyond assessment after preflight proved session leases alone
could not retain maintenance intent. `RecoveryBoundary` now recognizes
`.maintenance-hold.json` in `RecipesRootResolver.BaseRoot`, outside generation
folders. Any entry, including malformed/unreadable content or a directory, enables
coordination and blocks Write and Publish after the existing publication lease.
Read/Snapshot remain available; restore publication cannot bypass the hold. There
is no automatic timeout or parsing-based release. Existing startup activation uses
Write, so the process stays unavailable until explicit operator reopening; no
startup bypass or new public recovery API is introduced.

Operator creation acquires the existing exclusive publication lock in the actual
API database, drains writers, verifies the single-instance/data-mount boundary,
stops the old API while retaining the lease, writes/syncs the marker atomically and
reads it back. This order protects first activation with an older binary that does
not understand the marker. Exact operation/candidate identity, stopped sharing
containers and verified read-back are prerequisites to removal under the same lock.
Privileged schema tools remain coordinator-controlled while application processes
are stopped. Startup and deployed acceptance follow release; initiation is not success.

This is maintenance support, not library conversion or task 3.1 completion. Slice 1
retains the legacy library and existing volumes. Selected-ID conversion, full
protected-field/synthetic fixtures, stale-tab drafts, current-format full recovery
and grocery cutover retain their original requirements and task IDs.

## Conditional Disk Fallback

Only if in-place assessment establishes a concrete unresolvable blocker, prepare recipe-only fallback. Inventory both disk/live versions, IDs, source/media and field ownership; preserve input copies independently. No delete-all, auto-created missing IDs, soft-delete resurrection or purging database-only recipes. Household state, notes/rating/manual flags, attribution, creation/deletion, occurrences and relationship IDs stay untouched. Stage selected recipe fields only; revision-guard publication and durable derived rebuild. Record converted/deferred entries and resume input/output identities. For fallback, compare disk and database by stable recipe ID before publication; report unexpected content or membership mismatches and stop rather than choosing a winner.

Alex reports no recipe edits through the UI and says Dreaming has kept disk and database in sync. Treat matching recipe IDs/content as the expected case and verify it, allowing only documented representation differences from conversion. If an ID is missing on either side or supported recipe facts unexpectedly differ, stop/report the fallback before mutation rather than silently replacing content. No elaborate per-recipe edit-conflict workflow or general disk/live precedence selector is required solely for hypothetical UI edits. Keep revision guards against actual concurrent changes, input preservation and household protections. A timestamp is not evidence of equality. Do not overwrite source files before independent preservation and validation.

## Operational Diagnosis

Separate conversion status, committed facts, pending derived rebuild and completed verification. Record no sensitive raw recipe/provider payload in routine logs. A failure preserves prior usable content; a conflict is neither empty success nor forced replacement. Test current-format merge stale/divergent content, identical revision with different bytes, crash/restart, stale work, mixed old clients and media publication gaps before release.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).

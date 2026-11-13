# B migration executor and once-only week reset: plan for approval

Plan only. No executor/reset code, schema changes, activation or DV writes. Depends on reviewed migration manifest4 (actual PG3 green 3fb11a21), Root maintenance capability, and complete A recovery acceptance before operational rehearsal.

## Proposed bounded ownership

B five new files after shared receipt/interface approval:
- Services/CanonicalRecipeContentStore.MigrationExecution.cs: internal invocation/resume on existing converter owner; calls existing ConvertAsync, never copies its derivation/replay/guard implementation.
- Services/GroceryRecomputeService.Migration.cs: internal per-week method, existing ProcessWeekAsync transaction/locks and private RecomputeOwnedAsync reused.
- Services/CanonicalRecipeMigrationReceipt.cs: single closed, versioned receipt codec/identity/lookup owner, shared with A typed reference extraction by agreement.
- Tests/Services/CanonicalRecipeMigrationExecutionTests.cs and Tests/Integration/CanonicalRecipeMigrationExecutionPostgresTests.cs.

Root applies the sole shared `partial` keyword to GroceryRecomputeService.cs. Shared MaintenanceCommandLifecycle.cs addition, if required, stays with Root/current owner: expose an internal validated retained-command observation through its existing closed decoder, rather than B duplicating its private envelope. No Management worker routing, public endpoint, new converter, table or generic family_settings state. A owns typed recovery/history/reference registration, coordinated only after Root approves payload below.

## Capability and identities

Internal entry takes immutable inventory plus Root-issued revocable invocation context inside RunMaintenanceAsync(operationId, candidateCommit40, markerSha256, callback, ct). Exact callback/context type and method remain Root-owned/frozen prerequisites. Context must validate actual marker, maintenance hold, operation, runtime candidate artifact identity, and revocation before each recipe operation and again inside each week transaction after its lock, immediately before any mutation. No B-created context, marker bypass, detached/background task, public route or Snapshot-to-write inference.

Manifest CandidateSha256 is exact build/image/source artifact SHA256 (64 hex); capability candidateCommit40 is Git commit identity. Retain both; Root CLI must verify actual executing assembly/image/artifact against manifest, never infer the 64-byte domain from commit40. Keep schema/model/vocabulary document references distinct. Bind actual A-inspected source snapshot ID/manifest/index hashes and nullable generation; complete immutable manifest observation hash; exact selected recipe IDs/per-recipe operation IDs/revisions; exact week set with stored-plan/assignment reasons. No timestamp or count grants eligibility.

## Concrete proposed inert receipt schema (freeze before code)

Use maintenance_commands with CommandType `canonical-recipe-migration-receipt-v1`, Status `completed`, Attempts=1, RequestedBy=null, ScheduledFor=null, LastError=null, and actual CreatedAt/StartedAt/CompletedAt from the commit clock. Status certifies only this receipt was durably recorded, not whole-campaign completion. Never pending/processing/failed executable queue states.

Payload is closed JSON, all properties required (nullable fields explicit):
```
{ version:1, executionDisposition:"inert", phase:"plan"|"week",
  operationId:D, manifestSha256:64, candidateArtifactSha256:64, candidateCommit:40,
  schemaSha256:64, modelRevision:string,
  sourceSnapshot:{snapshotId:D,manifestSha256:64,vocabularyIndexSha256:64,generation:N|null},
  liveGeneration:N|null,
  references:[{revision:string,sha256:64}],
  recipes:[{recipeId:D,operationId:D,contentRevision:string,sourceRevision:string,originalFieldsSha256:64}],
  weeks:[{weekStart:YYYY-MM-DD,receiptId:D,storedPlanIds:[D],assignmentIds:[D]}],
  weekStart:YYYY-MM-DD|null, requestSha256:64 }
```
Canonical ordering, exact formats, unique IDs/dates, nonempty references/revisions where required, immutable full membership, and phase/week closure required. Unknown/missing/duplicate/altered properties fail closed. Request hash covers all preceding fields. Null content/source observations are not guessed into strings: unsupported/missing/defer/conflict selected facts stop first mutation and return an honest report; schema above is only issued for independently admitted selected conversion inputs.

Plan receipt Id = manifest.Request.OperationId, phase plan, weekStart null. Proposed week receipt ID is a versioned deterministic identity from SHA256 UTF8(`wfs/canonical-migration/week-receipt/v1` + NUL + operationId D + NUL + ISO Monday): first 32 lowercase hex parsed as Guid N. Freeze algorithm with Root before code. An existing live/retained ID whose entire binding differs is a conflict; never replace it. Plan receipt lists all derived IDs before work, so resume cannot allocate replacement IDs. A Root-supplied retained week-ID list is an acceptable alternative if preferred, but must be frozen in the same plan binding before any work.

Result is closed JSON with version1/executionDisposition inert/requestSha256 and outcome. Plan outcome `plan-retained` carries no success claim. Week outcome `week-reset-committed` additionally retains exact weekStart, planId, listVersion, resetEpoch=operationId N, committed row/demand/check/baseline digests and protected week digest. These are historical committed facts; a done-week replay must not demand that later human checks equal historical cleared checks, and must never restore them from this result.

## Required retained lookup (durability across pruning)

ManagementService only executes pending rows; unknown types become skipped. Completed receipts are inert without adding any worker command. However existing PruneMaintenanceCommands archives completed/skipped rows after30days into MaintenanceCommandLifecycleRecords and removes the live row. Therefore lookup must cover both live command and existing validated retained lifecycle payload.

Propose a single receipt reader: query command Id plus every lifecycle observation with that Id; existing MaintenanceCommandLifecycle owner validates outer closed payload/hash and actual workflow/physical closure first, then returns retained command observation for receipt codec. Treat lifecycle OperationId as pruning operation identity, never migration identity. Require matching command type/status/inert disposition/full payload+result and consistent copies. Missing/malformed/conflicting pruned proof blocks resume; no fallback reset. Add live/pruned/multiple-consistent/conflicting/forged controls and actual prune->later-check->resume PG. New receipt payload reference extraction must be explicitly registered with A; neither an unknown generic command nor its SHA alone certifies vocabulary closure.

## Transaction and resume sequence

1. Inside valid maintenance context, re-inspect actual source identity, exact artifact/schema/model/reference authority and complete protected manifest membership before first write. Compare every protected field/key/column/file. Only declared converter deltas, explicitly owned new command/journal receipts, and derived week fields may differ after validated prior progress; do not make CompareTables an authorization predicate. Changed/unsupported/unmatched/deferred inputs stop before any mutation.
2. Retain plan receipt atomically with its complete binding, after checking no conflicting live/retained ID. On resume revalidate exact same binding; no revised week/recipe set under old operation.
3. Invoke existing ConvertAsync for each selected recipe with its retained operation ID and exact baseline revisions. Existing V2 replay/guard is the only conversion owner. Stop on conflict. Crash after conversion but before later progress recording resumes via existing exact V2 operation; no reallocation. Validate full protected-state deltas against the converter's declared owner fields, preserving every plan/event/status/servings/prepared/cooked receipt/history/extra/original/media fact.
4. For each inventoried week, call existing groceryChecks.ProcessWeekAsync(monday,...,mutationId:weekReceiptId), retaining its transaction and advisory locks. Inside fresh callback DB, revalidate capability and lookup receipt under the transaction/lock. If valid completed live/retained week receipt exists, return recorded disposition WITHOUT recomputation, version bump, reset, SaveChanges or event publication. Later checks/baselines survive.
5. Only unfinished week: verify exact protected week/assignment membership and all selected conversion outputs. Reuse RecomputeOwnedAsync(fresh,monday,ct) to rebuild demand with existing quantity/package/contributor identities and authority. Then set every recipe row check false, checked-demand baselines empty; leave grocery extra occurrences/Checked/recurrence/removal/history fully untouched. Advance list version using existing Next owner to fence old tab mutations, set grocery reset summary to operationId N. Do not recreate row IDs or demand evidence through a second implementation. Serialize final checks using existing row state convention. Save final week fields AND completed week receipt in the SAME fresh DB transaction. Earlier internal SaveChanges in RecomputeOwnedAsync remains uncommitted until ProcessWeek commits; rollback leaves neither reset nor receipt.
6. Postcommit synchronize caller tracked plan through existing coordinator; any SSE is after commit and replayed done weeks do not emit fake changes. Failure of delivery does not roll back or repeat reset. Do not use an external progress file as the reset fence.
7. Revalidate all protected tables/keys/columns/files and every inventoried week's result for final report. No automatic reopening/activation; Root owns operator read-back, recovery/reversal and release.

## Meaningful RED then GREEN acceptance

Before logic: actual PostgreSQL tests must expose repeated reset after later human check; partial interruption after first week; mismatch before first write; crash rollback of reset plus receipt; completed unknown-command inertness; and prune->resume without reset. Include past/current/future stored-only and assignment-only weeks, old plan statuses/IDs, all event intent/servings/prepared/cooked/history and extra checked states preserved.

Pure controls cover exact manifest/artifact40-vs64/schema/model/snapshot/reference/recipe-op/week-set mismatch, duplicate/forged live/pruned receipts, invalid IDs/closed properties/statuses, and no eligibility from counts. Native controls include same operation changed request rejection, converter V2 replay preserving IDs, transaction failure before commit leaves both reset/receipt absent, crash after commit returns same receipt, later check/baseline preserved on replay, and existing ordinary recompute/locale behavior unchanged. No PG runs without serialized lease. Freeze precise five+shared dependency scope, before/after hashes, intended failures and stable zero-skip receipts for independent review. No code until Root approves shared receipt/context design.

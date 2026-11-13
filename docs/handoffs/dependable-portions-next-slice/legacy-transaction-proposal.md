# Legacy converter transaction seam: proposal only

No converter/receipt-v1 edits authorized by this proposal. Canonical-only atomic-week foundation remains separate; legacy assessment and full source/live coverage admission remain open. Existing Vocabulary.cs SHA2e4e88... already preserves prior evidence/name decisions for no-op conversion; no validator change proposed.

## Minimal single-owner seam

Keep public ConvertAsync behavior/signature, V1/V2 command/history formats and ordinary callers unchanged. Factor its current body once into a private core, with a nullable internal precommit callback. A new internal migration entry invokes that same core with the controlled receipt callback. No copied converter, ambient/nested BeginTransaction, caller transaction adoption, provider/model call or second recipe derivation.

Proposed internal shape, subject to Root freeze:
```
ConvertMigrationAsync(recipeId, expectedContentRevision, expectedSourceRevision,
    retainedRecipeOperationId, CanonicalMigrationConversionBinding binding, ct)
private ConvertCoreAsync(..., Func<CanonicalMigrationConversionEffects,CancellationToken,Task>? beforeCommit, ct)
```
Binding is immutable operation/manifest/assembly64/commit40/schema/model/source identity plus selected recipe op and exact initial protected observations. Effects is constructed by this existing owner from the actual locked before/after transaction, never supplied by caller. It contains actual V2 row/result and typed converter-owned sidecar, derived week, and constructed refresh-launch/task observations. Callback has no public route or generic executable command. Root maintenance invocation validates its revocable operation+actual assembly before entry and again before commit; wrapper enrolls RecoveryAccess.Write around the converter. Callback performs no Snapshot/Publish enrollment while recipe/supper locks are held.

The core preserves RecipeRotation.LockAsync(lockSupperInputs:true), exact revision/evidence guards, captured authority validation, candidate preparation before owner mutation, Invalidate/search-sidecar/EnlistWeeks and its current SaveChanges ordering. Invoke callback after all those owner effects and before its existing final commit. Callback retains the completed inert migration recipe receipt via the SAME DbContext/transaction, saves it, then core commits once. Any callback/protection/receipt failure rolls back recipe/V2/search/week/refresh/receipt together. A public ordinary ConvertAsync caller with null callback has exactly its existing behavior.

Migration replay must require BOTH exact validated V2 operation and matching retained live/pruned migration recipe receipt. Existing operation with absent/conflicting migration receipt is a conflict, never success or regenerated receipt. First-time legacy entry requires absent matching IDs. Crash after atomic commit resumes without allocating IDs/remapping; before commit leaves neither operation nor receipt. Ordinary V2 replay remains unchanged.

## Explicit future receipt dispatch

Do not widen frozen v1 plan/week codec implicitly. Propose separate `canonical-recipe-migration-receipt-v2` subtype with Version2 and phase recipe, while Root/A decide whether plan/week retain v1. Migration recipe receipt Id=retained selected recipe operation UUID. Validate all receipt command IDs (manifest op, recipe ops, derived week IDs) are distinct before writes. A registers this exact subtype in live/pruned typed references only after frozen codec review.

Payload repeats exact approved common immutable binding and additionally identifies recipeId, canonicalOperationId and observed before-content/source/evidence digests. Result contains complete typed converter-owned effects with before/after row hashes and exact IDs/keys; V2 original command/result is interpreted by its existing owner, not replaced by a hash-only proof. Exact referenced document revision+SHA closure is returned through the sole typed codec. Completed/inert status and actual completion clock retain the same durability rules as v1; no executable worker routing.

## Closed effect ownership

- Existing recipe membership unchanged. Permit only CanonicalContent, Ingredients, FoodMappingEvidence and UpdatedAt actually written by current legacy ConvertAsync; retain every other column, original/media/file, source URL/raw metadata/name/private notes and IDs. Unknown columns remain protected.
- Exactly one canonical_recipe_operations row with selected recipe/op IDs, existing closed V2 request/result/evidence interpretation and complete current six-column schema. No other operation growth or mutation.
- recipe_search_documents: exactly this recipe key; current owner may initialize its explicit default fields or set IndexStatus/EmbeddingStatus pending and EmbeddingFingerprint null. Every other field unchanged. No table-wide count-based exception.
- weekly_plans: only concrete weeks returned by EnlistRecipe/EnlistWeeks under the supper locks, each within full inventoried week set. Existing plans retain IDs/status/voting/notification/intent and all unknown columns; only exact serving derived fields written by Enqueue may differ. A newly materialized assignment-only week must have absent original membership, explicit observed new plan ID, default Draft/no voting/notification state and complete known owner schema; no new event or assignment.
- workflow_instances + workflow_tasks: only exact new `supper-grocery-refresh` closed constructed launch IDs linked by that week's ServingRefreshWorkflowId. Validate actual WorkflowOrchestrator.ConstructInstance/CaptureDispatchLaunch graph: parameter weekStartDate, sole refresh/RefreshSupperGroceries task, exact payload/dependencies, Pending state and original dispatch capture. Existing workflows/tasks/history remain exact. No arbitrary workflow/journal growth or timestamp-based origin inference.
- Every unlisted table/row/key/column and source/file must remain unchanged. The effect receipt is built in-owner from the same transaction and validated against these named resource rules; a generic supplied table-delta array is not authorization.

## Qualification before implementation/integration

First actual legacy PG RED must expose interruption between conversion effects and separate progress recording, missing/pruned/corrupt recipe receipt on V2 replay, and an unexpected protected/search/plan/refresh mutation. Then single-owner callback implementation and green: rollback neither recipe/V2 nor receipt on injected precommit failure; exact commit+replay with preserved original IDs/private facts; exact new assignment-only plan/refresh launch linked and retained; later human check never reset by already-completed week; mismatched recipe op/manifest/model/document/artifact/source rejects before mutation. Pure closed codec tests and native existing canonical/V1/V2/save/refresh baselines remain required.

Full executor must still independently compare A-owned validated source contents/protection projection with live complete baseline. An identity hash or unchanged live recapture is insufficient backup coverage. No operational migration, activation/DV, task closure or all-legacy acceptance follows from this proposal.

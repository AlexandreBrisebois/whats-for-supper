# Design

## Context and Existing Ownership

Current `ManagementService`, `RecipeExportContent`, `SyncRecipeProcessor`, `RecipeRepository` and online recovery owners span database, disk/media and durable workflows. Existing ordinary restore supports legacy arrays and missing artifacts; several main requirements must change together. Recipe-only fallback must not invoke general seed/disaster recovery unchanged because those owners also mutate household data.

## Decisions and Tradeoffs

Default in-place preserves live recipes and stable IDs. Capture source/current facts and protected hashes, convert only proven associations with one owner per recipe and publish atomically guarded. Ambiguous trusted measurements that cannot be represented safely keep legacy read access until manual reconciliation; do not erase them for a migration completion percentage.

Current-format ordinary merge and explicitly selected exact replacement are separate. Version and timestamps cannot establish precedence. An old backup is unsupported, not implicitly convertible inside restore. The one-time forward importer accepts only its manifest's input list; legacy source readability during this process does not promise continued old-backup support. Existing historical voter privacy, extras, report state and preparation/serving recovery remain intact.

## First Observable Slice

Disposable PostgreSQL plus copied recipe/media store → no-write manifest → convert one 4-portion 1/3-cup recipe with current edits and one partial step → current-format export/read-back → isolated exact restore. Compare every canonical field, source/media hash, relationship and protected household field; interrupt before/after commit and resume idempotently. Prove unsupported old format preflight has zero writes before widening batches.

## Compatibility, Rollout and Reversal

Use [rollout](../canonical-ingredient-correction/rollout.md). All old writers, workers, background sync and tabs must be fenced. Export unsaved drafts locally through the supported upgrade route before refresh; old full editor payloads with ingredients cannot masquerade as unrelated updates. Prepared counts, dates, history, family members, votes, assignments, human rotation/discoverability and grocery-extra lineages are protected.

Alex confirms there will be no active grocery list during update; the next recipe-derived list is new. Do not migrate old name-level checks or infer individual row intent. New recipe rows start unchecked without demand baselines. Preserve historical lists/check maps and extra occurrences/history, with extras retaining their existing lifecycle. No active-check conversion decision or special shopping acknowledgement UI is needed. Unexpected active-list evidence stops assessment for reporting, not automatic deletion.

A verified independent pre-cutover snapshot plus exact old executable/schema is the emergency rollback pair. After new writes, simply rolling back an image is unsafe; choose compatible full-state recovery or forward fix. Fresh current-format backup after conversion is separately read back and verified before routine operations resume; it cannot protect the migration interval retroactively.

## Conditional Disk Fallback

Only if in-place assessment establishes a concrete unresolvable blocker, prepare recipe-only fallback. Inventory both disk/live versions, IDs, source/media and field ownership; preserve input copies independently. No delete-all, auto-created missing IDs, soft-delete resurrection or purging database-only recipes. Household state, notes/rating/manual flags, attribution, creation/deletion, occurrences and relationship IDs stay untouched. Stage selected recipe fields only; revision-guard publication and durable derived rebuild. Record converted/deferred entries and resume input/output identities. For fallback, compare disk and database by stable recipe ID before publication; report unexpected content or membership mismatches and stop rather than choosing a winner.

Alex reports no recipe edits through the UI and says Dreaming has kept disk and database in sync. Treat matching recipe IDs/content as the expected case and verify it, allowing only documented representation differences from conversion. If an ID is missing on either side or supported recipe facts unexpectedly differ, stop/report the fallback before mutation rather than silently replacing content. No elaborate per-recipe edit-conflict workflow or general disk/live precedence selector is required solely for hypothetical UI edits. Keep revision guards against actual concurrent changes, input preservation and household protections. A timestamp is not evidence of equality. Do not overwrite source files before independent preservation and validation.

## Operational Diagnosis

Separate conversion status, committed facts, pending derived rebuild and completed verification. Record no sensitive raw recipe/provider payload in routine logs. A failure preserves prior usable content; a conflict is neither empty success nor forced replacement. Test current-format merge stale/divergent content, identical revision with different bytes, crash/restart, stale work, mixed old clients and media publication gaps before release.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).

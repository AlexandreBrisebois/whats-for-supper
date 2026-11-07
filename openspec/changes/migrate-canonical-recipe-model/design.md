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

There is no shopping in progress at upgrade. Recommend preserve provable one-to-one name checks, clear only ambiguous split name checks once, retain raw old check map in the migration manifest and preserve historical extras. The dataset cannot reveal independent intent behind the shared old check. This one-time choice remains a release gate; no special acknowledgement UI or copied historical purchase assertion.

A verified independent pre-cutover snapshot plus exact old executable/schema is the emergency rollback pair. After new writes, simply rolling back an image is unsafe; choose compatible full-state recovery or forward fix. Fresh current-format backup after conversion is separately read back and verified before routine operations resume; it cannot protect the migration interval retroactively.

## Conditional Disk Fallback

Only if in-place assessment establishes a concrete unresolvable blocker, prepare recipe-only fallback. Inventory both disk/live versions, IDs, source/media and field ownership; preserve input copies independently. No delete-all, auto-created missing IDs, soft-delete resurrection or purging database-only recipes. Household state, notes/rating/manual flags, attribution, creation/deletion, occurrences and relationship IDs stay untouched. Stage selected recipe fields only; revision-guard publication and durable derived rebuild. Each manifest entry is converted/conflicted/deferred with resume input/output identities.

Disk-vs-live precedence remains undecided until fallback is necessary. No fallback executable task is authorized or finalized while it could overwrite divergent live edits. A file's newer timestamp or current format is not permission to win. Do not overwrite source files until independent input preservation and validation pass.

## Operational Diagnosis

Separate conversion status, committed facts, pending derived rebuild and completed verification. Record no sensitive raw recipe/provider payload in routine logs. A failure preserves prior usable content; a conflict is neither empty success nor forced replacement. Test current-format merge stale/divergent content, identical revision with different bytes, crash/restart, stale work, mixed old clients and media publication gaps before release.

See the shared [dependency/conflict review](../canonical-ingredient-correction/review.md) for approval and release order, and [acceptance corpus](../canonical-ingredient-correction/acceptance-corpus.md) for preservation cases. Proposed API/schema details have one owner in [contracts.md](../canonical-ingredient-correction/contracts.md).

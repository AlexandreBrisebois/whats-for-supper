# Coordinated rollout and recovery gates

This is the authoritative coordinated rollout gate owner, not an authorization by itself. The current slice has explicit commit and nonproduction DV authorization plus a maintenance-hold extension; production and unrelated reset/reseed remain excluded. It replaces the old permanent-legacy-restore rollout. The [migration companion](../migrate-canonical-recipe-model/design.md) owns implementation/recovery; this file links the accepted portions release gates. Deferred bilingual adoption is separate.

Alex accepts planned downtime and confirms frontend/backend/database deploy as one
release. Reuse the demo/online-recovery coordination mechanism, with migration's
data/draft preservation policy. Rehearse the hold across process restart, drain or
fence work, verify the independent recovery point, update the coordinated release,
read back and validate, then reopen. A failed check retains the maintenance/recovery
boundary until a verified prior or new state is available. Do not invoke demo reset
to perform migration or assume its activity/draft clearing is acceptable here.

1. Review shared contracts and ownership with Alex’s accepted allocation, range/baseline and split/merge rules. The accepted release decisions are in proposal.md; contract/integration qualification remains required. Dataset adoption gates only the deferred bilingual release.
2. During later approved apply, inventory every writer: manual ingredient/basis/instruction/shop correction, web/photo/PDF/synthesis/share, RecipeAgent file output, SyncRecipeProcessor, seed/merge/exact restore, workers and old clients. Add storage and guarded staging; fence old write routes before canonical activation.
3. On disposable nonproduction copies, produce no-write manifest: recipe IDs, original current/source hashes/revisions, evidence associations, step coverage, protected fields, conversion/conflict/defer counts, retained historical list/check records, unchecked new-list inputs with no inherited baselines, no-active-list assessment and manual category collisions. No success threshold may erase conflicts. Unknown legitimate measurements are not failures.
4. Validate in-place conversion atomically per recipe. Stop/resume before/after commit, race human edits and test identical retries. Preserve exact fractions/ranges, units/packages, basis, IDs, nulls/empty, source/media, protection and legacy read access for safely deferred recipes. Canonical records never fall back to old metadata as current.
5. Qualify client upgrade with retained drafts for every edited field, stale workers/replies and incompatible browser tabs; test name-only-looking full payloads. Deploy frontend, backend and database together as one coordinated release. Record the matching application/schema identity and stale-tab refresh behavior, not an independently rolling compatibility window. No permanent old-edit-format adapter or unsafe dual writer period.
6. Verify independent pre-cutover snapshot/media and exact compatible old application/schema. Rehearse rollback and forward fix on isolated copies; choose a recovery objective/maintenance bound from measured rehearsal, not an invented duration. After new facts are accepted, an image-only rollback is unsafe.
7. Execute in-place upgrade only under separately approved operator release scope and confirmed no-active-list condition. The next recipe-derived list is new and unchecked; retain historical lists/checks and extra occurrence/history without old-name check transfer. Stop/report unexpected active-list evidence rather than clear it. Await durable affected grocery/search work; pending is not current. Preserve serving/prepared protections and unrelated household hashes/counts/relationships.
8. A recipe-only disk fallback is conditional: record the actual in-place blocker, disk/live inventory and field-preservation manifest. Compare disk/database by stable recipe ID and supported facts; expected Dreaming-synchronized content must be verified. Stop/report unexpected missing IDs or content mismatches before fallback writes rather than choose a winner. No elaborate per-recipe UI-edit conflict workflow is required solely for absent edits. Preserve database-only IDs, soft deletion and household links. General seed/disaster recovery is not this fallback.
9. Verify current-format full backup in independent storage and isolated read-back, including exact values, bindings, identity/catalogue revisions actually persisted (without requiring deferred catalogue adoption), row/check versions, all household relationships/prepared facts and media bytes. Reject old backup format before any mutation. Keep source input copies until validated; no deletion is authorized.
10. Release the full portions outcome only after step scaling and all required real-seam corpus cases pass. Dependable grocery UI may release earlier after its own compatibility/transition gates. Record local production-browser and hosted-candidate evidence separately; carry the parity dependency, do not change CI defaults here.

Operator packet must name exact candidate/schema/configuration, dry-run manifest, all passed/failed/blocked/skipped/not-run checks, qualified services/resources, conflict disposition, resumable checkpoints, writer fences and recovery rehearsal. A queued backup or provider-generated result is not verified recovery or successful correction.

## Slice 1 operator packet

Evidence owner: `.task/dependable-portions-slice1/`. `c/assessment.md` describes the
existing-boundary extension and exact source limitations. `c/rehearsal.json` records
current migration on a disposable DV copy with all 31 table digests preserved;
`c/no-write-inventory.json` inventories 198 copied recipe IDs as requiring forward
assessment, not approved conversion. `c/data-copy.json` verifies 1,400 media/data
files through independent read-back; that unlocked inspection is not an atomic
predeployment recovery point. `c/operator-tests.json` records marker/release guards.

The task-owned `c/maintenance.py` operator invocation takes `hold|status|release`,
explicit API/database containers, an operation UUID and full candidate SHA; release
also requires a matching verified read-back receipt. It validates API database/host
identity, uses that database's existing publication lease and refuses another running
container sharing the recipe mount. Creation stops the old API under the lease
before durable marker publication; release requires all sharing containers stopped.
No database credentials are printed. The marker itself neither resets nor converts
records. Keep the exact old image IDs, stopped-app database/files snapshot and
independently verified recovery pair before migration. Apply the reviewed migration,
verify protected state, then remove only this operation's marker and start the exact
candidate. Check deployed frontend/backend/schema identity, health and behavior.

Candidate process-restart/holder-loss rehearsal, final stable repository checks,
hosted results and actual DV acceptance are separate evidence stages; pending stages
remain pending until recorded. No entire change is eligible for archive from this
bounded producer and maintenance slice.

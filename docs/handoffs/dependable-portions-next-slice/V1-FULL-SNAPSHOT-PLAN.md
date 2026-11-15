# Proposed attestation-bound full-snapshot continuation

Status: **planning delivered only; execution requires a separate user selection**.
This contract and [proposed request](V1-FULL-SNAPSHOT-CONTINUATION.json) define one
successor beneath migration tasks 2.1–2.2/3.1–3.2 and bilingual 4.2. They do not close
those aggregates (migration 3/8, bilingual 8/10, release family 33/68), authorize
execution, admit migration source, publish a snapshot or grant restore authority.
The [implementation prompt](../../../.agents/prompts/dependable-portions-full-snapshot-next-slice.md)
selects the exact prospective scope. All predecessor authority documents are unchanged.

## Reconciled predecessor and hosted disposition

Entry local/tracking/remote: `070d9801f135062762f72dc668c13b41f6e15069`, clean
`recipe-view-redesign`. The history terminal record is
`.task/v1-recovery-history-20261114/delivery.json`; its exact hash is bound in the
proposed request. Schema preparation, attestation 46/46, remaining inventory,
recovery observation, durable history staging and source-dependent fresh-process
read-back passed. Ordinary strict readers rejected all 46. The final history
record reports 851 PostgreSQL cases with zero skips and passing repository checks;
these qualify that predecessor identity, not this unimplemented successor.

Complete source admission/full snapshot recovery did not pass. The next strict
reader stopped with `Snapshot manifest is missing.` This is a stopping boundary,
not a diagnosis that adding a manifest completes recovery. The delivered history
stage is neither an offline package nor a full snapshot.

`.task/chromium-provisioning-20261114/delivery.json` independently records original
run 43676429700 attempt 1: Tonight job 132698166560 failed Chromium dependency
provisioning; its capability tests **never ran**. Aggregate job 132701306773 failed.
The effective APT candidate cause was unresolved and no source repair was justified.
Comparison planning-host success does not qualify Tonight. Hosted final-candidate
acceptance remains pending; Alex owns monitoring/reruns. This planning slice does
not rerun CI or claim hosted success.

## Actual owners and acceptance path

The following are source-derived requirements, not executed successor evidence.
Paths are under `api/src/RecipeApi/Services/` unless stated otherwise.

| Boundary | Existing owner and required behavior | Successor disposition |
| --- | --- | --- |
| Attested source | `V1ExactSourceAdmission.cs` and `.Schema.cs`: pinned approval/package/backups/receipt set, original projected rows/files, reviewed catalog delta, generation/request/completion | Extend finite request dispatch; re-admit fresh copies before and after observation and inspection |
| Coherent capture | `RecoverySnapshotService.cs`, `CaptureToAsync`: Snapshot lease, binding, pending physical-retirement/file-publication rejection, table locks, schema/table/media construction | Reuse internal construction under one coherent boundary; do not call public capture, which publishes |
| Vocabulary/history | `.Vocabulary.cs`, `FoodVocabularyStore.Recovery.cs`, `FoodVocabularyInventory.*`, `V1RecoveryHistoryContext.cs` | Carry finite attestation through existing history/reference/authority/index owners; retain strict default behavior |
| Durable stage | `.V1History.cs`, `RecoveryDurability`, existing flushed writes | Reuse exact retry/durable write primitives; separate authority envelope and final completion from payload |
| File inspection | `.VocabularyRestore.cs`, `ReadCurrentSnapshotAsync` / `ReadCurrentSnapshotCoreAsync` | Internal bounded context at history validation; retain every structural/hash/inventory check |
| Database inspection | `.VocabularyRestore.cs`, `ValidateCurrentSnapshotAsync`; `.Restore.cs`, `ValidateTablesCoreAsync` | Invoke full schema, column, constraint, FK, grocery-extra lineage and weekly-history validation; identity-only inspection is insufficient |
| Publication | `CaptureToAsync` final rename into BackupRoot; demo selection and restore generation/journal owners | Excluded: stage completion never registers/selects a published snapshot or current pointer |
| Source coverage | `.SourceProtection.cs`, `InspectSourceProtectionAsync` / `RequireSourceCoverageAsync` | Existing ordinary path stays strict; selected-table/file comparisons alone do not establish complete approved-source coverage |
| Restore | `.VocabularyPublication.cs`, `.VocabularyRestore.cs`, `.Restore.cs`: preflight, destination CAS, stage, journal, DB commit, pointer activation/reconciliation | Excluded; no preflight/restore endpoint or journal invocation carrying this exception |
| Operational migration | Existing canonical migration source-admission/executor and maintenance owners | Excluded; no admission token, manifest execution, conversion, adoption, rebuild or reopening |

Current ordinary v3 payload contains exactly these 16 tables, in this order:
`family_members`, `recipes`, `canonical_recipe_operations`,
`recipe_file_publications`, `feature_flag_overrides`, `recipe_repair_intents`,
`recipe_import_reports`, `weekly_plans`, `calendar_events`, `family_settings`,
`ingredient_categories`, `weekly_household_interest`, `grocery_extra_occurrences`,
`supper_servings`, `grocery_mutation_outcomes`, `household_food_overrides`.
The code owner `CurrentTables(false)` remains authoritative; an unexpected change
requires reconciliation against this frozen contract before implementation.

The reader requires manifest v3, nonempty matching snapshot ID, captured time,
schema digest and ordered table list; every unique safe relative path, exact byte
length/hash and exact file-set equality; `tables/<table>.json` arrays;
`weekly-household-interest.json`; vocabulary index v1 and history v1; all referenced
immutable vocabulary files, including history-only references; coherent membership,
recipe mapping/evidence, canonical operations, publication/repair and override rows;
unique nonempty recipe IDs; each matching `recipes/<id>/recovery-row.json`; exactly
one allowed original image extension per declared image index; original/PDF/hero
assets permitted by the existing owner. Reject symlinks, extra files, duplicate or
traversing paths, unknown/duplicate JSON fields and malformed UTF-8 under existing
validators. Keep schema compatibility, exact writable-column sets, temporary-table
constraints/FKs, grocery-extra relationships and weekly-history sidecar equality.

The closed payload allowlist does **not** accept the predecessor
`vocabulary/v1-source-lineage.json` or `v1-history-complete.json`. Do not copy the
history stage wholesale into the payload. Put exact lineage, request, preparation,
preservation and completion evidence in the sibling `snapshot-authority` directory.
Keep v3 manifest/history/index formats and ordinary allowlists unchanged. The
internal reader must require that external evidence and fresh admission explicitly;
there is no ambient flag, public/DI authority or permanent legacy adapter.

## Authority, protected facts and permitted successor effects

The version-4 **proposed request** has fresh operation, generation, snapshot,
database/tree/stage/independent-copy and marker identities. Its raw-byte SHA256 must
be pinned by the later implementation's finite admission owner, with explicit
version dispatch; current owners recognize only predecessor requests and must
reject it. Do not broaden version comparisons or repurpose old version-3 marker
logic. Bind package/approval/source dump, original intent, exact schema continuation,
source/prepared catalogs, schema input and extracted-DDL hashes, predecessor
history request and terminal delivery. An old preparation/history marker never
authorizes this new request. Hashing a caller-supplied request is not admission.

A later explicit implementation selection may permit only:

- Restore the four pinned originals into a fresh task-owned pristine PostgreSQL
  18.6 database/tree and a distinct fresh descendant; validate the pristine catalog,
  all 31 original table projections and every one of 1,576 files per tree first.
- Apply only the already-qualified extracted compatibility DDL in one transaction:
  nullable `recipes.food_mapping_evidence`, no default/all SQL NULL, plus empty
  `household_food_overrides` and the declared constraints/indexes. Compare the
  prepared catalog to the independently established expected catalog. Never run
  broad `migrate.sh`, compatibility SQL or sqldef against these copies.
- Write task-owned new generation/preparation records, staged payload, sibling
  authority/completion, detached independent copy and evidence. Source/copy recipe
  files remain byte-identical; regenerated `recovery-row.json` and snapshot sidecars
  exist only in the new stage. No vocabulary installation or source sidecar rewrite.
- Run existing database validation using transaction-local TEMP tables, inserts
  and constraints in a transaction rolled back/disposed without persistent changes.
  This is inspection, not restore. Reusing its validation helper does not authorize
  the persistent restore path, DB publication journal or generation activation.

Protect every original column/value, membership, relationship and schema fact
outside the two declared additions; all planned meals/calendar events, IDs,
dates/status/intent/recipe/serving/prepared/cooked/non-cooking facts; human
notes/ratings/flags/corrections; grocery checks/baselines/extras/lineages/history;
and all source/media files. **No grocery-derived database change or check reset is
allowed in this slice.** All46 original request/input/result bytes/hashes, identities
and timestamps are exact, using PostgreSQL18.6 `result::text` UTF-8 for JSONB
results. Original writer/build/serializer and original result wire identity remain
unproven; present-day exact-source attestation does not establish those guarantees.

The ordinary snapshot is a selected recovery projection, not a whole-installation
backup. Keep the four original backup artifacts and all31/all1576 authority checks
separately. Produce an exhaustive mapping of each source file to copied payload
bytes or an explicit existing-owner omission (such as metadata/search sidecars),
and each original table to payload or typed-history/derived/excluded disposition.
Do not claim all1576 files or all31 tables are restored by v3. If a protected fact
has no faithful existing representation, stop with that blocker; do not drop it,
expand the format silently or build a second snapshot system.

Table aggregate JSON and normalized row/history equality do not prove exact
receipt result text. Preserve exact receipt representations in the attested
history/lineage envelope and independently compare all46 against original authority
as well as table membership/facts. Never reserialize a result to manufacture its
attested hash. Current schema digest is narrower than the catalog lineage proof;
require both and retain the predecessor's catalog coverage limits.

## Bounded tracer and completion contract

One implementation slice may comprise fresh-copy preparation → coherent complete
capture → task-owned durable staging → detached copy → fresh-process independent
inspection. It excludes publishing the staged package into BackupRoot, selecting
current/demo pointers, restore and complete migration source admission.

Capture holds the existing Snapshot lease and table-lock/coherence boundary across
source attestation, table/history/vocabulary observation and artifact inventory.
Revalidate authoritative source/copy and files after capture; do not stitch a
historical stage to separately observed current tables. Source admission context
must be constructed only after pinned request/authority/preparation validation,
carry exact operation/generation/snapshot/request and receipt membership, and reach
existing history serialization/read/merge/reference/index checks. It cannot disable
non-history schema, file, relationship or inventory checks.

Create final completion only after all artifacts are flushed, reread and validated
against original authority. The sibling completion v1 must bind request hash,
operation/generation/snapshot, deterministic captured-at/schema identities, manifest
raw hash, exact closed artifact path/length/hash inventory, index/history hashes,
lineage/receipt and protected-source inventory hashes, preparation evidence and
predecessor bindings. Persist the captured time in the owned attempt so exact retry
does not fabricate a new manifest. The completion is a durable stage identity,
**not** an independent-inspection success marker or publication result.

A fresh process, with fresh service/DB contexts and no cached attestation, must
read the independently copied payload/envelope, reconstruct authority from pinned
originals and a separately verified fresh prepared source, validate complete
completion/inventory, invoke existing file and DB checks and compare complete
protected facts/receipts. Reread manifest, inventory, media and authority after
validation and source re-admission to catch mutation during read-back. Record a
separate inspection result binding input digests and actual validation outcomes.
This is explicitly **source-dependent independent read-back**; it proves neither
offline restoration nor a self-contained recovery package. Restoring originals to
prepare test sources must be reported separately from restoring the new snapshot.

Partial or interrupted stage grants no authority. Retry accepts only the same
pinned request and exact verified existing bytes; it may finish only known owned
pending paths, never overwrite divergent final bytes, recapture changed source as
a baseline, reuse old markers or reapply historical operations. A lost reply after
completion returns the verified retained identity. If all complete bytes exist but
completion was interrupted, re-admit/revalidate them before completing. Postcompletion
mutation, foreign identities, missing/corrupt authority and mismatched copies fail
closed. Cleanup can touch only proven task-owned provisional files/resources.

## Required RED/GREEN and independent acceptance

Extend existing owners; proposed new tests may be named
`V1FullSnapshotContinuationTests` and `V1FullSnapshotPostgresTests`. These names do
not assert they already exist. Current test owners include
`V1RecoveryHistoryTests`, `V1RecoveryHistoryContinuationTests`,
`V1AttestationPostgresTests`, `V1SchemaLineagePostgresTests`,
`CurrentRecoveryInspectionPostgresTests`, `CurrentRecoveryObligationsPostgresTests`,
`CurrentRecoveryDictionaryPostgresTests`, `OnlineRecoveryPostgresTests`,
`GroceryExtraRecoveryPostgresTests` and
`CanonicalIngredientPublicationPostgresTests.Recovery*` partials.

| Gate | Intended RED before missing behavior | Required GREEN evidence |
| --- | --- | --- |
| Finite request | Current owner rejects the new request/old markers | New exact request only; each changed binding and predecessor marker rejected |
| Full capture tracer | Real admitted prepared V1 source fails ordinary history/capture validation; history-only input fails missing manifest | All required table/recipe/household/media/vocabulary artifacts staged without publication |
| Independent inspection | Manifest-only/history-only or identity-only input cannot satisfy full checks | Another process validates detached payload with fresh authority, DB checks and full protected comparisons |
| Receipt identity | Alter exact result text or coherent identities while retaining semantic equality/self-consistent hashes | All46 original pairs exact; substituted/missing/extra receipts rejected; ordinary readers still reject46 |
| Inventory/reference | Remove/corrupt one required table, row, original/hero/vocabulary/history-only file; missing/extra field or dangling relationship | Closed exact inventories, source dispositions and constraints/FKs/weekly-history enforced |
| Interruption/race/retry | Stop during artifact writes, before/after completion, copy and read-back; mutate bytes/source at validation checkpoints | No partial acceptance/publication; exact same-attempt resume, retained outcome on lost reply, conflicts fail without overwrites |
| Strict boundaries | Exercise ordinary/public/demo capture/read/restore and mixed/foreign context | V1 exception unavailable there; normal ordinary3/demo4 regressions pass without semantic changes |

Include missing/corrupt package/approval/backups/catalogs/schema inputs/preparation/
lineage/completion; foreign operation/generation/snapshot/root/request; symlinks and
extra pending/final files; unsupported versions; stale/mixed vocabulary contexts;
source or artifact mutation after hash computation and immediately before/after
completion; new evidence not NULL or overrides not empty. Use detached negative
fixtures only, never corrupt predecessor/source authority. Failures due to compile,
provider, missing services or empty/skipped selections are not behavior RED/GREEN.

Run the new focused actual PostgreSQL owner and affected history/schema/current
inspection/publication/online-recovery owners, then full `task test:database` with
zero required skips. Record commands, selected test counts, server/extensions,
source/build/config/request hashes, original31/1576 preservation, exact receipts,
stage and separate read-back identities. Run applicable `task verify:plan`,
`task prepare` and stable complete-path `task verify`; retain invocation-specific
records and failed/interrupted checks. Coordinate owned resources; keep port3000
and all preexisting containers/databases untouched. No browser task may borrow them.

Independent read-only reviewers must inspect a frozen planning/implementation and
source/evidence manifest, challenge exact-byte authority and completion/race controls,
and verify all claims and exclusions. Reconcile bounded findings and freeze again
if content changes. An independently reviewed plan remains a proposal. A later
implementation must obtain its own immutable implementation and actual PostgreSQL/
read-back evidence reviews; this planning review cannot qualify future code.

## Claims and stopping boundary

Report separately: original-backup fresh restore; schema preparation; attestation;
remaining inventory; capture; durable stage; fresh-process independent inspection;
complete source admission; snapshot publication; new-snapshot restore;
operational migration acceptance; hosted CI. Only executed and independently
qualified stages may pass. This planning delivery has no executed successor stages.

Stop after reviewed capture/staging/inspection evidence if later selected. Preserve
and report the next strict blocker without weakening it or proceeding into restore,
complete source admission, conversion, vocabulary publication/adoption, all-week
rebuild, activation, deployment, DV/production, adjacent UI, archival, setup repair
or cleanup of shared resources. The present task stops after reviewed planning,
implementation prompt, applicable documentation checks and signed commit/push.

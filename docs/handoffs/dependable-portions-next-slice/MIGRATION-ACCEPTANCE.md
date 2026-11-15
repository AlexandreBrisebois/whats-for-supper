# Portions coverage and copied-library admission

## Schema-only descendant lineage and strict inventory — 2026-11-14

Entered clean at expected local/remote `fc43971c47be366f5d9a157501ac27047654c2e3`.
The user separately authorized this schema/lineage implementation and audited
schema-only changes on owned disposable copies. Normal signed commits/pushes are
authorized; Alex owns CI. Frozen policy, approval/package, predecessor intent,
original backups, receipts and prior review/evidence bytes remain unchanged.
Historical writer/build/serializer identity and original result wire bytes remain
unproven; the approved exact source remains present-day authority.

The [separate continuation](V1-SCHEMA-CONTINUATION.json), SHA256 `0bc8fc02687eeb74f93f099e3b08c58559bdc335f97508fc795c60f56652270b`,
binds the immutable predecessor, approval/package/dump, new recovery operation,
target generation/request, complete schema input hashes and independently
established source/prepared catalogs. The source catalog was captured only after
verifying the pristine restore against all original table/file authorities. The
expected catalog was assembled from that unchanged source plus reviewed existing
DDL exercised in a separate empty reference database, before modifying the
descendant. The descendant was never recaptured as original authority.

The entire permitted delta is nullable JSONB `recipes.food_mapping_evidence`
(no default, all SQL NULL) plus an empty `household_food_overrides` table with
13 columns, its primary key, four CHECKs and three additional unique indexes.
PostgreSQL18 records 11 new constraint entries: five logical PK/CHECK constraints
plus six NOT NULL entries. The primary-key index makes four new indexes in total.
Exact compatibility sections are extracted by pinned offsets and hashes; broad
`compatibility.sql`/`migrate.sh`/sqldef execution is excluded because those owners
also perform unrelated destructive/data-changing work. No schema owner was
changed. Original older constraints and unmapped columns remain protected.

Preparation uses the existing PostgreSQL/recovery owners, one transaction and
original-table locks; retry accepts only exact pristine or exact fully prepared
state. The catalog checks original columns, ordinals/types/defaults/nullability/
identity/collation, constraints, indexes, internal FK triggers, rules, policies,
functions, namespaces, types/enums/operators/casts/collations, sequences and
extension versions. Read paths use `pg_catalog, public, pg_temp`; public creation
is selected only around the reviewed DDL after pristine validation. Every original
column/value and row membership is compared through the pristine projection
against the approved original digests; new evidence and override state are
checked independently. Completion evidence is published only after commit and
durable Linux flush. A marker alone cannot confer authority. Inspection and
replay revalidate required completion/authority evidence; replay never rewrites
current facts. Unsupported hosts reject preparation before DDL.

**Schema preparation passed.** Fresh source `wfs_v1_schema_pristine` and separate
descendant `wfs_v1_schema_descendant` ran on owned PostgreSQL18.6. Both preserve
all31 original table projections and all1,576 original files; new evidence is SQL
NULL and overrides empty. Original46 request/input/result/hash/timestamp/identity
pairs are preserved using PostgreSQL18.6 `result::text` UTF-8 extraction.
**Attestation accepted46/46; ordinary strict readers rejected46/46.**
**RemainingInventoryValidated passed** through the existing read-only recovery
inspection owner, including re-admission after its inventory read.

**Complete source admission/current-format recovery remain blocked.** The next
existing read-only prerequisite used by snapshot capture,
`FoodVocabularyStore.ObserveRecoveryAsync`, rejects unchanged original V1 history
with `Original canonical operation is inconsistent.` The exact stack is retained
in `.task/v1-schema-20261114/next-recovery-blocker.txt`. No snapshot capture,
migration, receipt rewrite or extension of the exception into current-format
history followed. A successful remaining-inventory boolean is not complete source
admission or a valid current-format recovery snapshot.

Test-first boundary RED is `lineage-red.log` (the existing strict gate rejects the
new continuation before implementation); initial GREEN is `lineage-green-v2.log`.
Final Linux qualification retains 71 rejected controls and 2 positive
controls, including transactional rollback, committed-before-marker interruption,
exact retry/resume, foreign operation/generation, altered protected facts/receipt
membership/schema/evidence, shadow schemas/types/FK triggers, missing/corrupt
bound evidence and replay preserving later current facts/original receipts.
Evidence owner `.task/v1-schema-20261114/`: `qualification-linux.log`,
`negative-controls.json`, `receipts.json`, `recovery-lineage.json`,
`qualification-runtime.json`, `inventory.json` and `preservation.json`.

Failed invocations remain separate: missing durability namespace was a build
failure; initial native preparation hit the existing Linux-only fsync owner;
two detached negative fixture statements were invalid SQL; a focused PostgreSQL
invocation detected concurrent content changes and is not final-identity success.
Final independent frozen review, affected/full PostgreSQL, repository preparation/
verification, signed delivery, ref/hash checks and owned cleanup have their exact
terminal records in `.task/v1-schema-20261114/delivery.json`. They were pending at
this document's write cutoff and are not asserted passed here. Browser checks use
a task-owned isolated source/build/port; port3000 and preexisting resources remain
protected. No aggregate checkbox closes (migration3/8, bilingual8/10).

No migration/conversion, household changes, vocabulary publication/adoption,
all-week rebuild, activation, deployment, DV/production, later intake, Similar,
garlic, adjacent UI, archival or unrelated cleanup is authorized or performed.
Predecessor sections below retain their historical scope and evidence.


## Exact-source V1 attestation implementation — 2026-11-14

Entered clean at expected local/remote `78fba6dc8b863d6e9e15f6f0ed939cfde2c550e9`.
The continuation supplies separate implementation authorization; signed normal
commits/pushes are authorized and Alex owns CI monitoring. The approved policy,
approval, membership and historical evidence remain byte-identical. Historical
writer/build/serializer identity and original result wire bytes remain unproven.

The internal version-1 validator reconstructs captured V1 edits without V2
preparation or today's facts. It verifies exact original/input/result bytes,
identities, hashes, baseline/revisions, all 140 listed identical duplicate sites,
recorded fresh allocations at independently derived creation sites, complete
result/created-ID comparison and the exact PostgreSQL 18.6 `result::text` hash.
Ordinary V1/public parsing remains strict. Shared domain checks are reused only
after the isolated reader's exact-byte/duplicate checks.

The reviewed [admission intent](V1-ADMISSION-INTENT.json) binds the one-time
operation `5238fbe6-1dca-4ec5-9eaf-b17d3db945a7`, target generation
`bc305bf36d804aa493f119cf2e5fe1e77`, policy/extraction and exact request digest.
A task-owned generation descriptor is outside copied source files; no live
recovery pointer is activated. The read-only PostgreSQL owner verifies pinned
approval/package, all four backup artifacts, complete receipt membership and
all restored table/file lineage before returning a historical context. Caller
hashes or flags cannot confer authority. Replay revalidates immutable evidence,
returns only frozen validated outcomes and never applies old edits to live facts.
Separate lineage retains exact approval/package/policy and all original receipts.

**Attestation gate accepted:** a fresh task-owned PostgreSQL 18.6 restore validates
all 46 original receipts; ordinary strict readers still reject all 46. The 27
negative controls reject altered/missing authority, foreign operation/generation/
source destination, changed file lineage/membership/input/baseline/result, coherent
ID substitution, conflicting/additional duplicates, unknown versions and
interrupted preflight. Fresh-context replay with retained lineage preserves newer
human notes and original receipts in a separate restored target. All source table
digests before/after match. Evidence: `.task/v1-attestation-20261114/qualification.json`
and `recovery-lineage.json`; originals and backups are never mutated.

**Complete source admission remains blocked:** the next existing strict inventory
owner reports `PostgreSQL 42703: column r.food_mapping_evidence does not exist` on
the untouched 31-table source schema. No schema adaptation, conversion, vocabulary
publication or migration was attempted. This is a distinct source-admission blocker;
attestation acceptance does not qualify a current-format preconversion snapshot.
Stop this slice here without weakening or expanding source admission.

Test-first derivation, policy and admission RED/GREEN logs are under
`.task/v1-attestation-20261114/`. Focused native history/public controls passed 37
with zero skips. A PostgreSQL fixture initially depended on excluded handoff docs;
that failed invocation also detected concurrent content mutation and is not success.
The corrected self-contained extraction regression passed one real PostgreSQL case,
zero skips (`.task/database-tests/runs/53584b88a7774596b644e35682879368/result.json`).
Independent immutable review, final preparation/full PostgreSQL/repository checks,
exact content identities, signed pushed commits and ownership-bound cleanup have
their invocation-specific terminal records in
`.task/v1-attestation-20261114/delivery.json`. Checks pending at this document's
cutoff are not asserted as passed here; consult that terminal record.

No aggregate boxes close (migration 3/8, bilingual 8/10, release family 33/68).
Migration/conversion, all-week rebuild, vocabulary adoption, activation, deployment,
DV/production, later intake, Similar, garlic, adjacent UI and archival remain excluded.
Port 3000, preexisting containers, source files/databases, backups and original
receipts remain protected. Earlier sections below retain their historical scope.


This is the current handoff for the November 14 selection on local
`recipe-view-redesign`, entered clean at local/remote
`6589c18a7073afc3aeacb94dd6a4a6506030eb5a`. The
[machine-readable packet](MIGRATION-ACCEPTANCE.json) owns exact source, catalog,
assembly, operation and evidence identities. Final preparation, immutable review,
stable verification, full PostgreSQL, signed delivery and resource disposition
are recorded in `.task/portions-migration-20261114/delivery.json`.
Alex owns CI monitoring; local checks do not qualify a hosted final candidate.

The retained V1 continuation entered clean at matching local/remote
`40824fbaf62a5c11170e62f312d3ff0d883e8c72`. Its separate evidence owner is
`.task/v1-history-20261114/delivery.json`. The cooking Save repair and recorded
push/PR CI success remain preserved; this continuation does not monitor CI.

## Authorized Portions acceptance change

The required native-focus matrix now covers 320 px and 390 px at normal text in
both EN/FR. Only its former 320 px/2× entry was replaced. Tab/Shift+Tab traversal,
`document.elementFromPoint` focus hit-testing, date/reset controls, retained drafts,
exit choices and finishing controls remain. Separate compact enlarged-text,
recipe Original/Reset, cooking and grocery requirements remain unchanged.

The [reported planning job](https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/43620241257/job/132524778916)
tested `fb4978e6d521bcceb8014951957bde5949554320`: 352 passed, six skipped and one
failed. Both attempts found French “Moins de portions” obscured at 320 px/2×.
The enlarged-text root cause remains unresolved. This is an authorized coverage
change, with no enlarged-text layout repair claimed and no application logic change.
C49 now names this precise exception; unrelated 200% acceptance remains.

A fresh production build with the shared CI flags, Node 26.12.0/npm 11.21.1,
Next 16.4.2 and task-owned output/port passed the complete revised file three times:
**27 passed, zero skips/retries, four workers**. Build ID
`dwl3HZgM_HHzXHyVrWt2x`; source-manifest SHA256
`29b563e5759649863b73cab7fa403187018144bfd27d0a0b85402826db68a45b`.
This is native macOS ARM qualification, distinct from hosted Ubuntu qualification.

## Actual library and old recovery pair

The selected historical source is the independently read-back, stopped/held
predeployment set under
`.task/dependable-portions-coordinator/pdf3/release/predeploy-8585db24-8ac9-4b9d-97aa-d21800055f82/`.
It is an actual library, not a synthetic fixture or a claim about today's source.
Its PDF3 application's aborted acceptance remains separate from this retained
predeployment recovery set.

Three new isolated databases and three file trees were restored. Every one of
31 original table inventories and all **1,576 files** matched the retained set.
The source contains 221 recipes (23 retired, 23 with canonical content), 69 calendar
events, 36 stored/assignment-implied weeks, 12 dated servings and five extras.
Complete key/column/row hashes, file descriptors, recipe IDs/revisions, historical
operations and exact week membership are retained beneath
`.task/portions-migration-20261114/copied-library/`; the packet binds their manifest.

| Identity | SHA256 |
| --- | --- |
| Independent database dump | `25eab5f9bdc4f35b8385f05c86a0c384fe0b3da89c2576f04f89566d96cc9ecc` |
| Independent data archive | `07e26b87a47805f9abdfad69ce6a54d15a03236c13607d50e7b0d0edd1ccb76b` |
| Old live 31-table catalog | `202b3b0d9719fcf2e694add4d1a04eefbbb34974572d7909e5dfb0a6fb23210c` |
| Candidate live 32-table catalog | `edd40bb30ea7232a9269d93e2d4c4cd4022f7af655204649d89296361c65713a` |
| Old executable assembly | `58196b0daeb4e2b5881c482328709a790c1bc1254561e8437a5846e57544743b` |
| Actual candidate assembly | `9580c5e0319a2079a716b1ed3da44d9396a6901186263646504bd36d1ec77dcd` |

The catalog hashes use the existing RecoverySnapshotService's actual catalog
projection across all public tables; complete live schema dumps are also retained.
They are distinct from the declarative `schema.sql` file hash. The reviewed schema
preview and existing compatibility/migration owners ran only on disposable copies.

The old pair is release `7a502eff4e805bad939e9f909bb2c83350e9ba81`, API image
`sha256:7db9f1984f059bbb88611ac58e444d6d750a806f3e262f639e08706466786ad9`
and PWA image
`sha256:fcd4f02e952f28b2b7c96d71af21ff61566b339e6409a5f9cd2a73404ea97e00`.
The API freshly started against its restored old schema and reported healthy
application/database/schema. The old PWA image was identified and available;
its rendered browser behavior was not requalified. Copy configuration retains
UTC and the recorded cron values, with synthetic credentials and an unreachable
provider endpoint on an internal network. No source environment was changed.

## Admission blocker and preservation

The candidate's existing vocabulary owner stopped before publication while
validating retained V1 canonical-operation authority. All **46 edit receipts** fail
the original-operation validator under both the extracted old executable and the
candidate. Network-disabled pure-reader results retain each operation identity
and stack location:

- 33 receipts across 14 recipes contain 140 identical duplicate `kind` sites in
  saved ingredient amount input. Duplicate properties are intentionally rejected.
- The other 13 were originally recorded at the combined final input-hash/derived-result
  condition. The continuation below isolates them as derived-result identity
  mismatches, with **zero input-hash failures**.

The old generated nullable union's duplicate discriminator explains a known
producer representation hazard. It does not qualify all historical hashes/results.
Existing `d1c12107` prevents future malformed transport; its public duplicate
rejection and the historical strict reader remain intact. No receipts were
collapsed, rewritten, discarded or treated as empty vocabulary references.

Operation `27bcc43b-c1db-4998-acf3-1a5e174742ab` retained its exact hold. Full
32-table comparison after rejected admission proves **zero database row changes**.
The reviewed vocabulary bytes remain
`9a73124844fd93422d00bda2a287169317377f69ef2a1a66f6b405e101e8274b`;
no vocabulary membership/file was installed. Two actual candidate Program starts
remained held and exited before activation, measured at 4.565 s and 5.427 s.
These measure held startup attempts, not a completed migration downtime window.

The diagnostic calendar date is 2026-11-14 UTC. There is no admitted migration
manifest or frozen migration evaluation date. Current-date freshness before
reopening remains blocked. All 36 weeks reported their historical `current`
status; that stored label does not establish freshness under a completed new
migration. Publication/retirement queues had no pending entries; retained history
admission is the blocking prerequisite.

The task-owned diagnostic DI helper is not the shipped migration executor. Its
executed paths establish the inspections above; unused interruption/restore
branches are unqualified and must not become an operator procedure. The retained
`DO-NOT-RUN.md` records this limitation. Required follow-up must reuse the shipped
guarded CLI and snapshot/recovery owners with new evidence paths.

## Retained V1 reconciliation: stopped at authority dependency

The continuation restored the original dump, SHA256
`25eab5f9bdc4f35b8385f05c86a0c384fe0b3da89c2576f04f89566d96cc9ecc`,
into one fresh PostgreSQL 18.6 container with no network or published ports.
All 46 operation identities, input hashes, original-request text and JSONB results
equal the earlier copied-library inventory. Exact original-request/input UTF-8
bytes and restored `result::text` bytes are preserved per operation beneath
`.task/v1-history-20261114/raw/`; JSONB did not retain original result wire
whitespace, member order or duplicate tokens. Original receipts were not rewritten.

The per-receipt report is `.task/v1-history-20261114/receipt-authority.json`.
Each record separates raw hashes, recipe/operation/version identity, original input
and hash derivation, captured baseline/revisions, result IDs/revisions and binding
dependencies, strict outcome and unresolved producer authority. The original
46-receipt failure inventory remains unchanged.

Both the exact extracted old assembly and a fresh build of entry HEAD reproduce
all 46 original-request byte strings through `CaptureOriginal`, baseline hashes,
expected content/source revisions and input hashes. This establishes the exact
writer/DTO representation family, not which historical process wrote each receipt.
The duplicate family matches the retained generated Kiota nullable union writers,
which both emit `kind`; `UpdateRecipeDto` stores those operands as `JsonElement`.
Source blob/package-lock identities and the prior raw-wire repair evidence are
retained separately. V1 contains no receipt-level writer/build/serializer identity.

The 13 nonduplicate failures differ only in newly allocated cooking binding IDs
and graph references, including `countBindingId` and allocation-group membership.
V1 `PrepareEdit` calls discovery with `Guid.NewGuid`, so rereconstruction generates
different IDs. All input hashes match. For the other 33 receipts, bypassing duplicate
parsing solely for component diagnosis reproduces the saved result. That bypass
is not an admitted format or a production reader change. Fresh strict old/current
readers still report **0 accepted, 46 rejected**: 33 duplicate inputs and 13 result
identity mismatches. No parser/result failure mechanism remains unexplained;
receipt-level producer authority remains unresolved for all 46.

The smallest proposed existing-owner repair would supply recorded fresh binding
IDs at independently reconstructed allocation sites using `DiscoverRecorded`,
while retaining V1 association policy and exact result comparison. V2 already
uses this owner. Independent read-only review found a blocking integrity limit:
V1's input hash does not bind its saved result, and recorded opaque IDs cannot
prove their own historical origin. A detached diagnostic changed a fresh binding
ID consistently with its references; the proposed recorded-allocation computation
still matched with the same input hash. This demonstrates a proof gap, not actual
tampering of the retained source. The approved bilingual storage contract also
keeps V1 pure derivation unchanged.

A narrow duplicate exception has the same authority gap: identical duplicates,
recognizable serializer shape and self-consistency cannot establish a known writer.
Continued strict rejection is therefore the selected disposition. No runtime or
test implementation was made, and no aggregate task closed.

The successor authority decision is now concrete in
[V1-AUTHORITY-DECISION.md](V1-AUTHORITY-DECISION.md), with the exhaustive
[V1-ATTESTATION-SET.json](V1-ATTESTATION-SET.json) and
[historical investigation](V1-HISTORICAL-AUTHORITY.json). Targeted retained
campaign/deployment/request-result inspection correlates all 46 receipts with ten
campaigns and reproduces historical whole-row hashes for 42; the other four have
operation/revision review but no recovered equivalent whole-row hash match in the
inspected representation. No authenticated per-operation writer/build/serializer
or original result wire binding was recovered. This is stronger historical
correlation, not recovered admission authority.

Alex **approved B: the one-time exact-source attestation policy** in a direct
`yes` reply to the exact package approval question; the durable decision is
[V1-AUTHORITY-APPROVAL.json](V1-AUTHORITY-APPROVAL.json). The alternative A
(admission from recovered historical authority) remains unestablished. All 46
remain strictly rejected by the current runtime pending separately authorized,
qualified implementation. The proposal names the exact four-file
backup, all recipe/operation IDs, request/input/baseline/result hashes, the exact
140 allowed duplicate sites, and fail-closed approval/replay/recovery rules. Its
result hashes bind retained PostgreSQL 18.6 JSONB `result::text` UTF-8, not
unavailable original writer/HTTP wire bytes. Alex designated this retained
source as present-day authority despite the missing historical provenance; no
historical writer identity is asserted.

The approval object is proposal `WFS-V1-EXACT-SOURCE-ATTESTATION-1`, package SHA256
`bb40457ca9b1ed47b79b2165d855b40f2970083c260de91d8055a1ee5f369827`,
[V1-AUTHORITY-PACKAGE.json](V1-AUTHORITY-PACKAGE.json). Approval covers **only this
finite integrity-policy exception**; later implementation remains separately
authorized and qualified. The frozen proposal/package and review remain
byte-identical, including their historical pending/unapproved labels; the separate
approval record supplies the current decision without changing the approved text.
It acknowledges unavailable historical writer/build/serializer and original result
wire proof, and the inability to detect alteration already present before capture.
The approved V1 contract,
strict rejection of all 46, all original receipts and aggregate task checkboxes
remain unchanged. Independent review and invocation-specific documentation
verification are recorded in [V1-AUTHORITY-REVIEW.json](V1-AUTHORITY-REVIEW.json)
and `.task/v1-authority-decision-20261114/delivery.json`; neither grants approval.
The approval-recording verification and signed delivery have their separate owner
`.task/v1-authority-approval-20261114/delivery.json`.

Focused existing public-duplicate and V1/V2 retained-history controls passed
**17 tests, zero skips**. Fresh original PostgreSQL read-back, current build and
strict/component diagnostics passed their stated checks. Regression RED/GREEN is
not applicable to this evidence-only delivery. Affected publication/recovery suites
and the full PostgreSQL suite were not run at this authority stopping boundary;
they remain required for a subsequently authorized runtime reconciliation. The
owned proof container/volume were removed; all six preexisting containers and
port 3000 match entry. No vocabulary publication, migration, conversion, reset,
reopening, source-environment operation or synthetic receipt substitution occurred.

## Independent acceptance and remaining gates

Focused existing migration/publication/recovery/bilingual/category PostgreSQL
owners passed **291 tests, zero skips**, receipt
`.task/database-tests/runs/e4fd7e228a0e48c3bcbc78d595ebb679/result.json`.
Their controlled fixtures qualify those owners separately from this actual library.

A fresh production live build `pwjscO2U3nIK1uB6emZNJ` passed **two native owners
and six real API/generated-client browser journeys**, zero skips/retries. It covers
current-revision legacy-write rejection, stale all-field editor drafts and
reconciliation, ordinary EN/FR producer/private correction/category paths and
independent read-back. Its source manifest is
`673008f1124a88c705b536f7960319ae985aa8e88134428a7e385ae3ad12aeaa`.
External provider doubles and controlled fixtures retain their original limits.
The mocked bilingual/package/online-recovery/recipe-recovery owners additionally
passed **19 cases, zero skips/retries**, on the fresh Portions production artifact.
Affected unit results and the terminal stable gate/full PostgreSQL retain their
own invocation identities in the delivery receipt.

Copied-library current-format capture, source-admitted migration, interrupted
conversion/resume, complete all-week rebuild, fresh post-conversion independent
backup→restore→re-export, coordinated frontend/backend/schema reopening and
reopening freshness remain **blocked or not-run due to source admission**.
No copied-library successful conversion, reset, recovery or reopening is claimed.
Earlier setup failures remain in their original logs: internal-network port lookup,
premature preview input, lost executable mode in a copied migration script, and
an incomplete app dependency output for the first held-start attempt. Their
corrected observations have separate records; none is behavioral RED or acceptance.

## Lifecycle and next bounded selection

No selected aggregate task completed: bilingual remains **8/10**, migration **3/8**
and the release family **33/68**. Migration 2.1–2.2/3.1–3.2 and bilingual 4.2 stay
open. All six changes retain unfinished criteria, so synced capabilities and
archived changes are empty. Parity cooking 4.1–4.2, complete local 6.2 and matching
hosted 6.3 remain open. The grocery design now reflects the already accepted
plan-preserving all-list policy; its historical empty-list gate is superseded.

Alex's approval of the exact policy package is recorded in
[V1-AUTHORITY-APPROVAL.json](V1-AUTHORITY-APPROVAL.json). This records the decision
and stops before implementation. A new bounded implementation selection still
requires separate authorization; no compatibility/attestation mechanism is
implemented. This source still has no valid current-format preconversion snapshot;
source admission, migration/conversion and all later runtime/recovery gates remain
blocked on separately authorized implementation and qualification, or not-run.
Do not remove history, substitute synthetic records or change
source membership to obtain a passing migration.

Shared-environment vocabulary adoption, migration activation, DV/production,
final release 5.1, later intake, Similar, garlic and adjacent UI remain subsequent
selections. Similar stays deferred and selective repair superseded/unimplemented.
Port 3000 and unrelated containers remain reserved; final cleanup is ownership-bound.

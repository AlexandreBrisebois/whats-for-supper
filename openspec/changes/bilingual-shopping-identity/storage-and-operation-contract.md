# Bilingual storage and operation contract

This narrows the reviewed live-owner-plan a4566d01 and C first-green-boundary-review da137c5d. It is not runtime qualification. At this contract freeze, the first producer RED is in progress and no production logic has changed.

## Shared storage and captured authority

`FoodVocabularyReference(Revision, Sha256)` names immutable exact UTF-8 bytes at recipes/.household/food-vocabulary/{revision}-{sha256}.json under RecipesRootResolver. Strict definitions document version1 is exactly {version,revision,sourceRef,units,releases}; release/food/alias meanings reuse current recovery records. No global mappings array. Reject duplicate/unknown fields, noncanonical identifiers/paths, malformed UTF-8, alias-key mismatch and active same-locale collisions; cross-locale exact lookup must resolve uniquely or abstain. Revision/qualifier immutability remains mandatory. Labels are not implicit aliases.

One document revision names one raw SHA256 across retained membership and captured authority. A second hash under that revision rejects during publication and admission. Resuming a prepared publication revalidates every retained file and its compatibility before further file or head writes. Restoring the exact accepted missing bytes permits retry of that retained operation. Historical V1/V3 derivation keeps its existing owner.

`FoodVocabularyCapture(Reference, ResolverPolicyVersion, RawBytes)` is the immutable operation authority. Root chooses **embedded exact raw bytes in new V2/V4 operation authority**, SHA checked against Reference, to keep historical derivation pure and independent of today's mutable files/head. There is no interchangeable fallback between embedded bytes and disk. Live admission still validates the referenced on-disk document; full snapshot requires all referenced disk documents, including history-only references, and rejects missing/corrupt files. Embedding does not waive that inventory or license reseeding. Buffers exposed to consumers must be defensively owned. ResolverPolicyVersion is1 with explicit dispatch; unsupported versions fail. Each new V2/V4 request binds one closed FoodVocabularyAuthority containing its active reference and a finite unique set of FoodVocabularyCaptures for that head plus every prior/result mapping reference needed by this operation. A current-head B does not replace retained A used by an unchanged line. New decisions resolve only against the captured active head; unchanged associations validate against their captured referenced documents. Missing/duplicate/conflicting documents reject before writes; no historical lookup of today's head or files.

`FoodVocabularyStore` requires db, storage, generation/root, RecoveryBoundary, clock. Methods: CaptureActiveAsync -> nullable capture; LoadCapturedAsync(reference) -> validated capture; PublishReviewedAsync(bytes, expectedHead, operationId, adoptionReviewIdentity) -> retained committed outcome. No optional-null production dependency, public management API or implicit first-request installation. Membership is the reviewed version1 family_settings food_vocabulary_publication shape from the pinned synthetic fixture, with exact operation/input/outcome replay. Initial absence is permitted only with no current mapped/evidence/override references AND no retained/prepared vocabulary operation, V2/V4 canonical/publication/workflow or other history-only vocabulary reference; it returns no active vocabulary rather than installing anything. Membership present but invalid/missing document fails closed. Replay selects retained op before today's head, validates same request, and never reactivates an old head. Publication holds existing exclusive Publish lease, records prepared operation before immutable file publication, and commits head/retained outcome under consistent settings lock. No shared-to-exclusive upgrade.


For the live definitions document, exactly one release must have `release.revision == document.revision`; that is the active release. New mappings resolve only explicit validated aliases in that release. Array order, timestamps, retained aliases and repeated FoodIds do not select a release. Retained releases serve validation/carry only. A saved mapping validates its exact captured document revision/raw SHA, dictionary release, food ID and food revision without rematching it to today's active release. A missing or duplicate active selector rejects publication; a removed alias cannot revive from a retained release. This selector is a live-document rule, not a retroactive requirement on old archive records that lack a document revision.

## Recipe evidence and versioned derivation

Add nullable recipes.food_mapping_evidence JSONB beside canonical_content, with matching EF/schema/compatibility inventory. Existing null means preadoption; present version1 evidence includes mappings and nameDecisions even if mappings empty. Each mapping carries existing CurrentRecoveryFoodMapping facts plus vocabularySha256/resolverPolicyVersion. Name decisions bind line/content revision, deciding operation, exact saved name, durable provenance kind (source, explicit_private, legacy_ambiguous, protected_clear) and relevant mappingRevision. Unchanged is an operation transition action, never replacement durable Name provenance. Quantity-only Save carries the original private/clear decision and deciding operation forward while updating contentRevision; it cannot demote either decision to source/unchanged. One line may not have duplicate/conflicting active evidence; every association must validate against the captured definitions and canonical source/protection. Exact struct names are implementation details; complete strict membership/hash semantics are required.

Keep old RecipePublicationFields/Observe/RestoreObservation and null/2/3 field hashes unchanged. Keep OriginalRequestV1, CanonicalRecipeWriteResult and V1 pure converter/editor/history bytes unchanged. New V4 capture/envelope binds old V3 fields plus exact observed evidence/hash and FoodVocabularyAuthority; new V2 canonical original/result binds prior evidence/hash, explicit decisions and captured definitions, while the public response unwraps existing Content/CreatedIds. Explicitly dispatch versioned validators. Never change ==3 to >=3 or omit Shopping from FreshOriginalFacts/SameReviewedLine. All new follow-up/launch/media/category/readiness/canonical-export captures carry evidence fences. New mutation must compare content/source/evidence baseline before atomic content+evidence+history commit. Undelivered old operations cannot apply across new evidence; delivered replay remains historical and never rewrites live facts.

Pure mapping preparation accepts an already losslessly prepared canonical export, complete retained source-to-purchase phrase alignment, prior evidence/protection and captured authority. Use one qualification owner; do not alter old conversion derivation. Allocate mappingRevision for a decision only, carry it on quantity Saves and advance evidence contentRevision. Full residual source phrase must match one approved exact alias, with source/supply agreement; provider-shortened names and contradictory product qualifiers abstain. Saved descriptions, originals, units/packages and steps remain unchanged.

## Coordination and first acceptance

Npgsql RecoveryBoundary Read/Publish must coordinate even before Enabled; middleware enrollment must agree, respecting publication244001 then writes244002. Consistent settings/presentation lock precedes supper/recipe/week locks; no reverse ordering. Manual constructors must use real scoped vocabulary store sharing their actual DB/storage generation.

First GREEN extends the actual input-seeded producer RED with real store publication tests, mapped source/evidence/result checks and captured-A-after-head-B replay. Add meaningful negative/history tests BEFORE each corresponding implementation increment: old V1/V3 exact replay after adoption; sidecar/rawSHA/revision tamper; delayed old/new application; same op/different input; source-qualifier shortening; missing history-only file; publication interruption/lost reply; first-install cross-process coordination. These do not close grocery labels/corrections/recovery or release acceptance.

## Approved one-time exact-source V1 exception

The separately approved `WFS-V1-EXACT-SOURCE-ATTESTATION-1` package
`bb40457ca9b1ed47b79b2165d855b40f2970083c260de91d8055a1ee5f369827`
and approval record `6eef7a175751927f26fb41950f94d7c60de8b69acfab0a31148e8f5c5c78e0a7`
authorize present-day trust only in the four exact backup artifacts and 46 listed
V1 receipt/result pairs. Historical writer/build/serializer identity and original
result wire bytes remain unproven. Ordinary V1 derivation and public parsing remain
unchanged. This exception is isolated in an internal version-1 attestation validator;
V2 preparation cannot interpret V1.

Before returning an admission context, verify the pinned approval/package, complete
membership, all four backup artifacts and complete restored table/file lineage.
Bind the separately reviewed read-only intent, recovery operation, target generation,
policy/extraction versions and request digest. Caller hashes and environment flags
are insufficient. Use exact PostgreSQL 18.6 `result::text` UTF-8; never reserialize
to obtain a hash match. Permit only the 140 enumerated identical duplicate sites
in the 33 listed inputs and recorded fresh allocations at independently derived
creation sites, retaining reserved-ID, uniqueness and graph checks. Validate every
original identity, byte/hash, baseline/revision, full derived result and created-ID
map. Coherent ID substitutions still fail the exact attested result hash.

Replay returns only the validated frozen outcome and never applies historical edits
to live facts. Retain exact approval/package and receipt bytes as separate lineage
with the existing recovery evidence. Missing/corrupt evidence, interrupted preflight
or changed source/operation/generation/policy/request gives no write authority.
Other history, full-source/schema/file admission and current-format recovery retain
their existing strict owners. Attestation-gate acceptance is separate from complete
source admission; a subsequent blocker stops this slice. No migration, publication,
conversion, all-week rebuild, activation or deployment is authorized here.


## Selected schema-only descendant continuation

The separately authorized November14 continuation permits only the exact nullable
`recipes.food_mapping_evidence` column (all SQL NULL) and the empty
`household_food_overrides` table plus reviewed constraints/indexes on a task-owned
disposable descendant. Its pinned intent binds the immutable predecessor,
approval/package/source, operation/generation/request and reviewed schema inputs.
Every original column/value, row membership, identity/relationship and file remains
protected against the original authority. Expected schema differences are declared
from the pristine source and existing DDL owners before descendant modification;
whole-row recapture cannot create new authority. Transactional preparation and
exact revalidation gate completion and retry. Missing/corrupt/interrupted evidence,
partial schema, unexpected new values or any protected change fails closed.
Existing history/reference inventory stays strict. RemainingInventoryValidated is
separate from complete source admission and current-format snapshot acceptance;
no adoption, conversion, publication, rebuild, activation or deployment follows.


## Selected recovery-history continuation

A separately pinned continuation may carry approved exact-source authority through
existing recovery-history write/read/merge/context/reference/authority/index owners
using an explicit bounded internal context. Require all46 original receipts with
exact bytes/identities/timestamps; enclosing JSON must restore original PostgreSQL18.6
result::text UTF-8. Keep both predecessor intents and ordinary/public/demo readers
unchanged. Re-admit approved source/schema lineage at observation and fresh-process
read-back boundaries; compare full staged observations to the newly verified source.
Separate durable lineage and completion bind operation/generation/snapshot/request,
staging and history/index hashes. Partial staging, foreign/mixed contexts or altered
facts fail closed. Exact retry verifies existing state without historical mutation.
This authorizes no full snapshot publication/restore, vocabulary adoption or migration.

## Proposed full-snapshot continuation boundary — 2026-11-15

The [separate proposed continuation](../../../docs/handoffs/dependable-portions-next-slice/V1-FULL-SNAPSHOT-CONTINUATION.json)
and [acceptance contract](../../../docs/handoffs/dependable-portions-next-slice/V1-FULL-SNAPSHOT-PLAN.md)
are planning authority only. A later selected internal capture/staging/read-back
slice must bind fresh identities/markers to the original approval/package/source,
qualified schema transition and delivered history. It must preserve exact46 receipt
representations independently of normalized table JSON, original31 projections,
all1576files and all plans/events. Finite authority reaches existing history and
reference validation only; no global parser flag or ordinary/public/demo exception.

Retain manifest3/history1/index1 and complete current/retained/history-only reference
closure. Keep lineage/completion in a sibling envelope outside the closed payload.
No source/vocabulary sidecar rewrite, adoption, regeneration or implicit seed.
Fresh-process inspection re-admits originals/fresh prepared source and runs existing
file and database validation with rollback-only TEMP writes. It proves neither
self-contained offline restore nor publication, complete source admission or
migration acceptance. All predecessor authority documents remain unchanged; old
markers cannot authorize the new proposal and no aggregate task closes.

## Selected full-snapshot implementation checkpoint — 2026-11-15

Alex separately selected the migration companion's [bounded staging and inspection](../../../docs/handoffs/dependable-portions-next-slice/V1-FULL-SNAPSHOT-DELIVERY.md).
The proposed request/authority bytes remain unchanged. Finite internal history
validation retains exact46 receipts and complete reference closure while ordinary/
public/demo paths stay strict. Source-dependent read-back is separate from offline
restore, publication, complete source admission and adoption. Explicit source
file/table dispositions do not imply restoration of omitted operational artifacts.
The full request's trigger-row ordering comparison retains every catalog field and
duplicate; no predecessor policy or receipt derivation changes. Migration4.2 and
release5.1 remain open, with Alex owning hosted qualification.


## Proposed source-coverage evidence only — 2026-11-15

The full-snapshot [source-coverage successor](../../../docs/handoffs/dependable-portions-next-slice/V1-SOURCE-COVERAGE-PLAN.md)
is planning only. A finite coverage-only v5 owner must reconstruct unchanged v4
source/history context, preserve exact46 raw pairs and full reference closure,
and retain explicit existing source-protection projection plus durable read-back.
New observation IDs cannot replace source history IDs or grant admission/write
capabilities. Keep ordinary/public/demo strict and migration inventory/admission/
execution unchanged. The selected recovery16 is distinct from original31/all1576
protection. Fixed original46 authority cannot admit changed post-adoption data.
No vocabulary generation/publication/adoption, source sidecar rewrite, restore,
grocery reset/rebuild or migration runs. Existing aggregates and hosted gates remain open.


## Selected task-owned source-coverage observation

The separately selected coverage observer consumes the unchanged v4 full snapshot
and finite original46 context through existing source/snapshot/projection owners.
Its coverage-only v5 request and operation/generation never enter schema/history
context. Caller-retained request-bound attempt bytes are invocation input, chosen
and retained before observation; stage/retry/detached read-back compare those exact
bytes independently of the envelope's own timestamp/hashes. The closed seven-file
coverage format and complete original31/all1576 preservation remain separate from
the selected16 recovery projection. Missing/foreign/mutated authority fails closed,
including mutations during final source re-admission; retained bytes are checked
afterward. No dictionary regeneration/adoption, migration, publication, offline
restore or operational source-admission authority follows. Bilingual4.2 stays open;
see the [coverage checkpoint](../../../docs/handoffs/dependable-portions-next-slice/V1-SOURCE-COVERAGE-DELIVERY.md)
for actual qualification and remaining blockers.

## Selected migration inventory and pre-write continuation

The migration companion's [finite continuation](../../../docs/handoffs/dependable-portions-next-slice/V1-MIGRATION-PREWRITE-PLAN.md)
extends only the directly dependent part of open4.2. Fresh original authority
reaches existing inventory, typed references and fenced admission through an
invocation-local internal context. Schema/history still consume unchanged v4;
v5 remains coverage-only. Ordinary/public/demo readers remain strict. Original
sources retain their hold bytes; the separately checked execution descendant has
only the exact bound coordinator delta. No vocabulary creation, adoption or
publication occurs, and absent mappings/references remain honest.

The result certifies only the tested pre-write boundary. It is no persisted
capability and does not permit a later mutator to skip fresh admission. The fixed
original46 authority cannot validate changed post-conversion/adoption facts; that
authority transition remains a later blocker. No migration receipt, executor,
conversion, grocery rebuild/reset, registration, restore or activation follows.
See the [delivery checkpoint](../../../docs/handoffs/dependable-portions-next-slice/V1-MIGRATION-PREWRITE-DELIVERY.md)
and its terminal task evidence for exact qualification. Bilingual8/10 and its4.2
remain open, with migration3/8 and family33/68 unchanged. Alex owns hosted CI.

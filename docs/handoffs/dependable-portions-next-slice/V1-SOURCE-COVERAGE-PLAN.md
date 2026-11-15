# Proposed task-owned attested source coverage

Status: **continuation proposal; no execution in this slice**. This
second slice follows signed full-snapshot delivery `66f0feadce1ba857c378847c32589337bbf2211f`.
The proposed [version5 request](V1-SOURCE-COVERAGE-CONTINUATION.json) has SHA256
`7c24eecd198bfb4d03bd04426b304e857f433a20dbe63b6ca4f07c57d9b984a1` and binds the immutable terminal delivery
`725d926798aa0b3eb8d9eef784166f7873276d531ec072361c8a1b24650d1407`, source commit/runtime and all eight
package/authority component digests. Missing local `.task` prerequisites block
execution; neither this document nor a reserialized substitute supplies them.
The [implementation prompt](../../../.agents/prompts/dependable-portions-source-coverage-next-slice.md)
selects the later bounded scope. A separate user selection is required.

The predecessor's locally qualified stage/read-back has41primary and31supplemental
controls,853PostgreSQL passes/0skips and stable repository verification. Native
2989passes/723conditional skips and mocked-browser1008passes/106skips are separate;
PG853 excludes opt-in LiveBrowser_* real-API/PWA cases, which did not run. Hosted
CI remains with Alex. These results qualify the predecessor, not this unimplemented
coverage continuation. Source-dependent full-snapshot read-back passed; complete
operational source admission, publication, offline recovery and restore did not.

Planning only. This successor consumes the delivered full-snapshot package and
freshly re-admitted original source; it does not publish or recapture the package.
Its selected outcome is durable read-only coverage evidence and fresh-process
read-back through the existing source-protection owners. It stops before migration
inventory/admission, maintenance capabilities, executor, restore or publication.

The package's existing snapshot, operation and generation remain source identities.
The new request has a separate coverage operation/generation and its own markers.
They identify a new observation; they never replace the original history context.
No old preparation/completion marker counts as new coverage completion.

## Source-derived boundary

`RecoverySnapshotService.SourceProtection.cs` currently reads
`BackupRoot/<snapshotId N>`, applies ordinary validation, compares selected table
schema/rows, typed history, protected original/hero/vocabulary files and repeats
history/files/manifest/generation checks. `InspectSourceProtectionAsync` projects
those validated facts. `CanonicalRecipeContentStore.MigrationInventory.cs` calls
coverage before and after observation, then ordinary identity/reference owners.
`MigrationAdmission.cs` repeats ordinary source/identity/reference checks under its
own mutator fence; `MigrationExecution.cs` requires coverage before a new plan.
These are separate boundaries. Successfully exposing coverage evidence cannot grant
those downstream mutators authority.

Actual full-snapshot independent read-back passed with finite V1 history authority;
its ordinary reader still rejects `Original canonical operation is inconsistent.`
The task package is unregistered, so the ordinary coverage lookup has no manifest
at its configured BackupRoot location. That latter lookup is source-derived, not a
runtime execution of migration. Copying this package into BackupRoot would not
make ordinary recovery or source admission safe. Publication is unnecessary for the
selected private coverage observer and is excluded.

## Prospective implementation

Add one finite internal coverage entrypoint. Pin version5 raw request bytes in a
coverage-only policy owner. Never send v5 into schema preparation or historical
context construction: both continue consuming unchanged version4 bytes and source
operation/generation/snapshot identities. Admit the exact proposed coverage
request and predecessor delivery/package hashes; invoke the existing full-snapshot
policy with its unchanged original request to rebuild source authority. Prepare
fresh disposable PostgreSQL18.6 pristine/descendant copies using only the qualified
two-addition schema transition. All physical copies live in a new task-owned
runtime root, retaining the predecessor request's root-relative source paths and
logical source identities. Do not rebind the old request to new paths/IDs or edit
its bytes. Keep both old/full completion and new coverage completion independently
validated.

Reuse `WithAttestedSnapshotSourceAsync`, full existing snapshot file/database
inspection and source comparisons, and `ProjectSourceProtection`/source-protection
comparison helpers. Extract only the shared comparisons needed; ordinary callers
keep their current BackupRoot resolution and strict context. Do not introduce an
arbitrary loader delegate, public flag, DI bypass, permissive reference validator,
parallel snapshot format or non-null context on public/demo/restore paths. Keep
all16 selected recovery-table and protected-file/history checks plus independent
all31 original projections/all1576 original-file admission; the latter cannot be
replaced by the selected v3 projection.

Observe within one bounded Snapshot lease/coherent transaction with the current
lock ordering. Reuse existing binding rather than recursively entering a second
lease or nesting an EF transaction. The separate admission connection remains independently read
only. The outer SHARE-lock observation transaction must not be changed to SET
TRANSACTION READ ONLY (PostgreSQL disallows those locks there); it permits locks
and reads with no persistent DML. Existing validation may use TEMP rows/constraints in rolled-back transactions;
no persistent domain/receipt/journal/sidecar write is allowed after copy preparation.
Repeat source, payload, envelope, context, roots/generation and protected facts at
the final boundary; compare against retained before-image bytes after that last
re-admission. An identity-only projection or cached attestation is insufficient.

Serialize a deterministic task-only coverage observation: exact new request/hash,
new operation/generation, unchanged source snapshot identity, full predecessor
manifest/history/index/lineage/source-inventory/completion/attempt hashes, live
schema/generation, complete projected table content or canonical content hashes,
protected-file path/length/hash inventory, typed-history digest/exact46 receipt
comparison and full original-source preservation/disposition digests. Declare
observed live generation independently from snapshot generation; null is valid
only as observed by existing roots owner. No fake pointer selection.

Full-snapshot inspection already performs most table/history/file comparisons.
The successor adds the explicit existing-owner source-protection projection and
durable observation/reconstruction, not broader admission. Leave MigrationInventory,
MigrationAdmission and MigrationExecution unchanged; construct no migration request
or CanonicalMigrationInventory.

Keep existing RecoverySourceProtection meanings and v3/history1/index1 wire semantics.
The new task-only envelope wraps that projection with coverage evidence; it is not
an alternative recoverable backup. Use existing durable exact-byte retention,
flush/reread and completion-last rules. Fresh-process read-back reconstructs finite
authority, validates both complete package and current protected source, and compares
all observed content. Package-only/offline reads remain unsupported. Retry resumes
only the exact same attempt/request/source/package bytes, never resets later facts,
never overwrites divergent completed artifacts and never silently recaptures source.
A changed source requires a separately reviewed continuation.

## Closed coverage evidence layout

Under the new task output root, use `coverage-stage/payload/coverage.json` and
`coverage-stage/payload/source-protection.json`; sibling `coverage-stage/authority/`
contains exactly `attempt.json`, `source-lineage.json`, `source-inventory.json`,
`preparation-complete`, `complete.json`. The detached independent root contains
exactly `payload` and `authority` with the same seven files. Only known same-byte `.pending` siblings may resume before completion; completed
read-back admits no pending files. No extra files,
symlinks, unknown/duplicate JSON fields or path traversal. These are task evidence,
not snapshot files and never registered under BackupRoot.

`attempt.json` version1 binds the exact v5 request SHA and retained capturedAt.
Choose capturedAt once before observation and retain its exact bytes/time across
interruption; only this known valid pending path can resume before the first final
attempt. Corrupt/foreign pending input fails closed. No retry calls the clock for
a new time. Observation time identifies the coverage run, not original receipt time.

`source-protection.json` serializes the existing projected record without losing
its fields: snapshotId, manifestSha256, schemaSha256, generation, complete tables,
exact historyBytes, protected files and declared derived omissions. Freeze the
existing owner's Json serializer and exact ordering/bytes; do not normalize history
bytes or treat table JSON as exact original result text.

`coverage.json` version1 has kind `attested-v1-source-coverage`, coverage operation,
coverage generation, capturedAt, request SHA, unchanged source snapshot identity,
all seven predecessor identity digests (manifest/history/index/lineage/inventory/
completion/attempt), live generation and all-public-table schema digest, projected
schema digest, projection SHA, exact46 receipt count/comparison, original31 projection
digests, original1576 path/length/hash source inventory digest and explicit source
inventory SHA. Freeze deterministic order by existing ordinal owners; counts alone
are insufficient. Carry all31/1576 observations or their pinned complete artifact
hashes, rather than a boolean with no contents.

Authority lineage/inventory are exact v4 package bytes. `preparation-complete`
contains v5 request SHA plus newline after fresh source/package admission; it is
not the existing v4 source preparation receipt. `complete.json` version1 binds v5
request, new operation/generation, capturedAt, all predecessor source bindings and
sorted relative path/length/SHA inventories of both payload files and all four
other authority files. It is flushed last and reread, then the source and all
preserved artifact bytes are checked again. Independent read-back reconstructs
these expected contents and validates exact file equality; self-consistent rehashing
of foreign source or context never substitutes for finite authority.

## Acceptance and stopping boundary

Test first: new request rejected by old finite owner; real admitted source reaches
ordinary unregistered/strict history boundary; private full coverage succeeds only
with exact predecessor authority. Retain ordinary/public/demo strict rejection.
Run real PostgreSQL stage -> exit -> detached coverage copy -> new-process read-back
with all46 original request/result UTF-8 pairs exact, all31 original projections,
all1576 files per source tree, all plans/calendar/events/human/grocery facts unchanged,
new evidence SQL NULL and overrides empty. Full snapshot remains byte-identical.

Negative controls must include missing/corrupt four backups and every bound request,
approval/delivery/schema/package/coverage artifact, extra/symlink/duplicate/foreign
memberships, rehashed changed rows/files/history and semantically equivalent result
text, foreign new operation/generation paired with valid old completion, mixed
source contexts, protected source/manifest/authority mutation during the final
re-admission, freeze cancellation, interruption before/after completion, lost reply,
exact retry and divergent retry refusal. Capture before/after table/file/receipt and
owned-resource inventories. Distinguish tooling/compile failures from behavior RED.

Run focused API and affected current recovery/source-protection/migration observation
regressions; full PostgreSQL with zero required skips; task prepare then complete-path
stable task verify and OpenSpec checks. Use isolated owned browser source/build/port,
preserve3000/preexisting runtimes and originals. Independent read-only frozen source
and final evidence review must confirm no admission/publication/restore authority
escaped. Retain signed commits/pushes and exact committed hashes/remote refs when
separately selected; Alex owns hosted CI monitoring/reruns.

Claims remain separate: full-snapshot stage/read-back predecessor; bounded coverage
observation; migration manifest; operational source admission; offline recovery;
restore; producer/adoption/rebuild; final hosted/release acceptance. Do not close
aggregate migration3/8, bilingual8/10 or family33/68. Historical writer/build/serializer
and original wire identity remain unproven. The fixed original46 context is invalid
for post-conversion/adoption facts; never widen its membership to reach a later gate.

No snapshot BackupRoot registration, current/demo pointer, public endpoint, restore
journal, new canonical migration request/inventory/receipt/capability, executor,
conversion, vocabulary publication/adoption, grocery reset/rebuild, activation,
deployment/DV/production, UI, archival or Entire setup repair. A downstream ordinary
identity/reference/admission failure is a new stopping boundary, not permission to
cross it. Report it as a finding on the existing Entire change.

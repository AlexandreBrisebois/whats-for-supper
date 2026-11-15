# Attested full-snapshot staging and independent read-back

Alex selected this implementation after planning commit
`d2c9622887709547daacb2a0a79dd5b9114db0d8`. This delivers only the bounded
[full-snapshot contract](V1-FULL-SNAPSHOT-PLAN.md). The immutable
[request](V1-FULL-SNAPSHOT-CONTINUATION.json) retains its proposed status/bytes;
Alex's separate selection authorizes this work, not that artifact's existence.
All predecessor authority, original backups and receipts remain unchanged.

Observed so far: finite admission, prepared-source capture, complete durable stage
and fresh-process source-dependent independent read-back pass. Final corruption/
interruption controls, prepared-source review, full PostgreSQL, repository checks
and signed delivery are pending at this document's cutoff. Their terminal outcomes
belong to `.task/v1-full-snapshot-implementation/delivery.json`; do not infer final
acceptance from this cutoff or close aggregate tasks (migration3/8, bilingual8/10,
release family33/68).

## Implemented boundary

The new internal stage/inspection owner holds the existing Snapshot lease and a
single observation transaction with original-table SHARE locks. It reconstructs
finite authority from pinned approval/package/backups, exact schema lineage and
history delivery. Existing artifact construction produces manifest3/history1/index1:
16 selected recovery tables, 818 listed artifacts and the manifest itself. Lineage,
source dispositions, attempt/preparation evidence and completion remain in a sibling
authority envelope, outside the closed ordinary payload.

Inspection invokes existing closed-file/recipe/media/vocabulary/history validation
and rollback-only PostgreSQL schema/column/constraint/FK/weekly-history validation.
Every selected table is compared with the protected source; exact46 receipt pairs
retain original PostgreSQL18.6 result::text UTF-8 separately from normalized table
JSON. Original31 table projections and all1576 files per source tree remain protected.
Source inventory v2 explicitly classifies copied, typed-history, derived and excluded
items, naming each existing owner/reason and refusing unexplained omissions. It does
not claim that the selected v3 payload restores all31 tables/all1576 source files;
original archives remain separate required protection.

The existing ordinary/public/demo paths receive no attestation context and remain
strict. Actual ordinary reading of the independently inspected attested package
still rejects with `Original canonical operation is inconsistent.` No snapshot was
registered/published into BackupRoot, no current pointer or restore journal was
selected, and no restore, complete source admission, migration/conversion,
vocabulary publication/adoption, grocery rebuild/reset, activation or deployment ran.
Fresh restoration of the original backup to prepare owned copies is distinct from
restoration of this new snapshot; the latter did not run.

## Identity and evidence

The approved request binds operation `58847a7c-85a8-4fbf-861e-d5f4959b3571`,
generation `ec6c4e6f569d4fb4be7055abb2c2227e` and snapshot
`64094478-a3f8-4019-8377-c27e3bc32d5d`. Its SHA256 remains
`8e4692096d14c4554622e6c6b3c9b659c985dbc2506651e6d3273124abbee299`.
The corrected independently inspected package has manifest SHA256
`652a6a3c021639a6ea4320d3972ee19697699ddc455c6e5c7df2abcc705ffd47`
and source-inventory SHA256
`b2e99ac0412f7fc28441c3882220b3fd56dbe434577a10c748bb9fec1f10f2b9`.

The prepared-candidate package is exported under
`.task/v1-full-snapshot-implementation/final-linux-package/`, with `staged-snapshot`,
`snapshot-authority`, exact read-back receipts and stage/inspection identities.
The actual Linux root is `/work`, with the request's root-relative stage/envelope
and detached `independent-snapshot/payload` plus `independent-snapshot/authority`
layout. `linux-fixture-resources.json` records that owned filesystem and runtime.
Earlier outer-root and `qualification-root` prototype artifacts remain retained;
their old envelopes are not the prepared-candidate package.

Runtime qualification requires pinned originals and a freshly verified prepared
source, not cached attestation or the package alone. This does not establish offline
restoration. The same request/capture time was retained across corrected disposable
fixtures; completed prototype files were preserved separately, never overwritten
through the runtime retry protocol.

Evidence owner `.task/v1-full-snapshot-implementation/`: policy/capture RED/GREEN,
mutation and pending-attempt RED/GREEN, source/read-back identities and exact receipt
comparison, source dispositions, catalog diagnosis, detached controls, runtime and
preservation records, independent frozen reviews and terminal delivery.

## Review corrections and retained failures

A detached control observed prototype acceptance after an artifact changed during
final source re-admission. The preserved payload/envelope fence now rereads exact
files, media and completion after that final source check. An interrupted initial
`attempt.json.pending` now resumes only from the exact valid request/time bytes;
unknown or corrupt provisional input grants no authority. Same-attempt retry never
overwrites divergent final bytes, reapplies historical edits or resets later facts.

Catalog diagnosis retained the exact failing admission observation: all65 complete
trigger tuples and every other catalog field matched; the self-FK's parent/child
UPDATE rows exchanged order under the same table/constraint/tgtype sort key.
PostgreSQL documents implementation-dependent order when all ORDER BY keys tie.
[PostgreSQL18 SELECT documentation](https://www.postgresql.org/docs/18/sql-select.html).
Only this pinned full-snapshot continuation compares complete trigger tuples as an
order-independent multiset, preserving duplicates and every field. Other catalog
fields remain exact; predecessor policies and source/prepared descriptor bytes stay
unchanged. Regressions reject disabled/changed, extra or missing triggers and changed
columns. The original mismatch is retained rather than described as schema mutation.
Catalog evidence retains the predecessor owner's coverage: ownership/ACLs, comments,
statistics and physical index metadata are not fully fingerprinted.

Initial compile errors, a macOS fixture-path/fsync mismatch, the first owned restore
startup failure, prototype disposition gaps and an overlapping-probe RecoveryBusy
control remain separate evidence. None is final acceptance. Qualifier probes sharing
the source database are serialized; normal PostgreSQL suites use separate owned
resources. Port3000 and all preexisting containers/databases remain protected.

Historical writer/build/serializer and original result wire identity remain unproven.
Hosted Tonight tests in original run43676429700 attempt1 never ran after Chromium
provisioning failed. Alex owns matching hosted CI evidence/monitoring/reruns. Local
source-dependent read-back does not qualify hosted success or release completion.

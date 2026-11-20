# Retained V1 authority decision — proposal only

Proposal `WFS-V1-EXACT-SOURCE-ATTESTATION-1` is **unapproved and inert**.
Recommendation: **B, a one-time exact-source attestation**, accepting a specific
retained recovery set as present-day authority. This is an explicit change in
integrity policy. It does not establish historical writer identity. Until Alex
approves that policy and a later implementation slice is separately authorized,
all 46 receipts remain rejected and the approved V1 contract stays unchanged.

## Evidence and the remaining proof gap

Entry local and remote branch `recipe-view-redesign` both matched
`d6c309df8e2c1a9cc0dbb5559a84ebb39cd2f6b2`; the worktree was clean.
The prior immutable 163-item manifest
`.task/v1-history-20261114/review/prepared/manifest.json`, SHA256
`8744bc161e8ddba23506b1781ee6b4a4084b62cdf93fb9d807bcc4094a5fa5e2`,
was rechecked without repeating its diagnostic campaign. Its exact detached
substitution operand and original receipts remain preserved.

All 46 original-request representations, baseline/revision checks and input
hashes reproduce. Thirty-three receipts across 14 recipes contain 140 identical
duplicate-property sites; the other 13 fail fresh binding-ID/result-reference
reconstruction. Strict old/current readers reject all 46. The recorded-ID
diagnostic also reproduces a consistently substituted fresh binding ID with an
unchanged input hash. This proves a limitation, not tampering of the source.
V1 has neither a writer identity nor a hash binding its saved result.

The targeted [historical evidence report](V1-HISTORICAL-AUTHORITY.json) joins
retained campaign, deployment, browser observations and preservation records:

| Recovered evidence                                                                     | What it establishes                                                                                           | Limit                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Ten named campaign reports covering all 46 receipt recipe IDs                          | Campaign/recipe correlation, candidate claims, observed edits                                                 | No authenticated per-request writer/build/serializer binding                                                |
| Reproduced historical sorted compact whole-row hashes for 42 receipts, zero mismatches | The retained request, input hash, IDs, timestamp and saved JSON value match those historical row observations | Local evidence integrity/correlation, not independent cryptographic execution authorship                    |
| Explicit operation/revision review for the other four, from annotated-half and C05     | Reviewers linked exact operations to accepted edit revisions                                                  | An equivalent whole-row hash match was not recovered in the inspected representation                        |
| Deployment read-backs and candidate reports                                            | Runtime image/commit claims associated with a campaign                                                        | Candidate names, time proximity and source-family resemblance do not authenticate each writer or serializer |
| Original dump restore/read-back retained by the predecessor                            | These 46 rows were present in that exact recovery set                                                         | The recovery capture happened after the writes; it cannot prove their original authorship                   |

The report lists every recipe/operation, campaign path/candidate claim, evidence
hash and missing proof. Some fixed-use rows precede the final successful campaign
window; campaign membership is not relabeled as execution-time proof. The failed
package campaign remains failed. Its retained operation evidence is still data;
it does not become campaign acceptance. Later PostgreSQL-text row digests are a
different representation from sorted compact Python JSON and were not silently
equated with it. Browser reports retain parsed observations, not an authenticated
raw request/result transcript. No historical serializer identity is invented.

## Options

| Option                                           | Decision and consequence                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Admission from recovered historical authority | Not established. The recovered records strengthen correlation and saved-value continuity, but do not complete the per-receipt writer/build/serializer and original-result binding. Do not authorize a general recorded-ID or duplicate exception from this evidence.                                                                                                                   |
| B. One-time exact-source attestation             | Recommended for Alex's decision. Replace the missing historical provenance requirement only for this exact approved recovery set and 46 receipt/result pairs with Alex's explicit present-day trust designation. Preserve structural/input/baseline/result checks and reject every unlisted variant. Implementation and migration still need separate authorization and qualification. |
| C. Continued rejection                           | Current/default disposition, also the fallback if B is rejected or any required artifact cannot be retained/verified. Preserves the approved contract fully; copied-library admission and dependent migration remain blocked. No deletion, receipt repair or removal of source members is an alternative.                                                                              |

B is useful because it gives a finite, reviewable path toward the selected copied
library without pretending the absent provenance was recovered. It knowingly
accepts the possibility of a pre-capture alteration already present in the named
backup. If that residual trust is unacceptable, choose C. A requires genuinely
new historical proof, not another repetition of the completed reconstruction.

## Exact proposed trust boundary

The machine-readable [attestation set](V1-ATTESTATION-SET.json) is the exhaustive
membership and hash authority. It names **46 version-1 edit operations on 14
recipes**, each recipe/operation ID, timestamp, captured baseline/revisions,
stored operation input hash, SHA256 of exact original-request text UTF-8,
extracted input UTF-8 and retained JSONB result text UTF-8, and exact allowed
duplicate sites. No wildcard recipe, date range, serializer shape or source name
can add members. Whole-row hashes additionally bind the retained row metadata.

The sole proposed trusted source is the retained predeployment recovery set at
`.task/dependable-portions-coordinator/pdf3/release/predeploy-8585db24-8ac9-4b9d-97aa-d21800055f82/`:

| Artifact      | SHA256                                                             |
| ------------- | ------------------------------------------------------------------ |
| database.dump | `25eab5f9bdc4f35b8385f05c86a0c384fe0b3da89c2576f04f89566d96cc9ecc` |
| data.tar      | `07e26b87a47805f9abdfad69ce6a54d15a03236c13607d50e7b0d0edd1ccb76b` |
| files.sha256  | `4cb537857d48de963ae91044457828c14643708a4e9d99ee23248e6af84a99ce` |
| readback.json | `ff367e7662ce7eea8c8a6e05783ade721e2b61f3832d25dc6f0e61cc6c84052a` |

All four artifact hashes and 138 raw receipt artifacts were checked this slice.
These hashes identify the proposed trust object; they do not themselves justify
trust. Approval means Alex designates these bytes as the recovery authority now.
PDF3's aborted application acceptance remains separate and unaccepted.

The result hashes name **retained PostgreSQL 18.6 `result::text` UTF-8 bytes**, as
captured in `result.jsonb.utf8.json`. They are not original result HTTP/writer wire
bytes, original JSONB on-disk binary bytes or a newly canonicalized JSON encoding.
JSONB discarded original whitespace, key order and duplicate tokens. Those
original result wire bytes cannot be recovered or attested here. A later executor
must use the pinned extraction profile and compare exact text bytes; different
serialization must stop for separate qualification, never silently rehash the set.

## Proposed validation policy for a later implementation

1. Only a dedicated internal, explicitly selected copied-source admission context
   may consult this policy. It must bind this proposal/package digest, Alex's
   approval record, the four source hashes, the exact receipt-set digest and a
   separately reviewed task-owned recovery operation/target generation. No global
   parser switch, environment flag alone, public caller assertion or normal API
   request may confer authority. A restored copy must demonstrate its lineage from
   this exact backup; presence of one matching receipt in another source is not
   sufficient. Current full-source admission, file/schema and preservation checks
   remain mandatory; matching the 46 rows is not whole-library acceptance.
2. Preflight the complete 46-pair membership and every listed byte/hash/identity,
   including stored input hashes and baseline/revision checks, before any write.
   Missing, added, duplicated, foreign, unsupported-version/kind or changed
   members reject the attested set atomically. Other history continues through its
   existing strict owner; this attestation grants no exception to it.
3. Recognize only the exact historical input bytes listed. For the 33 listed
   duplicate inputs, permit only the enumerated 140 identical `kind` sites with
   their exact occurrence structure and values, through an isolated internal
   historical reader. Conflicting, additional, moved or differently represented
   duplicates reject even if a parser would resolve to the same value. Preserve
   strict rejection of duplicates in all public/new input paths and all other
   envelope members. Do not rewrite, deduplicate or replace saved receipts.
4. Derive using the captured V1 baseline/input and unchanged V1 domain semantics,
   independent of today's mutable recipe/vocabulary state. A separately reviewed
   versioned attestation validator may use recorded fresh binding allocations only
   at independently reconstructed creation sites, with unique/nonempty/reserved-ID
   and graph-reference checks. Preserve full result/created-ID comparison and
   exact attested result hash checking for all 46; do not use V2 preparation to
   replay V1. Do not accept arbitrary IDs simply because they are self-consistent.
   A coherent substitution changes the attested result hash and must reject even
   when the input hash and reconstructed graph still match.
5. Unsupported representations, incomplete provenance-of-copy, missing approval,
   hash mismatch, unknown policy/extraction version, content/source mismatch,
   missing or altered baseline, invalid graph, or result mismatch stop before
   writes. There is no permissive fallback, recomputed allowlist, live-baseline
   substitution, membership repair, blanket old-writer claim or attestation of an
   unknown source. Inside this exact set only, Alex's trust designation explicitly
   replaces the missing historical writer proof; it does not discover that proof.

## Approval binding, replay and recovery

[V1-AUTHORITY-PACKAGE.json](V1-AUTHORITY-PACKAGE.json) binds this policy text,
attestation set and historical evidence report by exact SHA256. Alex's durable
decision must explicitly name proposal ID, package SHA256 and source dump SHA256,
choose approve/reject, acknowledge the missing writer/result-wire guarantees, and
include actor/time plus a durable link to the decision. A signed documentation
commit, clear independent review or the existence of this proposal is not approval.
Any changed core artifact invalidates the approval binding and requires a new
review/decision. Approval of B would approve this finite integrity-policy exception
only; it does not authorize runtime implementation, migration, activation or DV.

A later approved mechanism must retain that decision and immutable package with
the recovery journal. Bind replay to the same source, operation, target generation,
policy and request digest. Exact historical replay returns the validated recorded
outcome without applying an old edit to current live facts; same operation with
different source/input/result/policy rejects. New edits follow their normal strict
versioned owner and cannot inherit this exception. Do not recapture or rewrite V1
receipts to claim a newer format.

Interrupted preflight has no write authority. Interrupted authorized migration
must reread its durable stage and authoritative state before proceeding, revalidate
the immutable approval/source artifacts, resume only unfinished safe stages and
never repeat a completed reset over later human checks. Lost replies do not permit
blind POST retry. Recovery must preserve original receipt bytes and carry the
approval/package as separate lineage evidence; missing or corrupt evidence fails
closed rather than downgrading to ordinary V1 admission. Later current-format
capture/restore/re-export, all-week rebuild and reopening gates remain required
and are not qualified by this policy document.

## Decision and stopping boundary

Independent review must inspect the immutable prepared policy, exact membership,
original raw receipts, predecessor substitution operand and retained historical
evidence. Review establishes the proposal's coherence and evidence fidelity; it
cannot grant Alex's trust or prove unavailable authorship. Documentation checks
and delivery records remain separate from runtime qualification.

No aggregate task is closed. No implementation, public parsing change, source
mutation, vocabulary publication, conversion, rebuild, activation, deployment or
later intake is authorized by this package. Port 3000, existing containers,
databases/files, original backups and every original receipt are preserved.

**Approval question:** Does Alex approve option B for
`WFS-V1-EXACT-SOURCE-ATTESTATION-1`, bound to this exact package SHA256 and dump
`25eab5f9bdc4f35b8385f05c86a0c384fe0b3da89c2576f04f89566d96cc9ecc`,
accepting this retained source as present-day authority despite unavailable
authenticated historical writer/build/serializer and original result wire bytes;
or reject B and continue strict rejection under C?

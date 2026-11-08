# Prerequisite review and baseline-integrity checkpoint — 2026-11-07

The [extraction review](grocery-prerequisite-review.md) records the approved
prerequisite sequence, source inspection, exact recovery activation gate and
unresolved precision proof boundary before implementation. Canonical saved-row
identity/guarded publication is **not implemented or qualified** by this checkpoint.
Grocery remains open; no task is checked off, synced or archived.

## Implemented bounded correction

Malformed Unicode-digit rational operands in persisted checked-demand baselines
caused invariant BigInteger parsing to throw and abort recompute. Persisted rational
validation now checks bounded ASCII spelling, nonzero denominator and reduced form
directly before parsing. Human amount and compatibility numeric-token grammars
accept only supported ASCII digits; Unicode fraction glyph support remains intact.
There is no new quantity representation, rounding, fraction inference, unit change,
ID persistence, content guard, source-publication or read-time write in this fix.

New PostgreSQL acceptance covers missing/null/malformed entries, Unicode numerator
and denominator, unreduced/null operands, a future acknowledgement version, an
incomplete baseline and an unknown baseline. Each journey checks both the untrusted
row and an unrelated valid row, changes actual demand, recomputes in a fresh scope,
and proves: the untrusted row stays checked without acquiring a new baseline; the
unrelated provable increase resets; unchanged retry retains versions/summary; API
reread has no retired review marker. Malformed entries may become null rather than
being relabelled as an acknowledgement of current demand.

This is regression repair and partial matrix coverage, not proof for every mixed
contribution, changed-evidence or historical-fingerprint case. There is no inference
of positive cross-bucket lineage from this evidence.

## Executed evidence

All session logs are under `.task/canonical-prerequisite-20261107/`.

| Check | Actual outcome |
| --- | --- |
| Initial native unit attempt, `quantity-red.log` | Blocked before tests by sandbox test-runner socket; not behavioral red |
| Initial PostgreSQL attempt, `integrity-red.log` | Blocked before tests by Docker access; record `4c0d311a04d5403c942b3b585fa68a61` |
| Escalated focused quantities, `quantity-red-escalated.log` | Intended red: 7 fail, 39 pass, zero skips; FormatException in unsupported digits |
| Escalated PostgreSQL matrix, `integrity-red-escalated.log` | Intended red: 2 fail, 8 pass, zero skips; both malformed-digit operands abort recompute |
| Focused quantities/recompute, `quantity-green.log` | 116 pass, zero failures/skips |
| Selected PostgreSQL concurrency/recovery, `integrity-green.log` | 80 pass, zero failures/skips; includes all 10 new integrity cases |
| Full native API, `api-full.log` and `api-results/canonical-prerequisite-api.trx` | 1,466 pass, 298 opt-in/platform skips, zero failures; skips do not qualify real seams |
| Strict OpenSpec canonical + grocery checks | Both pass using private pinned 1.16.1 CLI; separate logs retained |
| `git diff --check` | Pass |

The PostgreSQL red record is
`.task/database-tests/runs/0577b8919704453cb5897dcb22f25c8f/result.json`.
Green record:
`.task/database-tests/runs/98a535e5b74d488d8f675f4a8a14badd/result.json`.
These records pin actual selected/started/completed cases, source identity, Linux
ARM64 SDK/PostgreSQL image identities and resource removal. No live-browser cases
run in this selection; the runner excludes `LiveBrowser_` explicitly. Both runs'
owned database, SDK and network resources report `removed: true`. Supported
escalation succeeded; no automatic approval rejection occurred.

No application/test bytes changed after these green runs. Subsequent changes are
specification/evidence documents only. Exact final source hashes and private
before-images are in `.task/canonical-prerequisite-20261107/`. Native uses installed
SDK rc.3; isolated database runs use the repository-pinned Linux SDK rc.2 image.
Neither runtime result is attributed to the other.

## Still required

Implement and qualify the complete extracted canonical path before claiming saved
ingredient lineage trustworthy. No OpenAPI/schema/client/editor/publication change
was made here. Actual canonical conversion/edit/publication and exact current-format
recovery tests remain not-run. The protected editor overlap requires coordination;
all 26 protected files retain entry bytes.

Complete the remaining grocery precision/mixed-baseline/focus/live journeys, full
existing-data migrate.sh rehearsal, inherited diff review and prepare/verify, four
production browser suites and hosted same-candidate qualification. The previous
349-pass full PostgreSQL run predates this runtime correction; this checkpoint
claims only its new selected 80-case pass. Hosted CI is still prohibited and not
run. No whole-task or release qualification is claimed.

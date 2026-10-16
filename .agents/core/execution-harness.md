# Execution harness

Use Taskfile.yml as the command interface. Inspect targets and scripts when their
effects or verification coverage are unclear. Commands do not grant authority to reset data, kill shared
processes, stage files or extend the selected task. A worktree alone does not isolate
processes, ports or databases.

## Preparation and verification

Use `task verify:plan -- <paths>` to preview the existing verification selection
as JSON, including selecting paths/classes, prerequisites and excluded scope.
With no paths it uses all current Git changes. It runs no checks, computes no
runtime fingerprints and writes no evidence; it does not establish readiness or
acceptance. Recompute after edits. Unknown impact retains the conservative union.

For focused red/green feedback, `task test:api -- --filter <expression>` forwards
arguments to the API test runner; `task test:unit -- <test-file>` forwards arguments
to Vitest (paths relative to `pwa/`). `task test:e2e -- <spec-file>` already supports
Playwright selection. A focused run does not replace applicable final verification.

Before editing, inspect Git status and relevant diffs.
Preserve unrelated changes and review overlapping edits
manually; Git differences and explicit path selection do not prove edit ownership.

Use `task gate` for development feedback and retain the broad final checks below.
Its adaptive E2E selection does not replace backend tests or the scope review.

`task verify` runs applicable final repository checks for the selected implementation
scope; it does not advance tasks or establish task acceptance.
It selects checks from current staged, unstaged and untracked Git changes by default.
For a bounded task in a dirty worktree, use `task verify -- <paths>` with the
complete reviewed task path set, including deletions and new files. Explicit paths
must be changed repository-relative files; the record lists excluded paths and makes
no verification claim for them. Include affected shared/contract/runtime inputs.
Mixed change classes take their union; unknown paths select the conservative union.
Path selection never makes tests file-local: architectural impact checks still apply.
No-change/review-only work records findings without implying tested implementation.
Task-specific acceptance and isolated model/host qualification remain separate obligations.

| Change class | Applicable checks |
|---|---|
| Documentation | Changed links, Python syntax where present, diff whitespace; review instruction meaning |
| Harness | Documentation checks and `task test:agent`; selected loading/fixture checks remain explicit task evidence |
| Application | Documentation, lint/types, unit/API/impact tests and static contract/client checks |
| Contract/schema | Application checks plus live endpoint parity and task-specific real database behavior |
| Unknown | Union of all classes; never silently reduce verification |

OpenSpec planning documents, change `.openspec.yaml` metadata and spec/change
`.gitkeep` markers are documentation. `openspec/config.yaml`, custom schema
`schema.yaml` files, Markdown schema templates and the generated skills target marker
are harness inputs. SQL and runtime API contracts retain contract checks; arbitrary
code or unrecognized OpenSpec files remain conservative. Impact selection uses the
same classification, so planning-only changes do not trigger application E2E.

When selected files need formatting or client generation, run
`task prepare -- <paths>` with the complete reviewed task path set before final
verification. Documentation/harness-only changes need no preparation run. Preparation requires explicit paths whenever Git changes
exist, so it cannot silently format unrelated dirty application files. It generates
the client for contract changes and formats only selected application files.
Generated output is an allowed calculated closure of an authorized contract edit;
include newly generated paths in the subsequent scope review and finish selection.
Unexpected preparation writes block rather than being silently adopted. Unknown
preparation blocks before writes; unknown final verification selects the full union.
Documentation/harness preparation needs no application generation or formatting.
Review the resulting diff and preserve unrelated work. `gen:client:sync` also stages
files and is not preparation.

The classifier recognizes bounded preview-flag changes and the exact addition of
`DEMO_MODE: ${DEMO_MODE:-false}` to the PWA environment in supported Compose files.
It compares the complete current file and mode against HEAD. Other deployment effects,
missing HEAD content and mode changes remain conservative; an unrelated dirty change
in the same file cannot be excluded by a task-session snapshot. These exceptions do
not waive live API/database checks required by actual impact.

Finish performs no formatting/generation in the source tree. Agent Python commands
use `-B` to avoid adding/updating bytecode during verification. Kiota check generates
and formats only in its temporary output directory. `review` remains a reusable
application validation target, with no formatter or process-kill step; it does not
include E2E. Running it again after successful application verification is unnecessary. `gate` is the developer loop
and still kills processes: inspect its effects and use dedicated resources.

Finish captures input identity before verification and checks it after every check.
Mutation fails content evidence and leaves remaining checks not-run. Application,
contract and unknown runs retain full repository/runtime identity. Harness-only
runs (optionally including documentation) retain all repository source inputs but
fingerprint the audited Python/PyYAML, Node/npm, Git, Task and shell toolchain;
OpenSpec's installed package is included when `spec:check` is selected. They omit
application `node_modules` and browser installations. The environment and dotenv
inputs remain hashed; no persistent fingerprint cache is introduced. Only
`documentation`, `test:agent` and `spec:check` qualify for this runtime scope.
Mixed application changes, the opt-in `WFS_TEST_SQLDEF=1` Docker qualification and
unrecognized runtime layouts retain the existing full fingerprint. Extend the
runtime inventory when harness tests introduce real external dependencies.
`checks.content.runtime_scope` records the actual choice and
`runtime_scope_reason` explains discovery fallback. Runtime discovery failure
after a check fails mutation evidence instead of switching scope mid-run.
Explicit paths containing only recognized documentation use bounded
identity: selected documents, whole selected active changes, their corresponding
main specs, linked shared main specs, schema/configuration and verification tools.
Link target existence and selected staged entries are also checked. This validates
documentation, not application behavior or the accuracy of source-derived claims.
Archived changes retain repository-wide verification.

For that explicit documentation scope, OpenSpec validation selects the named
changes/main specs with explicit item types. Another agent's incomplete unrelated
draft does not fail this scoped check. Selected changes and shared main-spec
dependencies must still remain stable. Editing the same index or owner spec during
verification can legitimately invalidate another agent's selected inputs.
`task spec:check` without arguments remains the full-repository gate; run it for
final reconciliation once concurrent generation is finished. To validate one item,
use `task spec:check -- <name> --type change` (or `--type spec`).

Each invocation writes its own `.task/agent-finish/runs/<id>.json`, reported as
`record_path`. Cite that path for durable evidence during parallel work.
Executed checks record `duration_seconds` and the following identity check's
`identity_duration_seconds`. `checks.content.timing` separates initial/total
identity time, identity call count, check time and total verification-loop time
using a monotonic clock. Selection and record serialization are outside that total.
Check time includes any fingerprinting internal to a child runner; these fields
measure the outer verifier, not nested phases or model/token usage. Unexecuted
checks have no duration. Timings are observations, not completion evidence.
`.task/agent-finish/last-run.json` is an atomically updated convenience copy and can
belong to another agent. Later edits to the tested inputs invalidate that identity
and require new applicable verification. Record evidence-file updates as later
documentation content rather than attaching old success to a new digest.

`pwa/next-env.d.ts` is ignored Next.js output, regenerated by dev/build/typegen.
Its dev/build type-path rewrites are excluded from Git change discovery and verification
identity. Keep it untracked so regeneration also does not invalidate pre-commit
hooks. Source, configuration and installed dependency changes remain checked.

`agent:test:impact` uses current Git changes by default. Finish passes its selected
paths to the impact runner. Unknown/unmapped application paths fall back to all E2E. Cache identity still covers repository
source, configuration, installed dependencies/browser bytes, tool executables and
hashed runtime/environment inputs. Success is stored only under the pre-test identity when
post-test identity agrees. CI and `WFS_DISABLE_TEST_CACHE=1` disable reuse, not mutation
detection. Reuse follows the impact runner cache policy and additionally requires no external
`BASE_URL`. The cache cannot prove external live-service state; E2E must use the repository's
mocked API boundary.

## Effects, blockers and supporting commands

- `task agent:reconcile` and `agent:drift:routes` inspect source route coverage;
  `agent:drift:schemas` checks DTO property/requiredness patterns;
  `agent:drift:mocks` audits ID/GUID patterns. None proves live API/database behavior.
- `task agent:drift:endpoints` probes the generated live API specification once.
  Unavailable service is blocked (script exit 2), not zero mismatches.
- Finish runs both `agent:test:impact` and `test:api` locally. Impact Playwright suites use
  the repository's mocked API boundary. Their results do not establish task-specific real
  database behavior, which remains explicitly blocked until recorded with its actual command
  and tested identity.
- A timed-out/interrupted finish child group is stopped and reaped without retry.
  Kiota retains its compatible runtime, clean-output and one-shot timeout behavior.
  Correct the cause before a new authorized attempt; monitor a running command only.
- `task agent:audit AREA=<keyword>` (backed by `test:audit`) is optional, advisory and
  bounded to affected coverage. Heuristics never require unrelated cleanup or deletion.
- `task agent:slice -- <route>` and `task agent:api` support static navigation.
  `task agent:status` remains the explicit HANDOVER reader under context-loading policy.

Inspect the invocation's `record_path` (or confirm selection in `last-run.json`)
and report passed, failed, blocked, not-run
and not-applicable separately. A passing static check cannot cancel a blocked live
check. Finish records automated checks only; do not claim completion while selected
acceptance, fixture or loading evidence is missing.

## Final verification

Before claiming the selected implementation scope complete, finalize any task
records and evidence, run preparation when applicable with reviewed paths, review
scope and generated output, then run `task verify -- <complete-task-paths>` once
for final repository checks. Include task/evidence changes in that path set.
Reconcile required acceptance with the actual verification results.

Keep verification evidence in the invocation's `.task/agent-finish/runs/<id>.json`. Later
edits to code, configuration or documentation change content identity and require
fresh applicable verification; previous results describe only their original
identity. Report final check results directly when no durable edit is needed.

## Scope review

After any applicable preparation and before `task verify`, inspect `git status --short`, staged
and unstaged diffs, new/deleted files, and any changes within already dirty files.
Review the full explicit path set before passing it to preparation or finish.
Existing changes are not task-owned merely because they differ from HEAD; Git and
path selection cannot establish which actor wrote an edit.

Account for each task file: what changed, why the requested outcome needs it, and
any formatter/generated changes. Check semantic scope within expected files too:
unrelated refactors, changed defaults, removed behavior and weakened tests can pass
broad checks. Resolve unexpected edits against authorization. Remove your own
unnecessary edits while preserving pre-existing and concurrent work; never reset a
whole dirty file to discard a task-local change.

Review two questions explicitly, in proportion to the change: does the diff deliver
the authorized behavior with appropriate acceptance evidence, and does its
implementation preserve ownership, handle relevant failures and avoid unnecessary
complexity or regressions? Report gaps in either dimension; a strong result in one
does not compensate for a gap in the other. Use the existing scope review, without
requiring separate reviewers or a new report.

Report unresolved differences. Recheck scope if preparation, fixes or later edits
change content. If
available history or before-images cannot distinguish overlapping edits, report that
limit and resolve ownership before reverting. Scope review is an agent assessment,
not automated proof of authorization. Shared, seam, contract, persistence and unknown
impact expand checks; CI, release and full-repository gates remain broader safety nets.

## Evidence and meaningful handoffs

Record changed paths, actual checks and content identity with the selected task
when durable evidence is needed, before final verification. Keep durable rationale in `specs/decisions/` when a decision needs
preserving; implementation facts belong with code/config references. Synchronize
only affected contracts, configuration documentation and task records within scope.
Static reconciliation alone is not database or live endpoint parity.

Update [HANDOVER](../../HANDOVER.md) at a meaningful handoff or interruption, only
in the writer's own task section. Preserve other tasks. Use these compact fields:
Task/spec; Worktree/branch; Authorized scope and source; Current checkpoint;
Verification evidence and content identity; Blocker or next action.
Check stale evidence against current files when resuming. Completed detail belongs
with its selected task; HANDOVER supplies context, not authority. [JOURNAL](../../JOURNAL.md) is
frozen historical evidence after its salvage pass; do not append session results.
There is no mandatory multi-file turn-end bookkeeping or automatic cleanup skill.
Useful repeatable tooling may be proposed within scope; temporary scripts do not
need automatic promotion into the repository.

`task agent:summary` prints navigation only; it does not load handover, skill bodies
or the whole registry. Use `task agent:status` explicitly for resumption/ambiguity.

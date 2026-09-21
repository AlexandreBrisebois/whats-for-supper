# Discovery rotation — specification review

Reviewed 2026-09-20 using `.agents/prompts/spec-reviewer.md` and the shared
specification workflow, after authoring with `spec-writer.md`. Review and
corrections are specification-only; no independent agent or runtime validation
is claimed.

## Findings and disposition

| Severity | Location | Consequence | Smallest correction and status |
|---|---|---|---|
| Medium | [DR-R4.6](requirements.md#dr-r4--live-convergence-follows-the-server-order), [browser reconciliation](design.md#browser-ownership-and-reconciliation) | Rejecting old responses alone leaves the previous member's already-rendered cards clickable while the new member loads | Resolved: clear old-context cards and disable voting until that context loads; explicit DR-3 regression |
| Medium | [browser reconciliation](design.md#browser-ownership-and-reconciliation), [DR-3](tasks.md#dr-3--reconcile-live-discovery-order) | A vote completion after navigation can write the obsolete page's stack into the shared store | Resolved: prevent unmounted completion writes and require fresh remount read; explicit unmount/remount regression |

No unresolved blocking findings remain in the revised specification. Product
defaults are visible in requirements; this review does not approve implementation.

## Checks against the requested behaviour

- Purge: both implementations remain outside authorised writes. The week-lock
  regression checks an unselected voted recipe as well as a selected one, so a
  selective purge cannot accidentally satisfy the test.
- Ordering: one tuple, explicit seven-day boundaries, never-used treatment,
  last-planned/last-cooked maximum, nonnumeric preference mapping and ID ties.
  Active votes intentionally outrank recency, as selected by the user.
- Eligibility: live calendar state is independent of votes; specified past-week,
  current-week, future, skipped and null-ID behaviour prevents perpetual exclusion
  or treating a skipped meal as cooked. Deleted plan history is not promised.
- Live behaviour: vote, slot, week, fill-the-gap and reconnect are covered. Empty
  results can refill. Full reconciliation moves a deep recipe up while keeping an
  eligible front stable. Zero count, stale GET and optimistic POST races are covered.
- Contract: existing GET, POST and SSE shapes suffice; OpenAPI prose is the only
  planned contract-file change. No schema migration or generated-file edit.
- Handshake: Search/filters, planner algorithms, consensus and purge stay unchanged.
  Initial interest metadata and the local match counter are not expanded.
- Testability: observable front/POST IDs, controlled time/responses, stateful mocks,
  isolated PostgreSQL view evidence and explicit task dependencies are specified.
- Complexity: existing service/store/page own the change. No queue framework,
  materializer, expiry policy, new setting or two-queue merge.

## Evidence and limits

Source and contract inspection completed against the current checkout. The
baseline is recorded in [tasks](tasks.md#specification-evidence--2026-09-20).
Documentation validation passed using the execution harness's read-only
`documentation_check()` helper: introduced Markdown links and `git diff --check`.
An additional check covered trailing whitespace in all four new, untracked spec
files and confirmed every acceptance ID is referenced by tasks. No Python files
were introduced. Application tests and live endpoint/database checks were not run
for this specification-only task.

Scope: this task created requirements, design, tasks and review in this directory
and added only its own checkpoint to `HANDOVER.md`. These files contain the
proposal, implementation boundaries and review evidence; no production edits.
The original staged recipe-import-reporting test patch was compared byte-for-byte
with the baseline and preserved. During drafting an unrelated unstaged change
appeared in `api/src/RecipeApi.Tests/Integration/RecipeSearchIntegrationTests.cs`;
it was not modified or reverted. Its observed patch is retained separately from
the starting snapshot as `observed-concurrent-unstaged.patch` in the baseline
directory. Final file hashes and scope verification are recorded there in
`spec-final-scope.json`.

Implementation `agent:prepare`/`agent:finish` were not run: this is specification
output, and worktree-wide preparation would also select formatting for unrelated
application changes. No application completion or runtime pass is claimed.

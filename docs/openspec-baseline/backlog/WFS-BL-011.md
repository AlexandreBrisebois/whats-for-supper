# WFS-BL-011 — Reject obsolete stack wrap responses

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | observed controlled-probe race / browser qualification pending |
| Affected journey / capability | recipe-library |
| Origin IDs | U31 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

Hold last-page fetch; change All to Discovery or list mode; release old response.

## Observed behavior and expected authority

Historical finding: the callback compared its old closure value with itself, and only a new wrap incremented its request ID. The [completed paging correction](../../../openspec/changes/archive/2026-10-17-complete-library-stack/tasks.md) replaced this with filter/presentation/unmount generations; delayed All→Discovery and failed-wrap recovery now have passing browser evidence. Do not reimplement that guard. Remaining qualification is delayed success/error after presentation change or unmount, including count/position/feedback preservation.

The generation guard and retry implementation are complete under WFS-BL-010. Qualify delayed success/error after presentation change or unmount before deciding whether any further implementation is needed; retain current count, position and feedback assertions.

Authority: original current implementation and exact requirement/scenario mappings in [library-audit.md](library-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Reload selected filter after pending request settles.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[library-audit.md](library-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `browse-all-stack/page.tsx; browseStackStore.ts`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: WFS-BL-010 implementation is complete; retain only the remaining qualification above. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

The generation guard and retry implementation are complete under WFS-BL-010. Qualify delayed success/error after presentation change or unmount before deciding whether any further implementation is needed; retain current count, position and feedback assertions.

Required acceptance/regression/integration/browser checks: Delayed old response after new filtered first page, mode switch, unmount, failure and retry; assert IDs/count/filter remain current.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

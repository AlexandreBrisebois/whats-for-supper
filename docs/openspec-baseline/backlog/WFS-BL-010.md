# WFS-BL-010 — Make stack position and traversal match the full deck

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | observed controlled-probe defect; user report partly unresolved |
| Affected journey / capability | recipe-library |
| Origin IDs | U31; BSL-recipe-library-002; reported first-backward card26 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

First backward on 126-card deck with page size20; traverse after wrap.

## Observed behavior and expected authority

Probe reaches ID126 but displays26/126 and retains first20+last6, disabling prefetch. Browser180 reaches actual ID180 then ID1. No hardcoded26 or universal wrong-last-ID cause established.

Keep paged deck identity/global ordinal coherent; make every ID reachable both directions. Preserve report until user dataset confirms whether content or counter was wrong.

Authority: original current implementation and exact requirement/scenario mappings in [library-audit.md](library-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Reload Browse or use Search to reach omitted recipes.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[library-audit.md](library-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `browse-all-stack/page.tsx; browseStackStore.ts; StackActionBar.tsx`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Keep paged deck identity/global ordinal coherent; make every ID reachable both directions. Preserve report until user dataset confirms whether content or counter was wrong.

Required acceptance/regression/integration/browser checks: 126 and180 IDs, full forward/back cycles and unique set; first↔last ID and ordinal; restored position, filters and failed last fetch.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

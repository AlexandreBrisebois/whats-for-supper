# WFS-BL-014 — Show unavailable cooking instructions honestly

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | source-supported UX defect / policy review |
| Affected journey / capability | cooking |
| Origin IDs | U-cooking-01/02/07 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Recipe detail GET fails or parser yields no steps.

## Observed behavior and expected authority

CooksMode installs generic Gather/Prep/Cook/Finish steps without unavailable/error recovery. Real recipe instructions are absent; no food-safety harm asserted.

Use explicit unavailable/retry behavior and preserve genuinely loaded instructions; decide empty-source treatment before spec.

Authority: original current implementation and exact requirement/scenario mappings in [tonight-audit.md](tonight-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Open actual source/detail instructions and retry; generic fallback is not actual recipe content.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[tonight-audit.md](tonight-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `CooksMode.tsx; stepParser.ts`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Use explicit unavailable/retry behavior and preserve genuinely loaded instructions; decide empty-source treatment before spec.

Required acceptance/regression/integration/browser checks: GET rejection, empty/malformed/mixed sections, retry succeeds, nested issue refresh, completion disabled when appropriate.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

# WFS-BL-002 — Make replacement acknowledgement match persisted Tonight

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | implementation risk / investigation |
| Affected journey / capability | tonight-meal-decisions, meal-planning |
| Origin IDs | TM-U07–08, MP-U01/03, U110–115 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Move/defer/delete original succeeds, replacement POST rejects or overlaps another action.

## Observed behavior and expected authority

assignRecipe returns void, installs optimistic meal, catches only to console; Home closes recovery and initiates reads. Separate requests permit partial completion and loss of retry context.

Introduce a bounded operation result and explicit retry state after approved recovery semantics. Do not promise distributed atomicity. Capture original identity at invocation and reconcile authoritative reads.

Authority: original current implementation and exact requirement/scenario mappings in [tonight-audit.md](tonight-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[tonight-audit.md](tonight-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `HomeCommandCenter.tsx; todayStore.ts; weekStore.ts; planner.ts`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: WFS-BL-001 and WFS-BL-005. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Introduce a bounded operation result and explicit retry state after approved recovery semantics. Do not promise distributed atomicity. Capture original identity at invocation and reconcile authoritative reads.

Required acceptance/regression/integration/browser checks: Reject each request in turn, delayed/out-of-order responses, remote original change, duplicate click; compare displayed Tonight and persisted planner, groceries, SSE.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

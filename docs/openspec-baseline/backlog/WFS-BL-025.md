# WFS-BL-025 — Define recovery for interrupted workflow maintenance and recurrence

| Field | Value |
| --- | --- |
| Priority | P3 |
| Finding type | operational reliability investigation |
| Affected journey / capability | background-processing, data-backup-and-recovery |
| Origin IDs | U89–94, BP-U01–05, DBR-U08 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Worker reset/reaper races or maintenance command crashes after processing; child launch succeeds but later fails.

## Observed behavior and expected authority

Reset/reaper lack universal cancellation/exclusivity; processing/failed commands not retried automatically; chained recurrence depends on report success. Active taskCount projection may lack loaded tasks.

Document operator diagnosis and choose recovery invariants; separate reset/task-count defects from distributed exactly-once aspirations.

Authority: original current implementation and exact requirement/scenario mappings in [workflows-audit.md](workflows-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Conditional operational, environment or qualification concern; no demonstrated broad current user harm.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Conditional operational, environment or qualification concern; no demonstrated broad current user harm. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[workflows-audit.md](workflows-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `WorkflowWorker.cs; WorkflowController.cs; ManagementService.cs; workflow repository`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Document operator diagnosis and choose recovery invariants; separate reset/task-count defects from distributed exactly-once aspirations.

Required acceptance/regression/integration/browser checks: Isolated real DB taskCount, reaper/reset race with injected clock, crash recovery, launch vs completion/report/recurrence, custom root.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

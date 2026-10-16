# WFS-BL-008 — Protect demo assets and reset semantics

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | high-impact conditional recovery investigation |
| Affected journey / capability | demo-household |
| Origin IDs | DH-U01–04, DH-U06/09 |
| Workflow status | awaiting human scope selection |
| Confidence | Medium overall: source boundaries known, environment-specific consequence unqualified |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Restore snapshot whose recipe directory is missing, or captured recipe later soft-deleted; manually restore while demo disabled.

## Observed behavior and expected authority

ReplaceDirectory deletes destination before checking source; four-file preflight does not require recipe directory. Query filters and manual recurring restore create separate risks. Source only; no destructive reproduction.

Define missing-assets preflight and all-state reset expectations; prevent silent active asset loss; decide manual recurrence when disabled, preserve custom workflow-root compatibility.

Authority: original current implementation and exact requirement/scenario mappings in [workflows-audit.md](workflows-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[workflows-audit.md](workflows-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `DemoSnapshotService.cs; ManagementController.cs; demo-restore.yaml; WorkflowSeeder/Repository`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Define missing-assets preflight and all-state reset expectations; prevent silent active asset loss; decide manual recurrence when disabled, preserve custom workflow-root compatibility.

Required acceptance/regression/integration/browser checks: Disposable directories/relational DB only; absent source preserves active assets, soft-deleted IDs, override cascades, manual disabled-mode scheduling and custom root.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

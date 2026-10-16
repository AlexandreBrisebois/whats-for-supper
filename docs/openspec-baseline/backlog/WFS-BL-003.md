# WFS-BL-003 — Supply required URL to contextual repair launch

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | source-confirmed implementation defect |
| Affected journey / capability | recipe-quality, recipe-capture |
| Origin IDs | U01; BSL-recipe-quality-002/003 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

Report ingredients/steps with nonblank note on a SourceUrl recipe using packaged URL definition.

## Observed behavior and expected authority

WorkflowParameters omits url; WorkflowOrchestrator rejects the required parameter before creating instance. Report remains saved with launchFailed. Independently corroborated; ordinary RecipeImportService does supply url.

Fix only contextual launch parameter construction after approved task; preserve server-owned eligibility and unchanged-feedback suppression.

Authority: original current implementation and exact requirement/scenario mappings in [capture-identity-audit.md](capture-identity-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Report remains saved; manual review is possible. Repeated unchanged Save does not fix the missing parameter.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[capture-identity-audit.md](capture-identity-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `RecipeImportReportService.cs; url-import.yaml read dependency; real-orchestrator regression`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Fix only contextual launch parameter construction after approved task; preserve server-owned eligibility and unchanged-feedback suppression.

Required acceptance/regression/integration/browser checks: Actual packaged definition with real orchestrator and isolated DB; report saved, exactly one intended launch with source URL, unchanged and changed feedback, UI launch failure/retry.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

# WFS-BL-021 — Set explicit clearing and deletion retention contracts

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | product decision / contract investigation |
| Affected journey / capability | recipe-library, meal-planning |
| Origin IDs | U35–37, U44, U49 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Clear cuisine to blank; open zero-photo original; purge a historically cooked recipe.

## Observed behavior and expected authority

Client sends null cuisine while API ignores null; local view hides value until reload. Purge can cascade history and deletes files before DB; zero-photo source fallback differs.

Decide null-clear and historical retention semantics separately; do not silently alter contract to match source.

Authority: original current implementation and exact requirement/scenario mappings in [library-audit.md](library-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[library-audit.md](library-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `RecipeDetailSheet.tsx; RecipeService.cs; RecipeController.cs; DB/schema`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Decide null-clear and historical retention semantics separately; do not silently alter contract to match source.

Required acceptance/regression/integration/browser checks: Clear/reread, malformed payload, zero-photo URL, two-device delete, relational historical purge and failure rollback fixture.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

Historical purge/retention risk U52 is separately prioritized P1 in [WFS-BL-031](WFS-BL-031.md); it is excluded from this clearing/representation scope.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

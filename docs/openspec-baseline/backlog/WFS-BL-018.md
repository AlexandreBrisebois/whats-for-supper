# WFS-BL-018 — Reconcile bundle validation cancellation and metadata preservation

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | source-supported UX/data fidelity investigation |
| Affected journey / capability | recipe-sharing |
| Origin IDs | U53–57, RS-U01–09 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Import unsupported version or cancel after submission; round-trip cuisine/mealTypes.

## Observed behavior and expected authority

Parser permits versions server rejects; in-flight Cancel clears local state without abort; DB precedes assets; serializer/parser drop metadata; absent hero checked before missing recipe. Not every discrepancy is a runtime defect.

Choose cancel/round-trip contract; separate file representation from HTTP bundle and privacy projection. Repair only approved bounded behavior, retain native AbortError semantics.

Authority: original current implementation and exact requirement/scenario mappings in [capture-identity-audit.md](capture-identity-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[capture-identity-audit.md](capture-identity-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `recipes.ts; MinimalCapture.tsx; RecipeService.cs; RecipeController.cs`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Choose cancel/round-trip contract; separate file representation from HTTP bundle and privacy projection. Repair only approved bounded behavior, retain native AbortError semantics.

Required acceptance/regression/integration/browser checks: Version/schema negative cases, delayed import cancel, metadata round-trip, partial asset failure, native canShare throw and AbortError; real201 response/state.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

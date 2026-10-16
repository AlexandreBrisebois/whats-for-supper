# WFS-BL-004 — Make recipe notes Saved reflect durable acknowledgement

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | source-supported lost-work investigation |
| Affected journey / capability | recipe-library |
| Origin IDs | U38–40; BSL-recipe-library-012/013 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Open notes A, edit B and wait 800ms, then edit back to A; or close before timer / reject PATCH.

## Observed behavior and expected authority

Effect compares against original recipe.notes forever; returning to A sends no restoration. Saved appears before awaiting PATCH; closing cancels unsent timer. No durable reread in existing assertion.

Choose explicit close/flush behavior; maintain acknowledged note baseline and pending/error state, protect response order. Keep rating behavior separately bounded unless approved.

Authority: original current implementation and exact requirement/scenario mappings in [library-audit.md](library-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Keep a separate copy and reload to verify notes; manual re-entry burden.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[library-audit.md](library-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `RecipeDetailSheet.tsx; recipes.ts`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Choose explicit close/flush behavior; maintain acknowledged note baseline and pending/error state, protect response order. Keep rating behavior separately bounded unless approved.

Required acceptance/regression/integration/browser checks: A→B→A plus server reread; close-before-debounce; reject never shows Saved; delayed response order; recipe switch isolation.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

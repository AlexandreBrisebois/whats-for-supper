# WFS-BL-012 — Recompute groceries and publish every week touched by push

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | source-supported side-effect defect |
| Affected journey / capability | meal-planning, grocery-shopping, household-live-updates |
| Origin IDs | MP-U05, HLU-U02 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Same-offset weekday push spills Sunday into next week.

## Observed behavior and expected authority

Same-offset move branch saves/publishes source without grocery recomputation; explicit cross-week branch DOES recompute both. Destination publication remains absent on cross-week move.

Compute affected weeks from actual movement; recalculate and publish every affected week after durable save, with explicit partial follow-up recovery.

Authority: original current implementation and exact requirement/scenario mappings in [tonight-audit.md](tonight-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[tonight-audit.md](tonight-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `ScheduleService.cs; GroceryRecomputeService.cs; schedule publisher`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: the [Tomorrow preservation](../../../openspec/changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md) and deployment-calendar prerequisites are complete. This item retains only ordinary-push grocery/publication behavior that the Tomorrow change explicitly excluded from parent closure. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Compute affected weeks from actual movement; recalculate and publish every affected week after durable save, with explicit partial follow-up recovery.

Required acceptance/regression/integration/browser checks: Unique ingredients each week; multi-week push; compare groceries and SSE on source/destination clients; retry after follow-up failure.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

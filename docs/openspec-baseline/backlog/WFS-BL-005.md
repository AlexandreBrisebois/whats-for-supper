# WFS-BL-005 — Use deployment local time for UX and inject every clock

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | accepted product policy / implementation investigation |
| Affected journey / capability | meal-planning, tonight-meal-decisions, background-processing, household-live-updates |
| Origin IDs | U99, TM-U01, U102–109; user decision 2026-10-16 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Deployment local day/week differs from UTC or client device timezone; test at midnight/Sunday/DST.

## Observed behavior and expected authority

Home/browser local weekday and API UTC dates can address different supper slots; direct clock reads and optional fallback clocks require inventory. Internal UTC timestamps are distinct from meal dates.

User decision: deployment-fixed local timezone determines all UX dates; internal timestamps remain UTC; time always injected, no DateTime.Now equivalents. Establish shared zone/clock seam before dependent date work.

Authority: original current implementation and exact requirement/scenario mappings in [time-policy-audit.md](time-policy-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[time-policy-audit.md](time-policy-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `IClock implementations; ScheduleService.cs; todayStore.ts; weekStore.ts; HomeCommandCenter.tsx; scheduling/time consumers`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

User decision: deployment-fixed local timezone determines all UX dates; internal timestamps remain UTC; time always injected, no DateTime.Now equivalents. Establish shared zone/clock seam before dependent date work.

Required acceptance/regression/integration/browser checks: Injected fixed instant with deployment zone across midnight, Sunday/Monday and DST gap/fold; device zone differs; no sleep-based tests or direct wall clock reads in domain logic.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

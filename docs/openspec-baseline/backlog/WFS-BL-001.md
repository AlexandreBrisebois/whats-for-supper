# WFS-BL-001 — Preserve every meal when Tomorrow pushes into following weeks

| Field | Value |
| --- | --- |
| Priority | P1 |
| Finding type | implementation defect / decision-backed resolution |
| Affected journey / capability | tonight-meal-decisions, meal-planning |
| Origin IDs | MP-U02, MP-U05, TM-U07; Tonight BSL changed-plan recovery |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

Sunday A; Monday B and following week occupied; select C then Tomorrow.

## Observed behavior and expected authority

Cross-week move scans for empty slot, full week returns normally and controller reports success. Replacement then carries Sunday A onto occupied Monday, overwriting B. Independently reviewed by library and Tonight lanes; real DB not run.

User decision 2026-10-16: Tomorrow shifts the selected and displaced meals by one day, spilling into following weeks. Preserve all meal IDs and non-cooking content under a reviewed collision policy; no silent no-op success. Save for Next Week retains its separate defer semantics.

Authority: original current implementation and exact requirement/scenario mappings in [tonight-audit.md](tonight-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction.

Workaround and recovery burden: Use a reviewed explicit defer destination and inspect affected weeks; do not rely on current Tomorrow for a full next week.

Priority rationale: Potential lost work, wrong meal state, or a broken core/recovery journey warrants early investigation even without production reproduction. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[tonight-audit.md](tonight-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `HomeCommandCenter.tsx; todayStore.ts; ScheduleController.cs; ScheduleService.cs; planner API/contract`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: WFS-BL-005 timezone/clock policy; agree push-result contract before dependent pivot work. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

User decision 2026-10-16: Tomorrow shifts the selected and displaced meals by one day, spilling into following weeks. Preserve all meal IDs and non-cooking content under a reviewed collision policy; no silent no-op success. Save for Next Week retains its separate defer semantics.

Required acceptance/regression/integration/browser checks: Real PostgreSQL chain spanning at least three weeks, occupied/non-cooking slots, Sunday, abort/retry, both-week groceries and two-client updates; assert exact ID conservation.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

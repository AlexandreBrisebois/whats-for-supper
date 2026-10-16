# WFS-BL-029 — Make Feature Flags coverage discoverable without duplicating it

| Field | Value |
| --- | --- |
| Priority | P4 |
| Finding type | coverage discoverability / false-positive component |
| Affected journey / capability | member-preferences |
| Origin IDs | BSL-MP009–016, U-MP06/07/09/10, DH-U03; user Feature Flags report |
| Workflow status | index discoverability addressed; missing-feature false positive reviewed; implementation limitations open |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

Look for Feature Flags as standalone capability.

## Observed behavior and expected authority

Independent subagent found 12 requirements/28 scenarios in member-preferences197–356,3 registry keys; 13 tests and strict spec validation pass. Broad missing-feature claim false; individual races/contracts/deployment still open.

Name Feature Flags/Preview features in index and coverage; preserve17 owners. Route remaining implementation limits to preferences/install/demo items.

Authority: original current implementation and exact requirement/scenario mappings in [feature-flags-audit.md](feature-flags-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Documentation or discoverability work; no implementation fix is authorized.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Documentation or discoverability work; no implementation fix is authorized. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[feature-flags-audit.md](feature-flags-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `docs/openspec-baseline-plan.md; backlog coverage only`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Name Feature Flags/Preview features in index and coverage; preserve17 owners. Route remaining implementation limits to preferences/install/demo items.

Required acceptance/regression/integration/browser checks: Verify exact12/28 and API/member override/consumer mappings; no duplicate draft.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

# WFS-BL-026 — Reconcile contracts placeholders and stale explanatory claims

| Field | Value |
| --- | --- |
| Priority | P4 |
| Finding type | documentation/contract drift and intended-absent triage |
| Affected journey / capability | cross-capability |
| Origin IDs | U02/03/09/19/22/29/36/45/47/50/65/80/81/85/95; SR-U01/02/06/09; DISC-U01/02/05/07/08; DH-U07 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Read generic claims, request unimplemented filters/recommendations or compare emitted enum/status.

## Observed behavior and expected authority

Some comments/docs overstate runtime evidence; placeholder recommendations are not connected Search. Wire status/enum drift is distinct from proven UX failure. U19 201/409 mismatch is superseded in current source.

Correct only approved documentation or contract scopes; decide absent API features before specification. Retain archived provenance and no automatic closure from missing tests.

Authority: original current implementation and exact requirement/scenario mappings in [discrepancy-register.md](discrepancy-register.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Documentation or discoverability work; no implementation fix is authorized.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Documentation or discoverability work; no implementation fix is authorized. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[discrepancy-register.md](discrepancy-register.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `Affected owner plans/specs; OpenAPI and emitted DTO read dependencies`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Correct only approved documentation or contract scopes; decide absent API features before specification. Retain archived provenance and no automatic closure from missing tests.

Required acceptance/regression/integration/browser checks: Exact schema/status fixture and connected caller search; independently review every closure. No blanket API repair.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

Runtime ignored-filter, Quick-continuation and visible-badge risks are **excluded from this P4 cleanup scope** and separately ranked [032](WFS-BL-032.md), [033](WFS-BL-033.md), [034](WFS-BL-034.md). Lack of runtime reproduction does not downgrade those concerns to documentation-only.

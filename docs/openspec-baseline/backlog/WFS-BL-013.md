# WFS-BL-013 — Read grocery check maps consistently from SSE snapshots

| Field | Value |
| --- | --- |
| Priority | P2 |
| Finding type | independently corroborated source mismatch |
| Affected journey / capability | grocery-shopping, household-live-updates |
| Origin IDs | U100, HLU-U03 |
| Workflow status | awaiting human scope selection |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Independent lane plus coordinator source review |

## User problem and reproduction trigger

Receive snapshot or week_updated with raw groceryState dictionary.

## Observed behavior and expected authority

JSON.parse forwards raw dictionary; weekStore reads only generated-model additionalData. Generated GET decoding and raw SSE are different representations. Separate grocery event has its own raw path.

Normalize at the wire boundary without dropping checks; preserve optimistic/conflict policy.

Authority: original current implementation and exact requirement/scenario mappings in [workflows-audit.md](workflows-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Recoverable user friction or a less frequent incorrect result; reload/manual correction may help but does not repair the root. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[workflows-audit.md](workflows-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `useScheduleStream.ts; weekStore.ts; StreamController.cs`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: coordinate WFS-BL-012; own wire normalization separately. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Normalize at the wire boundary without dropping checks; preserve optimistic/conflict policy.

Required acceptance/regression/integration/browser checks: Exact serialized server initial and incremental events, checked/uncheck maps and reconnect; no generated-model wrapper fixture shortcut.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

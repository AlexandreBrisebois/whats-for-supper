# WFS-BL-027 — Review missing search producers and operator classification baseline

| Field | Value |
| --- | --- |
| Priority | P4 |
| Finding type | missing supported extraction / draft awaiting review |
| Affected journey / capability | recipe-search, recipe-library |
| Origin IDs | SR-X03, SR-U10; new audit omission |
| Workflow status | closed — user accepted, promoted and archived2026-10-16; runtime limitations retained |
| Confidence | High for traced source; runtime reach/frequency unmeasured |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Startup/Dreaming materializes filters; index worker publishes; operator classifies/backfills/status.

## Observed behavior and expected authority

Consumer/generic workflow specs omit concrete producer outcomes. New isolated draft covers12 requirements; source/assertions mapped, provider/runtime unqualified.

Review draft baseline-recipe-search-operator-maintenance; acceptance/promotion only on separate authorization, preserve all existing reviewed content.

Authority: original current implementation and exact requirement/scenario mappings in [workflows-audit.md](workflows-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Documentation or discoverability work; no implementation fix is authorized.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Documentation or discoverability work; no implementation fix is authorized. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[workflows-audit.md](workflows-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `openspec/changes/baseline-recipe-search-operator-maintenance/ only`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: human review only; no application dependencies. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Review draft baseline-recipe-search-operator-maintenance; acceptance/promotion only on separate authorization, preserve all existing reviewed content.

Required acceptance/regression/integration/browser checks: Strict change validation, exact mapping/assertions, main unchanged; real model/DB checks separate.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

## Closure evidence

User explicitly approved consolidation. Exact requirement blocks were appended to main, validated and archived without altering application code. [Completion record](consolidation-completion.md). This closes the missing-documentation item only, not related implementation risks or device/provider/database qualification. Earlier proposed review/acceptance gates above are historical.

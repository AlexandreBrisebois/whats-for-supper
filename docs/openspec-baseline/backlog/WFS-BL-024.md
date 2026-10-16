# WFS-BL-024 — Qualify installation PDF delivery and feature-flag deployment

| Field | Value |
| --- | --- |
| Priority | P3 |
| Finding type | environment qualification / absent-feature decision |
| Affected journey / capability | app-installation, member-preferences |
| Origin IDs | U11/74, AI-U01–05, U-MP07/08; DH-U05 |
| Workflow status | awaiting human scope selection |
| Confidence | Medium overall: source boundaries known, environment-specific consequence unqualified |
| Owner | Unassigned; human selects one bounded scope |
| Independent review | Lane evidence reviewed by coordinator; un-reproduced impact remains investigation, not closed runtime defect |

## User problem and reproduction trigger

Installed PDF share or preview enabled in one boundary but not deployment; offline launch.

## Observed behavior and expected authority

Manifest/PWA and API flags are independent; no complete OS delivery evidence. Worker creates empty cache without population; offline application is not implemented.

Supply deployment/browser matrix and decide whether offline is desired; verify flag forwarding before promising supported native transport.

Authority: original current implementation and exact requirement/scenario mappings in [feature-flags-audit.md](feature-flags-audit.md); user decisions in [decisions.md](decisions.md) supersede inferred intent. When expected behavior is not settled there, it remains a review question, not a new normative policy.

## Impact, reach and recovery

Conditional on the concrete trigger; incidence has not been measured. Conditional operational, environment or qualification concern; no demonstrated broad current user harm.

Workaround and recovery burden: Use an authoritative reload/read and manual correction where possible; no universal safe recovery is established for this boundary.

Priority rationale: Conditional operational, environment or qualification concern; no demonstrated broad current user harm. Effort is not used to lower uncertain high-impact risks. Re-rank after actual reach and recovery evidence.

## Evidence and content identity

[feature-flags-audit.md](feature-flags-audit.md) contains executable path/symbols, assertion scope, substitutions and negative evidence; [verification.md](verification.md) records commit, pre-existing dirty inputs, current file hashes and checks. Existing passing mocked tests do not prove the real service path. No production incident is claimed unless explicitly recorded.

Verification evidence: source/assertion inspection; focused observed results only as named in the linked report. Live API/PostgreSQL/provider/device checks are **not-run**, not presumed passed or environment-blocked. Root cause is the traced branch above where established; otherwise it is a bounded hypothesis awaiting the listed check.

## Boundaries, dependencies and parallel eligibility

Affected files/state: `PWA manifest/service worker/pdf-share; deployment env read dependencies; feature flag registry`. Includes associated client/contract/persistence/workflow side effects described above; do not silently edit every listed dependency.

Dependencies: No hard prerequisite established; inspect shared-file conflicts before assignment. Parallel eligibility is conditional on disjoint owned files in [README.md](README.md). Reserve shared RecipeDetailSheet, ScheduleService, weekStore, contracts and generated clients to one writer. No implementation assignment exists yet.

## Proposed bounded resolution and acceptance

Supply deployment/browser matrix and decide whether offline is desired; verify flag forwarding before promising supported native transport.

Required acceptance/regression/integration/browser checks: Installed OS share cold/warm, expiry/claim, malformed envelope, storage rejection, deployment flag on/off, offline separately; no guessed device success.

Exclusions: no adjacent refactoring, universal transaction/exactly-once promises, unrelated contract cleanup, application implementation from this audit, promotion or archive. A future task must name one observable slice and test-first red/green evidence; documentation-only review has no application TDD requirement.

## Human review gate

Human selects this item and approves unresolved policy plus its concrete spec/task/file scope before implementation. Review evidence and actual diff before integration or closure. Draft generation, human acceptance, promotion and runtime qualification are separate states. Failed reproduction does not close the report automatically.

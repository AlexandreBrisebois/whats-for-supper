# WFS-BL-031 — Protect historical meal records during permanent recipe purge

| Field | Value |
| --- | --- |
| Finding type | Source-supported investigation; expected policy not fully settled |
| Priority | P1 |
| Capability / journey | recipe-library, meal-planning |
| Original IDs | U52; BSL provenance in owner register |
| Verification evidence | Source/assertion review, independent reviewer prioritization; runtime reproduction not-run |
| Confidence | Medium overall; traced boundary, unmeasured runtime reach |
| Workflow status | Awaiting human decision and individual scope selection |
| Owner | Unassigned |

## Trigger, observation and authority

Purge a soft-deleted recipe with past calendar events. Purge removes referenced historical events and deletes assets before DB commit. Potential historical-plan loss warrants P1 investigation; actual production loss not observed and retention expectation needs decision.

Expected behavior/authority: Decide historical retention/tombstone semantics before an isolated relational purge task. Assert past dates/recipe identity retained or explicitly approved deletion; fault after file removal must have a defined recovery path. Existing requirement/scenario mappings and original assertions are in [library audit](library-audit.md); this does not invent desired behavior from a missing test. [Original register](discrepancy-register.md) preserves IDs.

## Impact and recovery

Potential irreversible history loss; manual reconstruction may be impossible. Keep P1 visible while retention/real FK behavior is unresolved. Frequency conditional on the stated trigger; incidence is unmeasured. Root cause is the traced boundary above where established; remaining hypotheses require the fixture below.

## Scope, dependencies and side effects

Owned-file candidates: `RecipeService.cs purge path; calendar FK/schema; purge controller`. No edits authorized. Shares RecipeService/persistence with recovery and deletion scopes; serialize those writers. Product retention decision before schema/contract work. Exact contract/task and single-writer file set must be approved before dispatch. Changes may affect persisted history, response membership or displayed card state as described; do not fold unrelated cleanup.

## Resolution and acceptance

Decide historical retention/tombstone semantics before an isolated relational purge task. Assert past dates/recipe identity retained or explicitly approved deletion; fault after file removal must have a defined recovery path.

Required regression/integration/browser checks: Disposable PostgreSQL+asset root with past/current/future assignments, wrong PIN, failure injection and read-after-purge; no real household purge.

Content identity and check status: [verification](verification.md), [input identity](input-identity.md). Real API/DB/browser reproduction of this item remains **not-run**; no environmental failure was demonstrated. Independent library reviewer requested this explicit prioritization; no confirmed-defect/false-positive closure yet.

## Human gate and stopping point

Approve one item and its consequential policy, spec/task, owned files, acceptance checks and dependencies. Stop after evidence/diff review before integration. Exclude application fixes during this audit, production destructive checks, blanket redesign, promotion and archival. Failed reproduction alone does not close the finding.

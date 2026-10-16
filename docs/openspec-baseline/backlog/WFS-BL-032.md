# WFS-BL-032 — Resolve accepted Search filters that are not applied

| Field | Value |
| --- | --- |
| Finding type | Source-supported investigation; expected policy not fully settled |
| Priority | P2 |
| Capability / journey | recipe-search |
| Original IDs | SR-U03; BSL provenance in owner register |
| Verification evidence | Source/assertion review, independent reviewer prioritization; runtime reproduction not-run |
| Confidence | Medium overall; traced boundary, unmeasured runtime reach |
| Workflow status | Awaiting human decision and individual scope selection |
| Owner | Unassigned |

## Trigger, observation and authority

Send includedIngredients/categories/maximumTotalMinutes or preference ingredient/cuisine fields. Current service does not apply some accepted inputs; excludedIngredients instead rejects. Connected reach and intended API support must be established per field; do not present ignored fields as working filters or dismiss as documentation drift.

Expected behavior/authority: Trace each public input and caller, decide implement versus reject/deprecate under approved contract, then one field per tracer. Existing requirement/scenario mappings and original assertions are in [library audit](library-audit.md); this does not invent desired behavior from a missing test. [Original register](discrepancy-register.md) preserves IDs.

## Impact and recovery

Recoverable misleading results/navigation; request refresh or use a known supported filter as a provisional workaround, not a correctness guarantee. P2 reflects a user-visible runtime concern rather than documentation-only drift. Frequency conditional on the stated trigger; incidence is unmeasured. Root cause is the traced boundary above where established; remaining hypotheses require the fixture below.

## Scope, dependencies and side effects

Owned-file candidates: `RecipeSearchController/RecipeSearchService; OpenAPI/generated inputs; filter UI`. No edits authorized. Coordinate Search service ownership with019/006 where applicable;34 can run independently of Browse stack only after component conflict check. Exact contract/task and single-writer file set must be approved before dispatch. Changes may affect persisted history, response membership or displayed card state as described; do not fold unrelated cleanup.

## Resolution and acceptance

Trace each public input and caller, decide implement versus reject/deprecate under approved contract, then one field per tracer.

Required regression/integration/browser checks: Schema-compliant requests with paired discriminating recipes and exact IDs; null/absent/invalid values; verify actual mounted UI sends fields before assigning broad reach.

Content identity and check status: [verification](verification.md), [input identity](input-identity.md). Real API/DB/browser reproduction of this item remains **not-run**; no environmental failure was demonstrated. Independent library reviewer requested this explicit prioritization; no confirmed-defect/false-positive closure yet.

## Human gate and stopping point

Approve one item and its consequential policy, spec/task, owned files, acceptance checks and dependencies. Stop after evidence/diff review before integration. Exclude application fixes during this audit, production destructive checks, blanket redesign, promotion and archival. Failed reproduction alone does not close the finding.

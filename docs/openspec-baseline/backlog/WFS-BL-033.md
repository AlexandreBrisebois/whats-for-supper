# WFS-BL-033 — Revalidate Quick continuation against current eligibility

| Field | Value |
| --- | --- |
| Finding type | Source-supported investigation; expected policy not fully settled |
| Priority | P2 |
| Capability / journey | recipe-search |
| Original IDs | SR-U04; BSL provenance in owner register |
| Verification evidence | Source/assertion review, independent reviewer prioritization; runtime reproduction not-run |
| Confidence | Medium overall; traced boundary, unmeasured runtime reach |
| Workflow status | Awaiting human decision and individual scope selection |
| Owner | Unassigned |

## Trigger, observation and authority

Start Quick suggestions, mutate relevant schedule/recipe eligibility, then request continuation. Initial and continuation representations/revalidation differ; stale candidate eligibility is a source risk, not a reproduced unsafe suggestion. Existing continuation tests do not settle mutations between pages.

Expected behavior/authority: Use authoritative server policy to establish current eligible candidate behavior at continuation; do not recreate policy in the client. Existing requirement/scenario mappings and original assertions are in [library audit](library-audit.md); this does not invent desired behavior from a missing test. [Original register](discrepancy-register.md) preserves IDs.

## Impact and recovery

Recoverable misleading results/navigation; request refresh or use a known supported filter as a provisional workaround, not a correctness guarantee. P2 reflects a user-visible runtime concern rather than documentation-only drift. Frequency conditional on the stated trigger; incidence is unmeasured. Root cause is the traced boundary above where established; remaining hypotheses require the fixture below.

## Scope, dependencies and side effects

Owned-file candidates: `RecipeSearchService.cs; continuation store; Quick Find consumers`. No edits authorized. Coordinate Search service ownership with019/006 where applicable;34 can run independently of Browse stack only after component conflict check. Exact contract/task and single-writer file set must be approved before dispatch. Changes may affect persisted history, response membership or displayed card state as described; do not fold unrelated cleanup.

## Resolution and acceptance

Use authoritative server policy to establish current eligible candidate behavior at continuation; do not recreate policy in the client.

Required regression/integration/browser checks: Deterministic next-page request after recipe deleted/unready/assigned/status changed; compare exact IDs/eligibility, filters and week context; real service fixture.

Content identity and check status: [verification](verification.md), [input identity](input-identity.md). Real API/DB/browser reproduction of this item remains **not-run**; no environmental failure was demonstrated. Independent library reviewer requested this explicit prioritization; no confirmed-defect/false-positive closure yet.

## Human gate and stopping point

Approve one item and its consequential policy, spec/task, owned files, acceptance checks and dependencies. Stop after evidence/diff review before integration. Exclude application fixes during this audit, production destructive checks, blanket redesign, promotion and archival. Failed reproduction alone does not close the finding.

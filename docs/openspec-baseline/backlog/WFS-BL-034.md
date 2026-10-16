# WFS-BL-034 — Align Discovery position badges with visible cards

| Field | Value |
| --- | --- |
| Finding type | Source-supported investigation; expected policy not fully settled |
| Priority | P2 |
| Capability / journey | recipe-discovery |
| Original IDs | DISC-U04; BSL provenance in owner register |
| Verification evidence | Source/assertion review, independent reviewer prioritization; runtime reproduction not-run |
| Confidence | Medium overall; traced boundary, unmeasured runtime reach |
| Workflow status | Awaiting human decision and individual scope selection |
| Owner | Unassigned |

## Trigger, observation and authority

Vote updates reorder or annotate a deck with more than four cards. Store assigns position metadata to a different end of the deck than the first four rendered cards. User reach/label interpretation needs focused browser confirmation; absence of that check is not proof of no impact.

Expected behavior/authority: Reproduce visible badge/identity mismatch, settle positions relative to visible queue, then adjust only the owner of displayed position. Existing requirement/scenario mappings and original assertions are in [library audit](library-audit.md); this does not invent desired behavior from a missing test. [Original register](discrepancy-register.md) preserves IDs.

## Impact and recovery

Recoverable misleading results/navigation; request refresh or use a known supported filter as a provisional workaround, not a correctness guarantee. P2 reflects a user-visible runtime concern rather than documentation-only drift. Frequency conditional on the stated trigger; incidence is unmeasured. Root cause is the traced boundary above where established; remaining hypotheses require the fixture below.

## Scope, dependencies and side effects

Owned-file candidates: `discoveryStore.ts; discovery page/card consumers`. No edits authorized. Coordinate Search service ownership with019/006 where applicable;34 can run independently of Browse stack only after component conflict check. Exact contract/task and single-writer file set must be approved before dispatch. Changes may affect persisted history, response membership or displayed card state as described; do not fold unrelated cleanup.

## Resolution and acceptance

Reproduce visible badge/identity mismatch, settle positions relative to visible queue, then adjust only the owner of displayed position.

Required regression/integration/browser checks: More-than-four deterministic IDs, vote counts, front preserved/tail reorder; assert visible card ID and badge before/after actual SSE payload.

Content identity and check status: [verification](verification.md), [input identity](input-identity.md). Real API/DB/browser reproduction of this item remains **not-run**; no environmental failure was demonstrated. Independent library reviewer requested this explicit prioritization; no confirmed-defect/false-positive closure yet.

## Human gate and stopping point

Approve one item and its consequential policy, spec/task, owned files, acceptance checks and dependencies. Stop after evidence/diff review before integration. Exclude application fixes during this audit, production destructive checks, blanket redesign, promotion and archival. Failed reproduction alone does not close the finding.

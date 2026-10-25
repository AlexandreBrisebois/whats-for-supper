# Prepared demo baseline capture and reset

## Why

The demo should let an operator prepare a coherent sample household, capture it, let visitors experiment, and return to that baseline. The existing capture/restore workflows already implement the loop, but do not yet cover the newer household facts or safely publish database facts and recipe assets together.

PR [#348](https://github.com/AlexandreBrisebois/whats-for-supper/pull/348), change `cost-safe-demo-exploration`, separately owns model-boundary protection, honest AI-unavailable actions, model-free Search/indexing and the context band. This change is the **remaining capture/reset delta**, not a second implementation of those features. Related issue [#245](https://github.com/AlexandreBrisebois/whats-for-supper/issues/245) remains open.

## What Changes

- Preserve existing `demo-capture` / `demo-restore`, persisted background acceptance, intentional recurrence and fresh round authority. Extend their existing owners rather than create a scheduler or generic snapshot framework.
- Capture a complete versioned baseline with explicit restore/clear/preserve/rebuild dispositions: prepared plans/groceries, calendar, extras/lineage, household settings, approved member overrides and categories alongside existing members, recipes, search and history.
- Validate required relationships and assets before destructive work; stage capture without overwriting the last complete baseline; make restore publication recoverable across database/file failure.
- Coordinate household writes and old work during reset, reject stale writes/continuations and refresh mounted clients without replaying visitor edits. Preserve operator configuration, unrelated backups and device preferences.
- Prepare a small synthetic household that supports ordinary browse, vote, confirmed matches, explicit plan saving, groceries/extras and cooking. Keep local model-free imports and report resolution usable, with temporary visitor changes subject to the selected reset policy.
- Reuse existing recovery validation/publication mechanisms and the accepted #348 model-free search path where appropriate; keep independent exact/merge recovery contracts unchanged.
- Make baseline readiness, completed reset and confirmed future occurrence distinguishable in existing management diagnostics.
- **BREAKING, proposed:** upgraded rich reset requires a complete format; legacy core snapshots require recapture rather than silently treating omitted collections as empty.
- **BREAKING, proposed:** capture/selection requires operator authority unavailable to shared visitor credentials, and old work cannot mutate the restored household.
- Keep date mapping, fixture votes/reports/privacy, maintenance disposition, legacy compatibility, operator authority, reset availability/recovery and manual recurrence as explicit review decisions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: complete prepared-baseline capture/reset, recoverable publication, reset-specific coordination and diagnostics. Model isolation, local exploration and the context explanation remain owned by #348; the dependency and scenario mapping are in design.md.

- `data-backup-and-recovery`: retain the existing, unchanged delta's demo missing-history cross-reference; ordinary merge and independent exact recovery semantics remain unchanged.

Application-time, background-processing and search/indexing remain existing integration/preservation boundaries. This revision changes only four existing planning files; the pre-existing data-backup-and-recovery delta and change metadata are preserved.

## Dependency and Review Boundaries

Research is pinned to main `4682643cd6086b66008fc77ede4570329e29b5ae` and published #348 head `5370238ec5d3b9b44172e7c077d40d54cbf44dbf` on 2026-10-25. #348 is still draft/unmerged and undergoing corrections/verification; its implementation is not current-main behavior or a completed dependency. Recheck its final accepted head, including safe prepared-bundle imports, local report resolution and isolated browser fixtures, before planning dependent application work. Merged Home #339 and duration #346 are reused, not redesigned; beta #345 remains separate.

This approval covers deeper review and updates to the existing four planning files only. It does not settle the open behavior choices, authorize implementation/apply/sync/archive, close #245, or permit merge, deployment, live capture/reset, credentials or configuration changes. Prior validation belongs to its original content identity; this revision requires its own strict validation.

## Smallest Sufficient Delivery

First define and validate the baseline through the existing management seam, then prove a small complete capture → visitor changes → workflow reset → ordinary reads loop. Use existing recovery ownership for the required publication/coordination seam, not wholesale exact-restore delegation. Add only reset-specific failure, stale-client/work and recurrence acceptance after the core loop. Missing-asset preflight is a useful separately selected safety slice, but alone is not complete reset or public-operation qualification.

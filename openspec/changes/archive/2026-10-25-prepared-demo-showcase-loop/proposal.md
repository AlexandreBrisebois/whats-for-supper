# Prepared demo baseline capture and reset

## Why

The demo should let an operator prepare a coherent sample household, capture it, let visitors experiment, and return to that baseline. The existing capture/restore workflows already implement the loop, but do not yet cover the newer household facts or safely publish database facts and recipe assets together.

PR [#348](https://github.com/AlexandreBrisebois/whats-for-supper/pull/348), change `cost-safe-demo-exploration`, separately owns model-boundary protection, honest AI-unavailable actions, model-free Search/indexing and the context band. This change is the **remaining capture/reset delta**, not a second implementation of those features. Related issue [#245](https://github.com/AlexandreBrisebois/whats-for-supper/issues/245) remains open.

## What Changes

- Preserve existing `demo-capture` / `demo-restore`, persisted background acceptance, intentional recurrence and fresh round authority. Extend their existing owners rather than create a scheduler or generic snapshot framework.
- Capture a complete versioned baseline with explicit restore/clear/preserve/rebuild dispositions: members, recipes, search, household settings, approved member overrides, categories, with explicit clearing of calendar events, meal plans, groceries/extras, votes, import reports, aggregate voting history and recipe cooking history.
- Validate required relationships and assets before destructive work; stage capture without overwriting the last complete baseline; make restore publication recoverable across database/file failure.
- Coordinate household writes and old work during reset, reject stale writes/continuations and refresh mounted clients without replaying visitor edits. Preserve operator configuration, unrelated backups and device preferences.
- Prepare a small synthetic household that supports ordinary browse, vote, confirmed matches, explicit plan saving, groceries/extras and cooking. Keep local model-free imports and report resolution usable, with temporary visitor changes subject to the selected reset policy.
- Reuse existing recovery validation/publication mechanisms and the accepted #348 model-free search path where appropriate; keep independent exact/merge recovery contracts unchanged.
- Make baseline readiness, completed reset and confirmed future occurrence distinguishable in existing management diagnostics.
- **BREAKING:** upgraded rich reset requires a complete format; legacy core snapshots require recapture rather than silently treating omitted collections as empty.
- **BREAKING:** capture/selection requires operator authority unavailable to shared visitor credentials, and old work cannot mutate the restored household.
- Apply the accepted fresh-round, private-capture, bounded recovery and recurrence policies documented in design.md.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `demo-household`: complete prepared-baseline capture/reset, recoverable publication, reset-specific coordination and diagnostics. Model isolation, local exploration and the context explanation remain owned by #348; the dependency and scenario mapping are in design.md.

- `data-backup-and-recovery`: retain the existing, unchanged delta's demo missing-history cross-reference; ordinary merge and independent exact recovery semantics remain unchanged.

Application-time, background-processing and search/indexing remain existing integration/preservation boundaries. The pre-existing data-backup-and-recovery delta and change metadata are preserved.

## Dependency and Implementation Boundaries

The user selected implementation on top of the existing demo safeguards branch. The accepted policy and explicit data/workflow dispositions are in design.md; tasks.md records tests and incomplete acceptance. This supersedes the original four-file planning-only restriction. It does not authorize live operations, sync/archive, merge or deployment.

Local base `fdde5fe3` carries the corrected #348 safeguards. Preserve its model-free import/local-resolution/Search/Similar and browser acknowledgement behavior. Home #339 and duration #346 are reused without redesign. Original remote planning validation at `62d3c27e46f2b7a799dc6f2c5278986dcdd2cf59` does not validate these implementation edits.

## Delivery and acceptance

Use existing management/workflow/recovery owners for complete staged capture and recoverable reset. Prove a playable synthetic household through real API/PostgreSQL ownership, then stale client recovery and the browser loop. Keep ordinary independent exact/merge recovery intact. Qualify only with synthetic data, disposable files/databases and no model calls. Record scoped preparation, generated-client checks and final verification independently of deployment and physical-device qualification.

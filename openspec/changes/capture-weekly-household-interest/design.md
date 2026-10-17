# Design

## Context and Existing Ownership

ScheduleController POST /api/schedule/lock → ScheduleService.LockScheduleAsync persists weekly locking, snapshots selected live counts and clears RecipeVotes. DiscoveryService.SubmitVoteAsync upserts recipe/member choices. Separate browser assignment requests precede close; do not claim a transaction spans those requests. ManagementService owns ordinary backup and demo capture/restore. Schema owner is api/database/schema.sql with EF mappings. The API validation transition AwaitingConsensus → Locked can purge that recipe’s votes before close; no production frontend status-1 caller was found. C1 limits complete-capture claims for that API compatibility path, not the normal Planner close flow.

## Decisions and Tradeoffs

Accepted: aggregate-only history, indefinite retention, partial touched-row replacement, zero-like deletion, unchanged early votes and one operational week. Proposed storage: unique `(household scope if applicable, planning_week_start, recipe_id)` with positive integer count, selected-at-close boolean, captured-at metadata and source close identity. Do not invent multi-tenant columns if deployment isolation already supplies household scope. Count >0 and canonical Monday validation belong at persistence boundaries; no voter IDs, negatives or inferred individual traits.

Proposed round metadata/receipt is separate from live recipe/member rows. It identifies the one operational round, selected week and close outcome; it is not week-owned live preference data. A closed round has immutable receipt identity, while a deliberate reopen creates a new operational generation. Next-round early votes are held without requiring a new week open. Use existing database transactions/locking, not a new distributed service. This design recommendation needs concrete API compatibility reconciliation; a status flag alone cannot distinguish a lost response from a newly reopened round.

## First Observable Slice

Protected open/vote/lock requests through controllers → services → real PostgreSQL, then observe week lock, positive history and cleared live votes. Inject failure before commit and after commit before response. Retry the same close after a fresh early vote and prove that vote survives. Test selected A and unselected B together; the normal close-only slice does not require an aggregate pre-purge checkpoint; C1 is separate API compatibility coverage. API mocks alone cannot establish this boundary.

## State, Concurrency and Recovery

Serialize vote mutation, close and open/reopen against the same operational-round boundary. A vote arriving before close linearization is included; one after is next-round live state. A transaction with no shared lock or serializable retry policy is insufficient. Capture the touched set from all live vote rows before grouping positive likes; otherwise touched-zero is indistinguishable from untouched. Same-member Like→Pass crossing close must have one consistent outcome. Preserve untouched history and captured selection metadata; an empty intentional revote updates no rows.

Close receipt, target lock, selected calendar counts, positive upserts/deletions and vote clear commit together. Failed persistence rolls all back. Publication occurs after commit; a failed publish does not roll data back or justify mutation on retry. Use existing refetch/invalidation recovery; no exactly-once event delivery claim. A stale close must carry or resolve to its original round, not bind to the current reopened round. Legacy clients without a round token require an explicit safe compatibility rule; infer already-completed close only when it cannot act on a new round, otherwise conflict and refresh. The implementation contract must expose conflict/retry semantics rather than guess.

A plan edit concurrent with close is serialized or observed consistently at the snapshot boundary. Later edits do not change captured selected flags. Selection is persisted assignment, not suggestion or eating. Current-plan exclusion reads existing events and does not rewrite historical selection flags or cancel historical bonuses on other surfaces. If a future compatibility change captures aggregates at the API-only purge, define its later-vote/zero/retry behavior separately; no such checkpoint or cumulative sum is required for the primary flow.

## Persistence and Side Effects

Backup uses a complete versioned history snapshot, explicit empty, recipe dependencies and canonical keys. Ordinary absent legacy history preserves destination rows; demo legacy restore resets history to empty. Valid complete restore replaces the declared history scope atomically; malformed/missing dependency fails that portion clearly without claiming the whole management operation rolled back. This authoritative replacement is a new contract alongside existing additive member/recipe restore. Do not export/replay stale active close receipts; successful restore invalidates operational generations so old browsers must refresh. Existing partial management outcomes remain reported by their owner.

Recipe soft deletion leaves history retained but ineligible; permanent purge removes dependent rows. Member removal must not cascade anonymous aggregate rows. Household teardown clears them with household data. No normal-family history reset action or retention cron is added. Demo reset replaces rotation/history facts coherently and clears transient receipts, retaining existing workflow ownership.

## Compatibility, Rollout and Reversal

Expand schema first, leaving existing rows/votes untouched and history empty. New writer must not activate while old close/vote writers bypass its serialization: deploy an all-writer-compatible version or pause writes during the bounded cutover. Add optional response round identity and idempotency input only after approving OpenAPI; update generated PWA client and method-sensitive mocks together. Do not deploy a required new token without an old-client recovery contract.

Enable capture before ranking. A rollback disables ranking/rotation consumption while preserving stored aggregates; it must not drop indefinite history or reintroduce an unsafe old clear path against active new rounds. Reverting binaries below the new transaction contract needs a controlled voting pause/compatible migration, not a claimed safe feature-flag rollback. Restore backup before destructive migration; no destructive migration is proposed.

## Operational Diagnosis

Use existing request/workflow correlation IDs for close commit/replay/conflict and export/restore validation. Log counts/statuses and operation identity, not member vote payloads or preference histories. Distinguish commit failure from post-commit publication failure. No new telemetry service or performance target is invented.

## User Experience

Existing voting remains recognizable. Guide copy explains early votes survive opening, close keeps anonymous household totals then clears working votes, and history is not proof of eating. No individual analytics or child profiling. Pending close and retry must not report success before durable outcome. Designer/mère-designer simulation prioritizes not losing an interrupted family's votes over hidden technical detail.

## Live round versus historical interest

Live likes feed Quick Find/Replace while the operational voting round is live, before close. Valid early votes received after the previous close and before the next explicit open are still working round data and remain usable; no strict VotingOpen gate is introduced. Close snapshots positive aggregate history and clears working votes. Historical interest then gives previously unselected recipes a route back into suggestions without needing the cleared live likes to persist. New early votes can also begin the next round's live signal. The completed caller trace confirms manual Quick Find/Search assignment does not clear votes or call status-1 validation; it persists Planned (0).

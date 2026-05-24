# Requirements: Smart Defaults On Active Voting Week (Regression Fix)

## Vision
When a family opens voting for any week, the planner for that same week must load smart defaults derived from discovery votes. Users must never lose pending suggestions simply because voting is open on a non-zero `weekOffset`.

## Product Decisions
1. Smart-default loading is governed by `status === 1` (VotingOpen), not by `weekOffset === 0`.
2. The planner must fetch smart defaults for the currently viewed week (`get().weekOffset`) in all store paths (`init`, `openVoting`, `sync`).
3. No contract changes are required; this is an implementation regression against existing contract behavior.
4. No UI redesign is in scope; this is behavior correction plus regression tests.

## Pre-Mortem (Dead Ends / Blind Spots)
1. Dead end: opening voting on next week (`weekOffset=1`) shows no pending suggestions even with valid family votes.
2. Blind spot: store paths use mixed week references (`0` in one path, `get().weekOffset` in another), causing inconsistent behavior after navigation.
3. Silent failure: SSE `smart_defaults_updated` can arrive, but initial load is already wrong, creating user confusion and apparent randomness.
4. Regression risk: future refactors may reintroduce literal `0` on planner smart-default fetches.

## AC Index

### AC-1 Active Voting Week Loads Defaults
1. If schedule status is `VotingOpen` (`status === 1`) for week `W`, planner initialization must request `GET /api/schedule/{W}/smart-defaults`.
2. If status is not `VotingOpen`, planner must not request smart defaults.
3. Applies to any integer week offset supported by the existing contract (including `0`, positive, negative).

### AC-2 Open Voting Uses Current Week
1. When `openVoting()` succeeds for week `W`, the follow-up fetch must load schedule and smart defaults for `W` (not hardcoded week `0`).
2. Pending smart-default slots must be visible immediately after `openVoting()` without waiting for a later sync loop.

### AC-3 Sync Uses Current Week
1. During `sync()`, when authoritative schedule for week `W` has `status === 1`, store must request smart defaults for `W`.
2. `sync()` must not request smart defaults for other weeks.

### AC-4 Regression Tests (Red-Green)
1. Unit tests must fail first against current buggy behavior, then pass after fix, for `init`, `openVoting`, and `sync` paths.
2. A planner E2E scenario must verify non-zero voting week behavior end-to-end via week navigation and visible pending-vote indicator.
3. E2E assertions must use `page.getByTestId(...)` only.

## Glossary
- Active voting week: any week whose `ScheduleDays.status` equals `1`.
- Smart defaults: response from `GET /api/schedule/{weekOffset}/smart-defaults` merged as pending planner slots.
- Pending slot: planner day seeded from smart defaults (`_isPending=true`) before explicit user confirmation.

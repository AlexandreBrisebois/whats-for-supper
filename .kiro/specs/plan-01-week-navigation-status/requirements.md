# PLAN-01 — Week navigation and status: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Source artifact:** current planner, schedule API, and schedule-stream source listed in [`design.md`](design.md).
- **Authority:** documents existing behavior only; it does not authorize implementation.

## Outcome

A planner user can move between calendar weeks, view the returned seven-day schedule, and see whether that week is Draft, Voting Open, or Locked.

## Implemented behavior

- **PLAN-01-AC-01 — Week selection.** `/planner` treats a missing `weekOffset` as `0`; previous/next controls replace the URL query with the adjacent integer offset (and remove it again at zero). The page parses decimal integer text with `parseInt`; a non-finite result leaves the current selection unchanged.
- **PLAN-01-AC-02 — Authoritative week snapshot.** A change to the planner offset calls `weekStore.init(offset)`, which obtains `GET /api/schedule?weekOffset={offset}`. The server derives Monday through Sunday from its clock and returns seven dated days plus numeric weekly status and `locked`; it does not persist a client-selected week.
- **PLAN-01-AC-03 — Status and tab presentation.** The page renders Draft/Voting Open/Locked from `weekStore.status`; `weekStore` loads smart defaults only while status is `VotingOpen`. The Planner/Grocery tab is client state in `plannerStore`; it does not alter `weekOffset`.
- **PLAN-01-AC-04 — Loading and stale selection.** `init` exposes `isLoading`, and discards fetched schedule/default data if `weekStore.weekOffset` no longer equals the requested offset. A fetch failure merely clears loading; this path has no rendered error or retry control.
- **PLAN-01-AC-05 — Stream reconciliation.** `/api/stream` applies a connected or week-updated snapshot only when its `weekOffset` equals the loaded week. Move echoes carry `echoSeq`; the store confirms the sequence and retains the optimistic schedule. A snapshot arriving during a drag or unconfirmed move is deferred until the move is confirmed.
- **PLAN-01-AC-06 — Schedule representation.** Each server day contains `day`, ISO date, optional recipe, and per-day status. The client gives each displayed day a local `_uiId` and merges persisted grocery state/items; those UI fields are not API contract fields.
- **PLAN-01-AC-07 — Access and scope boundary.** The schedule endpoints shown here have no member-id binder in `ScheduleController`; member-specific voting belongs to PLAN-04/discovery. Authentication/response conventions are owned by `plat-07-health-auth-response-conventions`.

## Limitations and non-goals

- URL parsing accepts `12junk` and has no range guard; offsets are not constrained to a finite planner horizon.
- The week label is localized, but planner day names are server literals (`Mon` through `Sun`), and fetch failure is silent.
- The stream’s connected snapshot is week 0; a user viewing another week relies on its request rather than a stream snapshot.
- Assignment, replacement, movement, voting, and grocery behavior are separate packets: PLAN-02, PLAN-03, PLAN-04, and `groc-01-derived-weekly-grocery-list`.

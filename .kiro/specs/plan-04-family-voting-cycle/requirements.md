# PLAN-04 — Family voting cycle: requirements

## Status

- **Status:** Implemented capability baseline.
- **Kind:** Capability baseline; behavior-first.
- **Authority:** documents existing behavior only; it does not authorize implementation.

## Outcome

The planner can open voting for a week, display consensus candidates while it is open, promote displayed pending candidates when it locks, and direct individual members to the discovery-vote flow.

## Implemented behavior

- **PLAN-04-AC-01 — Week lifecycle.** `POST /api/schedule/voting/open?weekOffset=<n>` creates or marks `WeeklyPlan` VotingOpen and publishes a week snapshot. The planner permits opening for a nonpast loaded week when status is Draft or Locked. `closeVoting` posts assignments for every locally pending smart default in parallel, then posts `POST /api/schedule/lock?weekOffset=<n>`; lock marks that week’s events Locked, persists their like count, and globally deletes all `RecipeVotes`.
- **PLAN-04-AC-02 — Member voting.** Discovery, not the planner, posts `POST /api/discovery/{id}/vote` with `{ vote }` and requires `X-Family-Member-Id`. The service upserts one `RecipeVote` per recipe/member, counts Likes, and publishes `vote_updated`.
- **PLAN-04-AC-03 — Smart defaults.** Schedule smart-default requests calculate `ceil((familySize + 1) / 2)`, select Like-voted recipes at/above threshold, order unanimous first then descending `LastCookedDate`, and place them in unoccupied target-week indices. While a week is VotingOpen, `weekStore` represents them as `_isPending` rather than persisted scheduled events. A threshold crossing (or one below) publishes `smart_defaults_updated` only for week 0.
- **PLAN-04-AC-04 — Nudge link.** Planner’s Nudge Family resolves `getVotingLink(window.location.origin)` and offers copy; native share is offered only when `navigator.share` exists, otherwise copy remains available. It falls back to `/discovery` when no voting link is returned.
- **PLAN-04-AC-05 — Stream updates.** `vote_updated` changes vote counts in planner/discovery stores. `smart_defaults_updated` applies only when event offset equals the loaded week; it never replaces a confirmed nonpending day. `week_updated` carries lifecycle/lock snapshots.
- **PLAN-04-AC-06 — Scope boundary.** Discovery queue/filter behavior belongs to DISC packets; selected-week navigation is PLAN-01. This packet records scheduling use of votes, not a household governance policy.

## Limitations and non-goals

- Vote rows are global in service queries; neither threshold nor lock purge is household-scoped in the current source.
- Open voting allows a Locked week to reopen, and lock promotion is a series of assignment calls followed by lock, not one atomic service operation.
- The client only reacts to smart-default threshold events for week 0 even if another week is open.
- Nudge retrieval/copy/share failures are console-only; there is no rendered retry/error state.

# Proposal

## Why

Families should stop swiping when confirmed household matches cover the meals still needed, even when Discovery has cards remaining. Issue [#291](https://github.com/AlexandreBrisebois/whats-for-supper/issues/291) currently spans independent vote, suggestion, Planner and SSE paths; one server-side voting-session owner should determine convergence.

## Outcome and Scope

This is an in-progress specification, not implementation authorization. The supported deployment is one .NET API host process on a home server, without load balancing. Use a host singleton inspired by an actor: hydrate from existing server data and serialize session commands. Do not introduce an actor framework or separate durable actor store. Future multi-instance coordination is deferred to [#316](https://github.com/AlexandreBrisebois/whats-for-supper/issues/316).

The household has one operational round at a time. Votes may arrive before a week opens. Opening attaches the existing round to the intended week without discarding early votes. Convergence stops Discovery for everyone; closing remains a separate explicit action through the existing Close Voting button. Restart uses Close Voting followed by the existing Open Voting button, not a new control.

## What Changes

- Stop Discovery when confirmed distinct qualifying matches cover the remaining recipe slots. There is no extra-match buffer: one remaining slot requires one match. Keep the existing household consensus threshold.
- Count slots from persisted occupancy of the intended week, including Other plans and saved recipes. Pending suggestions are not persisted occupancy; exclude already selected recipe identities from new match coverage.
- Keep Discovery stopped for the round within the current host lifetime once convergence occurs. SSE and reconciliation communicate the server decision; optimistic swipes do not establish it.
- Convergence stops Discovery interaction, not server vote acceptance. Record late or in-flight votes normally while the round remains open. These votes may create additional matches or change suggestion ordering through the existing selection/ranking policy; suggestions are not frozen at convergence. Reconcile updated suggestions to Planner without restarting Discovery or assigning more recipes than available slots. Votes recorded before the existing close boundary participate in its historical capture; preserve existing close-boundary semantics for concurrent submissions.
- Preserve pending suggestions as suggestions, with no Change action. Their normal persistence path remains promotion during Close Voting; convergence and navigation do not assign meals.
- Reuse existing close/history/round-identity safeguards. After closing, removing a saved recipe and reopening the same week creates a new voting round for the newly available capacity. Historical interest already supports repeated rounds within a week and is not redesigned here.
- Hydrate the singleton after recycling from existing votes, week ownership and persisted plan data. After host restart, recalculate from current data; Discovery can resume if convergence no longer holds. This recovery exception is explicitly accepted; no durable stop marker is added.

- Replace the converged Discovery card arena with the app-logo celebration and exact English copy “We did it!” / “Menu’s In!”. No celebration button, Planner nudge, confetti or automatic navigation.
- Preserve the non-converged exhausted-feed experience and existing warm copy. Keep Capture and Refresh Feed available, and reuse the existing family-nudge sharing dialog; queue exhaustion alone never claims household success or identifies members as unfinished.
- Provide a model-neutral image-generation brief as a planning artifact. Asset selection remains with the user; no generated image is selected by this specification.

## Capabilities

### New Capabilities

None proposed. The actor is an implementation owner for existing voting behavior, not a new user capability.

### Modified Capabilities

- `recipe-discovery`: confirmed match coverage, household-wide stopping before deck exhaustion, and the family celebration.
- `planning-lifecycle`: session convergence distinct from close, single-host hydration, and reopen behavior against remaining capacity.

- `household-live-updates`: publish active-round progress and suggestions, reconcile authoritative state on entry/reconnect, and reject stale session data.

Existing `meal-planning` and `weekly-household-interest` remain preservation dependencies; no planned-count badge redesign or historical algorithm change.

## Impact

Source inspection confirms `DiscoveryService.SubmitVoteAsync` publishes duplicated smart defaults for week zero, while `ScheduleService.ReadSmartDefaultsAsync` separately computes suggestions. The existing `VotingBoundary` coordinates database writes. `ScheduleService.OpenVotingAsync` preserves early votes and enforces a single owner; `LockScheduleAsync` captures touched recipe-week history, preserves untouched history, clears completed-round votes and advances round identity with retry protection.

Planner hides the recipe action for `_isPending` entries. `weekStore.closeVoting` promotes pending suggestions through separate assignment requests before lock: this is not an atomic promotion-and-close operation. Preserve and explicitly cover partial-success recovery during design.

Likely affected seams are those services, the round read contract, generated client, existing week store, Discovery/Planner presentation and singleton SSE consumer. Contract, mock and integration coverage will be specified after behavioral decisions are settled. These are static observations, not runtime qualification; no application changes or runtime checks have been made for this change.

## Draft Assumptions and Boundaries

- An opened week with confirmed zero remaining slots immediately stops Discovery without votes or plan mutations, using the same celebration. This is the zero-capacity consequence of the selected coverage rule.
- No week owner means ordinary early voting, not convergence against a guessed current week.
- Existing ranking remains unchanged; additional votes can change consensus membership/unanimity and therefore existing ordering. This change does not introduce raw-vote sorting as a new ranking policy.
- A stopped session is not a closed week. Closing and reopening retain existing buttons, persistence, history and retry semantics. No deployment, implementation, archive or main-spec synchronization is part of this planning work.

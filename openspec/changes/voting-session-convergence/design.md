# Design

## Context and Existing Ownership

Scope and product decisions are in [proposal.md](proposal.md). This is a planning draft, not a claim of implemented or runtime-qualified behavior.

| Existing owner | Observed behavior and bounded change |
| --- | --- |
| `DiscoveryService.SubmitVoteAsync` | Saves votes through `VotingBoundary`, publishes counts, duplicates smart defaults at threshold boundaries for week zero. Keep vote acceptance; refresh owned-session suggestions after every committed vote, including late votes. |
| `ScheduleService.ReadSmartDefaultsAsync` | Counts consensus and places candidates into unoccupied dates. Extract this cohesive calculation/read owner for both consumers; exclude selected recipe IDs before placement/counting. Keep existing eligibility, threshold and ranking. |
| `VotingRoundState`, `OpenVotingAsync`, `LockScheduleAsync`, `VotingBoundary` | Already own one round, early votes, week binding, durable close receipts and history. Reuse these; no new lifecycle persistence. |
| `weekStore.closeVoting` | Captures displayed pending slots, assigns in separate parallel requests, then locks with round identity. Keep this lifecycle and existing recovery; convergence does not call it. |
| `discoveryStore`, `useScheduleStream` | Existing queue state and one shell-owned SSE connection. Add a small authoritative session projection here, not another connection or global event bus. |
| Discovery page | Local `matchCount` and exhausted queue currently drive wrap-up and destination. Retain these legacy empty-state decisions only when not converged; never use that count for household readiness. |
| Planner page | Pending recipes omit Change. Nudge dialog, `getVotingLink`, clipboard and native share already exist inline. Extract only that cohesive dialog/behavior for reuse without changing Planner behavior or test IDs. |

The app logo reference is [solar_earth_logo.png](../../../specs/mockups/solar_earth_logo.png). The app palette is owned by `pwa/src/app/globals.css`; fonts are Outfit and Inter. See [image-generation-prompt.md](image-generation-prompt.md) for model trials, not a new logo or a selected generated asset.

## Decisions and Tradeoffs

### One in-process session owner

Use one DI singleton, conceptually `VotingSession`, with an async serialization gate around hydration, recalculation and replacement of its immutable projection. The home server runs one API host. This is an actor-inspired ordinary service, not Orleans/Akka, a hosted polling worker, a distributed lease, a mailbox framework or event sourcing.

Do not capture scoped `DbContext` or scoped services in the singleton. Open and dispose an explicit service scope for each database operation. Keep existing transactional vote/open/close operations in their current scoped owners. Their post-commit session refresh commands funnel through the singleton; the actor owns derived session state, not a second copy of persistence policy. Request cancellation releases gates safely; a canceled publication never rolls back committed votes.

Use the existing database voting boundary for a coherent session read of owner, votes, family size, candidate recipes and occupied dates. Read under that boundary, finish the database scope, then publish the immutable result. Do not hold a database lock over network publication. Call session refresh only after existing mutation transactions end; do not invoke it recursively from the shared calculation. The singleton serializes projections; `VotingBoundary` continues to serialize persisted vote/close writes. Preserve both responsibilities rather than replacing database safeguards with an in-process lock.

The read needs one consistent database snapshot for recipe/member facts too; the existing table lock alone does not freeze those tables. Use a scoped repeatable-read transaction for this projection and acquire the existing voting lock before querying, or an equivalent single-query snapshot. This is a projection-read choice, not a repository-wide isolation change. Keep state replacement after the successful read; failed or canceled reads cannot publish partial calculations.

### Minimal read and notification contract

Add one protected `GET /api/discovery/session` returning the standard success envelope with a `VotingSessionSnapshot`. A cold Discovery entry has no week/round owner; extending only a week-specific smart-default read would still require guessing or fetching every week. A small read endpoint is the bounded extension that resolves that gap. Existing vote request and response contracts remain unchanged.

Proposed snapshot fields, to be declared in `specs/openapi.yaml` before implementation:

| Field | Meaning |
| --- | --- |
| `incarnationId` | Opaque UUID created once per host lifetime; never persisted. |
| `revision` | Nonnegative, monotonically increasing within the incarnation across round transitions; unchanged identical reads need not increment it. |
| `roundId` | Existing operational round identity; null only for a genuinely uninitialized unowned store. Reads do not create database rows just for this feature. |
| `weekStartDate` | Active absolute Monday, or null when unowned. |
| `phase` | `unowned`, `collecting`, or `converged`; closed-week status remains with schedule reads. Closing advances to the existing unowned next round. |
| `requiredSlots`, `coveredSlots`, `candidateCount` | Nullable when unowned; nonnegative integers when owned. Unknown/unavailable is a failed read, never a zero-filled snapshot. |
| `smartDefaults` | Existing `SmartDefaultsDto`, nullable when unowned; owned counts and suggestions originate from the same read. |

Publish the same snapshot in `voting_session_updated` on the existing `/api/stream`. One new event is clearer and smaller than changing every legacy schedule/default frame to carry unrelated session metadata. Keep existing `vote_updated` and `smart_defaults_updated` publication for compatibility, but use the shared calculation and the owning week for active voting. When unowned, retain existing early-vote behavior. Do not send an active-week snapshot as the existing week-zero `connected.schedule` or change Today/grocery semantics.

In the browser, the new snapshot is the authority for active-round pending suggestions. Legacy smart-default events without a compatible version must trigger session reconciliation rather than overwrite accepted active-session suggestions. Keep legacy direct smart defaults usable for non-session contexts. A generation guard also invalidates pending initialization/sync results before they can reintroduce stale pending content. Apply the same-week accepted projection after ordinary schedule composition; preserve persisted recipes and Other plans.

### Coverage and ranking

Let `R` be the number of dates without a persisted calendar entry in the owning week, before suggestions are placed. Let `C` be distinct candidates satisfying existing consensus and candidate rules, excluding already selected recipe identities. Coverage is `min(R, C)`; convergence is `C >= R`, including `R = 0`. Do not use the DTO's post-placement `openSlots.length` alone as the target. Do not count pending suggestions as persisted occupancy or count a selected recipe again.

Keep existing candidate policy separate from Discovery queue visibility/cooldown. Keep unanimity-first and existing secondary ordering; no new raw-vote ranking, unanimous-only consensus or voting algorithm. Recompute after every vote: a last vote can change unanimity/order without crossing the old threshold publication boundary.

### Minimal UI changes

Branch the existing Discovery arena by confirmed session state. Keep ordinary queue fetching/filtering and voting controls intact outside convergence. Hide/disable new voting interaction on convergence without deleting cards, synthesizing passes, canceling submitted requests or emptying the server queue. Make all Discovery attention indicators respect authoritative convergence rather than merely retained stack length; preserve Planner's existing voting controls and badge calculation.

For a non-converged empty queue, keep existing translated copy and existing primary destination. Ensure Capture remains directly reachable even when the legacy primary action is Go to Planner; add the reused Nudge family control only for an owned open round. Do not claim particular people are unfinished: an exhausted queue provides no such evidence. “I'm done voting!” is an optional copy direction, not required wording; the minimal implementation retains current warm wording. Refresh Feed and return-later behavior remain usable.

## First Observable Slice

Use a real four-member household with four persisted Other plans and three distinct candidates needing their final consensus vote. Open the intended week, record votes through the existing POST route, read the new session snapshot and receive the stream event. The third confirmed match yields `requiredSlots=3`, `coveredSlots=3`, `phase=converged`. Two browser contexts stop Discovery while cards remain. Planner still shows pending suggestions and VotingOpen; database assertions show no new calendar assignments or historical rows before Close Voting.

This first slice includes shared server calculation, singleton hydration/projection, OpenAPI/generated client/stateful mock, existing stream/store wiring and the basic logo/text celebration using the existing asset. Later slices cover late updates, restart/reopen, empty-feed/nudge reuse and the user-selected illustration. Do not implement all backend work before integrating a browser path.

## State, Concurrency and Recovery

```text
unowned + early votes
        | existing Open Voting / Ask the Family
        v
collecting -- coverage met --> converged
        |                         |
        +--- existing Close ------+
                    |
                    v
             unowned next round

host restart: hydrate current database facts and recalculate
```

- Convergence is an in-memory latch keyed by round identity, not by week alone. A repeated open of that round retains it. A new round resets it. Later votes and edits still recalculate informational counts and suggestions, without unlatching in the current host.
- On host restart the user explicitly accepts recalculation and possible resumed Discovery. No marker, migration, timer-based persistence or hidden local-storage surrogate is introduced.
- A snapshot read recalculates from current database facts rather than assuming all mutation writers have sent notifications. This recovers after publication failure. Post-commit refresh hooks cover voting, open/close and existing schedule assignment/removal/move/defer/non-cooking publication boundaries; where a mutation spans weeks, recalculate only if the owned week is affected. Use explicit existing call sites, not an EF interceptor or universal event framework.
- Existing recipe/member changes can affect eligibility or threshold. Relevant existing invalidations trigger a read; reads remain fresh. Scope any immediate post-commit refresh hook to these actual inputs, without refactoring their unrelated flows. Include member-count change and recipe removal cases in acceptance.
- Client state distinguishes unknown/loading/unavailable from confirmed `unowned`. Never infer success from a failed read. A previously confirmed same-round celebration may remain while a refresh fails, without presenting newer counts as confirmed.
- Initial entry, native SSE reconnect, foreground resume and successful local mutations invoke the same coalesced session-read action. No new polling schedule. When a mutation fails after possible commit, existing reconciliation plus session reread determines truth; do not retry a mutation merely to force a notification.
- Within one incarnation, compare revisions globally, including across rounds. Duplicate frames have no effect. On unexpected incarnation, invalidate pending requests and fetch authoritative state. Do not order UUIDs or trust an unsolicited old frame as proof of a new host. Accept a new baseline only from the current reconciliation generation; reject superseded HTTP responses. An SSE event received during a read advances the guard so an older read cannot replace it.
- Open/close, local schedule actions and initialization already have week guards. Add session-generation guards only where pending suggestions cross those paths; do not replace the entire week store or its unrelated drag, Today and grocery policies.

## Persistence and Side Effects

No new schema or historical writer. Existing vote persistence precedes count/session notification. Shared computation cannot persist suggestions. Publication failures leave the committed database operation intact; the next authoritative read repairs the projection. New session notification should be best-effort and logged after commit, without adding a new failure outcome to otherwise successful existing routes; existing failures retain their current semantics.

Close still captures displayed pending suggestions, promotes them with separate requests and then invokes the existing round-aware lock. Late votes before that capture may alter the displayed set; after capture they do not retarget already issued assignments. Their historical membership follows the database close boundary. Do not promise a frozen menu, an atomic promotion transaction or the mathematically latest ranking at lock time.

Use the existing `requireEmpty` assignment guard for promotion with the captured calendar reference, so an intervening Other plan or saved recipe is preserved. This is the narrow close-path protection needed for live suggestion updates, not a replacement-workflow rewrite. On conflict/partial failure, reread the captured week/session, retain successful writes and do not lock from that failed invocation. On a subsequent explicit retry, promote only still-pending empty targets. Maintain the existing close receipt semantics and never compensate by deleting saved assignments or clearing votes. No new retry UI is required.

## Compatibility, Rollout and Reversal

Add the read DTO and named event to OpenAPI, regenerate Kiota, update typed API wrapper, and implement stateful mock handlers/event payloads together. Existing endpoints, vote payloads, routes, queue ordering and auth/member rules stay intact. The new read follows existing protected household access; no new permissions or identity model. Roll out API and PWA together in the existing single-host deployment. Older clients ignore the new event and continue the existing flow; missing session data in a mixed deployment must never fabricate convergence.

No schema migration or irreversible data rewrite is required. Reverting the feature restores ordinary Discovery behavior and leaves existing votes/history/meal plans intact. Multi-instance support is explicitly deferred to issue #316. Do not add feature flags or deployment machinery solely for this slice.

## User Experience

The celebration is a stable in-place state with the app logo and two text lines: **We did it!** / **Menu's In!**. No CTA, forced navigation, explanatory paragraph, confetti or sound. Keep the existing app navigation accessible. Late updates do not replay the entrance. Respect reduced motion; use a brief existing fade only if appropriate. Render text as localized HTML; decorative image uses empty alternative text so it is not announced twice. Announce the meaningful state once, without moving keyboard focus or trapping it when swipe controls disappear.

The production image remains user-selected. Start with the existing logo so image choice cannot block behavior tests. The selected asset must fit the same component without a layout redesign. On image failure the heading remains legible. Review 320px-wide mobile, normal desktop, keyboard use, reduced motion, foreground return and a second member's completion mid-gesture. Generated-image review alone does not establish these interactions.

Keep Planner's existing post-close “Menu's in!” toast and its historical-vote/reset explanation unchanged. The new Discovery celebration shares the familiar phrase, but does not fire that saved-close feedback or claim votes have been reset.

## Acceptance Properties

- For every `R` in 0..7 and valid `C >= 0`: `0 <= covered <= R`, placements do not exceed `R`, and no occupied date or selected recipe is counted twice.
- Confirmed success implies sufficient coverage at the transition, not unanimity, assignment, saved history or all members having finished.
- The current-host latch is monotonic within a round; newer-round and new-incarnation behavior follow the explicit reset rules.
- Repeated identical snapshots do not change counts or cause writes. Failed/unconfirmed votes cannot create success.
- Existing close retries cannot delete later-round votes or replace a previous historical outcome. These require real PostgreSQL seam tests, not only in-memory or browser mocks.

Use table-driven coverage tests for the small slot domain, existing API/DB suites for persistence and contention, and two browser contexts for household communication. A mocked browser test is not proof of real SSE/database behavior.

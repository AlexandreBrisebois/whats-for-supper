# Discovery rotation — design

Status: reviewed proposal. Implements [requirements](requirements.md) with local
changes to the existing Discovery path. No application changes have been made.

## Verified path and failure points

Paths below are repository-relative, verified in the working tree on 2026-09-20.

| Boundary | Existing owner and behaviour | Proposed change |
|---|---|---|
| Browser request | `pwa/src/lib/api/discovery.ts` → `pwa/src/lib/api/api-client.ts` → `pwa/src/lib/api/generated/api/discovery/index.ts`; wrapper maps `RecipeDto[]` in response order | Map an additive Discovery envelope, preserving recipe image mapping |
| Contract/controller | `specs/openapi.yaml`, `api/src/RecipeApi/Controllers/DiscoveryController.cs` | Add Discovery target context/empty reason and document first-result-first semantics; regenerate the affected client |
| Eligibility/ranking | `api/src/RecipeApi/Services/DiscoveryService.cs` reads `DiscoveryRecipes`, excludes requester votes, sorts Like count then cooking date | Local calendar predicate, batched rating/history inputs, one deterministic ordering |
| Persistence | `api/database/schema.sql` defines `vw_discovery_recipes`; `DiscoveryRecipe.ToRecipe()` drops vote count; `Recipe` has saved `Rating`; `CalendarEvent` has date/status/recipe ID | Read existing fields only; no SQL, entity or DTO changes |
| Presentation | `pwa/src/app/(app)/discovery/page.tsx` currently renders/votes from the array end | Make index zero front everywhere |
| Live state | `pwa/src/store/discoveryStore.ts` assumes index zero front but locally moves only indices 1–3 and ignores zero count | Replace local ranking with invalidation plus server-list reconciliation |
| Event dispatch | `pwa/src/hooks/useScheduleStream.ts` routes vote/calendar events; only fill-the-gap currently refreshes Discovery | Notify Discovery for all specified existing event types |
| Voting target/purge | `ScheduleService.OpenVotingAsync` selects a week; `ScheduleService.LockScheduleAsync` purges all votes on lock; `DiscoveryService.SubmitVoteAsync` emits existing consensus updates | Make the explicitly opened week the sole target without changing either purge implementation or automatically opening a week |

The current page's reversal makes the lowest-ranked API result the first vote.
Calendar eligibility is absent, so purging votes makes locked recipes visible
again. Discovery also cannot tell a full plan from an exhausted library, and
`OpenVotingAsync` permits multiple open weeks despite one global vote pool.
Existing tests contain a TODO for planned-recipe exclusion; DOM `.first()`
assertions do not establish which overlapping card receives a vote.

## Server ownership, voting target and query shape

`RecipeVotes` remain one global, ephemeral pre-vote pool. Discovery is never
gated by a week status: after a lock purges the pool, family members can continue
to browse and cast the next pre-votes before anyone selects another voting week.
`LockScheduleAsync` remains byte-for-byte unchanged and must not call
`OpenVotingAsync` for any offset.

`OpenVotingAsync(weekOffset)` is the sole explicit target-selection operation.
It must reject the request without mutation when another `WeeklyPlan` is already
`VotingOpen`; opening the selected plan neither clears nor copies `RecipeVotes`.
The selected week, not a computed `N+1`, is the target. This makes the existing
global pool unambiguous without adding vote/session persistence.

When `SubmitVoteAsync` crosses the existing consensus boundary, resolve that same
target and call the existing smart-default path for its offset rather than the
current hard-coded offset. This changes only which week receives the existing
consensus result; do not alter threshold calculation, default ranking or slot
assignment policy. With no target, retain vote recording and `vote_updated` but
do not fabricate a planner default for a week the household has not selected.

`GET /api/discovery` returns a `DiscoveryResponseDto`: the existing ordered
recipe DTOs in `recipes`, plus `votingTarget` (`weekStartDate` and
`remainingSlotCount`, or null) and `emptyReason` (`TargetWeekFull`, or null).
This is the one authoritative read for both cards and capacity, avoiding a PWA
calendar reconstruction or a separate context race. A normal exhausted stack has
an empty `recipes` list and a null empty reason. Categories keep their existing
schema because the page stops scanning when the main response says the target is
full. Update OpenAPI and generated client in the same slice.

Resolve the target and its capacity from the same server clock/calendar query as
the recipe list. When a target exists, count Monday--Sunday dates that contain a
recipe in a non-`Skipped` event; seven such dates mean `TargetWeekFull` and the
service returns no recipes regardless of category. Null-recipe and skipped events
are available. With no target or remaining capacity, retain normal eligibility
and ordering. Removing a target-week assignment makes the next authoritative
read eligible to return cards again.

Keep the policy inside `DiscoveryService`. Inject the already-registered
`IClock` (`api/src/RecipeApi/Services/IClock.cs`); derive UTC today and week bounds
once per request. Update direct test construction as needed, without a new clock
abstraction or changing the service's public operations.

Build a private eligible-query helper over the existing discovery view. Apply
the current filters/requester-vote exclusion plus an EF calendar `Any` exclusion
matching DR-R1. Reuse it for categories; the latter does not need ranking inputs.
No category-specific copy of calendar policy.

For stack ranking, load eligible discovery rows, then batch-read their saved
ratings and historical calendar date/status fields by candidate ID. Aggregate
latest use dates into a dictionary once; avoid per-recipe queries or a nested
full-history scan per candidate. The endpoint already returns the full stack;
this slice does not add pagination, a cache or materialized facts. Return early
for zero candidates. Keep the view's current Like count as the vote input.

Order in the service using the exact tuple in DR-R2. Give never-used an explicit
group marker rather than performing arithmetic on a minimum date. Map ratings
explicitly because numeric `Unknown=0, Dislike=1` would otherwise put dislikes
above unrated recipes. Convert through the existing `ToRecipe()` response path.
There is no need to expose age, rating or count just to render a sorted list.

The global purge changes counts normally. The calendar exclusion remains true
after that purge, independent of any previously stored vote count on a calendar
event. Do not count `CalendarEvent.VoteCount` as an active vote. The target
capacity gate is separate from that eligibility predicate: it only suppresses
cards when the explicitly selected target has no available slots.

## Browser ownership and reconciliation

Use the existing Zustand Discovery store and page; do not introduce a reusable
queue manager. Store the server-provided target context alongside the stack.
Index zero is the first card. Render `slice(0, 4)` with stack index
equal to array index, and ensure front-card layering/drag behaviour still matches
`DiscoveryCard`. Both buttons target `recipes[0]`; visible-removal checks use the
same first-four convention. Extend a front-card test attribute if necessary.

Use one Discovery-specific monotonic invalidation revision in the existing store
(a narrowly named field, separate from QuickFind's `fillTheGapVersion`). Route
the five existing event types listed in DR-R4 to it. Keep QuickFind and Search
invalidations as they are; do not repurpose their versions. On `vote_updated`,
existing `applyVoteUpdate` may update the transient flag with `voteCount > 0`
but must not calculate ordering. It also signals the server refresh.

Unify initial, manual and silent loads around the same acceptance/reconciliation
guards in the page, reusing its existing category handling. Record request
generation, member/category identity and invalidation revision at request start.
Commit only if all still match. A rejected stale response leaves the latest
revision pending; schedule a current fetch after the earlier request settles.
Coalesce bursts while a fetch is outstanding instead of making a request per
event; do not implement time-based polling or a debounce service.

On member/category identity changes, clear the prior stack and reset loaded state
before accepting votes in the new context. Keep voting disabled through that
context's load/error state. Reuse the existing loading presentation; a page reload
can retry an initial failure. Late responses and writes cannot release this guard
for a different context. Silent refreshes within one context retain usable cards.

On initial/manual load, use server order. A `TargetWeekFull` response clears the
stack, records the full-plan reason and stops the category wraparound. Render the
existing **"That's a wrap!"** shell with: "Every dinner slot for the week of
{weekStartDate} is filled. Ready to see what's on the menu?" and the existing
**Go to Planner** action; omit both refresh controls. Do not use this state for
ordinary exhaustion, which retains the current capture/refresh affordances. On
silent refresh, inspect the current
front at commit time, not the front captured when the request started. If it is
still present and not locally voted, retain it followed by the fresh server list
minus that ID. Otherwise use the fresh list. Include fresh additions, remove
absent IDs and deduplicate by recipe ID. Preserve known transient interest flags
for retained IDs unless a newer count explicitly cleared them. Initial interest
badges remain limited by the existing response; adding interest metadata or
redesigning the local match counter is outside this slice.

Track outstanding local votes by recipe ID in the page. Omit those IDs from any
GET response until the write settles. Starting/settling a write invalidates older
reads so a pre-write response cannot win afterward. On success, reconcile with a
post-write GET; on failure, remove the pending suppression and refetch, restoring
the optimistically removed card if the server still permits it. Retain enough
local information to restore that card if the recovery GET also fails. Clear
member-scoped pending state on member changes; late writes must not alter the
new member's stack. Keep this scoped to Discovery, not a general mutation system.

An outstanding POST can settle while Discovery is unmounted. Its completion
must not repopulate the unmounted page's shared stack; remount performs a fresh
server read. Add an unmount/remount case alongside the member-switch case.

The loaded-state trigger must support empty results: do not copy a
`recipes.length === 0` early return that prevents repopulation. Always retain the
pinned Supper fetch context separately from exhaustion's `activeCategory=null`
and the target-full state. A target-week slot removal, reconnect or the specified
SSE invalidations re-read context and can restore cards.
Keep `hasPendingCards` derived from the committed list through the existing page
effect. Reconnect triggers a fresh read, recovering events lost while disconnected.

No client calendar inference: on read failure the previous stack can be stale
until a successful retry. Do not claim immediate removal during an outage. The
existing vote endpoint's acceptance behaviour is unchanged; server-side rejection
of a racing vote on a just-planned recipe would require a separate contract choice.

## Compatibility and alternatives

- Add the Discovery response envelope and regenerate its client. Keep recipe DTO
  fields, vote POST, SSE payloads, database schema and views intact.
- Search's [filters specification](../filters/requirements.md) excludes Discovery
  changes from its own scope. This separately requested spec owns Discovery only;
  it neither reopens filters tasks nor changes Search's strict rediscovery policy.
- A 2:1 merged queue was declined. A weighted score, vote expiry and durable
  planning history add behaviour and persistence the user did not request.
- Simply reversing each fetch would leave competing store/page front conventions;
  making index zero front once is clearer and avoids continued SSE ambiguity.
- A new vote-count DTO could enable client sorting but would duplicate server
  policy and expand the contract. Existing GET plus existing SSE is sufficient.
- Planner smart-default consolidation/ranking fixes are intentionally deferred.
  This change resolves the already-existing target week for consensus results;
  it does not alter planner selection after the threshold is reached.

## Verification strategy

Use fixed UTC dates through `IClock`. Unit fixtures must populate both recipe and
discovery rows because the in-memory provider does not execute the view. Cover
the no-target standing pool, explicit arbitrary-future target, second-open
conflict, unchanged lock purge/no-auto-open, full-capacity definition, full-to-open
removal and every DR-R1 status/date boundary, week rollover, null recipe,
multiple events, last-use maximum, seven-day boundaries, rating mapping, vote
count, never-used and stable ties. Assert query behaviour rather than duplicating
the sort function.

Add HTTP assertions through `DiscoveryIntegrationTests` for member/category
isolation, response envelope, target context/full reason, full exact order and
unchanged vote POST semantics. Add schedule integration coverage for opening an
explicit future target and rejecting a competing one.
`TestWebApplicationFactory` uses EF InMemory despite historical comments; it is
not evidence of PostgreSQL view or translation correctness. A narrowly scoped
`DiscoveryPostgresTests.cs` must use the established isolated PostgreSQL fixture
pattern (see `RecipeSearchFilterMaterializerPostgresTests.cs`) to exercise real
view counts, EF calendar exclusion and week-lock purge followed by Discovery GET
or service query. Do not mutate shared development data or redesign the fixture.

PWA tests cover exact front/voted ID, count-zero updates, deep promotions,
front preservation/removal, list additions, ordinary-empty recovery,
target-full-to-open recovery, stale generations, member switch, loading-time SSE
and failed vote recovery. Use at least six cards and controlled response
completion order. E2E uses `MOCK_IDS`, builders and stateful routes: vote writes
change later reads. Test the front card and POST ID, not DOM order alone. Assert
that target-full keeps **"That's a wrap!"**, has the dated full-plan copy and Go
to Planner, and has neither refresh control. Retain the existing planner
vote-update consumers and test that consensus still arrives through the existing
event path.

Run relevant focused checks first and then the repository's applicable completion
workflow for selected implementation work; see [tasks](tasks.md). No application
test execution or live qualification is claimed for this specification draft.

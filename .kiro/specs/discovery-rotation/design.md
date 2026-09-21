# Discovery rotation — design

Status: reviewed proposal. Implements [requirements](requirements.md) with local
changes to the existing Discovery path. No application changes have been made.

## Verified path and failure points

Paths below are repository-relative, verified in the working tree on 2026-09-20.

| Boundary | Existing owner and behaviour | Proposed change |
|---|---|---|
| Browser request | `pwa/src/lib/api/discovery.ts` → `pwa/src/lib/api/api-client.ts` → `pwa/src/lib/api/generated/api/discovery/index.ts`; wrapper maps `RecipeDto[]` in response order | Keep request/response shapes and image mapping |
| Contract/controller | `specs/openapi.yaml`, `api/src/RecipeApi/Controllers/DiscoveryController.cs` | Document first-result-first semantics in OpenAPI descriptions; controller signature unchanged |
| Eligibility/ranking | `api/src/RecipeApi/Services/DiscoveryService.cs` reads `DiscoveryRecipes`, excludes requester votes, sorts Like count then cooking date | Local calendar predicate, batched rating/history inputs, one deterministic ordering |
| Persistence | `api/database/schema.sql` defines `vw_discovery_recipes`; `DiscoveryRecipe.ToRecipe()` drops vote count; `Recipe` has saved `Rating`; `CalendarEvent` has date/status/recipe ID | Read existing fields only; no SQL, entity or DTO changes |
| Presentation | `pwa/src/app/(app)/discovery/page.tsx` currently renders/votes from the array end | Make index zero front everywhere |
| Live state | `pwa/src/store/discoveryStore.ts` assumes index zero front but locally moves only indices 1–3 and ignores zero count | Replace local ranking with invalidation plus server-list reconciliation |
| Event dispatch | `pwa/src/hooks/useScheduleStream.ts` routes vote/calendar events; only fill-the-gap currently refreshes Discovery | Notify Discovery for all specified existing event types |
| Purge/conversion | `api/src/RecipeApi/Services/ScheduleService.cs` purges all votes on week lock; `DiscoveryService.SubmitVoteAsync` emits existing consensus updates | Preserve both implementations and conversion behaviour |

The current page's reversal makes the lowest-ranked API result the first vote.
Calendar eligibility is absent, so purging votes makes locked recipes visible
again. Existing tests contain a TODO for planned-recipe exclusion; DOM `.first()`
assertions do not establish which overlapping card receives a vote.

## Server ownership and query shape

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
event. Do not count `CalendarEvent.VoteCount` as an active vote.

## Browser ownership and reconciliation

Use the existing Zustand Discovery store and page; do not introduce a reusable
queue manager. Index zero is the first card. Render `slice(0, 4)` with stack index
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

On initial/manual load, use server order. On silent refresh, inspect the current
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
pinned Supper fetch context separately from exhaustion's `activeCategory=null`.
Keep `hasPendingCards` derived from the committed list through the existing page
effect. Reconnect triggers a fresh read, recovering events lost while disconnected.

No client calendar inference: on read failure the previous stack can be stale
until a successful retry. Do not claim immediate removal during an outage. The
existing vote endpoint's acceptance behaviour is unchanged; server-side rejection
of a racing vote on a just-planned recipe would require a separate contract choice.

## Compatibility and alternatives

- Keep OpenAPI schemas, generated files, event payloads and database view intact.
  Only GET descriptions need semantic clarification, in the selected API slice.
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
  This change improves reaching the existing threshold, not planner selection
  after the threshold is reached.

## Verification strategy

Use fixed UTC dates through `IClock`. Unit fixtures must populate both recipe and
discovery rows because the in-memory provider does not execute the view. Cover
every DR-R1 status/date boundary, week rollover, null recipe, multiple events,
last-use maximum, seven-day boundaries, rating mapping, vote count, never-used and
stable ties. Assert query behaviour rather than duplicating the sort function.

Add HTTP assertions through `DiscoveryIntegrationTests` for member/category
isolation, response shape, full exact order and unchanged vote POST semantics.
`TestWebApplicationFactory` uses EF InMemory despite historical comments; it is
not evidence of PostgreSQL view or translation correctness. A narrowly scoped
`DiscoveryPostgresTests.cs` must use the established isolated PostgreSQL fixture
pattern (see `RecipeSearchFilterMaterializerPostgresTests.cs`) to exercise real
view counts, EF calendar exclusion and week-lock purge followed by Discovery GET
or service query. Do not mutate shared development data or redesign the fixture.

PWA tests cover exact front/voted ID, count-zero updates, deep promotions,
front preservation/removal, list additions, empty recovery, stale generations,
member switch, loading-time SSE and failed vote recovery. Use at least six cards
and controlled response completion order. E2E uses `MOCK_IDS`, builders and
stateful routes: vote writes change later reads. Test the front card and POST ID,
not DOM order alone. Retain the existing planner vote-update consumers and test
that consensus still arrives through the existing event path.

Run relevant focused checks first and then the repository's applicable completion
workflow for selected implementation work; see [tasks](tasks.md). No application
test execution or live qualification is claimed for this specification draft.

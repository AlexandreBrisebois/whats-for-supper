# Design

## Context

See proposal.md for motivation and the meal-planning delta for observable rules. A83 authorizes documentation extraction only. CLI resolves the nearest root as `/Users/alex/Code/whats-for-supper`, using `spec-driven`; seven main capabilities exist and meal-planning is absent. The first observable slice is protected planner entry → URL selection → initialization → GET `/api/schedule` → enveloped response → displayed week. No new architecture or implementation is proposed.

## Goals / Non-Goals

**Goals:** Trace the real browser/API/storage/read-state seams, preserve the distinct initialization, callable sync and live reconciliation behaviors, and map every scenario to source and actual inspected assertions.

**Non-Goals:** Improve read races, errors or recovery; implement policy for suggestions or mutations; repeat promoted shared requirements; qualify any service or browser runtime. No configuration, application, tests, API, generated-client or SQL edits.

## Decisions

### Retain both initialization owners and URL selection

`Navigation` links Planner to `/planner` through the shared Layout; household-identity owns access and member entry. `AppRouteLayout` mounts the stream hook and `WeekStoreInitializer`; the initializer's mount effect calls `init(0)` only when weekStore currently has offset zero. It does not test whether data was already loaded. Planner has separate effects for URL parsing and `init(currentWeekOffset)` on offset/success changes. Both stores start at zero, and neither is a persisted planner store. A retained SPA store can carry selection until URL parsing updates it; absent URL offset requests zero. A direct nonzero URL can start an old-offset initialization before the parsed selection propagates. Do not promise effect ordering, deduplication or exactly one read.

`Number.parseInt(value,10)` accepts signed integer prefixes and ignores trailing characters; only nonfinite results are rejected. Arrows replace the URL with ±1, preserving other query parameters, and the return pill deletes only weekOffset. No application clamp exists. Server integer binding and DateOnly/arithmetic representability constrain successful reads; do not promise every finite JavaScript offset succeeds. Invalid query behavior, extreme offsets and canonical URL normalization are not newly specified.

### Follow contract and projection without importing adjacent policy

`planner.getSchedule(offset)` calls generated `api.schedule.get` with the query parameter. The generated response factory reads `data: ScheduleDays`; the wrapper accepts it only if `data.weekOffset !== undefined`, without checking payload equality with the request. Shared `api-client.ts` supplies available member and live-update headers; controller GET itself has no member binder/existence lookup. Program installs the global authenticated-user filter and SuccessWrappingFilter; accepted shared credentials remain household-identity policy. The action returns `Ok(ScheduleDays)`, and the filter wraps it under data.

OpenAPI defines optional integer offset default zero and a 200 data object; ScheduleDays requires offset/locked/status/seven days. The GET operation omits an explicit 401 response. Its illustrative example omits required status and uses full weekday names, unlike service Mon–Sun. Record those discrepancies rather than modifying the contract or using examples as execution evidence (U105).

`ScheduleService.GetScheduleAsync` derives Monday from `_clock.UtcNow.UtcDateTime`, adds offset×7 and queries inclusive Monday–Sunday calendar events including Recipe, followed by the weekly plan. It maps seven dates and uses the first loaded event matching each date. It does not filter/select a mealSlot or order multiple matching events. Model uniqueness is date+mealSlot, not date alone. No claim is made that the result covers every stored event or meal slot (U104).

Recipe query filtering excludes DeletedAt through RecipeDbContext. Schedule retrieval has no explicit IsReady, discoverable, attribution or selected-member condition. Do not copy library-list eligibility onto planner projection or promise relational query-filter behavior without database qualification. Related recipe fields become ScheduleRecipeDto (hero reference, deserialized ingredient strings and saved votes included). Missing entries become planned empty dates; status-three recipe-free entries get nonCooking with order_in fallback, while legacy recipe-backed skipped entries still return recipe and null nonCooking.

Weekly status derives from plan or Draft; locked is true only for Locked. Stored grocery JSON is deserialized, not recomputed or saved by this GET. Calendar rows and weekly plan are separate reads without a transaction, revision or cross-request consistency boundary. Invalid stored JSON can fail the request; generic exception middleware handles failures, but no new error recovery is inferred.

### Separate persisted content, suggestion composition and read completion

`init` immediately sets offset/loading, retaining days/status/adjuncts/time. After schedule await it checks requested offset against current store offset, returns on mismatch, and treats missing data as a loading-only completion. For status one it serially awaits `getSmartDefaults(requestedOffset)`; that wrapper returns null on a thrown request or unusable envelope. A second offset check precedes the final merge.

`buildScheduleDays` normalizes direct, nested data or additionalData recipe IDs. A persisted recipe wins first, including a legacy recipe-backed status-three day; the renderer subsequently gives status three priority. Recipe-free skipped days never gain a suggestion. Other empty dates can receive a suggestion keyed by array index, not a date lookup, marked pending with vote metadata. This is local composition; `GetSmartDefaultsAsync` builds DTOs from votes/events without saving assignments. Ranking, thresholds, readiness and consensus rules are excluded. Read completion can proceed without suggestions. UI IDs reuse prior array-index IDs; this is display identity, not persistence identity.

Successful init applies usable groceryState.additionalData to plannerStore before setting weekStore schedule/items/status/time/loading. There is no atomic multi-store transaction. A missing wrapped check map retains previous checks; missing items become []. Generated REST deserialization supplies an AdditionalDataHolder path, unlike raw SSE JSON; actual wire-to-check-map qualification remains unexecuted. Preserve U100 and do not claim complete grocery reconciliation.

### Keep the three read writers distinct

Initialization rejects successful work only while the requested offset differs at its two checks. There is no request generation, abort or payload-offset comparison: concurrent same-offset reads, a 0→1→0 return and a late old initialization can overwrite newer content. Catch unconditionally clears loading even if the user has navigated. One boolean does not count in-flight reads. It bypasses optimistic move/drag and recent-write guards (U102/U109).

The callable `weekStore.sync()` reads `get().weekOffset` at request start but has no offset/generation/payload check at completion. It reads the then-current offset for any later suggestion call, so navigation can mix schedule and suggestions. A recent optimistic timestamp (<10 seconds, checked after schedule await) suppresses day replacement but still updates status/time. Otherwise it rebuilds days; finally clears loading. It does not refresh groceryItems or groceryState. Targeted caller search found only tests invoking this action; do not present it as a wired planner refresh button or focus handler (U103).

The mounted planner and initializer have no visibility/focus/online listener or periodic schedule refresh. GroceryList's visibility listener collapses completed aisles and FeatureFlagProvider's focus handler refreshes flags; neither initializes the planner week. Mount/selection/success and existing mutation-local rereads trigger initialization, while live events invoke snapshot/slot handlers. HomeCommandCenter also requests `init(0)` after its existing recovery mutations; these are mutation-local rereads, not focus recovery. Mutation semantics and completion are outside this slice.

Connected/week_updated snapshots use `applySnapshot`, governed by promoted household-live-updates: offset checks, move/drag deferral, echo confirmation, same-date pending preservation, all-recipeless fallback and grocery representation limits. Initial/reconnected snapshots read week zero, so they do not reset a selected nonzero loaded offset but also do not refresh it. There is no shared ordering between REST and SSE; later REST completion can replace already-applied snapshot state. lastSyncedAt records a local update time, not server revision, completeness or freshness. Reuse U95–U101; do not duplicate their requirements (U109).

### Document what the user actually sees

Loading feedback appears only when loading and days.length===0. Loaded content remains during navigation, so offset label can change while date heading/cards still belong to the old week. Missing/rejected init ends loading with no dedicated error, Retry or unavailable panel; an empty schedule renders no cards and keeps the Loading... range fallback. An ordinary successful empty week instead has seven dated Plan supper cards. No lastSyncedAt freshness indicator is rendered on this page (U106).

Offset labels use This week/Next week/Week offset. The range uses UTC date/month for first/seventh days and omits year. Card numeral uses getUTCDate, card month uses toLocaleDateString('en-US') without UTC, while past-week controls compare Sunday to browser-local getTodayString(). No midnight or server/client timezone-equivalence guarantee is made (U107).

Day rendering prioritizes status three and uses label helpers for custom text, Mystery night/hint, Eating out or Order In, and optional order-in/eating-out note. Ordinary recipe IDs render name/image reference and vote count or Chosen; no ID offers Plan supper. The count includes pending recipe IDs and can include recipe-backed skipped entries; it is not the persisted assignment count. Week status selects voting indicators/action visibility rather than a dedicated Draft/Locked text badge. Grocery tab/layout behavior is inspected only to bound rendering, not extracted as grocery policy.

### Record actual assertions and their substitutions

BSL-meal-planning-001–005 in the durable plan contains exact mappings and source identities. `page.test.tsx` replaces navigation, both stores, init/API methods, child components and animation; URL hydration asserts setWeekOffset(1), not a real read. Voting controls are asserted for supplied status/pastness. `layout.test.tsx` substitutes the initializer and stream hook, so it cannot prove two-owner integration.

`weekStore.test.ts` exercises actual stores with API mocks and often one-day fabricated schedules: deferred init(0) then init(1) asserts retained offset/date; status-one offset calls and skipped-day suggestion protection are asserted. Its grocery 'atomically' test asserts ordered subscriptions in a synchronous tick using an explicitly wrapped map, not transactional visibility or raw-wire parity. Same-offset/ABA/stale rejection/sync navigation/failure presentation are not asserted by those inspected cases.

`planner.spec.ts` intercepts schedule calls broadly and returns weekOffset zero and the same pinned dates regardless of query; its chevron test checks week-range (the offset label) and the return pill, not date-content correctness. Its 'smart defaults merged' test only counts seven cards and checks first visibility. The nonzero-week browser test calculates offset-specific schedules but only asserts first vote-count visibility, which also renders for ordinary recipe cards; it does not assert pending provenance, exact suggestion name or request routing. Both remain weaker than their titles imply.

ScheduleIntegrationTests reads back data.days/nonCooking label after mutations; service tests assert grocery map values and absence. Default TestWebApplicationFactory disables auth, uses EF InMemory unless explicitly configured otherwise and substitutes orchestration/publisher boundaries. These are inspected assertions, not PostgreSQL or production-auth proof. Browser fixtures pin May 4 2026, inject access/member context, intercept requests and reject unhandled APIs. Common mocks ignore GET offset, return unusable data:[] for default smart-defaults and finite identity-free connected frames. A Home-only timezone test is not planner timezone qualification (U108/A34).

## Risks / Trade-offs

- Incomplete request ordering → U102/U103/U109 withhold cancellation, latest-request-wins, freshness and complete convergence; no corrective code authorized.
- Separate EF reads, date-first projection and eligibility differences → U104 records snapshot/meal-slot limits and defers database qualification.
- Contract examples and permissive offset handling → U105 records discrepancies without contract or parser repairs.
- Silent failure with retained misleading dates/status → U106 records actual presentation without designing a recovery flow.
- Mixed date formatting and no midnight refresh → U107 withholds timezone equivalence or rollover guarantees.
- Mock assertions overstate integration → U108 preserves evidence boundaries and A34; no services or suites launched.

## Migration Plan

No application deployment or data migration applies. Create only the CLI-scaffolded draft and plan update, validate selected/all items strictly, inspect the full six-path documentation diff and run explicit-path task verify. Preserve the before-image plan history, all seven main specs, previous artifacts, source identities and index. Stop at a validated draft for human review; promotion, archive, application fixes and later slices require separate authorization.

## Open Questions

No consequential product choice remains unresolved for this bounded extraction: disputed normative guarantees are withheld. Future separately authorized qualification could establish same-offset/ABA/failing-request races, real generated-client dictionary parsing, relational query filtering/multiple meal slots, native reconnect and server/browser date boundaries. Those execution questions do not authorize work in this slice.

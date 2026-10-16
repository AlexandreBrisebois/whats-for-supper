# Meal planning baseline plan

## Current checkpoint and scope

Promoted baseline: **30/70 requirements/scenarios** at A86 (2026-10-16).
This covers week reading/navigation (15/40) and ordinary empty-day assignment
(15/30), not the entire capability. Assignment was accepted and promoted under
A86; its change remains active. Runtime qualification remains not-run/deferred
under A34. Next action: await a separately selected bounded slice or lifecycle
action; no archive, implementation or successor is authorized. Earlier draft and
checkpoint records below retain their historical status and are superseded by A86.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main meal-planning specification](../../openspec/specs/meal-planning/spec.md).

## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Meal planning: maintain dated supper plans | Monday–Sunday weeks, assign/replace, swap/push/cross-week move, defer/remove, week/day states, voting closure, recipe-free plans, overdue completion, groceries side effects | [ScheduleService](../../api/src/RecipeApi/Services/ScheduleService.cs), [weekStore](../../pwa/src/store/weekStore.ts), `pwa/src/app/(app)/planner/page.tsx` | [ScheduleIntegrationTests](../../api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs), [non-cooking PostgreSQL tests](../../api/src/RecipeApi.Tests/Integration/NonCookingPostgresTests.cs) | Library, votes, groceries, cooking history, live updates / high states; concurrency medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

| ID | Decision | State / authority |
| --- | --- | --- |
| A83 | Discover and draft planner week reading/navigation | User pasted request and continue, 2026-10-16. Documentation-only trace and CLI-scaffold selected change; 15/40 delta, proposal/design/extraction tasks and durable plan. Preserve all seven main specs, 239 prior source identities, existing index/work/plan edits and historical qualifications. Strict selected/all and explicit six-path docs verification; stop at human-review draft. No promotion/archive/application/services/runtime/browser/network/database/model qualification or successor slice. |
| A84 | Promote reviewed planner week reading/navigation baseline | User “promote”, 2026-10-16, after validated A83 draft. Create main meal-planning with exact reviewed Purpose and 15/40 delta; preserve all seven prior mains, selected delta/proposal/design/metadata, 254 source identities and prior work/index/plan history. Plan/task follow-up only; no archive/application/runtime qualification or successor work. |
| A85 | Discover and draft ordinary empty-day chosen-recipe assignment | User attached request, 2026-10-16. Documentation-only Quick Find and explicit-target Search/detail trace; one CLI-scaffolded change, ADDED delta, proposal/design/extraction tasks, evidence/mapping/identities and index follow-up. Preserve promoted 15/40, all staged baseline split work, U95–U109 and earlier qualifications. Strict selected/all validation and explicit seven-path task verify; stop at human-review draft. No promotion/archive/implementation/services/runtime/browser/network/database/model/successor work. |
| A86 | Promote reviewed empty-day assignment baseline | User “promote”, 2026-10-16, following the validated A85 draft. Sync only its reviewed 15/30 ADDED delta into main meal-planning, preserving Purpose/prior 15/40, source evidence, U95–U115 and all unrelated staged/unstaged/untracked work. Update capability/index/task lifecycle records; strict main/specs/change/all and explicit four-path documentation verification. No archive/application/runtime qualification or successor slice. |

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U03 | Week-flow documentation drifts from implementation | [Week lifecycle document](../flows/data-flows/week-lifecycle.md), [WeeklyPlan](../../api/src/RecipeApi/Models/WeeklyPlan.cs), [ScheduleService](../../api/src/RecipeApi/Services/ScheduleService.cs): three week states, separate day states, actual event types, mutable locked weeks. Keep docs as secondary evidence. | Open |
| U04 | Match, consensus, suggestion and assignment are different | [SQL views](../../api/database/schema.sql), [DiscoveryService](../../api/src/RecipeApi/Services/DiscoveryService.cs), [weekStore closure](../../pwa/src/store/weekStore.ts). Lock clears global votes; client promotion and lock use separate requests. | Open |
| U95 | Stream contract omissions and context differ from general member binding | BSL-household-live-updates-001/002/004: ConnectedEvent omits connectionId; operation omits 401; publisher incremental objects lack base discriminator type; stream requires cookie GUID without header fallback/existence lookup. | Record observed extension and gate; no claim of complete schema parity, existing-member validation or contract repair; shared access stays household-identity |
| U96 | Controller writes bypass broadcast locks and registration precedes snapshot | BSL-household-live-updates-002: initial/heartbeat writes unlocked; broadcast sequential; wait outside catch, concurrent disposal and slow streams unqualified; no durable event/backplane/cursor path. | No connected-before-all-push, total serialization, global ordering, fairness, cross-replica, exactly-once or lossless recovery guarantee |
| U97 | Native reconnect and received data lack application recovery guarantees | BSL-household-live-updates-001/003/004: constructor catch returns; error logs; no retry/fallback/online listener; JSON.parse/store errors uncaught; identity retained on error/cleanup. | Delegate eligible attempts to native source only; no guaranteed reconnect/deadline/acknowledgement or malformed-frame recovery |
| U98 | Successful receipt or synchronization timestamp can coexist with stale displayed days | BSL-household-live-updates-003: week-zero mismatch ignored; move/drag defers latest days while status/time update; pending metadata and all-recipeless snapshots retain old content; no revision check/forced release. | Draft conditional reconciliation only; no immediate freshness, monotonic state, confirmed move or complete convergence claim |
| U99 | Today uses local date and independently suppresses optimistic updates | BSL-household-live-updates-004: absent local-date entry untouched; server uses UTC week; differing IDs under two seconds dropped without timed replay. | No automatic later application or guaranteed local-date coverage; existing journey/REST behavior remains separate |
| U100 | Raw connected grocery dictionary misses AdditionalDataHolder path | BSL-household-live-updates-002/003: server plain dictionary → hook JSON.parse → applySnapshot reads only additionalData; wrapper-built unit assertion cannot prove wire reconciliation. | Record check-map retention alongside groceryItems replacement; withhold complete grocery reconciliation and atomic multi-store visibility; no code/contract fix |
| U101 | Substituted assertions and emission counters do not establish receipt/application | BSL-household-live-updates-001–004: default integration factory disables auth/uses InMemory; MemoryStream publisher tests; hook mocks omit identity setter; finite intercepted browser frames omit ID; cookedReconnects increments before response fulfillment. | Inspected assertions only; attempted/registered/emitted/received/applied remain separate. Runtime/API/browser/DB/network/model not-run A34 |
| U102 | Offset checks are not request-generation protection | BSL-meal-planning-001/003: init checks offset after successful schedule/default awaits; same-offset concurrency and 0→1→0 can apply old content; stale catch clears global loading; no abort/payload-offset check. | Specify only different-offset successful-result rejection; withhold latest-request-wins, deduplication, counted loading or race-free navigation |
| U103 | Callable sync and actual refresh wiring differ | BSL-meal-planning-003/004: sync lacks offset guards, reads current offset for later defaults, retains grocery adjuncts and has only test callers found; no planner focus/visibility/online refresh. | Do not describe a wired refresh button, focus recovery, full-adjunct sync or selected-week freshness guarantee |
| U104 | GET projection is not an atomic complete calendar snapshot | BSL-meal-planning-002: separate events/plan reads, first event per date without mealSlot ordering; model permits date+mealSlot; recipe DeletedAt query filter but no explicit readiness/member filter. | Seven dated output entries only; no all-events/meal-slots, transactional consistency or inherited library eligibility promise; relational qualification deferred |
| U105 | Offset and schedule contract precision have limits | BSL-meal-planning-001/002: integer-prefix parsing/no UI clamp; API int/DateOnly bounds; GET omits explicit 401 and example status, uses full names unlike service Mon–Sun. | No arbitrary-offset success or example/schema parity claim; preserve API/generated code and record discrepancies without repair |
| U106 | Failed or missing reads silently retain displayed content | BSL-meal-planning-004: loading only replaces zero-day content; failure ends loading with no error/Retry; selection label can advance while dates/status remain old; empty state retains Loading heading. | Record actual failure/unavailable presentation and withheld freshness, without redesigning recovery or treating stale days as the selected server result |
| U107 | Planner date uses mixed UTC/local computations | BSL-meal-planning-002/004: server week UTC, heading UTC month/day, card day UTC but month local en-US, pastness local today; no midnight schedule trigger. | No timezone equivalence, rollover freshness or uniform locale/date guarantee; Home-only date tests do not qualify planner |
| U108 | Planner assertion titles exceed fixture coverage | BSL-meal-planning-001–004: mocked page stores/router; often one-day store inputs; static week-zero browser mocks, label-only navigation and weak vote-count assertion; default API factory auth-disabled/InMemory. | Inspected assertions only; no actual executed API/browser/DB/auth/calendar/race qualification (A34), no full contract parity claim |
| U109 | REST and live snapshots have independent guards and ordering | BSL-meal-planning-003/004: init bypasses optimistic snapshot guards, sync uses a time window; snapshots preserve/defer conditionally; reconnect fetches zero; local timestamp is not revision. | Preserve U95–U101 including U100 grocery representation; no immediate freshness, atomic combined load, forced release, complete convergence or guaranteed nonzero-week recovery |
| U110 | Empty UI/read classification is not an atomic server precondition | BSL-meal-planning-007–009: ordinary UI empty differs from pending suggestion/status-three; Search helper drops status/nonCooking and returns null for missing day/date, yet null proceeds to POST. Endpoint selects first event by date and can overwrite occupied target (including Sunday displacement). | No atomic empty-slot reservation, missing-target refusal, status-three protection or occupied recovery policy is extracted; compatibility/race limitation only |
| U111 | Assignment validation/default/error and response contract limits | BSL-meal-planning-009: required OpenAPI fields lack bounds/defaults; generated optional/null fields and unannotated C# int/int/Guid differ; no explicit recipe eligibility lookup or index clamp. Empty response displacement is null despite non-null schema when present; operation documents 200 only. | Withhold omitted-value defaults, accepted index/offset range, eligibility enforcement and precise malformed/missing/constraint error matrix; no contract/client fix or runtime binding qualification |
| U112 | Persistence precedes fallible follow-up work | BSL-meal-planning-009–011: new plan saved separately, calendar saved before grocery save/query/publication; no enclosing transaction/compensation. Client POST or later GET may reject after persisted assignment. | Record observable partial-success possibility; no exact server/local rollback, atomic operation, safe retry, persistence inference from feedback or successful failure-injection claim |
| U113 | Local pending controls do not serialize or cancel assignment | BSL-meal-planning-007/008/011: Quick Find callback lacks await/submission latch; detail only disables local action. Week store reread uses current offset and failure resets captured whole schedule; no assignment generation/abort guard. | No duplicate-submission prevention, idempotency, latest-write-wins, navigation isolation, exact rollback or guaranteed modal/selection state after independent dismissal/overlap |
| U114 | Today handoff performs another mutation | BSL-meal-planning-011: captured zero-week/today match calls todayStore.assignRecipe, which updates display, fires another POST using local weekday and hydrates detail; errors log independently. | Non-normative side-effect record only; no one-POST guarantee, UTC/local date equivalence, completion/rollback of second write or duplicate-write policy approval |
| U115 | Assertions substitute service/client/transport boundaries | BSL-meal-planning-007–011: mock page stores, wrapper mocks, direct service/InMemory auth-disabled factory, invocation-count publishers, static schedule browser mocks and substituted success responses. | Source support and inspected assertions only; no executed unit/API/browser/relational/auth/partial-failure/race/convergence qualification; retain U95–U109/A34 |

## Slice evidence and lifecycle records

## Draft slice — meal planning / week reading and navigation

**Authorization A83 (2026-10-16):** User “Discover and draft the next WFS OpenSpec baseline slice: planner week loading, navigation and read-state reconciliation” authorizes documentation-only discovery and drafting for `baseline-meal-planning-week-reading-navigation`, capability `meal-planning`. Follow installed openspec-propose; stop at a validated human-review draft. No promotion, archival, implementation, services, runtime/browser/network/database/model qualification or another slice. Existing staged work and plan edits remain owned by their prior work.

**Live inventory:** CLI `openspec context --json` resolves nearest `/Users/alex/Code/whats-for-supper`, schema spec-driven. Before scaffold, twenty active changes and seven main capabilities; meal-planning absent. `openspec new change baseline-meal-planning-week-reading-navigation` creates only its selected metadata. After draft there are twenty-one active changes and still seven main specs. Actual main headers confirm identity 36/92, library 55/122, sharing 9/34, capture 37/92, quality 37/92, background 14/42 and live-updates 15/38. No main meal-planning spec is created or promoted.

**Ownership:** household-identity retains page/API access and member resolution; schedule GET adds no endpoint-specific member-existence requirement. household-live-updates retains connection/reconnection/snapshot/optimistic reconciliation and U95–U101. recipe-library retains readiness/deletion visibility for library reads; schedule projection does not acquire those list filters by implication. background-processing retains workflow lifecycle; schedule read acceptance is not workflow completion. Smart-default generation/ranking/eligibility/consensus and all mutations remain deferred to their owners.

### BSL-meal-planning-001 — Entry, initialization owners and selected URL week

**Path:** `components/common/Navigation.tsx` Planner link → shared Layout → `app/(app)/layout.tsx` mounted stream plus `WeekStoreInitializer` → conditional `init(0)`; `app/(app)/planner/page.tsx` → URL parse/setWeekOffset effect → separate initialization effect keyed by selected offset and success query. `plannerStore` and `weekStore` are separate in-memory stores, initially zero; no persisted planner selection. Shell init tests offset only, not loaded data. Planner mount can issue another initialization. Missing URL offset selects zero; parseInt base ten accepts signed prefixes/trailing text, rejects only nonfinite results. Arrows use router.replace ±1 with other parameters retained; zero removes weekOffset. Controls impose no application offset clamp. Initial effects may start reads for the old offset before URL hydration; no effect-order/deduplication guarantee (U102/U105).

**Assertions:** `page.test.tsx` URL test checks mocked setWeekOffset(1), without actually mutating the mocked store or running init. `layout.test.tsx` replaces initializer and stream hook. `planner.spec.ts` chevron test compares week-range label text and Back to this week pill, then This week text; its schedule interceptor always returns offset zero/same pinned dates. The assertion does not establish correct requested-week dates. Source supports parsing and URL construction; no invalid/extreme offset or two-owner race assertion inspected. No tests executed.

### BSL-meal-planning-002 — Protected GET, persisted projection and snapshot scope

**Path:** `lib/api/planner.ts getSchedule(offset)` → generated schedule GET query/factory → `specs/openapi.yaml` GET `/api/schedule` and ScheduleDays/ScheduleDayDto/ScheduleRecipeDto → shared `api-client.ts` headers → Program global authenticated-user filter → `ScheduleController.GetSchedule(int=0)` → `ScheduleService.GetScheduleAsync` → calendar events with Recipe for inclusive UTC Monday–Sunday plus separate weekly-plan lookup → DTO → SuccessWrappingFilter data envelope. No action member binder/existence lookup; reuse household-identity API credentials (including accepted h_access cookie in handler). OpenAPI operation has only 200, omits explicit 401, and illustrative data lacks required status and uses full weekdays rather than service abbreviations (U105). The contract schemas still require seven days and week status.

**Stored versus returned:** Offset is relative to Monday containing injected clock UTC date; integer×7/DateOnly bounds constrain successful offsets. Seven dates are generated even without rows. Events are picked by first date match, without mealSlot selection or deterministic tie ordering; model permits distinct meal slots per date. No complete calendar-event coverage is claimed. Related recipe projection supplies ID/name/hero reference/saved votes/ingredient strings/description/totalTime. Recipe global filter excludes DeletedAt; no explicit readiness/discoverable/attribution/member predicate in schedule read. Relational filtering is unqualified. Status-three recipe-free rows expose kind/label with order_in fallback; recipe-backed skipped rows expose recipe and null nonCooking. Weekly plan status or Draft determines numeric status/locked; adjunct JSON is deserialized or null without recomputation/save. Events and plan are separate queries, not an atomic snapshot (U104).

**Assertions:** ScheduleIntegrationTests.NonCookingValidation_RoundTripsAndRejectsRecipeConflict and optional-note round trips read `data.days` and selected-date nonCooking labels after writes. Service GetScheduleAsync_IncludesGroceryState asserts exact stored map values; ReturnsNullGroceryState_WhenNoWeeklyPlan asserts null, not a complete seven-day/default-status contract. Status-transition tests inspect stored plans, not the whole GET envelope. Factory CreateAsync disables auth, uses EF InMemory by default, substitutes recipe store/orchestration and mocked publication; these assertions do not qualify production auth, PostgreSQL, consistent queries, date boundaries or multiple slots. No tests executed.

### BSL-meal-planning-003 — REST mapping, suggestions and competing read writers

**Initialization:** wrapper requires data with defined weekOffset, but does not compare payload offset to request. init sets selected loaded offset/loading without clearing content; checks current offset after schedule await; status defaults zero; only VotingOpen serially fetches same-request-offset smart defaults; checks offset again. Merge normalizes direct/nested data/additionalData recipe IDs, preserves index UI identity, prefers a real recipe, excludes recipe-free skipped days from suggestions and otherwise composes by array day index with pending/vote metadata. Missing days means []; suggestions unavailable/throw become null and do not fail schedule initialization. Smart-default service builds DTOs and does not persist assignments; ranking/consensus policy is not extracted.

Successful init applies usable wrapped grocery check map before week state, then replaces schedule/items(default []) and status/time/loading. It is not a multi-store transaction; missing check map retains existing checks. REST uses generated AdditionalDataHolder deserialization, raw SSE does not; preserve U100 rather than assuming complete wire parity.

**Overlap limits:** Different selected offset at either successful-await checkpoint discards that invocation. Same-offset concurrent requests and 0→1→0 are not distinguishable; no abort, generation or payload equality guard. Catch unconditionally clears loading even for an obsolete read. Multiple requests share one boolean. init has no optimistic move/drag/write-time protection and can overwrite a newer live snapshot (U102/U109).

**Callable sync:** sync sets loading and queries offset at request start; after await it reads current offset for suggestions without navigation/request/payload guards. It can combine old schedule with another offset's suggestions. Under <10-second optimistic age it preserves days but still updates status/time; otherwise rebuilds days; finally clears loading. It does not refresh grocery adjuncts. Targeted caller search found direct sync invocations in tests only, not a wired planner refresh trigger (U103).

**Live boundary:** connected/week_updated route to applySnapshot under promoted household-live-updates. Reconnect week zero does not change a nonzero loaded offset; it also does not refresh that selected week. Matching snapshots can defer or preserve content/status. REST init/sync do not share those guards or revisions. lastSyncedAt is a local update timestamp, not proof of fresh/complete state (U95–U101/U109).

**Assertions:** Real-store mocked-API test delays init(0), completes init(1), then asserts weekOffset=1 and next-week date after late zero; it does not test same-offset/ABA, stale rejection or pending defaults. Other tests assert init(1)/sync(1) request defaults(1). A skipped-day init assertion prevents suggestion insertion. applySnapshot assertions cover offset ignore, pending preserve/replace, drag/move deferral and echo flush; grocery wrapper test checks week then planner subscriptions in the same tick, not atomic visibility. Fabricated schedules often have one day and are not seven-day contract evidence. No tests executed.

### BSL-meal-planning-004 — Displayed read states, refresh triggers and actual browser evidence

**Rendering:** Loading indicator/Curating your week appears only for loading+zero days. Old days remain during navigation; selected label can change before date heading/cards. Missing/rejected init ends loading without error/Retry/unavailable panel; initial empty state yields no cards and Loading... date fallback, unlike successful empty week with seven Plan supper cards. No lastSyncedAt display. Status maps to voting signal/action visibility; status one has Nudge family/Close Voting, zero/two have Ask the Family unless loaded Sunday is before browser-local today. This extracts read presentation only, not transitions (U106).

Offset label is This week/Next week/Week offset. Date range uses UTC month/day from first/seventh entries, card numeral UTC day, card month local en-US, and past-week comparison browser-local date; no year, midnight refresh or timezone-equivalence guarantee (U107). Day order follows loaded array. Status three takes non-cooking rendering priority, including legacy recipe-backed skipped content. Helpers choose custom label, Mystery night/hint, Eating out or Order In and optional order-in/eating-out note. Ordinary recipe ID renders name/image reference/vote count or Chosen; no ID gives Plan supper. Planned count includes pending recipe IDs and legacy recipe-backed skipped IDs, not only persisted cooking assignments.

**Refresh:** Planner mount/selection/success query and existing mutation-local handlers call init. HomeCommandCenter also calls init(0) after its recovery mutations; policies remain excluded. No planner/initializer visibility/focus/online handler, periodic schedule refresh or manual read Retry is wired. GroceryList visibility return only collapses completed aisles; FeatureFlagProvider focus refreshes flags. Stream receipt is an independent conditional writer under promoted policy; native reconnect is not guaranteed recovery for a nonzero week (U103/U109).

**Assertions/substitutions:** page.test.tsx supplies loaded store values, replaces router/stores/init/API/child components/animations; it asserts Draft/Locked Ask, VotingOpen controls and absence of voting-status-badge, past suppression, pending change-button suppression and recipe detail entry. It does not prove real loading/failure/API/URL integration. planner.spec.ts asserts seven cards and first visibility; its 'smart defaults merged' title exceeds those assertions. Offset-one smart-default browser test provides correct offset-specific fixtures but only checks first vote-count visible, also true for ordinary recipe cards; no exact suggestion name/pending provenance/request assertion. Non-cooking browser cases assert saved labels after reload using a mutable local mock; Home-only near-midnight cases are not planner date qualification. Fixtures pin browser time, inject access/member context and block unhandled APIs. Common mock GET ignores query offset, smart-defaults returns data:[] (not the object shape), finite connected frames omit connection ID. No browser/backend/network/database/model or unit/API suite executed (U108/A34).

### BSL-meal-planning-005 — Complete draft mapping, artifacts and check boundary

Draft artifacts: CLI `.openspec.yaml`, proposal, design, `specs/meal-planning/spec.md` ADDED delta and documentation-extraction tasks. **15 requirements / 40 scenarios**, new-capability Purpose, no main spec. Table scenarios are exact delta headers; assertion notes do not claim execution.

| Requirement (delta order) | All scenario headers | Evidence / inspected assertion limit |
| --- | --- | --- |
| 1. Initialize week reading from shell and planner entry | Shell has the initial offset; Shell sees another selected week; Planner selection or success changes | BSL-meal-planning-001: Source only; layout test replaces initializer; page test replaces initialization |
| 2. Select the planner week from the URL | Offset is absent; Integer prefix is present; Offset is not parseable | BSL-meal-planning-001: Page URL test asserts setter(1) only; other parsing source only |
| 3. Navigate relative weeks and return to this week | Navigate forward or backward; Return to zero | BSL-meal-planning-001: Browser chevron test checks label and return pill, not fetched date correctness |
| 4. Read the household schedule through the protected GET operation | Default week read; Explicit week read; No household access | BSL-meal-planning-002: HTTP non-cooking round trip inspects data.days; default factory disables auth; access/default source only |
| 5. Return seven dates from the server UTC week | Read a supported relative week; No calendar entry exists | BSL-meal-planning-002: Seven-day and UTC range source only; mocked browser card count does not prove server dates |
| 6. Project stored recipe and non-cooking read content | Related recipe is available; Recipe-free skipped entry; Legacy skipped recipe entry | BSL-meal-planning-002: Non-cooking HTTP label round trip inspected; recipe projection and legacy fallback source only |
| 7. Read week status and stored adjuncts without creating a plan | Weekly plan exists; Weekly plan is absent | BSL-meal-planning-002: Service asserts stored grocery map and null without plan; status projection/source only |
| 8. Use enveloped schedule data for browser initialization | Usable response arrives; Envelope or offset is absent; Days are absent | BSL-meal-planning-003: Store offset-call assertion uses wrapper mocks; envelope and missing data branches source only |
| 9. Compose voting suggestions separately from persisted assignments | Draft or locked read; Voting read; Suggestions are unavailable | BSL-meal-planning-003: Store asserts offset-one suggestion calls and skipped-day protection; no new policy qualification |
| 10. Discard initialization results for a different selected offset | Navigate before schedule completes; Navigate while suggestions load | BSL-meal-planning-003: Deferred schedule test asserts 0→1 late result rejection; second await check source only |
| 11. Show pending initialization without clearing loaded days | First read is pending; Another read is pending | BSL-meal-planning-004: Source only for loading/retention; page tests supply loaded state |
| 12. Retain content after missing or failed initialization reads | No usable response; Read rejects; No content has ever loaded | BSL-meal-planning-004: Source only; no isolated read-failure assertion found in inspected tests |
| 13. Render the selected label and loaded date range | Standard offset labels; Loaded range; Selection changes before content | BSL-meal-planning-004: Browser asserts label changes only; date format source only |
| 14. Render day content and planned count from displayed state | Empty persisted week; Recipe and non-cooking presentation; Pending recipe contributes to count | BSL-meal-planning-004: Browser asserts seven cards; page asserts recipe entry and pending controls; representation source only elsewhere |
| 15. Display read week status without implying a transition | Voting status is loaded; Draft or locked non-past week; Past week | BSL-meal-planning-004: Page assertions cover supplied Draft/Locked/VotingOpen and past-week controls; no transitions extracted |

**Verification handoff:** Review the complete six-path documentation diff and retained before-image/index/source identities. Run selected and all-item strict validation, then explicit-path task verify below. Final outcomes/content identity belong to final response/current `.task/agent-finish/last-run.json`; earlier checks cannot certify later documentation bytes. Runtime/unit/API/browser/network/database/model qualification is not-run by authorization under A34; implementation TDD/new tests, API/client synchronization, migrations/deployment are not-applicable. Failed and blocked checks remain distinct if encountered. No promotion, archival, application change or successor extraction.

```sh
task verify -- docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-week-reading-navigation/.openspec.yaml openspec/changes/baseline-meal-planning-week-reading-navigation/proposal.md openspec/changes/baseline-meal-planning-week-reading-navigation/design.md openspec/changes/baseline-meal-planning-week-reading-navigation/specs/meal-planning/spec.md openspec/changes/baseline-meal-planning-week-reading-navigation/tasks.md
```

### Planner week-reading source identities — SHA-256

All 239 prior unique evidence identities rechecked unchanged. This manifest records 40 inspected inputs, 15 newly represented paths, 254 unique evidence paths overall. Digests identify inspected source, not successful runtime behavior. Seven promoted specs and prior artifacts are separately compared to the session before-image; this plan retains all prior identity rows.

| Source | SHA-256 |
| --- | --- |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` | `c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/ScheduleDays.cs` | `52d4bf981307df51a4b38fc12a2fe3271eb2be6445089d5521a83fb399f691e7` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | `cac6be71f2d3fa947a903390d9d6a69da7df9ebbf7aed38a76a80c45ef856806` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/planner-non-cooking-days.spec.ts` | `c902f33c1822d3e9d371709a1bd18d82871037b6b295abcccd3ea8ed28f76c8c` |
| `pwa/e2e/planner-smart-defaults-week-offset.spec.ts` | `23a5175e6b22e416401ecc53b11bdbcc1fc9700fec73b198661645da3a7935f1` |
| `pwa/e2e/planner.spec.ts` | `c6eaf618469b43c8543420b0ca6f52259ee1e98c9564b50e58dcbbdf7d32eeed` |
| `pwa/src/app/(app)/layout.test.tsx` | `01b164ecf61a4999e96c1cfc3c7171fe43db19bc891b573f71ec001adc460cbd` |
| `pwa/src/app/(app)/layout.tsx` | `4daa1c42696fc0ed77b1e458199844dac241ee87116e2e14f218057dc59bb5e9` |
| `pwa/src/app/(app)/planner/page.test.tsx` | `d787f5c4061bd45efd6311a76b53b61634059f90608be9a1b122b3f352acf1ba` |
| `pwa/src/app/(app)/planner/page.tsx` | `f113f605a33f78cdde5ed6b6ab37c2742d952c7be4319063ff91eeb81dae7f6d` |
| `pwa/src/components/WeekStoreInitializer.tsx` | `68e309a65e807d5b180ffd64625745be7433a24c7756fa9cf90b000fcb82bc69` |
| `pwa/src/components/common/Layout.tsx` | `1a841ab1121efbaa2d3618713936de1ede3bb4460dfc0beba0582b0cc67b53c6` |
| `pwa/src/components/common/Navigation.tsx` | `58a6d6011fd9027f4cfa3e0e654ffd5a2964f1ffe7e458bd3e60d4d03e282d78` |
| `pwa/src/components/featureFlags/FeatureFlagProvider.tsx` | `b17e4c224987a0906c90aa122c0202ce5e31a0b8f1b252487b5afb3af29ae420` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/planner/GroceryList.tsx` | `00766ec26b0ef70facdafe96a6c3440613cba9e482acddd0963882ff8d5dd9f0` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/schedule/index.ts` | `da09b75039c26cc48129288613c1a274e7e006296c8c51b3b88f1799d63bb577` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `pwa/src/lib/planner/nonCooking.ts` | `664f2eacb8a1ce9e114a4a97b3de660b78f04ad7f01297a019377df8720ee1ed` |
| `pwa/src/store/plannerStore.ts` | `0058c7adf697f243c08ef18b89492ecdd3622fde24688930c1ebca0dce178f31` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `pwa/src/testing/builders.ts` | `1ba340965d186078a627c5a30b7421d4c583f028ea198078c42c47fa04c9f747` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### BSL-meal-planning-006 — Week-reading/navigation main-spec promotion

**Authorization A84 (2026-10-16):** User “promote” following the validated A83 draft authorizes syncing only its reviewed meal-planning delta into main, with durable-plan/task follow-up. No archive, application/test/contract/configuration changes, runtime qualification or successor slice.

**Result:** New `openspec/specs/meal-planning/spec.md` contains the exact reviewed Purpose body and all 15 requirements/40 scenarios verbatim under one Requirements heading. Its non-normative evidence section references BSL-meal-planning-001–006, U102–U109, U95–U101 and A34, retaining conditional read application, stale content and grocery representation limitations. All 15 mapping rows/40 scenario headers remain applicable. No delta operation header or TBD Purpose in main. Seven existing main specs remain unchanged: identity 36/92, library 55/122, sharing 9/34, capture 37/92, quality 37/92, background 14/42 and live-updates 15/38. Twenty-one changes remain active; delta, proposal, design and metadata unchanged.

**Preservation and check boundary:** All 254 prior source identities match. Private before-images preserve the entire plan/task files, all existing file hashes and staged binary diff. Compare prior plan lines/order except the current Next action cell; allow only the new main spec, this plan and selected task follow-up. Require exact Purpose/requirements equality, strict main/specs/all validation, full three-path documentation review and explicit task verify below. Final observed outcomes/content identity belong to the final response/current `.task/agent-finish/last-run.json`. Runtime/unit/API/browser/network/database/model qualification is not-run under A34; implementation TDD, API/client synchronization, migrations/deployment are not-applicable. No archive/application/successor work.

```sh
task verify -- openspec/specs/meal-planning/spec.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-week-reading-navigation/tasks.md
```


## Draft slice — meal planning / empty-day recipe assignment

**Authorization A85 (2026-10-16):** User's attached “Discover and draft the next WFS OpenSpec baseline slice: empty-day recipe assignment” authorizes documentation-only discovery and drafting of `baseline-meal-planning-empty-day-recipe-assignment`. Trace Quick Find selection and targeted Search/library detail; preserve U95–U109 and earlier qualifications. Stop at a validated draft for human review. No implementation, promotion, archival, successor work or services/runtime/browser/network/database/model qualification. No consequential product decision is silently settled: disputed claims below remain non-normative.

**Session identity and preservation:** Branch `moving-to-openspec`, commit `db6fede90ec0a7dfff26e6050036310bc8211837`. Initial status: 65 staged paths (baseline-plan split, prior changes and promoted specs), no unstaged changes or untracked files. Private before-images captured selected plan/index bytes, full staged binary diff, Git status and hashes of all existing tracked/untracked files before scaffold. Existing staged bytes and all other files are retained. No retired background-task-navigation spec is restored. Source manifest below identifies inspected inputs; it does not establish runtime behavior.

**Live inventory:** `openspec list --json` and `openspec context --json` resolve nearest root `/Users/alex/Code/whats-for-supper`; configured schema is spec-driven. Before scaffold: 21 active changes, eight main capabilities. CLI spec inventory and actual header counts: identity 36/92, library 55/122, sharing 9/34, capture 37/92, quality 37/92, background 14/42, live-updates 15/38, meal-planning 15/40. After this one CLI scaffold: 22 active changes; eight main capabilities unchanged. Only this change receives new artifacts; the index row adds its 15/30 draft while retaining promoted 15/40 and historical A84 inventory.

**Status:** Discovery reconciled with U110–U115. Artifacts: proposal, design, ADDED meal-planning delta and documentation-extraction tasks validated. Selected strict validation passed; all-item strict validation passed 30/30. Explicit seven-path task verify passed documentation/spec/content checks; final checked identity belongs to the final handoff and current harness record. Human review pending; no acceptance or promotion. Main meal-planning remains 15 requirements/40 scenarios. Runtime evidence not-run under A34/current authorization. The draft contains 15 requirements/30 scenarios, all mapped below.

**Shared owners:** Reuse household-identity's “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”; recipe-library's “Retrieve the selected library recipe for detail reading” and “Return persisted recipe detail for an available record”; household-live-updates' displayed-week, merge-guard, adjunct, Today and echo-exclusion requirements identified in design. Reuse meal-planning's “Return seven dates from the server UTC week”, suggestion composition and initialization/read-state rules. These accepted owners are unchanged; library-read visibility does not imply assignment-time eligibility checks. Grocery recomputation is a directly invoked side effect; grocery aggregation/check policies remain excluded.

### BSL-meal-planning-007 — Planner target, classification and Quick Find entry

**Actor/state/trigger/outcome:** Household person opens an ordinary empty day (displayed no recipe ID, status not three), chooses Quick Find or Search library and selects a recipe. `planner/page.tsx` `SortableDayCard` gives status-three presentation priority, shows recipe cards for IDs, hides Change recipe for `_isPending`, otherwise offers Plan supper. The pivot treats recipe IDs OR status three as hasRecipe; pending suggestions remain distinct from persisted entries through `_isPending`, not a different recipe-ID type. Week status does not gate the ordinary Plan supper branch. This evidence does not extract voting/locking transitions or non-cooking conversion.

**Ordered trace:** day array index → `showPivot.dayIndex` → Quick Find pending handoff after pivot closes (240ms timer) → selectedDayIndex → `QuickFindModal` props including currentWeekOffset → returned-card callback → `handleQuickFindSelect`. Search pivot route uses addToDay/index plus selected offset. Quick Find terminal Search Library link carries the same target. Neither sends the displayed date as assignment input. Handler routes a displayed recipe ID with date to occupied recovery, without a fresh target read or pending-marker distinction; ordinary empty path invokes weekStore.assignRecipe. Recipe-free non-cooking can reach the shared mutation via connected controls, but its conversion rules are excluded.

**Assertions/substitutions:** `planner/page.test.tsx` tests supply mocked stores/router, replace Quick Find with a callback button and pivot with buttons. `keeps Quick Find open, shows an error, and reconciles when an empty-slot assignment fails` uses empty day one, rejects mocked assignRecipe, asserts an extra init call, error toast and retained mock Select; it does not exercise the actual store/network or assert retry completion. `hides the change recipe button for a pending family suggestion` checks the supplied pending marker. `QuickFindModal.test.tsx` mocks API/discovery state/motion: fifth-card selection asserts callback ID/name, four-card case counts progress dots, no-results disables Skip; terminal/shrink cases check Select disabled. Those prove neither persistence nor submission locking. No inspected focused assertion covers targeted terminal href with a nonzero offset, duplicate assignment clicks or navigation while submitting. `planner.spec.ts` checks pivot controls and targeted Search URL; browser assertions not executed.

**Evidence:** Implementation-supported, medium confidence overall (high for direct routing/callback, limited concurrent semantics). Disposition drafted R1–R2; U110/U113/U115. No unit/browser/runtime run.

### BSL-meal-planning-008 — Targeted Search/detail, fresh read and response-independent navigation

**Path:** `recipes/page.tsx` addToDay/weekOffset base-ten parse → local-date `resolveDayName` label → loaded `RecipeDetailSheet` primary Plan for label → handleUseRecipe → handleAssignRecipe → assignWithRecoveryGuard → `slotAssignment.getPlannerSlot` → `planner.getSchedule` → generated GET. Existing promoted reading rules apply. Helper indexes days, requires a date, normalizes direct/nested data/additionalData recipe identity, but returns neither status nor nonCooking. A normalized recipe closes detail and opens occupied recovery (only the boundary is extracted). A dated ordinary recipe-free result calls assignRecipeToEmptySlot → assignRecipeToDay → POST; the helper itself does no read/check. Missing/undefined slot also proceeds in source, and status-three recipe-free entries are not distinguished by this guard. These gaps are qualified under U110, not normalized into an ordinary empty-day precondition.

**Pending/failure/exit:** Detail sets isSavingAction, awaits callback and releases it in finally; primary button disables while pending. Page sets isAssigning for list-container pointer-events/opacity. No initial `if (isAssigning)` submission guard, global lock or cancellation is present; closing detail/other navigation remains possible. On successful POST resolution it pushes exact target success URL without inspecting response fields or calling week/Today assignment stores. On read/post rejection it logs, clears page assigning state and retains detail/selection; no assignment-specific visible error/Retry is added. The enabled action allows another attempt. Success leaves isAssigning true until navigation/unmount on this path. First-open scanning, specific-day discovery and Cook Tonight branches are outside this extraction.

**Assertions:** `recipes/page.test.tsx` “renders the planner CTA in planner mode and assigns the recipe back to the planner” uses real sheet/helper with mocked planner wrapper (getSchedule resolves seven ordinary empty days, normalize is a trivial substitution, POST resolves undefined). It checks wrapper arguments (0,2, selected detail ID/name/image) and success URL. It does not assert GET ordering, failure/retry/pending behavior, generated serialization, nonzero-week assignment or persistence. Separate tests retain planning context in search inputs; they do not qualify the mutation. `RecipeDetailSheet.test.tsx` callbacks are supplied vi.fn stubs; no isolated pending-assignment assertion found. `slotAssignment.test.ts` exercises defer and first-open scanning only, not getPlannerSlot/assignRecipeToEmptySlot empty-target behavior. No tests executed.

**Evidence:** Implementation-supported, medium confidence; source-only pending/failure semantics. Disposition drafted R3–R4/R14–R15; U110/U113/U115.

### BSL-meal-planning-009 — Request, access, defaults, date and calendar/week persistence

**Wire trace:** `lib/api/planner.ts` assignRecipeToDay sends only weekOffset/dayIndex/recipeId → generated assign POST metadata JSON serializer → `specs/openapi.yaml` POST `/api/schedule/assign` and AssignScheduleDto → Program global authenticated policy/ApiController → `ScheduleController.AssignRecipe([FromBody] AssignScheduleDto)` → `ScheduleService.AssignRecipeAsync(dto, GetConnectionId())`. Shared auth handler accepts exact secret, signed Bearer or signed h_access cookie; browser client supplies member and stored connection headers as available. No endpoint member binder/existence/readiness/discoverability check. Action's only explicit response is Ok after service completion.

**Contract/default/validation boundary:** OpenAPI requires body and all three fields, integer week/index and UUID recipe, no defaults/min/max. Generated TS fields are optional/null and serializer writes their respective number/Guid fields; wrapper always supplies them. C# int/int/Guid positional DTO has no explicit defaults or required/range annotations. No semantic day-index clamp, recipe lookup, empty-slot token, idempotency key or version check in service. Framework JSON/body/model binding, absent-value defaults and extreme integer/DateOnly arithmetic are not executed here; do not infer an acceptance/error matrix. OpenAPI only declares 200 and models displacedRecipe as a non-null DTO when present, while empty-date implementation emits explicit null and generated TS permits null. Preserve this nullability and missing 400/401/500 documentation limitation without editing contract/client (U111).

**Persistence:** Server injected-clock UTC date → GetWeekBounds offset Monday → Monday.AddDays(dayIndex). EnsureWeekPlanExistsAsync queries existence and separately saves a new GUID Draft week plan when absent. Existing weekly-plan status remains untouched. Service queries first event for date including Recipe, with no mealSlot filter/order. No event → new GUID CalendarEvent with RecipeId/date/Planned=0, CLR default mealSlot=0 and null non-cooking fields → SaveChangesAsync. Existing occupied event is mutable; Sunday displacement exists in shared endpoint, inspected only to bound compatibility. No atomic empty-target assertion is made. Models/EF/SQL define recipe FK, unique (date,mealSlot), unique week_start_date and status/non-cooking constraints; they do not establish idempotency or a multi-save transaction. EF and SQL non-cooking check text differ; this slice neither changes nor qualifies conversion policy.

**Assertions:** `ScheduleIntegrationTests.AssignRecipe_CreatesCalendarEvent_WhenNoneExists` directly calls service and asserts chosen ID and computed current UTC Monday, not HTTP envelope/auth, default binding, status/slot, nonzero offset or week-status retention. Update-existing and skipped-reopening assertions establish compatibility only; skipped test even seeds Guid.Empty under InMemory, not a valid relational FK test. `ScheduleServiceTests.cs` has no AssignRecipe cases (targeted symbol search); its voting/locking tests do not qualify assignment status. Default factory disables auth and uses EF InMemory with transaction-ignored warning; source relational constraints are not runtime qualification. No tests executed.

**Evidence:** Implementation-supported, high for explicit source mapping, medium for end-to-end semantics. Disposition drafted R5–R8/R10; U110–U112/U115.

### BSL-meal-planning-010 — Ordered side effects, response and partial success

**Order:** Optional earlier weekly-plan SaveChanges → calendar SaveChanges → grocery RecomputeForWeekAsync(monday, CancellationToken.None) → GetScheduleAsync(offset) → PublishWeekUpdatedAsync(schedule, excludeConnectionId) → PublishFillTheGapInvalidatedAsync(offset, excludeConnectionId) → return displaced (null for no previous event) → controller Ok message/displacement → SuccessWrappingFilter `{data:{message:"Recipe assigned",displacedRecipe:null}}`. Recompute itself queries recipes, saves weekly grocery output/check transitions and conditionally awaits grocery_updated. Only its invocation/save/publication boundaries are recorded; no aggregation/check policy is extracted. No request cancellation token or enclosing transaction is passed by assignment.

**Partial success/failure:** New week can persist before calendar failure. Calendar save can succeed before grocery failure. Grocery save can succeed before snapshot query/publication fails. No compensation removes these earlier writes. An exception prevents later steps and controller success; generic middleware maps unhandled errors to 500 `{status,message}` (specific Argument/KeyNotFound/Unauthorized mappings remain shared). No exercised injection proves any particular failure timing; preserve the source-supported possibility, not an executed partial-failure claim. SseEventPublisher delegates to SseConnectionManager: serialization/semaphore wait can propagate; per-response write/flush failure is caught and registration removed, so a disconnected recipient alone does not necessarily fail the POST. Publication success is not delivery/application acknowledgement. Connection exclusion and all U95–U109 guards remain owned by live updates.

**Assertions:** `AssignRecipe_RecomputesPersistedGroceryItems_AndPreservesGroceryState` directly invokes service and rereads a new scope, checking one ingredient line's normalized key/recipe ID and unchanged sample grocery JSON, not all aggregation/check policy or PostgreSQL durability. `AssignRecipe_PublishesWeekUpdatedAndFillTheGapEvents` verifies mock invocation counts, not ordering, payload completeness, receipt or store application. Factory substitutions remain as above; no ordered persistence/failure-injection/HTTP-success-envelope assertion found in selected tests. No tests executed.

**Evidence:** Implementation-supported, medium confidence. Disposition drafted R9–R10; U112/U115.

### BSL-meal-planning-011 — Optimistic week display, Today, rollback and overlapping requests

**Planner state path:** weekStore.assignRecipe captures the whole prior schedule; spreads the selected day; sets status zero/nonCooking null/chosen recipe display fields; sets optimisticWriteAt. It does not clear `_isPending`, `_voteCount` or `_unanimousVote` explicitly. POST uses current store weekOffset. Then GET reads the then-current offset and only sets groceryItems(default []), status(default zero), lastSyncedAt; displayed days/check map are not replaced by this read. Missing usable data returns successfully. POST/GET rejection resets the whole captured schedule, leaves optimistic timestamp/other state independently managed and throws generic Failed to assign recipe. No exact multi-store/server rollback is established.

**Page response:** On completion, if captured week offset is zero and captured selected date is browser-local today, page calls todayStore.assignRecipe; then closes Quick Find/pivot and clears selected/pending day. Today immediately sets recipe/status zero/nonCooking null/time, fires a SECOND assignRecipeToDay(0, browser-local weekday) without awaiting and fetches full recipe details, conditionally hydrating description/ingredients/time only while ID matches. Background assignment error logs without a rollback. No direct Today call exists on targeted Search completion. Same-local/server-date equivalence, exactly one write and completion of this second request are not established (U114).

**Failure/retry:** Planner catch awaits init(captured offset), then adds toast “That recipe could not be added. Your plan was refreshed; please try again.” Selection/modal are not cleared by that catch. Init may swallow missing/failed reads and retain content under U106; the toast's “refreshed” wording is not evidence of successful reread or persistence reversal. Another selection can retry, but a persisted earlier attempt may now be seen as occupied, and the shared endpoint can repeat side effects. No promise of safe/identical retry or recovery outcome.

**Concurrency/navigation:** Quick Find has loading flags for suggestions, not assignment: Select callback is not awaited by the modal, no disabled submission state/ref latch exists, Close/Skip/Search remain enabled as applicable. Repeated callbacks can post overlapping writes; optimistic local state can cause another selection to enter occupied recovery. Week store captures no assignment offset/generation; pending navigation may change follow-up GET's offset, old result may update new-week adjuncts, captured whole-schedule rollback may overwrite intervening state. Page closure can later dismiss changed modal state or invoke Today using old selection. No AbortController/unmount guard for these assignment paths. Detail has local pending button state, but page/other navigation is not canceled. These are source limits, not observed races or new normative policies (U113).

**Reconciliation boundary:** Success URL starts Planner init per promoted rules and separately sets ring/scroll from any truthy success plus parsed dayIndex. It requests smooth centered scroll if element exists and clears highlight after 3000ms; there is no server-confirmation check and query feedback is not consumed/removed. REST init, assignment adjunct read and SSE remain independently ordered. useScheduleStream week_updated applies guarded week/Today snapshots and invalidates search promotion; fill_the_gap_invalidated increments the corresponding discovery version and invalidates search promotion. Quick Find's versioned suggestion refetch has its own fetch-generation guard, not an assignment-generation guard. Preserve conditional application/echo exclusions/U100; no convergence guarantee.

**Assertions:** `weekStore.test.ts` rollback case rejects mocked POST, awaits rejection and compares whole schedule to its seeded before state; no deferred optimistic assertion, post-success GET-failure, concurrent navigation/rollback or server persistence assertion. Planner page failure assertion uses mock store as in BSL-007. Browser `planner.spec.ts` round trip asserts URL/ring only on static schedule mocks; it does not assert the selected recipe after persistence. `recipes.spec.ts` captures and asserts request fields but substitutes HTTP 200 `{success:true}` rather than real data message/displacement. Common mock assignment returns `{data:{success:true}}` without schedule mutation. Non-cooking-specific mutable mock assigns by array index and ignores requested week offset, so it is not ordinary assignment/backend parity evidence. Fixtures pin browser date to 2026-05-04 noon UTC, inject auth/member context via suite setup and block unhandled APIs. No unit/API/browser/backend/database/network/model tests run.

**Evidence:** Implementation-supported, medium confidence, with source-only concurrency and Today limitations. Disposition drafted R11–R15; U112–U115. Existing assertions are inspected evidence only.

### BSL-meal-planning-012 — Complete draft mapping and final check boundary

All 15 requirements/30 scenarios are ADDED under the existing meal-planning capability. No Purpose/MODIFIED/REMOVED sections or promoted edits. Mapping rows use exact delta header text; no row claims executed application behavior.

| Requirement (delta order) | All scenario headers | Evidence / inspected assertion limit |
| --- | --- | --- |
| 1. Carry an empty planner day into recipe selection | Choose Quick Find for an empty day; Search from the pivot | BSL-meal-planning-007: Planner pivot source; mocked page and browser pivot assertions; not executed |
| 2. Select a returned Quick Find recipe for the target day | Select an available card; Continue into targeted Search | BSL-meal-planning-007: Quick Find callback/disabled assertions; targeted href source only; not executed |
| 3. Present the targeted recipe-detail planning action | Open detail in planning context; Use the loaded recipe | BSL-meal-planning-008: Search/detail source; mocked page CTA assertion; not executed |
| 4. Read the explicit Search target before assignment | Ordinary empty target is returned; Target now has a recipe | BSL-meal-planning-008: Slot helper source; no focused helper assertion; not executed |
| 5. Submit chosen-recipe assignment through the protected operation | Submit the selected identity; Household access is absent | BSL-meal-planning-009: Wrapper/generated/OpenAPI/controller source; no live auth/serialization assertion; not executed |
| 6. Resolve assignment dates from the server week | Assign Monday of the current week; Assign within another supported week | BSL-meal-planning-009: Service current-Monday assertion; other offsets source only; not executed |
| 7. Ensure a weekly plan for assignment | No weekly plan exists; Existing week status is retained | BSL-meal-planning-009: Source only for assignment plan/status behavior; not executed |
| 8. Persist a planned recipe entry for an empty date | Empty date receives the chosen recipe; Default supper slot | BSL-meal-planning-009: Create assertion ID/date only; status/slot source only; not executed |
| 9. Invoke assignment follow-up work in order | Follow-up work completes; Follow-up rejects | BSL-meal-planning-010: Ordered source awaits; mock counts do not prove ordering; not executed |
| 10. Return the assignment success envelope | Empty-date operation completes; Browser completion does not depend on the message | BSL-meal-planning-009/010: Controller/filter/generated source; browser substitutes response; not executed |
| 11. Show the chosen recipe optimistically in Planner | Assignment is pending; Other days are displayed | BSL-meal-planning-011: Store source; no deferred optimistic assertion; not executed |
| 12. Read assignment adjuncts after the Planner post | Follow-up data is usable; Follow-up resolves without usable data | BSL-meal-planning-011: Source only for assignment adjunct GET branches; not executed |
| 13. Finish or recover the Planner Quick Find selection | Quick Find selection completes; Assignment path rejects | BSL-meal-planning-007/011: Mocked page failure/retained Select and store rollback assertions; not executed |
| 14. Show pending targeted detail submission and allow another attempt | Detail planning action is pending; Targeted assignment fails | BSL-meal-planning-008: Source only for detail pending/failure retry; not executed |
| 15. Return targeted Search assignment to Planner | Search assignment resolves; Planner receives success feedback parameters | BSL-meal-planning-008/011: Mocked page URL and browser URL/ring assertions; not executed |

**Preservation/check handoff:** Recheck prior 40 source-identity rows in this capability plan and all newly inspected input digests below; compare all eight promoted specs and all unrelated files/staged bytes to before-images. Review full seven-path documentation diff, selected/all strict OpenSpec grammar, then `task verify` with every explicit path shown in selected tasks. Final observed outcomes/content identity belong to the final response and `.task/agent-finish/last-run.json`; this pre-verification text does not certify its own later bytes. No documentation preparation is needed. Runtime/unit/API/browser/network/database/model qualification is not-run by authorization; behavior TDD/new tests, API/client/mock synchronization, migrations and deployment are not-applicable. Failed/blocked outcomes remain separate if encountered.

### Empty-day assignment source identities — SHA-256

Prior capability source rows are retained verbatim. The following digests identify inspected source/contracts/assertions/fixtures, not successful operation of the application. Shared main specs are separately compared to the session before-image.

| Source | SHA-256 |
| --- | --- |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` | `c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/AssignScheduleDto.cs` | `d76dd22443e39593b31551b60df3df40700b3d9ff4f8282efc8fb5a34c902172` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/IScheduleEventPublisher.cs` | `ae8b2dc385c0a83b0bb6fd2b9ed53b627c91d1f3fa5cbe84440b6e26e09f5722` |
| `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs` | `6e757f5e3a63a96ab98287e2cfa761d0010969e1db1664f87db28e6f0c8460d9` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | `cac6be71f2d3fa947a903390d9d6a69da7df9ebbf7aed38a76a80c45ef856806` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/GroceryRecomputeService.cs` | `ae35bbb1ed3d88d8a3c895b3d372dc33cce58b7270b69980138be10598d882dd` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/planner.spec.ts` | `c6eaf618469b43c8543420b0ca6f52259ee1e98c9564b50e58dcbbdf7d32eeed` |
| `pwa/e2e/recipes.spec.ts` | `b41683a89d6b1704ecf0a447fdf6493f60314b45b62b3f60143ec190e9eaaa51` |
| `pwa/src/app/(app)/planner/page.test.tsx` | `d787f5c4061bd45efd6311a76b53b61634059f90608be9a1b122b3f352acf1ba` |
| `pwa/src/app/(app)/planner/page.tsx` | `f113f605a33f78cdde5ed6b6ab37c2742d952c7be4319063ff91eeb81dae7f6d` |
| `pwa/src/app/(app)/recipes/page.test.tsx` | `4e43afaf0d59302a1c219fba02e5df5c08bb03e143dc4d2c8f9b0393f69257e6` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/planner/PlanningPivotSheet.tsx` | `28fc6fc674d3aeb4354c955c8025f0a8e615d429a7c4ebb992a024412703abcc` |
| `pwa/src/components/planner/QuickFindModal.test.tsx` | `0e5b936773ba379e3daef5659aba6cc3fe8d71d18de0da90dccb250b4cbb665b` |
| `pwa/src/components/planner/QuickFindModal.tsx` | `8b2685317c477129a2501ae58cfb09c92741f639e6cb5d8d5774c87f35cb9b80` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/schedule/assign/index.ts` | `072c2e46468bbd9ba3ed641a9b4eddf49a0d6e5ec82ab5fc80b836ef40db61a2` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/src/lib/imageUtils.ts` | `a51d124d0fae2a99257186e607597825299737ca77717813aac3ce72821d46be` |
| `pwa/src/lib/planner/slotAssignment.test.ts` | `62293032af1a1181c79f0f5e3e1641a24809257942a261fb3a866db443e63550` |
| `pwa/src/lib/planner/slotAssignment.ts` | `0973028bc470f3bd1b4a3f58ed43029950f4c8b5fdb6ca69b40094c761520117` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### A85 next-session checkpoint

Discovery is reconciled for this slice with BSL-meal-planning-007–012 and U110–U115. Proposal/design/15-requirement/30-scenario delta/extraction tasks are validated: selected strict validation and all 30 OpenSpec items passed; seven-path documentation/spec/content verification passed. Final checked identity is reported by the harness/final handoff. Failed: none; blocked: none. Runtime/application qualification remains not-run, and application TDD/client/schema/deployment checks are not-applicable to this edit. Human review pending; accepted/promoted status remains absent for this slice. Eight mains remain unchanged, including meal-planning 15/40; 22 changes remain active. No runtime evidence was executed.

Exact next bounded action: human review of this draft and its qualifications. Revisions or promotion require a later instruction; do not archive, implement, qualify runtime behavior or start another slice. Recheck input hashes before reuse. No consequential unresolved decision was needed for the supported draft because disputed guarantees remain withheld; future resolution of U110–U115 must be separately selected and asked one question at a time if it changes normative treatment.

### BSL-meal-planning-013 — Empty-day assignment main-spec promotion

**Authorization A86 (2026-10-16):** User “promote” accepts the validated A85 assignment draft and authorizes syncing its exact reviewed delta to main with bounded capability/index/task follow-up. No archive, implementation, runtime qualification or successor extraction.

**Result:** Main meal-planning now has **30 requirements / 70 scenarios**: original Purpose and all 15/40 week-reading requirements remain byte-identical, and the reviewed assignment 15/30 blocks are appended verbatim under the same Requirements heading. New non-normative evidence paragraphs identify BSL-meal-planning-007–013 and retain U110–U115, U95–U109 and A34. All 15 mapping rows/30 assignment scenario headers in BSL-012 now map to the promoted blocks without renaming or changing their text. Previous Purpose language describes the initial reading slice; the new evidence paragraph identifies this additional assignment slice without rewriting the Purpose.

**Inventory and preservation:** CLI resolves nearest root `/Users/alex/Code/whats-for-supper`; spec-driven schema, eight main capabilities and 22 active changes. No capability or change created/deleted/archived. All 83 source identity rows (58 unique paths in this capability plan) rechecked unchanged. Private before-images capture every pre-existing file hash, staged binary diff and the four overlapping documents. Preserve all prior plan history except the current checkpoint, the other seven main specs, selected delta/proposal/design/metadata and every unrelated file/staged byte. The small index updates only its checkpoint/meal-planning summary. No retired navigation spec is restored.

**Check boundary:** Exact original-Purpose/prior-requirement equality and exact reviewed-delta append are required, together with unchanged source hashes/other files/index bytes, full four-path documentation review, strict selected change/main/all-spec/all-item validation and explicit-path task verify below. Actual outcomes and final content identity belong to the final response and `.task/agent-finish/last-run.json`; prior draft checks describe earlier bytes. Runtime/unit/API/browser/network/database/model qualification remains not-run under A34/current scope; implementation TDD, client/contract/mock synchronization, migrations and deployment are not-applicable. Failed and blocked checks remain separate if encountered.

```sh
task verify -- openspec/specs/meal-planning/spec.md docs/openspec-baseline/meal-planning.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-empty-day-recipe-assignment/tasks.md
```

**A86 next-session checkpoint:** Assignment accepted/promoted as documentation; main meal-planning 30/70, eight main capabilities, 22 active changes. Historical A85 pending-review wording above is superseded by this record. The source change remains active. Runtime evidence remains not-run. Await a separately selected bounded slice or lifecycle action; do not archive, implement, qualify runtime behavior or start another slice from this checkpoint alone.

## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the meal-planning OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/meal-planning.md.
Use these as the execution context; do not read the full history or other
capability plans unless an immediate dependency requires a specific section.
Resolve installed OpenSpec workflow/root before artifact writes. Preserve staged,
unstaged and untracked work. Recheck source identity and affected evidence.

Current user messages define scope. Reuse recorded decisions without asking for
approval again within already authorized work. Do not infer new drafting,
promotion, archive, implementation or runtime qualification authority from history.
Trace one selected observable journey through source, contracts and actual test
assertions/substitutions. Keep disputed claims non-normative. No application,
test, contract, client, SQL, configuration or dependency edits.

Update this capability plan's evidence/mappings, decisions, uncertainty, artifact
status, session log and next action. Update the small index only if its routing or
summary changes. Validate selected artifacts and run task verify with every changed
path. Distinguish passed, failed, blocked, not-run and not-applicable; source
support is not runtime verification. Stop at the authorized session boundary.
```

## Next-session record

Use this section for new capability sessions after the split. The earlier evidence
and lifecycle records above retain their original chronology.

```text
Session/date:
Branch, commit, relevant dirty inputs:
Current user authorization and selected capability/slice:
Completed discovery/evidence IDs:
Artifact paths and status (draft/validated/accepted/promoted separately):
Human decisions and unresolved questions:
Checks: passed / failed / blocked / not-run / not-applicable, with reasons:
Limitations and excluded assertions:
Exact next bounded action:
```

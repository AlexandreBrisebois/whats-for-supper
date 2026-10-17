# Meal planning baseline plan

## Incoming branch reconciliation — 2026-10-16

The local branch was fast-forwarded from `b43f8ab3` to `e4a48c85`, incorporating `8357a8bd` / PR #242 before restoring the complete uncommitted spec splits. A retained Git safety stash and private file/patch snapshot preserve the pre-reconciliation work. No commit, deployment or new archival was performed.

All four incoming changes to existing planning requirements were applied to their relocated owners: two assignment/replacement rules in meal-assignment and two legacy movement rules in meal-rescheduling. Six new Tomorrow movement requirements belong to meal-rescheduling; the new shared-caller gating requirement belongs to meal-assignment. Home retains its three modified and one added Tomorrow requirements in tonight-meal-decisions. The six planning owners now match all 111 upstream planning blocks / 263 scenarios exactly; Home matches upstream under its existing owner. The other five capability splits retain all 260 blocks / 609 scenarios unchanged.

The original split archive and its 104/249 block identities remain a historical snapshot, not a delta to replay over later accepted Tomorrow behavior. The incoming [Tomorrow change](../../openspec/changes/archive/2026-10-16-tomorrow-preserve-meals/design.md) and its [recorded test/qualification evidence](../../openspec/changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md) are preserved untouched. This reconciliation verifies documentation alignment and Git preservation only; previous application evidence is not promoted into a new runtime result. Historical uncertainties remain unless explicitly superseded by the accepted incoming requirements.

Reconciliation acceptance: the complete current main-spec union matches incoming HEAD `e4a48c85` exactly by requirement title and canonical block content: **667 unique requirements / 1,615 ordered scenarios across 30 owners**. All incoming non-overlap files and deletions match that commit; 58 of the 66 original changed/untracked files remain byte-identical, and exactly eight documentation files contain the authorized reconciliation. No staged changes or unresolved merge entries remain. Strict OpenSpec validation passed for all 31 items; link, whitespace and preservation checks passed. Application/runtime tests were not rerun during this synchronization. Final documentation-harness evidence is reported with its unique record_path in the completion response.

## Current capability ownership — 2026-10-16

The six current main specs contain **111 requirements / 263 scenarios**, matching upstream `e4a48c85` after the Tomorrow reconciliation. The original split conserved 104/249 from combined-spec SHA-256 `84a098961a8972ae17925266e8a3ac47b28ef8d7b7aa0875f799436b7a763d32`; that identity remains a historical input. Incoming PR #242 adds seven requirements and fourteen scenarios and updates four existing requirement blocks, all copied exactly under their current owners. This file remains the shared historical evidence record for those owners; BSL/U/A mappings, old source digests and runtime limits below are preserved, not newly qualified.

| Current capability | Requirements / scenarios | Responsibility |
|---|---:|---|
| [meal-planning](../../openspec/specs/meal-planning/spec.md) | 17 / 44 | Week reads, navigation, display and direct suggestion reads |
| [deployment-calendar](../../openspec/specs/deployment-calendar/spec.md) | 7 / 20 | Timezone, date context, captured references and rollover |
| [meal-assignment](../../openspec/specs/meal-assignment/spec.md) | 29 / 64 | Quick Find, assignment, first-open placement and replacement recovery |
| [meal-rescheduling](../../openspec/specs/meal-rescheduling/spec.md) | 26 / 65 | Movement, drag, defer, recipe removal and shared deletion |
| [non-cooking-plans](../../openspec/specs/non-cooking-plans/spec.md) | 18 / 39 | Recipe-free supper plans and editing/clearing UI |
| [planning-lifecycle](../../openspec/specs/planning-lifecycle/spec.md) | 14 / 31 | Voting, locking, day validation and overdue finalization |

The shared date-delete lifecycle belongs to [Delete the recipe-free entry before clear follow-up work](../../openspec/specs/meal-rescheduling/spec.md#requirement-delete-the-recipe-free-entry-before-clear-follow-up-work). The [preserved qualifications](../../openspec/specs/meal-planning/spec.md#evidence-and-qualifications-non-normative) apply to transferred requirements. The following lifecycle counts and combined-owner references are historical checkpoints; they do not describe the current split.

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **96 requirements / 222 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

Promoted baseline: **93 requirements / 214 scenarios** at MP-P01 (2026-10-16).
The user's “promote” accepts the five MP-G01 documentation drafts and promotes
their reviewed 44/100 alongside the unchanged prior 49/114. Ordinary-household
meal-planning generation and its selected promotion are reconciled with explicit
owner/exclusion/unresolved dispositions. A34, U95–U122, MP-U01–MP-U12 and earlier
qualifications remain intact. The eight meal-planning source changes remain active;
no archival or application/runtime work is performed. Historical pending-review
and next-action text below is superseded for current lifecycle status by MP-P01.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

Accepted baseline: [main meal-planning specification](../../openspec/specs/meal-planning/spec.md).

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 93 requirements / 214 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


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

**NC-A01 (2026-10-16):** User's attached “Discover and draft the next WFS OpenSpec baseline slice: recipe-free non-cooking day plans” authorizes documentation-only discovery/drafting of `baseline-meal-planning-non-cooking-day-plans`, including the recipe-free clear lifecycle, strict selected/all validation and explicit-path task verify. Preserve promoted Purpose/30/70, all unrelated/staged/untracked work and U95–U115/earlier qualifications. Stop at a validated human-review draft; no application/test/contract/client/SQL/dependency/configuration edits, services/runtime/API/browser/network/database/model qualification, promotion, archive, implementation or successor extraction. Local NC-A01 is this capability session's authorization label, not a change to global decisions.

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

### Non-cooking qualifications added under NC-A01

| ID | Finding / evidence | Withheld treatment |
| --- | --- | --- |
| U116 | BSL-014: pivot condition accepts pending suggestions, but pending recipe cards have no Change button; captured displayed dates and selected offsets can differ during navigation under U106. Nonnegative offset gate does not restrict a past date inside the current week. | No general pending-card conversion entry, server future-date restriction or atomic displayed-target freshness claim. Preserve ordinary/pending/persisted/recipe-free skipped/legacy distinctions. |
| U117 | BSL-015/018: mounted-sheet ref latch and disabled controls are local; no abort/unmount cancellation, request generation, server version or idempotency key. Date/offset key resets mounted state only on target change; captured props do not rebase an existing draft. Closure checks active date and selected offset, application checks loaded offset; same-offset/ABA responses can still apply. | No cross-sheet serialization, latest-response-wins, cancellation, navigation isolation or exactly-once save/clear. Clear via pivot has no sheet busy controls. |
| U118 | BSL-017: SQL install/compatibility permit optional preset notes; EF check constraint still permits only null preset labels. SQL has unique (date,meal_slot), not unique date; service uses first-by-date, no slot selector or row version. Serializable begins only for explicit plan + relational provider; selected PostgreSQL 23505/40001 handling is not exhaustive concurrency proof. | Withhold universal deployed schema parity, actual enforcement, date-wide uniqueness, atomic reservation/assignment-race protection, exact rollback and guaranteed winning writer. InMemory ignores transactions/constraints. No database inspected or run. |
| U119 | BSL-017–019: save commits before slot publication; clear saves deletion before recomputation, its separate save/conditional grocery publication, schedule read and further publications. No compensation spans these steps; client follow-up GET can fail after server success or resolve unusably then close. | Failure feedback does not prove no persistence, server/local rollback, successful reread or complete success. Retrying editable state is available, not promised safe/idempotent. No failure injection executed. |
| U120 | BSL-019: shared DELETE has no expected-kind/recipe/version check and deletes the first entry by date. Sheet has no failure-refresh branch for DELETE; pivot clear optimistically clears by array index, fires DELETE and restores captured whole schedule/items on rejection without toast. | No compare-and-clear protection if a recipe acquired the date, safe general recipe removal, equivalent feedback across clear callers or isolation of rollback from later changes. General removal policy remains excluded. |
| U121 | BSL-018: save/clear have no direct Today sync/update; origin-excluded events may not return. Snapshot merge can preserve old/pending content or defer; all-recipeless snapshots retain old week status. Home mount/SSR/client sync are independent and guarded; planDate targets only selected week zero although local Today may require adjacent UTC week. | No immediate Today reconciliation, combined-store atomicity, clearing guarantee from snapshot, timezone-equivalent handoff or guaranteed convergence/recovery. Preserve U95–U109 including U100. |
| U122 | BSL-016/020: OpenAPI raw maxLength and trimmed/scalar prose are not equivalent acceptance rules for whitespace-padded raw input; ValidationDto status description says 1 Planned while model Planned=0/Locked=1. Generated required fields are optional/null in TS; wire missing/malformed binding not qualified. Mock validation ignores real trim/length/status/schema checks; GET ignores offset; default API factory disables auth and uses InMemory. | No full contract/schema/client parity or exhaustive malformed-input/status/date matrix; no relational/auth/race/transport evidence inferred from mocks or test names. API/DB/browser/unit/network/model checks not-run A34. |

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

## Draft slice — meal planning / recipe-free non-cooking day plans

**Session NC-A01 (2026-10-16):** Branch `moving-to-openspec`, commit `04a1c4570f9bbb01b47436790d4248635ac3179a`. Initial Git status: staged `docs/openspec-baseline/recipe-library.md` and untracked `openspec/changes/baseline-recipe-library-summary-reading/`. Both remain unrelated. The baseline-plan split is already part of current HEAD; it is retained. Private before-images capture capability/index/main-spec bytes, a hash manifest of all tracked/untracked files and the complete staged binary diff. Current `git diff --cached --check` and unstaged whitespace check were clean: the previously reported staged meal-planning EOF blank line is absent now, and main meal-planning has no staged delta. No unrelated staged bytes were repaired or staged.

**Live inventory:** `openspec list --json` and `openspec context --json` resolve nearest root `/Users/alex/Code/whats-for-supper`. Configured schema is spec-driven. CLI `list --specs` and actual headers confirm eight mains: meal-planning 30/70, identity 36/92, library 55/122, sharing 9/34, capture 37/92, quality 37/92, background 14/42 and live-updates 15/38. There were **23 active changes**, including the unrelated summary-reading draft, rather than A86's historical 22. CLI scaffold creates only this selected change, bringing the active count to **24**; no capability added/promoted/deleted/archived and no root initialization/reconfiguration.

**Ownership/reuse:** Main meal-planning's Return seven dates from the server UTC week, Project stored recipe and non-cooking read content, Compose voting suggestions separately from persisted assignments, Render day content and planned count from displayed state and existing assignment requirements remain unchanged. Household-identity's Gate protected page entry with household access, Apply member context after household access and Authenticate protected API requests independently own access/context. Recipe-library owns recipe facts/read visibility (Return only eligible household library recipes; Return persisted recipe detail for an available record); these are not inferred non-cooking save filters. Household-live-updates owns Use connection identity only for immediate echo exclusion, Bound delivery to current process registrations, matching-week/deferred/merge/adjunct snapshot requirements, Select Today independently from the received snapshot and Preserve Today's recent optimistic recipe guard. This slice adds only the missing recipe-free lifecycle rules.

**Artifact status:** Proposal/design/ADDED meal-planning delta/documentation-extraction tasks drafted and selected-change validated in `openspec/changes/baseline-meal-planning-non-cooking-day-plans/`. Delta has **19 requirements / 44 scenarios**; no Purpose/MODIFIED/REMOVED section or main-spec edit. Discovery reconciled with U116–U122; evidence is implementation-supported, with inspected assertions separately labeled below. Human review pending; accepted/promoted absent. Selected strict grammar check passed on the initial delta; final selected/all/check identity is established only by the commands after all artifacts are finalized and the final handoff. Runtime qualification not-run under current authorization/A34.

### BSL-meal-planning-014 — Displayed classification, target and entry availability

**Actor/trigger/outcome:** A household member opens an ordinary empty Plan supper card or a saved status-three indicator in `pwa/src/app/(app)/planner/page.tsx` → onPivot stores the current array index → `PlanningPivotSheet` displays the loaded date. Other plans/Edit supper plan captures `{date, weekOffset, plan, existing: status===3}` then closes the pivot. `NonCookingDaySheet` is keyed by offset/date. The sheet date formatter in `lib/planner/nonCooking.ts` formats date at noon UTC with explicit UTC timezone using en-CA/fr-CA; it is not the mixed card/header calculation in U107.

**Eligibility/state:** No week-status gate: Draft/VotingOpen/Locked can offer the action. The callback exists only for selected offset >=0 and (!recipe.id || _isPending); a missing date prevents opening. This is an offset gate, not a per-date pastness gate. Ordinary empty days have neither persisted recipe nor skipped plan. Pending suggestions can have a recipe ID but are not persisted assignments under promoted rules. Their ordinary recipe card hides Change (`!_isPending`), so the permissive callback is not proof of a reachable pending-card entry (U116). Persisted recipes cannot open this edit action. Recipe-free skipped entries can edit and clear. Legacy recipe-backed skipped entries render status-three fallback presentation first and can open a pivot, but no recipe-free edit callback is supplied. Pivot hasRecipe includes status three; non-cooking remove is last, Quick replace/Search remain separate compatibility boundaries. No replacement policy is extracted.

**Assertions/substitutions:** Planner `page.test.tsx` checks empty action for week states 0/1/2, legacy recipe-backed suppression and date-specific opening using mocked store/router/pivot. `PlanningPivotSheet.test.tsx` checks title/date/copy/action order and backdrop/Close callbacks with mocked locale/animation. No assertion proves pending entry reachability, real selected-week API persistence or a server date limit. Existing promoted classification/read rules are reused. Evidence: implementation-supported, medium confidence across entry state; disposition R1/R2, U116/U122. Tests not executed.

### BSL-meal-planning-015 — Sheet draft, validation, dismissal and local pending state

**Path:** `NonCookingDaySheet.tsx` initializes kind from captured plan or mystery, message from label or empty; no prop-to-state reset effect. Kind order is mystery/order_in/eating_out/custom with localized Mystery night/Order In/Eating out/We made plans and aria-pressed. Non-mystery choices share Tell the family the plan and example text. Switching retains message, clears error and custom focuses input; mystery hides input and sends null label. Date/offset key remount initializes a new target, not a durable draft cache. Idle Close/backdrop/Escape invoke close, unmount discards typing; no Cancel button. Effect focuses Close, custom effect may subsequently focus input, Tab cycles at first/last enabled controls, cleanup restores prior connected focus else first target-date button. These controls do not establish a universal accessibility guarantee.

**Validation/submission:** `submit` first checks `submitting.current`; uses `message.trim()` and `Array.from(label).length`, requires custom nonblank, rejects >80 code points for non-mystery. Blank optional notes become null. Error uses the localized “Enter a message with 1–80 characters.” with a focus request; it overstates minimum for optional notes but the empty optional value is accepted. Input has no HTML maxLength; the limit is submit-time. Clear bypasses label validation. On accepted submission the ref latch is set synchronously, busy=true, prior error cleared; await save or clear. Close/choice/input/save/clear disabled, dialog aria-busy, Save text Saving… (also during clear), backdrop/Escape idle-only. Catch reads `responseStatusCode`, shows plan-changed text for 409 else generic save text, retains kind/message; finally resets latch/busy. Editing text alone does not clear error; changing choice or resubmitting does. No auto-submit/retry loop.

**Assertions:** `NonCookingDaySheet.test.tsx` checks default order/no textbox/submitted mystery null, shared draft across choices, custom focus, optional note initialize/edit/trim/blank/null/81 rejection, required custom and retained original padded draft after a mocked failure, clear callback only, disabled Save/Close with deferred save, Close-no-save and focus restoration, French accessible date/title/choices. It does not assert rapid duplicate calls, pending clear, Tab/backdrop/Escape, unmount/navigation overlap or arbitrary Unicode equivalence. `nonCooking.test.ts` only checks mystery localized label fallback. Evidence: implementation-supported, high for directly asserted local branches, medium for unasserted focus/concurrency branches; disposition R2–R6/R14/R15, U117/U122. No executed checks of application behavior.

### BSL-meal-planning-016 — Browser/contract/access/response trace

**Ordered path:** Page onSave → `lib/api/planner.ts saveNonCookingDay(date, plan)` uses `DateOnly.parse`, throws Invalid date if absent, posts `{status:3, nonCooking:plan}` to generated `api/schedule/day/item/validate/index.ts`. Serializer `serializeValidationDto` writes nested plan, optional recipeId and status; plan serializer writes kind enum/customLabel. Page supplies no recipeId, name, image, day index or offset. Clear uses `removeRecipeFromDay(date)` → generated date removal builder → DELETE with sendNoResponseContent. GET uses `getSchedule(capturedOffset)` → generated schedule GET/model normalization, accepting only data with defined weekOffset. No response value is used to decide save/clear success; promise completion starts follow-up.

**OpenAPI/DTO agreement:** `specs/openapi.yaml` /api/schedule/day/{date}/validate requires date/body/status; NonCookingPlanDto requires kind, defines four kinds, nullable optional label with raw maxLength 80 and trimmed-scalar/blank/mystery prose. ValidationDto nonCooking optional/nullable, status-three-only. Documents 200 `{data:{message,mealMarkedCooked}}`, 400/409 unwrapped status/message, plus 404. Removal date path documents 204 only. C# ValidationDto int status + optional Guid? recipeId/NonCookingPlanDto; NonCookingPlanDto string kind + nullable label. Generated properties optional/null; 400/409 factories map message to `messageEscaped` and status to number; sheet uses adapter status metadata rather than that message. Actual malformed/null/missing binding and malformed dates are not executed. Raw schema length, trimming prose and EF constraint limits remain qualified, not silently repaired (U118/U122).

**Access/response:** Shared API client adds selected member/cookie fallback header and optional X-SSE-Connection-ID; Program's global authenticated-user filter/Hearth handler owns authorization. Schedule actions perform no member existence lookup or elevated role/PIN check. Operation inherits OpenAPI root HearthSecret/HearthToken; no explicit 401 documented. Do not infer API access from injected browser member context. Controller ValidateDay catches explicit conflict and direct Postgres 40001 when nonCooking supplied → 409 status/message; middleware ArgumentException → 400, unhandled →500 generic status/message. Successful service false becomes controller Ok message Cooking status updated/mealMarkedCooked false, SuccessWrappingFilter adds data. Delete returns NoContent, not a success envelope. Evidence: implementation-supported, high for source mappings, medium end-to-end; disposition R7–R9/R12/R16, U118/U122.

### BSL-meal-planning-017 — Service validation, calendar/week persistence and relational boundaries

**Ordered save path:** `ScheduleService.ValidateDayAsync` extracts explicit plan → trims/validates before transaction/read → starts Serializable only when explicit plan exists and Database.IsRelational → DateOnly.Parse → Include(Recipe).FirstOrDefault by date. Explicit plan rejects if selected entry has RecipeId or status !=Skipped. With no entry/status 3 creates Guid entry/no recipe/date/Skipped/normalized metadata/default CLR meal slot0 → SaveChanges → Commit when relational → slot publication → false. Existing recipe-free skipped entry keeps identity/date/slot, sets status 3 and kind/label → SaveChanges → Commit → null-recipe slot publication → false. No weekly-plan query/create/status mutation or grocery recompute here. Day Skipped = 3 is distinct from weekly Draft 0/VotingOpen 1/Locked 2; no save-side voting/locking transition or recipe facts created. A successful read of absent weekly plan still projects Draft under promoted reading.

**Validation:** status must be 3, exact lowercase kind in four supported values; custom trimmed nonblank; all non-mystery labels <=80 EnumerateRunes scalar values; mystery rejects any non-null original CustomLabel, even empty/whitespace. Valid blank optional labels normalize null. Supplied RecipeId with status 3 is not inspected by this branch; browser omits it. No date-future/offset gate, version token, recipe eligibility check or application retry. Status-only legacy calls are a separate compatibility path: they can create skipped default order_in projection or preserve saved metadata; recipe-backed skipped projection has nonCooking null. Assignment clears metadata, move/swap/push can transfer it, defer/assignment targeting have other semantics; inspection stops at these compatibility boundaries.

**Actual constraints/concurrency:** `CalendarEvent` has nullable recipe/kind/label and MealSlot short default 0, no concurrency token. SQL `schema.sql` declares FK recipe ON DELETE CASCADE, status0–4, unique(date,meal_slot), and non-cooking check allowing either both metadata null (including legacy recipe-backed entries), or status 3/recipe null with supported kind and appropriate optional/required label. SQL `char_length(btrim(label))` is not a proof of equivalence to all .NET/JS whitespace cases. `compatibility.sql` adds columns/replaces older check when marker differs, records optional-notes-v1 marker. EF `RecipeDbContext` maps same composite uniqueness but its check still forbids notes on order_in/eating_out; it is not current SQL parity. WeeklyPlan unique week_start_date, independent from calendar entries, no CalendarEvent→WeeklyPlan FK. Service selects first date without slot ordering; uniqueness does not imply one event per date (U104/U118).

Creation catches DbUpdateException inner PostgreSQL 23505/40001, detaches new event and throws NonCookingPlanConflictException; existing save catches inner 40001; controller separately handles direct 40001. Transaction begins/commits outside publication; provider disposal is not evidence of exact rollback across arbitrary faults. Relational transaction guards do not establish atomicity with assignment, general clear, publication or browser reads. No automatic retry, deterministic concurrent winner, date-wide reservation or runtime race guarantee is asserted.

**Assertions:** `NonCookingScheduleTests` uses unique InMemory DB, ignored transaction warnings, fixed 2026-10-12 clock, mocked publisher and real grocery service. OptionalNote asserts trimmed/blank/null/80-emoji round trip and overlength rejection; InvalidPlan asserts exception/no events for listed bad inputs; LabelLimit checks 80 emoji vs 81 ASCII; NonCookingSave_CannotOverwriteRecipe checks unchanged recipe/status. CustomPlan/Mystery tests call voting/lock after save, so final assertions do not separately prove unchanged immediate weekly status; no-plan creation/no-week effects are source-supported only. Other movement/assignment tests are inspected only as boundaries. Evidence: implementation-supported, medium overall; R8–R11, U118/U119/U122; no relational/runtime checks run.

### BSL-meal-planning-018 — Reread, retained error, navigation, live and Today reconciliation

**Save return:** Page awaits POST, then GET(captured offset). Usable result is offered to `weekStore.applySnapshot` only if loaded week offset still matches; close only if effect-maintained active date equals captured date and `plannerStore.currentWeekOffset` matches. No local optimistic save, direct Today mutation, Today sync or response-field use. GET rejection after successful POST enters sheet generic error; resolved unusable GET skips apply but still allows closure. On POST failure page attempts GET with rejected read swallowed to undefined, conditionally applies and rethrows original failure; if snapshot application itself throws, that exception can replace the original. Retained editing enables another deliberate attempt, not safe/idempotent replay.

**Navigation/overlap:** No effect clears nonCookingTarget on week change, no AbortController/request generation or unmount cancellation. Different loaded-offset successful response is rejected by this callback; closure also tests selected offset/date, but a same-date/same-offset replacement or offset ABA is not distinguished. Target-key remount resets latch/draft; old requests continue and may reread or close an indistinguishable newer target. Native/navigation unmount is outside local dismissal guards. No source-supported promise of race-free editable state or cancellation on navigation (U117).

**Stores/live:** `useScheduleStream.slot_updated` sends matching browser-local date to Today, date payload to week applySlotUpdate, invalidates search promotion. `weekStore.applySlotUpdate` requires nonempty loaded days containing date, replaces matching recipe/status/nonCooking and sets _isPending false; no week-status or timestamp update. Week_updated offers whole schedule to existing snapshot guards, independently Today by local-date match and invalidates search promotion. fill_the_gap_invalidated increments discovery invalidation and search promotion; save publishes neither it nor week_updated. Origin exclusion comes from shared client/header; save/clear reread updates only Week. `applySnapshot` prioritizes incoming status 3 over pending recipes but after clear ordinary empty slots can preserve prior pending suggestions; if every incoming day lacks recipe it can retain prior ordinary recipe/status and week status. Moves defer replacement; U95–U109/U100 remain intact. Request success/lastSyncedAt is no convergence proof.

**Home:** `HomeCommandCenter` nonloading skipped + non-mystery + no currentRecipe summary uses nonCookingLabel/note/icon and router.push `/planner?weekOffset=0&planDate=${getTodayString()}`. Mystery uses a different Home path outside this summary handoff. Planner waits not loading, selected offset 0, exact loaded recipe-free status 3 date and planDate not opened; timeout 0 marks ref, selects planner tab and opens pivot. Same planDate does not reopen after closing until query becomes absent/reset or mount changes. No URL consumption/removal, force reread beyond normal init, or previous-week handoff. Home page SSR gets schedule0, seeds date/plan through TodayStoreInitializer only when server date equals local; store may preserve recent optimistic/richer skipped state. Home mount separately calls todayStore.sync: read 0, possibly adjacent week for local coverage, status 3 accepts recipe/nonCooking, other branches use optimistic 20s guards, failures log/end loading. None is invoked directly by these planner save/clear callbacks. Origin exclusion, two-second Today live guard and independently ordered SSR/client writes preserve U99/U109/U121. Home-only near-midnight assertions cannot qualify Planner week-zero handoff.

**Assertions:** Planner mocked tests assert late offset 0 save rereads0 and does not apply after loaded offset1; conflict mock409 refreshes supplied recipe snapshot and retains Birthday draft with alert/no assignment/removal. They do not prove same-offset ordering, unmount, latest target protection, persistence or real adapter409. Home handoff mocked test checks one pivot opening, saved input initialization and closing without save. WeekStore skipped test title mentions snapshots but actually asserts init + applySmartDefaultsUpdate only; no snapshot call. Evidence: implementation-supported, medium; R13–R15/R18/R19, U117/U119/U121/U122; no application/browser tests run.

### BSL-meal-planning-019 — Sheet/pivot clear and ordered partial-success side effects

**Two entry/response paths:** Existing plan sheet includes onClear; `submit(true)` uses local pending guard and no label validation → page awaits removeRecipeFromDay(captured date) → GET(captured offset) → loaded-offset applySnapshot → active-date/selected-offset closure. Any rejection is caught by the sheet with generic or status409 copy, retains draft, releases busy; there is no DELETE-failure refresh branch. Direct pivot Remove supper plan closes pivot then calls `weekStore.removeRecipe(index,date)` without awaiting. Store marks indexed status0/nonCooking null/recipe undefined/_isPending false/_userCleared true, retains others, updates optimistic timestamp and removes recipe-related local grocery contribution if any; recipe-free means no recipe contribution. Fires DELETE; rejection restores captured whole schedule/items only, no toast, no read, no Today call, no timestamp rollback. Repeated/reopened pivot actions are not serialized.

**Server order:** `ScheduleController.RemoveRecipe` parses date → `ScheduleService.RemoveRecipeAsync` first-by-date lookup with no expected plan/version/status predicate. If found, derive containing Monday/server-relative offset → Remove/SaveChanges → await GroceryRecomputeService.RecomputeForWeekAsync(monday,None) → GetScheduleAsync(offset) → PublishWeekUpdated(schedule,exclude) → PublishFillTheGapInvalidated(offset,exclude) → controller 204. If absent, bypass side effects and still 204; this is an absent-entry branch, not a general idempotency guarantee. Grocery recompute reads source and then finds/creates WeeklyPlan(Draft if absent), updates persisted adjuncts, retains existing week status, saves, conditionally publishes grocery_updated if check-state transitions changed, without origin exclusion. Aggregation/check transition policy remains grocery owner, not extracted here.

**Failure/publication:** Delete persistence precedes all follow-up; later throw leaves earlier writes possible and prevents later steps/204. Save analogously commits before slot publication. No enclosing clear transaction/compensation/rollback/readback acknowledgment. `SseEventPublisher` serializes named slot/week/fill payloads via SseConnectionManager; serialization and semaphore wait can throw, while per-response write/flush failures are caught/registration removed, so a disconnected recipient alone need not fail mutation. Successful publisher await is not receipt/application/durable delivery. Client GET rejection or failed server follow-up can show error/restored local content after persistent change (U119). Clear can delete a recipe acquired in the meantime; withhold compare-and-clear/general recipe-removal guarantees (U120).

**Assertions:** Sheet test asserts clear callback once/no save/no Cancel, not a real DELETE. Browser lifecycle uses mutable mock DELETE resetting status/recipe/metadata, then asserts Plan supper. ScheduleIntegrationTests RemoveRecipe_RecomputesPersistedGroceryItems_AndPreservesGroceryState uses a recipe-backed entry, so it only supports shared follow-up inspection and does not directly qualify recipe-free clearing. RemoveRecipe_PublishesWeekUpdatedAndFillTheGapEvents checks mocked call counts, not temporal ordering or receipt. No focused recipe-free partial-failure, missing-delete, changed-target clear or DB transaction assertion found in selected tests. Evidence: implementation-supported, medium; R15–R17, U119/U120/U122; not executed.

### BSL-meal-planning-020 — Assertion environments, complete mapping and preservation boundary

**API/integration:** ScheduleIntegrationTests uses default TestWebApplicationFactory.CreateAsync (auth-disabled/InMemory). NonCookingValidation_RoundTripsAndRejectsRecipeConflict asserts 200/data.mealMarkedCooked false, subsequent label, then sequential assignment and 409/unwrapped status/message/retained recipe. OptionalNoteRoundTripsAndClears asserts trimmed/null notes; InvalidLabelReturns400WithoutCreatingEntry asserts 400/unwrapped status/no events. These inspect HTTP serialization through substituted auth/provider, not real authorization or relational constraints.

**Relational test inspection only:** NonCookingPostgresTests is gated by WFS_TEST_POSTGRES_CONNECTION, creates/drops disposable DB, applies install/compatibility SQL directly, simulates previous constraint, checks marker/OID preservation, trimmed/cleared preset notes, invalid rows 23514, mystery/legacy projection and a two-context serializable concurrent-create barrier (one success, one failure, one row). Publisher is mocked; clock fixed; it calls service directly and bypasses API/auth, deployment and EF schema creation. It tests two non-cooking creations, not assignment-vs-save or clear races. No execution here; the conditional skip is not a current executed skip result. It cannot settle EF/SQL parity or general relational safety by inspection.

**Browser tests inspected:** `planner-non-cooking-days.spec.ts` asserts request path/kind, save labels/reload, notes edit/null, clear→Plan supper, generic failure/retained message, Home summary/reload/pivot edit/cancel, icons/date/readability/phone viewport. Some cases then invoke voting/lock or drag; those are compatibility context, not extraction of their policies. `fixtures.ts` pins 2026-05-04 noon UTC, injects access/member/locale and blocks unhandled API routes. `mockNonCookingSchedule` mutates a local ScheduleDays array, ignores GET offset, copies validation body without backend trim/length/status check, returns mock message Day validated (real Cooking status updated), rejects any recipe even without explicit plan, clears in memory and emits only finite connected fixture output; no true mutation SSE/transactions/DB. API request captures/browser screenshots are assertion definitions, not executed evidence. Near-midnight Home tests use specific offset mocks and finite stream; not a Planner handoff guarantee. No services, application/unit/API/browser/network/database/model qualification run.

**Mapping:** R numbers below are local row order, not global requirement IDs. Every scenario header is exact; evidence class is implementation-supported throughout, and every cited assertion is inspected, not executed. All blocks are ADDED to the existing capability; no overlap requires modifying promoted requirements.

| Requirement (delta order) | All scenario headers | Evidence / assertion boundary |
| --- | --- | --- |
| 1. Offer recipe-free Other plans from a dated planner pivot | Ordinary empty date; Edit recipe-free skipped date; Past offset or legacy recipe-backed skip | BSL-meal-planning-014: mocked page eligibility/pivot; pending reachability withheld; not executed |
| 2. Initialize a date-specific supper-plan draft | New plan; Existing plan | BSL-meal-planning-014/015: sheet default/existing assertions; target remount source; not executed |
| 3. Retain the message while switching non-cooking choices | Return to a typed message; Save the mystery choice | BSL-meal-planning-015: shared-draft/mystery-null mocked callback assertions; not executed |
| 4. Validate and normalize non-cooking message submission | Blank custom message; Optional note and length limit; Message exceeds the limit | BSL-meal-planning-015: optional/custom validation assertions; clear bypass source; not executed |
| 5. Dismiss an unsubmitted supper-plan draft | Cancel editing; Keyboard dismissal | BSL-meal-planning-015: Close/focus assertions; Escape/Tab source only; not executed |
| 6. Guard the sheet's pending submission | Save remains pending; Clear remains pending | BSL-meal-planning-015: deferred-save Save/Close assertions; latch/pending-clear source only; not executed |
| 7. Submit non-cooking plans by explicit date through protected operations | Save a chosen date; Missing household access | BSL-meal-planning-016: wrapper/generated/OpenAPI/auth source; no live auth; not executed |
| 8. Reject invalid explicit non-cooking plans at the server | Invalid plan content; Blank optional server note | BSL-meal-planning-016/017: InMemory invalid-content assertions; not relational; not executed |
| 9. Reject a non-cooking save against an occupied stored date | Recipe acquired after sheet entry; Other recipe-free status already stored | BSL-meal-planning-016/017: sequential conflict/asserted recipe preservation; no concurrent assignment; not executed |
| 10. Persist recipe-free skipped plans without changing week status | Create without a weekly plan; Edit in an existing week | BSL-meal-planning-017: create/edit source; immediate week effects not directly asserted; not executed |
| 11. Publish a saved recipe-free slot before returning success | Slot follow-up completes; Publication throws after commit | BSL-meal-planning-017/019: ordered awaits source; no failure injection/delivery assertion; not executed |
| 12. Return non-cooking save completion without cooked confirmation | Save completes; Caller consumes completion | BSL-meal-planning-016/020: API false data assertion; message/caller source; not executed |
| 13. Reread the captured week after non-cooking save | Same target completes; Loaded offset changed | BSL-meal-planning-018: mocked late different-offset assertion; same-target closure source; not executed |
| 14. Retain editable non-cooking failure feedback | Conflict returns; Save or later read rejects | BSL-meal-planning-015/018: mocked conflict/generic failure retained-draft assertions; not executed |
| 15. Clear an existing recipe-free plan from its sheet | Sheet clear resolves; Sheet clear rejects | BSL-meal-planning-015/019: mocked clear callback and mutable browser clear; no real DELETE qualification; not executed |
| 16. Delete the recipe-free entry before clear follow-up work | Entry exists; Entry is already absent; Later clear work fails; Clear creates a missing weekly plan; Clear retains existing week status | BSL-meal-planning-019: source and shared recipe-backed assertions only; no recipe-free ordering/fault test; not executed |
| 17. Offer direct pivot clearing for a recipe-free plan | Clear through the pivot; Pivot deletion rejects | BSL-meal-planning-019: local/store source; no recipe-free concurrency assertion; not executed |
| 18. Display the saved non-cooking choice and note | Preset with a note; Mystery or custom saved plan | BSL-meal-planning-014/018: mocked icon/note and mutable-browser assertions; not executed |
| 19. Hand eligible Home plans back to Planner editing | Home summary activation; Matching dated plan is loaded; Handoff has no matching date | BSL-meal-planning-018/020: mocked pivot-once and browser summary/handoff; no date-boundary guarantee; not executed |

### Non-cooking source identities — SHA-256

All 83 prior rows (58 unique paths) rechecked unchanged before drafting. These additional/current rows identify inspected source, contracts, tests and substitutions, not runtime success. All eight main specs and unrelated files are separately compared against private before-images; concurrent external changes are recorded below rather than restored.

| Source | SHA-256 |
| --- | --- |
| `api/database/compatibility.sql` | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/NonCookingPostgresTests.cs` | `b6e671d30bdbef9fd8f642e0a50f8837718814fd1ee3c463eeb70e5b5cc395c9` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs` | `ea4aff024db3114fb6dc7db73dfa66d898d511c5ac36f5ea50348bb981b2bfd8` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/NonCookingPlanDto.cs` | `6b16aed29ce6fb2dd54f30d4bb6241c7dd63d090ad210cada1e3b13b3188e023` |
| `api/src/RecipeApi/Dto/ValidationDto.cs` | `d0d3db18ae9caf54ad47c0bb219c78695bbe446bce7c788d281f30c2a9a41b20` |
| `api/src/RecipeApi/Infrastructure/SseConnectionManager.cs` | `6e757f5e3a63a96ab98287e2cfa761d0010969e1db1664f87db28e6f0c8460d9` |
| `api/src/RecipeApi/Infrastructure/SseEventPublisher.cs` | `8378000101a36943903b8c7f7dcb560c3202464258410ac127d6d34b512c1696` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Middleware/ErrorHandlingMiddleware.cs` | `b5849eb709ca2bc85efa3051d3a953ca955ef8704848327ad88d0297299d949b` |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | `cac6be71f2d3fa947a903390d9d6a69da7df9ebbf7aed38a76a80c45ef856806` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/GroceryRecomputeService.cs` | `ae35bbb1ed3d88d8a3c895b3d372dc33cce58b7270b69980138be10598d882dd` |
| `api/src/RecipeApi/Services/NonCookingPlanConflictException.cs` | `7414fb73bc5e3012c8c5945f0be7b095f418f1f36bded6c395ec62b778480c41` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `pwa/e2e/fixtures.ts` | `402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/planner-non-cooking-days.spec.ts` | `c902f33c1822d3e9d371709a1bd18d82871037b6b295abcccd3ea8ed28f76c8c` |
| `pwa/src/app/(app)/home/page.tsx` | `b52e0c595ad5fd9c13daeab2c7c4ce65fc909cef7717b7b8bc9c0bc9bffaec68` |
| `pwa/src/app/(app)/planner/page.test.tsx` | `d787f5c4061bd45efd6311a76b53b61634059f90608be9a1b122b3f352acf1ba` |
| `pwa/src/app/(app)/planner/page.tsx` | `f113f605a33f78cdde5ed6b6ab37c2742d952c7be4319063ff91eeb81dae7f6d` |
| `pwa/src/components/TodayStoreInitializer.tsx` | `74727da4cc874fc6f2b00993f97480e50bbed992421336f6de877ecdcb46e6b1` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/planner/NonCookingDaySheet.test.tsx` | `3a2710a27eb596eb590940ce216233e327310382b5aaaf058bc1a95f0b52940b` |
| `pwa/src/components/planner/NonCookingDaySheet.tsx` | `4c8e520d073b1c0d7f3bfeb14d4f5f09082571f6e095d8ec8bff73030063a84d` |
| `pwa/src/components/planner/NonCookingIcon.tsx` | `4e4d0f2c411adb55fdfa0d1ff29557592a7c5cef0a02a279106b6908fd0c46c3` |
| `pwa/src/components/planner/PlanningPivotSheet.test.tsx` | `15e0f0f0ea127df82088482554462557c5c4dbf10307c62da982dc729ade1bf3` |
| `pwa/src/components/planner/PlanningPivotSheet.tsx` | `28fc6fc674d3aeb4354c955c8025f0a8e615d429a7c4ebb992a024412703abcc` |
| `pwa/src/hooks/useScheduleStream.ts` | `0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/schedule/day/item/remove/index.ts` | `d3374c6a5e78b821a7cc97f1657a8391316777b10c26320fbb3702132df878be` |
| `pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts` | `00af096baa1fe530bed2f5a50a412bb2315d600081944dd7b6760e959acb311e` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/src/lib/planner/nonCooking.test.ts` | `fdf00b2cdebdcef49c2e49b0e1454bda1baeb56d1c492482f2deb47eb7b562ba` |
| `pwa/src/lib/planner/nonCooking.ts` | `664f2eacb8a1ce9e114a4a97b3de660b78f04ad7f01297a019377df8720ee1ed` |
| `pwa/src/locales/en/common.json` | `3519f2d7e0140a11786597976b6868fa195312e0bc3feb3e4d3c3e144a41d0bc` |
| `pwa/src/locales/fr/common.json` | `b5d957a8f395091038e1c3ab64fed1b300cd7f015e0e11172ed1cba611d4e198` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

### Concurrent-work and first validation observation

During discovery, unrelated recipe-library work changed its main spec (now 61 requirements/137 scenarios by header count), capability plan, shared index recipe-library row and summary-reading tasks and scaffolded `baseline-recipe-library-claim-corrections`. The initial staged binary diff remains exactly preserved. This session writes none of those recipe-library paths and preserves the concurrent recipe-library row while editing only its own checkpoint/meal-planning row in the shared index; it does not restore their before-images. The first all-items strict validation returned **32 passed / 1 failed (33 items)**: this non-cooking draft passed; the concurrently scaffolded claim-corrections change had no delta yet. This is a separate failed all-items observation, not a failure of the selected delta and not permission to repair another change. Current inventory then became eight main capabilities and 25 active changes. The first explicit seven-path `task verify` also returned nonzero: documentation passed, content identity passed, spec:check failed on the same unrelated missing delta (32/1), all application/harness/runtime checks were not-applicable to this documentation edit. No historical staged-EOF whitespace blocker recurred. A subsequent attempt stopped after documentation because repository content changed during verification (content failed; spec:check not-run). Once the concurrent artifacts existed, all 33 items passed strict validation and a complete seven-path task verify passed documentation/spec:check/content with identity `ea2b9719c3fc79b5be79e9cd4313148123631260f55e80e8da9f4714dd3bcef1`. Task 2.2 acceptance is now satisfied; this record update requires final post-record verification. Actual final outcomes/content identity belong to the handoff; do not reuse an earlier digest for later bytes.

### NC-A01 next-session checkpoint

Discovery reconciled; proposal, design, 19/44 ADDED delta and extraction tasks form a validated draft for human review. Main meal-planning remains promoted 30/70 with Purpose/all prior blocks unchanged; eight main capabilities; 24 changes after scaffold, 25 after concurrent external claim-corrections scaffold. Human review pending; no new acceptance/promotion/archival. U116–U122 withhold disputed guarantees and retain U95–U115/all prior qualifications. Selected strict validation, full seven-path documentation review, preservation/mapping/source checks and documentation/content verification passed on the inspected draft. Earlier all-item strict/spec:check missing-delta failures and the intermediate content-mutation failure remain historical observations; the later complete check passed all 33 items and documentation/content. No unrelated repair was performed. Final post-record outcomes/content identity belong to the final response and `.task/agent-finish/last-run.json`, not an earlier digest.

Runtime/unit/API/browser/network/database/model checks: not-run by authorization. Behavior TDD, new tests, application lint/type/build, client regeneration/contract parity, migrations and deployment: not-applicable to this documentation edit. No preparation required. Failed earlier: all-item strict/spec:check and one content-mutation check as recorded; later complete checks passed. Blocked: none at the completed check. Final outcomes must be reported separately; the earlier staged-EOF blocker was not present at entry.

Exact next bounded action after the final checks: human review of this non-cooking draft, including its mapping and non-normative limitations. Do not promote, archive, implement, qualify runtime behavior or begin another slice. Any later decision changing disputed normative treatment needs separately selected scope and consequential questions one at a time. Recheck identities/current inventory before reuse.

### BSL-meal-planning-021 — Recipe-free non-cooking main-spec promotion

**Authorization NC-A02 (2026-10-16):** User “promote” accepts the validated NC-A01 draft and authorizes syncing only its reviewed recipe-free non-cooking delta into the existing main meal-planning specification, with capability/index/task lifecycle follow-up. No archive, application implementation, runtime qualification or successor extraction. NC-A02 is a local session label, continuing NC-A01 without assigning a cross-capability A number.

**Result and mapping:** Main meal-planning now contains **49 requirements / 114 scenarios**. Its original Purpose, all prior 30/70 requirement/scenario blocks and earlier evidence paragraphs remain byte-identical. All reviewed 19/44 non-cooking blocks are appended verbatim under the existing Requirements heading; no delta operation header is copied. Two non-normative evidence paragraphs connect this promotion to BSL-meal-planning-014–021 and retain U116–U122, U95–U115 and all earlier qualifications. Every exact requirement/scenario mapping in BSL-020 now maps to the promoted block without renaming or normative revision. Historical pending-review text above is superseded by this acceptance/promotion record.

**Current inventory and preservation:** CLI resolves nearest root `/Users/alex/Code/whats-for-supper`, configured spec-driven schema. Eight main capabilities and **26 active changes** at promotion entry; concurrent recipe-library stack-browsing was added since the prior 25-change checkpoint. Promotion creates/deletes/archives no capability or change. All 130 source identity rows rechecked unchanged. Private before-images capture all existing tracked/untracked file hashes, the full staged binary diff and four overlapping documentation files. Initial status includes prior non-cooking draft/index/capability edits, staged plus unstaged recipe-library notes, modified recipe-library main and three untracked recipe-library changes (summary-reading, claim-corrections, stack-browsing). This promotion preserves those inputs; the small index changes only its checkpoint and meal-planning row. Proposal/design/delta/metadata remain unchanged. No retired navigation spec is restored.

**Verification boundary:** Require exact prior Purpose/requirement/evidence equality, exact delta append and complete 19/44 mapping; recheck source hashes, other main specs, unrelated files and staged bytes. Review the complete four-path promotion diff, run strict selected change/main/all-spec/all-item validation, then explicit-path task verify below. Actual post-record outcomes and final content identity belong to the final response and `.task/agent-finish/last-run.json`; this text does not certify its own later bytes. Documentation requires no preparation. Unit/API/browser/network/database/model/runtime qualification is not-run by scope/A34. Behavior TDD, new tests, application checks, API/client/mock synchronization, migrations and deployment are not-applicable to this documentation edit. Report failed/blocked outcomes separately if encountered.

```sh
task verify -- openspec/specs/meal-planning/spec.md docs/openspec-baseline/meal-planning.md docs/openspec-baseline-plan.md openspec/changes/baseline-meal-planning-non-cooking-day-plans/tasks.md
```

**NC-A02 next-session checkpoint:** Non-cooking baseline accepted/promoted as documentation; main meal-planning 49/114, eight main capabilities and 26 active changes at entry. The source change remains active; no new implementation or runtime evidence. Await a separately selected bounded slice or lifecycle action. Do not archive, implement, qualify runtime behavior or start a successor from this checkpoint alone. Recheck source identities, inventory and concurrent work before reuse.

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

## MP-G01 — Remaining ordinary-household generation (2026-10-16)

**Authorization:** Current attached request authorizes sequential discovery,
reconciliation and documentation drafting of all remaining ordinary-household
meal-planning behavior, including successors, through validated drafts or explicit
evidenced exclusions/unresolved dispositions. This supersedes prior successor
restrictions solely for this generation. Main specs, application/tests/contracts/
clients/SQL/configuration/dependencies remain unchanged. No services, runtime
qualification, promotion, archive, commit or deployment.

**Entry preservation:** Private `/tmp/meal-planning-before` records porcelain
status including staged/unstaged/untracked/deleted work, full index/worktree binary
diffs, selected before-images and 1,639 file hashes. Existing selected-file edits
are retained. Root resolves nearest `/Users/alex/Code/whats-for-supper`; configured
schema is spec-driven, no selected store. Actual CLI inventory is 42 active changes
and eight main capabilities (recount at final review). Three meal-planning changes
already cover the promoted 49/114; their completed extraction tasks do not imply
runtime verification or archival. No remaining meal-planning draft to resume was
found. Source identities and exact counts are rechecked below.

### Coverage matrix before successor generation

| Entry / operation | Accepted or existing change coverage | Remaining disposition / source entry |
| --- | --- | --- |
| GET schedule; URL/navigation; initialization; displayed statuses | Accepted week-reading-navigation, 15/40 | Covered; retain U102–U109 |
| Empty-date assignment; Quick Find; targeted Search/detail | Accepted empty-day-recipe-assignment, 15/30 | Covered; occupied branch only remains |
| Recipe-free save/edit/clear; Home edit handoff | Accepted non-cooking-day-plans, 19/44 | Covered; retain U116–U122 |
| Occupied assignment; Quick Replace/Skip recovery; targeted Search/stack recovery | Empty-day slice explicitly excludes occupied behavior | Missing: planner/recipes/browse-all-stack pages → slotAssignment → assign/move/defer/remove |
| Same-week drag/swap; push; Plan later cross-week; legacy source fallback | No accepted mutation coverage | Missing: planner drag/Plan later → weekStore/planner wrapper → MoveScheduleEventAsync |
| Explicit-date defer; recipe-backed removal | Recipe-free DELETE lifecycle accepted, recipe-backed effects excluded | Partial: DeferRecipeAsync, RemoveRecipeAsync and client recovery |
| Open/reopen voting; close promotion; direct lock; day validation | Read status/suggestion composition accepted only | Missing: planner/weekStore → open/lock/validate service; vote meaning owned by discovery |
| Overdue completion and planning completion consequences | No accepted mutation coverage | Missing: FinalizeOverdueMealsAsync → workflow processor/materializer; cooking history owned elsewhere |
| fill-the-gap and smart-defaults GET | Accepted consumer composition only | Discovery eligibility/ranking owned elsewhere; enumerate planning DTO/non-persistence boundary |
| Grocery PATCH item/map and recomputation internals | No planning-owned policy | Grocery owner; enumerate routing, specify only planning mutation calls |
| Live receipt/reconnect/snapshot merges | Accepted household-live-updates connection/reconciliation requirements | Owned elsewhere; planning drafts describe publication calls only, retain U95–U101 |
| Tonight recovery/cook mode/history; recipe readiness/deletion | Other owners; shared assignment calls are dependencies | Exclude owner policy; record missing accepted owner coverage where relevant |
| Demo/preview/operator variants | A09 ordinary-household boundary | Excluded; no assumption of runtime parity |

### Slice 1 — occupied replacement evidence

**BSL-meal-planning-022 (implementation-supported, high for local handler order;
medium end-to-end):** `pwa/src/components/planner/QuickFindModal.tsx`
(fetchSuggestions/handleNext/onSelect) reads fill-the-gap through `lib/api/planner.ts`,
uses a recipe-count + 1 terminal card and advances/reset-flips without mutation.
`QuickFindModal.test.tsx` uses mocked getFillTheGap and checks 0/1/2/4/5 results,
terminal card and selection boundaries; assertions are inspected, not run.
`PlanningPivotSheet.tsx` exposes Quick replace/Search/remove/Plan later for occupied
slots; `planner/page.tsx` suppresses change for pending suggestions. It captures
loaded date/selected offset, closes Quick Find and opens SkipRecoveryDialog step 2.
That dialog has actual buttons, translated labels, named Close/backdrop and Back;
no focus trap, Escape handler or modal role is implemented there. `handleRecoveryAction`
uses submission and resolved refs, awaits resolveOccupiedSlot, then store assignment,
optional Today assignment, closes state and initializes. Failure initializes and
shows distinct English toasts; init itself can resolve after silent read failure.
Date/offset captures are not an atomic slot read or navigation lock. Dismissal does
not cancel an in-flight handler. `page.test.tsx` replaces stores/router/API/pivot/
QuickFind/dialog and asserts no assignment on move failure, recovery retained,
refresh counts, one move across assignment retry, one submission while pending and
refresh only after awaited assignment. These meaningful assertions do not exercise
real dialog, store, network, database, Today or timezone boundaries. `SkipRecoveryDialog.test.tsx`
asserts action callbacks/Back with animation substitutes; no full focus guarantee.

**BSL-meal-planning-023 (implementation-supported, medium):**
`lib/planner/slotAssignment.ts resolveOccupiedSlot` → generated schedule move/defer/
day remove POST/DELETE builders → `specs/openapi.yaml` MoveScheduleDto,
DeferScheduleDto, AssignScheduleDto and date DELETE → protected `ScheduleController`
→ `ScheduleService`. Planner next_week explicitly selects server defer; Search
`assignWithRecoveryGuard` and Browse `handleCookTonight` read a target schedule and
enter recovery on normalized recipe. Their next_week path omits the defer switch,
uses captured offset + 1 movement, then posts assignment and navigates. Search
catches/logs and releases assigning; Browse callback propagates rejection. Neither
handler has Planner's resolved-operation ref/submission ref/refresh toast. Test
`slotAssignment.test.ts` substitutes DateOnly.parse as identity and all API wrappers;
it asserts exact defer sourceDate/recipeId and no move call, not wire date parsing.
Search/Browse source-only branches are not promoted into safe retry or complete
failure UX. Date DELETE and move no-op completion can still let replacement start.

**BSL-meal-planning-024 (implementation-supported, medium):**
`ScheduleService.AssignRecipeAsync` ensures source plan (separate save when absent),
selects first entry by date with Recipe, overwrites ID/status/nonCooking; Sunday
prior recipe is carried to next Monday, creating plan/entry or overwriting an
existing entry. Existing source/destination VoteCount is not reset on overwrite;
new destination has default null. Save precedes source recompute/read/week publish/
fill-gap invalidation, then destination recompute/read/week publish, then controller
200 data message/displacedRecipe. Selected callers ignore displacement response.
`ScheduleIntegrationTests.AssignRecipe_UpdatesExistingCalendarEvent_WhenOneExists`
asserts one stored Monday row with new ID; ReopensSkipped test seeds Guid.Empty
rather than a genuine null and asserts Planned/new ID. No Sunday occupied-Monday
safety assertion was found in the inspected schedule suites. Default factory uses
InMemory (transaction warnings ignored), disabled auth, in-memory assets and mocked
workflow orchestration; service publication tests use Mock<IScheduleEventPublisher>.
Relational uniqueness/FK, publication transport and concurrent replacement remain
unqualified. Relevant generated builders serialize DTO fields, accept nullable/
optional TS fields, use shared request auth, and do not add expected-recipe/version
preconditions; production access follows accepted household-identity requirement.

| Local uncertainty | Non-normative disposition |
| --- | --- |
| MP-U01 | Prior resolution and replacement are separate calls; failed response/read may follow saved work. Planner remembers returned resolution only, has no server idempotency/compensation, and may continue after dismissal/navigation. No atomic replacement, safe retry, latest-request-wins, exact rollback or immediate Today guarantee. Preserve U95–U122. |
| MP-U02 | Sunday assignment overwrites an occupied next Monday without preserving that Monday's recipe; inherited vote fields can describe displaced content. Draft only supported carry-forward with absent destination and completion envelope. Collision safety/desirability and vote freshness remain unresolved, not a lossless policy guarantee. No fix proposed. |
| MP-U03 | Search/Browse recovery lacks Planner-style operation memory and single-flight guard. Their repeated actions can repeat resolution after partial success. Keep next-week semantics caller-specific; no common retry/feedback guarantee. Recovery and Quick Find include English literals; no complete locale or keyboard-modal compliance claim. |

**Slice checkpoint:** Draft generated through CLI dependency order; selected strict
validation pending immediately below. Discovery reconciled with MP-U01–MP-U03;
human review/promotion pending, runtime not-run. Next authorized slice is movement.

#### Exact requirement/scenario mapping — baseline-meal-planning-occupied-recipe-replacement

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Advance Quick Find suggestions without changing the plan | Skip a suggestion; Restart or exhaust the deck | BSL-022 |
| Enter recovery before replacing an occupied Planner day | Occupied Quick Find target; Dismiss the recovery choice | BSL-022 |
| Resolve the previous Planner meal before replacement | Move to tomorrow; Sunday or next-week choice; Drop prior assignment | BSL-022/023 |
| Retain completed Planner recovery work across replacement failure | Repeated activation while pending; Prior-meal operation fails; Replacement fails after prior resolution | BSL-022 |
| Complete Planner recovery after awaited assignment | Replacement is still pending; Replacement resolves | BSL-022 |
| Preserve caller-specific Search and Browse recovery routes | Search or Browse uses Save for Next Week; Recovery completes | BSL-023 |
| Replace a stored assignment at the resolved date | Replace an ordinary recipe; Replace skipped content | BSL-024 |
| Report Sunday carry-forward after replacement follow-ups | Following Monday is absent; Additional follow-up fails | BSL-024 |

Artifact draft: **8 requirements / 18 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-occupied-recipe-replacement`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

### Slice 2 — movement evidence

**BSL-meal-planning-025 (implementation-supported, high local / medium integration):**
`planner/page.tsx` Reorder.Item onDragStart captures schedule/UI identity and marks
drag active; handleReorder derives from/to against the captured base; onDragEnd
reads final store order and invokes commitMove once for a changed valid position.
`weekStore.reorderLocally` exchanges only two content objects, reattaches original
date/day labels, preserves unaffected identity and calls no API. commitMove posts
through `lib/api/planner.ts moveRecipe`, which increments planner localMoveSeq;
`api-client.ts` supplies headers. Its rejection restores entire pre-drag schedule
and clears optimistic timestamp, without repairing sequence confirmation or server.
Deprecated store moveRecipe calls local reorder and wrapper immediately; no active
production caller was found by targeted search, so it is retained as compatibility
evidence, not a second UI feature. `weekStore.dragDebounce.test.ts` invokes helper
simulations of page handlers with mocked API; asserts one call (0,recipe-1,4,1)
after multiple updates, exact final UI identities, unchanged-drop zero calls,
rollback and custom-message/status movement. One no-onReorder case simply asserts
zero calls without exercising drop. This is not real pointer/HTTP qualification.
`PlannerDragHandle.tsx` ordinary disabled-preview branch starts on primary pointer
down; div label/title is Drag to reorder, touch-action none. Preview hold branch
is inspected but excluded under A09; its fake-timer tests/browser mock do not
qualify ordinary keyboard access or all devices. No keyboard move handler exists.

**BSL-meal-planning-026 (implementation-supported, high simple swap / medium other branches):**
Generated `api/schedule/move/index.ts` serializes MoveScheduleDto through shared
adapter → OpenAPI POST move → ScheduleController.MoveRecipe reads optional
X-SSE-Connection-ID and parseable integer X-Move-Seq → MoveScheduleEventAsync.
Date uses server clock UTC Monday; source is explicit fromIndex date first, then
global first recipe match only if absent. A mismatched explicit recipe is a
no-op. SwapInternalAsync exchanges recipe/count/status/nonCooking fields, not row
identity/date/meal slot/candidate IDs; empty destination moves row date. Push finds
empty index <14 and mutates intervening Date fields in descending order before
one save. Skipped-source push creates Planned destination and clears source
RecipeId/VoteCount; swap fallback instead swaps full content. EnsureWeekPlan is
only explicitly called for push when toIndex >=7, not every shifted cross-week
entry. Source save precedes schedule/publication; no recompute/invalidation here.
ScheduleServiceTests actual assertions inspect exchanged recipe IDs, shifted dates,
recipe-free skipped source + Planned destination, exact duplicate source selection,
and one mock publication with echo 9. They use default InMemory/fake publication;
no relational multi-row swap/push race or uniqueness enforcement established.

**BSL-meal-planning-027 (implementation-supported, medium):** Different target
week selects MoveCrossWeekAsync: source fallback same as above; target scans first
empty date through Sunday starting toIndex (any entry occupies); intent does not
select swap in this branch. Full target returns no mutation; wrapper still reads/
publishes source and controller returns Recipe moved. Found target ensures Draft
plan only if absent, moves ordinary row without resetting status or creates Planned
row from skipped source, saves, recomputes source then target, and wrapper publishes
source only. Plan later from Planner always uses captured offset +1/index0/push,
then init current selected offset; optional local-today Today sync is independent.
Catch logs only. `ScheduleIntegrationTests.CrossWeekMove_RecomputesBothPersistedGroceryLists_AndPreservesGroceryState`
uses actual service/recompute with InMemory and asserts persisted source empty,
target contains recipe contribution and check-map strings unchanged; SameWeekMove
asserts precomputed items retained. `Move_To_Next_Week_Creates_New_WeeklyPlan_In_Draft_Status`
manually inserts both plans and never invokes move; its title is not service proof.
No inspected full-target/no-op or cross-week failure-injection assertion exists.

| Local uncertainty | Non-normative disposition |
| --- | --- |
| MP-U04 | First-by-date across meal slots, global recipe fallback, no request range/row-version precondition and multi-row Date changes do not establish relational collision safety, exact source selection for missing explicit dates, concurrency order or unbounded index acceptance. Normative ordinary cases are conditioned on successful persistence. |
| MP-U05 | Move 200 includes full-target and missing/mismatch no-ops; cross-week publishes source only; same-offset pushes may spill into another week without both recomputations/plan creation. No confirmed relocation, complete two-week groceries/live reconciliation, idempotency, atomic follow-ups or safe rollback claim. Echo counters are transport correlation, not persisted revisions. |

**Matrix update:** swap/push/cross-week/legacy API movement now drafted; previous
replacement slice validated 8/18. Defer/removal, week/day transitions and overdue
completion remain next. Human acceptance/promotion and runtime evidence stay separate.

#### Exact requirement/scenario mapping — baseline-meal-planning-recipe-movement

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Preview a drag as a swap of dated Planner content | Drag crosses multiple days; Return to the source; Movement rejects | BSL-025 |
| Submit dated-source movement through the protected operation | Explicit drag source; Protected movement lacks credentials | BSL-026 |
| Prefer an explicit movement source with legacy fallback | Repeated recipe has an explicit source; Legacy source lookup; Selected source differs | BSL-026/027 |
| Swap stored content within a week | Destination is occupied; Destination is empty | BSL-026 |
| Push toward a later available date within the search window | Later date is empty; Search window is full | BSL-026 |
| Place cross-week movement in the first available target-week date | Target Monday is occupied; Target week has no free date | BSL-027 |
| Preserve a skipped source when moving its recipe forward | Push a skipped source; Move a skipped source cross-week | BSL-026/027 |
| Distinguish movement follow-ups from movement confirmation | Same-week movement completes; Cross-week movement completes; Full target returns completion | BSL-026/027 |
| Request Plan later from the selected Planner week | Plan later for next selected week; Movement request resolves or rejects | BSL-027 |

Artifact draft: **9 requirements / 21 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-recipe-movement`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

### Slice 3 — defer/removal/first-open evidence

**BSL-meal-planning-028 (implementation-supported, high supported source/state
cases; medium transactional/concurrent seams):** `slotAssignment.resolveOccupiedSlot`
Planner next_week → generated defer DateOnly POST → OpenAPI defer DTO/result and
404/409 → ScheduleController.DeferRecipe exception mapping → ScheduleService.DeferRecipeAsync.
HomeCommandCenter next_week is a direct API consumer; its Tonight recovery policy
remains excluded. Source query is SingleOrDefault date+recipe with related recipe,
404 if absent, conflict only for AwaitingConsensus. Server clock UTC Monday +7
begins unbounded AnyAsync occupancy scan (DateOnly exhaustion/cancellation can fail).
Destination week ensured Draft only if absent. Non-Skipped moves/reset Planned;
Skipped clears source RecipeId but retains source VoteCount and metadata, creates
new Planned row copying count. wasCooked invokes SaveChangesAndRecalculateLastCookedDatesAsync:
transaction/save → max remaining Cooked event date per recipe → midnight UTC or
null → save/commit. Then distinct affected Mondays recompute sequentially and each
schedule is published with exclusion/echo; response date/offset/message follows.
Message prefixes Next week is full when destination offset >1 and formats weekday/
month using process culture; no locale guarantee. `ScheduleServiceTests` bodies
assert Locked→Planned and count4, exactly two mock week publications; Skipped source
null recipe/count3 and separate Planned destination/count3; only Cooked source
moved leaves LastCookedDate null. Default factory InMemory ignores transactions;
no actual HTTP error/date parsing/full-spill/concurrent reservation assertions
inspected. slotAssignment test mocks DateOnly.parse and generated API. All not-run.

**BSL-meal-planning-029 (implementation-supported, high local / medium integration):**
`PlanningPivotSheet` recipe-backed Remove recipe → Planner.handleRemoveRecipe closes
pivot and calls weekStore.removeRecipe → immediate indexed state0/no recipe/
nonCooking/pending, userCleared=true and optimistic timestamp. Local helper filters
recipe IDs from grocery rows and drops sole-contributor rows without recomputing
quantities. API wrapper parses DateOnly → generated DELETE → controller DateOnly.Parse
→ first-by-date entry delete/save → grocery recompute → schedule GET → week publish
→ fill-gap invalidation → 204. No entry returns without follow-ups. No recipe record
deletion/last-cooked recalculation/status/week gate is present. Rejection catch
restores captured entire schedule/items, no toast/no success GET. Accepted recipe-free
clear service requirements are reused. Actual dragDebounce tests assert local
recipe removed, one DELETE call, no move and shared grocery row retains other ID;
removeRecipe.test uses recipe-free ordered-in data for state restoration, not all
recipe states. Integration RemoveRecipe_RecomputesPersistedGroceryItems_AndPreservesGroceryState
asserts persisted list empty/check-map string retained. Uses InMemory, not production
FK/unique constraints. No racing replacement, cooked-history removal or failure
injection was run/established.

**BSL-meal-planning-030 (implementation-supported, medium):** Search/Browse
handlePlanForLater derive tomorrow from browser-local weekday, Sunday rolls offset1;
slotAssignment.findFirstOpenPlannerSlot default scans 520 weeks sequentially,
skips absent days, excludes status3 and normalized recipe, finds indexed target.
Then shared assignment API/post-save effects and planner success navigation apply.
No date reservation; missing getPlannerSlot can permit direct assignment in other
callers. Search catches/logs and releases assigning; Browse callback propagates
rejections. `slotAssignment.test.ts` supplies a two-day fake schedule and asserts
recipe-free skipped index0 is ignored for empty index1; no 520-week/network/timezone
qualification. No owner ranking/eligibility is copied. Search/Browse real runtime
and navigation not-run. Existing assignment assertions use wrapper/API substitutions.

| Local uncertainty | Non-normative disposition |
| --- | --- |
| MP-U06 | Defer destination AnyAsync search precedes save without reservation, explicit source carries no expected status/version, and multiple meal slots can violate SingleOrDefault assumptions. No exact concurrency ordering, cancellation rollback of later side effects, unlimited date availability or safe retry guarantee. Browser placement has separate 520-week bound and UTC/local mismatch. |
| MP-U07 | Removing a Cooked entry does not recalculate LastCookedDate; defer does. Defer ordinary state reset does not explicitly clear all old non-cooking metadata, and skipped source retains count unlike push. Preserve observed differences without a universal metadata/history-consistency rule. Cooking-history accepted owner coverage is absent; no repair or owner extraction. |

**Matrix update:** recipe-backed removal, exact-date deferral and newly confirmed
first-open placement now drafted. Shared DELETE lifecycle is referenced, not copied.
Remaining in-scope generation: week/day transitions, overdue consequences and API
operation/owner inventory. Human review/promotion pending; runtime not-run.

#### Exact requirement/scenario mapping — baseline-meal-planning-deferral-removal

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Defer the exact dated recipe through a protected operation | Source does not match; Source awaits consensus; Household credentials are absent | BSL-028 |
| Find a defer destination from server-current next week | Next Monday is free; Next week is full | BSL-028 |
| Return deferred content to Planned state | Locked source is deferred; Skipped source is deferred; Cooked source is deferred | BSL-028 |
| Complete defer after affected-week follow-ups | Both affected weeks complete; Later work rejects | BSL-028 |
| Remove a recipe-backed Planner assignment optimistically | Removal is pending; Deletion rejects | BSL-029 |
| Apply the shared date-delete lifecycle to recipe-backed entries | Recipe-backed date exists; No calendar entry exists | BSL-029 |
| Find first-open placement after browser-local today | Next date is non-cooking; Today is Sunday; Scan finds no target | BSL-030 |
| Assign first-open placement through the shared assignment operation | First-open assignment resolves; Week read is absent or rejects | BSL-030 |

Artifact draft: **8 requirements / 19 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-deferral-removal`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

### Slice 4 — week/day transition evidence

**BSL-meal-planning-031 (implementation-supported, high ordinary states / medium
async integration):** Planner Ask family → weekStore.openVoting → planner API/
generated voting open builder → OpenAPI optional query default0 → ScheduleController
→ ScheduleService.OpenVotingAsync finds/creates Monday plan, sets VotingOpen,
saves then GET/publishes with exclusion → message. No day mutations/recompute/
fill-gap invalidation. Store optimistically status1, then reads current offset
schedule and defaults concurrently, rebuilds only if schedule usable, restores
captured status/schedule on rejection; wrapper getSmartDefaults catches failures
as null. Close captures pending non-status3 recipe IDs, status2 optimistic,
Promise.all assign → lock → if loaded offset matches clear all pending markers;
catch restores only status. Planner success feedback lasts about three seconds,
errors warn only. `weekStore.test.ts` pending-promotion assertion checks exactly
one expected assignment, one lock, status2 and cleared marker; despite its comment,
it does not assert invocation order with delayed assignments. Offset-one open test
asserts wrapper read arguments. Page tests replace stores/init/dialog/animation and
assert supplied-state controls, not server transitions. Direct lockWeek exists in
store and wrapper, no current UI caller found; it sets status2 and reverts on
rejection but does not promote suggestions. Record as callable compatibility;
protected API-only direct lock is drafted.

**BSL-meal-planning-032 (implementation-supported, medium):**
ScheduleService.LockScheduleAsync creates/finds weekly plan, sets Locked; loads all
week entries with recipes; groups global Like counts; sets day Locked unless
recipe-free Skipped; copies count only for matching groups; removes all RecipeVotes
(not only selected-week recipes), saves, reads/publishes schedule, returns message.
No LastCookedDate change or grocery recompute. `ScheduleServiceTests.Should_Purge_Votes_On_Lock`
asserts empty votes and Locked plan; integration State_Transition_VotingOpen_To_Locked_Purges_Votes
asserts global seeded vote removed/plan Locked, Recipe_LastCookedDate_NOT_Updated_On_Lock
asserts null history. NonCookingScheduleTests supplies separate skip preservation
assertions (accepted earlier slice). InMemory/fake publisher and disabled auth do
not qualify production transactionality, all prior statuses or global vote races.
Discovery main spec is absent; vote meaning/threshold/global clearing policy not
newly owned by planning. Closure's observable purge is recorded, not universal
correctness of that policy.

**BSL-meal-planning-033 (implementation-supported, high matching cases / medium
contract compatibility):** Today.markCooked → generated explicit-date validate
status2+recipeId → OpenAPI recipe-aware fields → protected controller →
ValidateDayAsync recipe available check, LastCookedDate current clock, assignment
ID compare. Nonmatch saves recipe then fill-gap invalidation, returns false and
leaves scheduled entry untouched; match/day-only writes Cooked and saves/slot
publishes, returns true. Status-only3 keeps existing recipe/metadata or creates
null-recipe Skipped when absent; no weekly plan/grocery recompute. Explicit
nonCooking guards remain accepted coverage. `ScheduleServiceTests.Cooking_UnscheduledRecipe_UpdatesItsHistoryWithoutCookingSupper`
uses fixed clock and asserts history value, supper Planned/no row and no mock slot
publication; Cooking_MatchingRecipe asserts Cooked/exact clock/one slot publish;
ValidateDay_UsesInjectedClock asserts current time differs from selected event date.
Should_Purge_Recipe_Votes_On_Consensus asserts recipe votes empty after status1 from
AwaitingConsensus, not contract naming agreement. Integration status-only tests
assert existing recipe remains Skipped and empty-date skip creates a row. Many
integration tests call service directly, despite class name; HTTP substitution
factory still does not establish schema/status enforcement or production auth.
Today UI/confirmation ownership remains excluded; only API assignment consequence
is drafted. Nudge page → lib/auth.getVotingLink → signed invite redirect=/discovery
or empty fallback → displayed URL/copy/share. Actual page test stubs link as
http://example.com/discovery and asserts clipboard URL/copied text/native-share URL,
not signed token/invite behavior. Buttons are native; close has accessible name;
no focus trap/dialog role/Escape handler exists for nudge. Labels mix translations
and English literals. No browser permission/accessibility/runtime checks run.

| Local uncertainty | Non-normative disposition |
| --- | --- |
| MP-U08 | Lock resets even Cooked and recipe-backed Skipped states to Locked and clears global votes; no guard requires VotingOpen and no immutable-week policy exists. New normative lock case is ordinary Planned plus recipe-free Skipped preservation. Desirability of state regression/global policy and unavailable group-count reset remain unresolved. Do not claim lock preserves all completion/history consistency or atomic multi-request close. |
| MP-U09 | ValidationDto contract says 1 Planned, entity says 1 Locked. Executable cast has no general status range/state-transition validation; 4→1 purges recipe votes. Withhold disputed status1 and arbitrary-code success guarantees; record legacy missing-entry non-three exception without inventing exact error body/status. Keep U122 and contract unchanged. |
| MP-U10 | openVoting follow-up reads then-loaded offset, close/lock restore only captured status across navigation, no single-flight handler or expected revision. Assignment Promise.all can partially persist; successful close does not reread days. No exact concurrency, current-date equivalence, undo, stale-write isolation or complete displayed/server reconciliation guarantee. |

**Matrix update:** week open/reopen/direct lock/browser close/day2 and day3
compatibility and nudge now drafted; status1/4 vocabulary and cooked-regression
policy explicitly unresolved, not silently omitted. Only overdue completion and
remaining API/owner disposition remain for generation. Human acceptance/promotion
pending, runtime not-run.

#### Exact requirement/scenario mapping — baseline-meal-planning-week-day-transitions

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Open or reopen a protected planner week for voting | Missing weekly plan; Reopen a locked week | BSL-031 |
| Reconcile Planner after opening voting | Open completes; Open or its follow-up rejects | BSL-031 |
| Promote displayed pending suggestions before closing voting | One pending and one confirmed recipe; Some assignments fail | BSL-031 |
| Finish the Planner close-voting presentation | Lock completes in the same loaded week; Lock rejects after promotion | BSL-031 |
| Persist a protected week lock independently of browser promotion | Direct API lock with no entries; Lock without household access | BSL-032 |
| Lock persisted ordinary assignments while preserving recipe-free skips | Planned recipe and non-cooking date; Lock is not cooking | BSL-032 |
| Attempt voting-state publication after persistence | Lock completes; Publication rejects after save | BSL-031/032 |
| Validate recipe-specific cooking without completing another assignment | Supper recipe matches; Another recipe or no assignment; Recipe is unavailable | BSL-033 |
| Retain status-only day-validation compatibility | Legacy recipe-backed skip; Legacy empty-date skip; Legacy Cooked date exists | BSL-033 |
| Publish supported changed-day validation after saving | Recipe-backed validation completes; Slot publication rejects | BSL-033 |
| Share the generated voting destination from Planner | Link generation resolves; Copy or share | BSL-033 |

Artifact draft: **11 requirements / 24 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-week-day-transitions`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

### Slice 5 — overdue completion and API inventory evidence

**BSL-meal-planning-034 (implementation-supported, high selection/derived-date
path; medium integration):** `Program.cs` registers ScheduleService and
FinalizeOverdueMealsProcessor; `Workflows/dreaming.yaml` invokes finalization and
makes materialize-recipe-search-filters depend on it. Processor ExecuteAsync passes
cancellation into FinalizeOverdueMealsAsync. Startup hosted backfill invokes same
service before materialization, catches/logs failures in StartAsync; no recurring
startup retry loop is present despite log wording. Service selects Date < clock
UTC DateOnly, nonnull RecipeId, Planned/Locked; sets Cooked; transactional helper
saves, recalculates max Cooked date to UTC midnight, saves/commits; then distinct
affected Mondays GET/publish without exclusion. No grocery recompute/fill-gap
invalidation, no week state change. Empty selection returns before saves/publish.
ScheduleServiceTests.FinalizeOverdueMeals_OnlyCooksPastPlannedAndLockedRecipeEvents
actually seeds past Planned, today Locked and past Skipped, calls twice, asserts
those three statuses; its title does not establish all excluded states. Fixed-clock
RecalculatesLastCookedDateFromNewlyCookedEventDate asserts exact prior-date midnight
UTC. Other-state exclusions/latest-existing date are source-supported only.
DreamingFilterMaterializationWorkflowTests reads actual YAML dependency; failure
case manually marks finalization Failed in an InMemory context, asserts materializer
Waiting and previous materialized timestamp unchanged. It does not execute scheduler,
processor, database transaction, publication failure or a real overnight workflow.
Background accepted requirements “Select due pending tasks for processor dispatch”,
“Record processor execution and successful task completion” and “Promote dependencies
after successful task completion” own that machinery; no new planning schedule SLA.

**BSL-meal-planning-035 (implementation-supported, medium):** ScheduleController
FillTheGap/GetSmartDefaults → ScheduleService read-only queries over calendar,
recipes, RecipeMatches/DiscoveryRecipes or votes/members → ScheduleRecipeDto list
or SmartDefaultsDto → success wrapper → generated fillTheGap and smartDefaults
GET builders → browser wrappers/composition. No SaveChanges/CalendarEvents.Add/
WeeklyPlans mutation occurs in these two service methods. OpenAPI matches list
and contextual object shape; default API errors/auth omissions remain qualified.
Algorithmic eligibility/order/threshold details stay discovery-owned, with no
accepted discovery main spec currently available. Tests using fabricated recipes/
InMemory view data or mocked wrappers do not establish live SQL view selection.
Accepted read composition already defines persisted recipe priority and pending
markers; new direct API requirements add no automatic assignment or locking.

**BSL-meal-planning-036 (implementation-supported, medium inventory):** Current
ScheduleController has twelve operations, all matched to OpenAPI and generated
schedule builders below. Grocery item and whole-map PATCH live in ScheduleService
but persist WeeklyPlan.GroceryState and publish groceries; grocery policy remains
excluded. Whole-map requires an existing plan and replaces serialized map; item
loads/merges/saves without a server row version — its “atomic” comment is not
concurrency evidence. Cooking/Today calls use supported validate/assign/defer and
move/delete paths; their UI and history ownership remain outside this capability.
Generic mocked POST /api/schedule/day/* has no matching controller action and is
not a positive compatibility capability. Default mock handlers return canned lock/
open responses, move message, fixed defer date, DELETE200 instead of204 and smart
defaults data:[] instead of object. Separate stateful non-cooking mock ignores
query week for GET, models same-array swap without cross-week/push semantics and
assigns displacedRecipe:null without Sunday behavior. No browser mock substitutes
prove backend state transitions, contract parity, actual persistence or SSE delivery.

| Local uncertainty | Non-normative disposition |
| --- | --- |
| MP-U11 | Finalization is invoked by workflow/startup, not a demonstrated midnight guarantee. Transaction helper uses real provider semantics only outside InMemory; publication is post-commit and not replayed automatically by a later empty invocation. No household timezone, actual-cooking proof, scheduler SLA, grocery freshness, exactly-once or eventual delivery guarantee. |
| MP-U12 | API/controller/SDK operations exist but default factories and browser mocks substitute auth/provider/transport/state. Status1 vocabulary, nullable displacement contract versus actual null, invalid indices/status/date binding and mock-only day POST remain unqualified. No exhaustive schema/SDK/live endpoint parity or new compatibility route is claimed. |

**Matrix update:** all initial candidates have accepted coverage, a source-supported
draft or an explicit owner/exclusion/uncertainty disposition. New first-open placement
and voting-link presentation were discovered and included. Generation still requires
final cross-slice review, identities, full inventory and documentation verification;
human acceptance/promotion and runtime evidence remain pending/not-run separately.

#### Exact requirement/scenario mapping — baseline-meal-planning-overdue-api-boundaries

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Finalize only overdue planned or locked recipe assignments | Past planned recipe exists; Date or state is outside the selection | BSL-034 |
| Recalculate cooking consequence before overdue publication | Newly completed date is latest; Later cooked date already exists | BSL-034 |
| Attempt affected-week snapshots after overdue persistence | Multiple overdue entries share a week; Nothing remains overdue; Publication fails after completion save | BSL-034 |
| Expose direct fill-the-gap reads without assigning recipes | Direct suggestion read completes; No suggestions are returned | BSL-035 |
| Expose direct smart-default reads without locking a plan | Suggestions are represented as locked; Direct read has no preselected recipe | BSL-035 |

Artifact draft: **5 requirements / 11 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-overdue-api-boundaries`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

### Cross-slice review additions and evidence corrections

**BSL-meal-planning-037 (implementation-supported, high component assertions /
medium live integration):** Final UI inventory found additional QuickFindModal
presentation/read consequences beyond the initial replacement boundary. fetchSuggestions
increments latestFetchId, rejects stale results and guards finally loading; effect
cleanup retires outstanding results. Initial completion gates eligible per-week
version refresh; successful replacement clamps currentIndex to recipes.length.
handleNext resets flip; card activation toggles description/ingredient side; progress
count is recipes.length+1; named Close/backdrop dismiss without mutation. Failure
logs/ends loading with old recipes retained. No Escape/focus trap/keyboard flip
semantics guarantee exists. QuickFindModal.test.ts actual assertions include one
initial call, no version-zero duplicate, subsequent version increments, different-week
ignore, shrink to terminal with Select disabled, and delayed older result ignored
after newest result. API/discovery store/image/animation/buttons are substituted;
no real invalidation receipt or eligibility/HTTP/database guarantee. Initial failure,
flip and cleanup boundaries are source-supported only. This is an authorized
reconciliation of the newly authored first slice, adding 3 requirements/7 scenarios
without touching any pre-existing draft. Slice 1 total is now **11/25**.

**Additional inspected assertions:** NonCookingScheduleTests (direct EF
InMemory context with ignored transaction warnings, fixed clock, mocked publisher) explicitly asserts custom-message swapping,
whole custom plan push, full fourteen-day push fallback to swap and cross-week/defer
skipping an occupied custom Monday for Tuesday. SundayDisplacement_ClearsMetadataOnExistingNextMondayTarget
asserts overwriting a custom Monday with the displaced Sunday recipe and clearing
its kind/label. This adds assertion evidence for BSL-024/026/027/028; it does not
establish safe Sunday collision policy for an existing recipe-backed Monday, real
PostgreSQL uniqueness/swap behavior or runtime correctness. Earlier BSL-024's
limited schedule-suite search is superseded by this more specific assertion inventory.

**Concurrent owner drafts:** During this sequence, recipe-discovery drafts appeared:
`baseline-recipe-discovery-consensus-suggestions`, `baseline-recipe-discovery-votes-api`
and `baseline-recipe-discovery-household-queue`. Their requirement inventory includes
Calculate consensus from all stored members, Return consensus candidates as suggestions
without assignment, Place suggestions only in unoccupied week day indices, Distinguish
unanimity metadata from persisted locks, Count likes separately from passes and
Reconsider queue eligibility after stored votes are removed. These are draft owner
coverage, not accepted requirements; no discovery main spec currently exists. Earlier
“absent accepted owner coverage” findings remain true. Do not copy their policy into
planning or claim cross-owner human acceptance. No unrelated artifact is edited.

#### Exact requirement/scenario mapping — baseline-meal-planning-occupied-recipe-replacement

| Requirement | All scenario headers | Evidence |
| --- | --- | --- |
| Advance Quick Find suggestions without changing the plan | Skip a suggestion; Restart or exhaust the deck | BSL-022 |
| Enter recovery before replacing an occupied Planner day | Occupied Quick Find target; Dismiss the recovery choice | BSL-022 |
| Resolve the previous Planner meal before replacement | Move to tomorrow; Sunday or next-week choice; Drop prior assignment | BSL-022/023 |
| Retain completed Planner recovery work across replacement failure | Repeated activation while pending; Prior-meal operation fails; Replacement fails after prior resolution | BSL-022 |
| Complete Planner recovery after awaited assignment | Replacement is still pending; Replacement resolves | BSL-022 |
| Preserve caller-specific Search and Browse recovery routes | Search or Browse uses Save for Next Week; Recovery completes | BSL-023 |
| Replace a stored assignment at the resolved date | Replace an ordinary recipe; Replace skipped content | BSL-024 |
| Report Sunday carry-forward after replacement follow-ups | Following Monday is absent; Additional follow-up fails | BSL-024 |
| Present Quick Find reads and failed-read retention | Initial request is pending; Suggestion request rejects | BSL-037 |
| Reconcile Quick Find after an eligible invalidation signal | Another week is invalidated; Newer fetch finishes before an older one; Refreshed deck shrinks | BSL-037 |
| Inspect and dismiss the Quick Find deck | Inspect recipe details; Close before selection | BSL-037 |

Artifact draft: **11 requirements / 25 scenarios**. Evidence class is implementation-supported; assertions inspected, not run. Human acceptance and promotion pending.

**Selected validation passed:** `baseline-meal-planning-occupied-recipe-replacement`, strict/non-interactive. Mapping reviewed; artifact validated, human acceptance/promotion pending, runtime not-run. Successor discovery remains authorized under MP-G01.

## MP-G01 final coverage and review checkpoint

**Session identity:** 2026-10-16, branch `moving-to-openspec`, commit
`04a1c4570f9bbb01b47436790d4248635ac3179a`, with the existing staged/unstaged/
untracked/deleted inputs captured before edits. Root remains repository-local,
no store selected, spec-driven schema. Entry inventory is 42 active changes/eight
main capabilities, confirmed from saved before-image metadata excluding four
archived changes. Current review inventory is 53 active changes/eight mains:
five meal-planning additions plus six concurrent capture/discovery drafts. No
main spec or pre-existing meal-planning change is modified. Generation is not
acceptance, promotion, archival or runtime verification.

### Final operation coverage matrix

| Actual entry / operation | Final coverage / disposition | Evidence / owner |
| --- | --- | --- |
| GET /api/schedule | Accepted week reading/navigation 15/40 unchanged | BSL-001–006; U102–U109 |
| POST /api/schedule/assign, ordinary empty date | Accepted empty-day assignment 15/30 unchanged | BSL-007–013; U110–U115 |
| POST /api/schedule/assign, occupied date/Sunday | New occupied replacement draft; collision-safe Sunday policy explicitly unresolved | BSL-022–024/037; MP-U01–03 |
| POST /api/schedule/move | New movement draft: source lookup, same-week swap/push, cross-week first-open/no-op, Plan later and drag | BSL-025–027; MP-U04–05 |
| POST /api/schedule/defer | New deferral/removal draft: exact source, next-current-week spill, supported states and response | BSL-028; MP-U06–07 |
| DELETE /api/schedule/day/{date}/remove | Accepted recipe-free lifecycle 19/44 plus new recipe-backed caller/applicability requirements; no duplicated follow-up definition | BSL-014–021/029; U120/MP-U07 |
| POST /api/schedule/voting/open | New week/day draft: missing plan/reopen; UI optimistic/read/failure reconciliation | BSL-031; MP-U08/10 |
| POST /api/schedule/lock | New week/day draft: direct lock versus browser promotion, ordinary day lock and closure consequences | BSL-031–032; MP-U08/10 |
| POST /api/schedule/day/{date}/validate, nonCooking | Accepted save/edit/non-cooking 19/44 unchanged | BSL-014–021; U116–U122 |
| POST /api/schedule/day/{date}/validate, status2/3 | New week/day draft: matching versus different recipe, legacy day-only behavior/publication | BSL-033; MP-U09 |
| validate status1/4/arbitrary codes | Executable cast/consensus-purge observed; status1 contract vocabulary disputed; exact invalid-state matrix withheld | BSL-033; MP-U09/12; U122 |
| GET /api/schedule/fill-the-gap | New direct read/non-persistence boundary; accepted Quick Find selection and new deck behavior | BSL-035/037; discovery ranking/eligibility excluded |
| GET /api/schedule/{weekOffset}/smart-defaults | Accepted browser suggestion composition; new direct API representation/non-persistence only | BSL-035; discovery threshold/consensus/ranking excluded |
| PATCH /api/schedule/{weekOffset}/grocery/item | Evidenced grocery-owned operation, not a missing planning mutation | BSL-036; no accepted grocery owner spec yet |
| PATCH /api/schedule/{weekOffset}/grocery | Evidenced grocery-owned legacy whole-map operation, not a planning requirement | BSL-036; map replacement/concurrency owned by groceries |
| dreaming processor/startup overdue invocation | New overdue/API draft: UTC-date selection, derived history consequence, post-save week publication | BSL-034; MP-U11; background execution owner |
| Planner Quick replace/Skip, inspect deck/invalidation; recovery | New occupied draft; shared selection stays accepted; Skip never means calendar Skipped | BSL-022–024/037 |
| Search/Browse target recovery and first-open Plan for Later | New occupied and deferral/removal drafts; existing empty target/shared assignment reused | BSL-023/030 |
| Nudge family link/copy/share/dismiss | New week/day draft; generated identity link and discovery destination policy owned elsewhere | BSL-033; accepted identity access/invite requirements |
| Deprecated store moveRecipe/lockWeek | Inspected callable compatibility; no current production UI caller found; shared move/lock API covered, no invented separate feature | BSL-025/031 |
| Mock POST /api/schedule/day/* | Excluded as positive compatibility: no ScheduleController action | BSL-036/MP-U12 |
| Live events, groceries, history, Tonight, recipe eligibility | Observable planning calls/consequences only; owner policy excluded, no placeholder requirements | Accepted live/auth/library/background references; missing accepted discovery/grocery/cooking/Tonight coverage |
| Demo, preview hold-to-move, deployment/operator variants | Excluded from ordinary-household generation under A09; source is not runtime parity proof | BSL-025; no preview qualification |

The twelve actual controller operations each have accepted, draft or explicit owner
coverage. Day-validation branches, source fallback, no-op movement, direct locking,
first-open placement and automatic finalization are separately accounted for; no
additional ordinary planning endpoint was found in the current contract/controller/
generated-client inventory. Candidate boundaries were adjusted to actual source,
not treated as predetermined features.

### New artifact status

| Change (under openspec/changes/) | Requirements / scenarios | Discovery | Artifact | Human review | Main spec | Runtime |
| --- | --- | --- | --- | --- | --- | --- |
| baseline-meal-planning-occupied-recipe-replacement | 11 / 25 | Reconciled; MP-U01–03 | Strict validated draft | Pending | Not promoted | Not-run |
| baseline-meal-planning-recipe-movement | 9 / 21 | Reconciled; MP-U04–05 | Strict validated draft | Pending | Not promoted | Not-run |
| baseline-meal-planning-deferral-removal | 8 / 19 | Reconciled; MP-U06–07 | Strict validated draft | Pending | Not promoted | Not-run |
| baseline-meal-planning-week-day-transitions | 11 / 24 | Reconciled; MP-U08–10 | Strict validated draft | Pending | Not promoted | Not-run |
| baseline-meal-planning-overdue-api-boundaries | 5 / 11 | Reconciled; MP-U11–12 | Strict validated draft | Pending | Not promoted | Not-run |

All five changes contain CLI-created metadata, proposal, ADDED meal-planning delta,
cross-seam extraction design and dependency-ordered documentation tasks. Existing
three promoted source changes remain untouched. Total prospective unique coverage
would be 93 requirements/214 scenarios if all new drafts are accepted and promoted;
that total is not the current main-spec count. Earlier 8/18 first-slice mapping is
historical; its later 11/25 mapping supersedes it. All requirement/scenario headers
in the final five deltas map exactly to the final evidence tables above; BSL IDs
in tables abbreviate BSL-meal-planning, not another owner.

### Cross-slice semantic review

- Accepted Purpose and all 49/114 blocks remain byte-identical. No new ADDED header
  duplicates an accepted header or another new slice. Shared empty assignment,
  read/suggestion composition, recipe-free save/clear and live merge rules are
  referenced instead of redefined.
- Replacement requests prior resolution then assignment; move and defer own their
  target semantics; removal reuses the accepted date-delete lifecycle. Browser
  first-open scanning (520 weeks) and server defer (current UTC next week onward)
  have distinct predicates and bounds. No common availability policy is invented.
- Week Draft/VotingOpen/Locked and day Planned/Locked/Cooked/Skipped/consensus are
  separate. Displayed pending/isLocked metadata is not persistence. Open/reopen
  leaves day states; closure and general mutation remain fallible separate calls.
  Status1 ambiguity/state-regression desirability remain MP-U08/09 rather than a
  normative universal state machine. Existing U03/U04 stay open with added evidence.
- Same-week move, cross-week move, defer, assign, remove, validate and overdue have
  different recompute/publication calls; no complete-grocery/live convergence claim
  is shared across them. Publisher receipt/application stays with accepted live
  requirements. Cooking history and Tonight ownership are not absorbed here.
- Failed follow-ups may follow persistence. Local captured-state restoration can
  overwrite later local updates; mounted guards do not provide cross-page or server
  serialization. No row-version/idempotency, safe retry, transaction-across-network,
  lost-update protection or guaranteed winning writer is specified.
- Date interpretation distinguishes explicit DateOnly, server UTC relative weeks,
  browser-local weekday/today and culture-sensitive message strings. No DST,
  cross-midnight, local/UTC equality or extreme-index binding guarantee is invented.
  Native buttons/named Close and actual pointer behavior are recorded; no complete
  localization, dialog focus-trapping or keyboard drag guarantee is invented.
- New owner drafts are available for discovery, but no accepted discovery/grocery/
  cooking/Tonight owner requirements can yet be referenced. Their absence is an
  explicit ownership disposition, not authorization for cross-capability generation.
  No consequential question is needed to draft the supported subset; disputed
  assertions remain non-normative for future review.

### Identity and preservation review

All **130 prior source identity rows (75 unique paths)** were checked against
current bytes with zero mismatches. Commit identity supplements the relevant dirty
inputs rather than replacing them. All eight main specs and pre-existing
meal-planning change files match entry hashes; the full staged binary diff matches
the saved before-image. The task writes only its 25 new change files plus this
checkpoint and the index's meal-planning routing row (27 paths total). Existing
selected checkpoint bytes are preserved except the superseded current summary;
all historical A34/U95–U122 and evidence records remain. The index's unrelated
pre-existing edits are preserved. Concurrent recipe-capture checkpoint/new capture
and discovery drafts are observed and left untouched; do not attribute them here.
No deleted navigation capability is restored.

Newly relevant source/test identities follow. Hashes identify inspected content;
they do not establish test execution or runtime correctness.

| Source/test path | SHA-256 at final extraction review |
| --- | --- |
| `api/database/compatibility.sql` | `bd3828fc1ce8b898b0feaa8f2e41be2e211cecadbefbfe9a68e14df435b859d5` |
| `api/database/schema.sql` | `3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161` |
| `api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs` | `4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/DreamingFilterMaterializationWorkflowTests.cs` | `02bdea5196fa246317d354f31043e7aa246fcd1f50480cdf32ce9eaed80c1e6e` |
| `api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs` | `ea4aff024db3114fb6dc7db73dfa66d898d511c5ac36f5ea50348bb981b2bfd8` |
| `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` | `c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi/Data/RecipeDbContext.cs` | `92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447` |
| `api/src/RecipeApi/Dto/AssignScheduleDto.cs` | `d76dd22443e39593b31551b60df3df40700b3d9ff4f8282efc8fb5a34c902172` |
| `api/src/RecipeApi/Dto/DeferScheduleDto.cs` | `8bbbaf0665676831b1ea86f58b81e9039ece6686d9bd44c5ced875cdabef7504` |
| `api/src/RecipeApi/Dto/MoveScheduleDto.cs` | `15c69614b8e07a6ba4b07deab25ddbaf6282ac62b192bdceba4451fa5d414ad8` |
| `api/src/RecipeApi/Dto/ValidationDto.cs` | `d0d3db18ae9caf54ad47c0bb219c78695bbe446bce7c788d281f30c2a9a41b20` |
| `api/src/RecipeApi/Infrastructure/HearthAuthenticationHandler.cs` | `51ecd8a5be459e1ffaae7e3a33646de57aa13bf0fec088a7e388083da08ee817` |
| `api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs` | `6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d` |
| `api/src/RecipeApi/Models/CalendarEvent.cs` | `cac6be71f2d3fa947a903390d9d6a69da7df9ebbf7aed38a76a80c45ef856806` |
| `api/src/RecipeApi/Models/WeeklyPlan.cs` | `cb342c8c26394264a00401c7eb8ef16693af7315e845e88ac5d5307535aec4b5` |
| `api/src/RecipeApi/Program.cs` | `a4a2510b9cf0bbeb0e05072ab2bf2b299f4029e449bff17e7386b62f5321c523` |
| `api/src/RecipeApi/Services/GroceryRecomputeService.cs` | `ae35bbb1ed3d88d8a3c895b3d372dc33cce58b7270b69980138be10598d882dd` |
| `api/src/RecipeApi/Services/IClock.cs` | `f0cac2885e61bfe54f42ac4c60be44d18091d8f1f733ea066c1ceee45304280b` |
| `api/src/RecipeApi/Services/Processors/FinalizeOverdueMealsProcessor.cs` | `5ddb7b7db00db051f8a9dad80b1fa830ab506a0af5977abae8f4182e45e48e0b` |
| `api/src/RecipeApi/Services/RecipeSearchFilterMaterializer.cs` | `d22d18ff83159625452a6641b78923cc5ec2492139491ec95b86d038b1cfa5da` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `api/src/RecipeApi/Workflows/dreaming.yaml` | `862cf700ca717dd5b09b5f6dfb84b6f8810448c6080b805e2b3ff62289f9853d` |
| `pwa/e2e/mock-api.ts` | `063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07` |
| `pwa/e2e/planner.spec.ts` | `c6eaf618469b43c8543420b0ca6f52259ee1e98c9564b50e58dcbbdf7d32eeed` |
| `pwa/src/app/(app)/browse-all-stack/page.tsx` | `2beaa3dd23a1817db55c037a27fbe92f881444d4285726af1b034a15d8ece947` |
| `pwa/src/app/(app)/planner/page.test.tsx` | `d787f5c4061bd45efd6311a76b53b61634059f90608be9a1b122b3f352acf1ba` |
| `pwa/src/app/(app)/planner/page.tsx` | `f113f605a33f78cdde5ed6b6ab37c2742d952c7be4319063ff91eeb81dae7f6d` |
| `pwa/src/app/(app)/recipes/page.tsx` | `18b9605e8078e8ee46674a0e781836886697ce18e9166c0591aeac6c8fe78bb4` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/home/SkipRecoveryDialog.test.tsx` | `0a7b779812b37358ecb08eaa862b8efc4dc54184b714f14b60bda6e942a29654` |
| `pwa/src/components/home/SkipRecoveryDialog.tsx` | `0ae06fa49aab1e62b69354366744518e09de594e8760b7bed191ea59fa4b654e` |
| `pwa/src/components/planner/PlannerDragHandle.test.tsx` | `f229703d24987e05a6720fb29605443e4440160bd32c2eaa6b62b69d6e30694d` |
| `pwa/src/components/planner/PlannerDragHandle.tsx` | `3cc09c93f7331ea5df8ed2566319cf73fe237aafbc05a1cc639a648b8cc5525d` |
| `pwa/src/components/planner/PlanningPivotSheet.tsx` | `28fc6fc674d3aeb4354c955c8025f0a8e615d429a7c4ebb992a024412703abcc` |
| `pwa/src/components/planner/QuickFindModal.test.tsx` | `0e5b936773ba379e3daef5659aba6cc3fe8d71d18de0da90dccb250b4cbb665b` |
| `pwa/src/components/planner/QuickFindModal.tsx` | `8b2685317c477129a2501ae58cfb09c92741f639e6cb5d8d5774c87f35cb9b80` |
| `pwa/src/lib/api/api-client.ts` | `c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95` |
| `pwa/src/lib/api/generated/api/schedule/assign/index.ts` | `072c2e46468bbd9ba3ed641a9b4eddf49a0d6e5ec82ab5fc80b836ef40db61a2` |
| `pwa/src/lib/api/generated/api/schedule/day/index.ts` | `ef26965ccbe5a9ffaccb4afab9fed14c42701eaaa622f71d72821c57c9bdb882` |
| `pwa/src/lib/api/generated/api/schedule/day/item/index.ts` | `fa909ba8b4e2be409217a6f06080e8e33a1df15b9387b1b20cc334c1a4f625b5` |
| `pwa/src/lib/api/generated/api/schedule/day/item/remove/index.ts` | `d3374c6a5e78b821a7cc97f1657a8391316777b10c26320fbb3702132df878be` |
| `pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts` | `00af096baa1fe530bed2f5a50a412bb2315d600081944dd7b6760e959acb311e` |
| `pwa/src/lib/api/generated/api/schedule/defer/index.ts` | `8c00c99579b034367368c5327ac7d743305280a0de7c1f7693fb89fa8c49c62c` |
| `pwa/src/lib/api/generated/api/schedule/fillTheGap/index.ts` | `c38fbe7a69fdcebddc7b0510967a3f67011a3a043a1056f97672a2cfaf246d06` |
| `pwa/src/lib/api/generated/api/schedule/index.ts` | `da09b75039c26cc48129288613c1a274e7e006296c8c51b3b88f1799d63bb577` |
| `pwa/src/lib/api/generated/api/schedule/item/grocery/index.ts` | `67038df0058e1a8c38bee2d79b3f1954b561854e4d6fc90f787460f5b2427ef1` |
| `pwa/src/lib/api/generated/api/schedule/item/grocery/item_Escaped/index.ts` | `e4f733eccdccb97d0f5c9588d1c1bd68e0e219127f4ea2243d46ecb2b23939e5` |
| `pwa/src/lib/api/generated/api/schedule/item/index.ts` | `619a35425edc31ec7aa87397901b64aa97f658e8b09db0e0db5a9e845fbbc447` |
| `pwa/src/lib/api/generated/api/schedule/item/smartDefaults/index.ts` | `359bb7a1a57fbbb08418e7fbb94ca506ceb969b9eb4f0649da2a250e06918374` |
| `pwa/src/lib/api/generated/api/schedule/lock/index.ts` | `3a3888949d220a82a0bac7328d8bb20727073d3e75b4c6452db716af5dd91f37` |
| `pwa/src/lib/api/generated/api/schedule/move/index.ts` | `f419d68aa046bd7ce41664fb6c3cb9a8fdc3a421afb75413375d0fde05e74194` |
| `pwa/src/lib/api/generated/api/schedule/voting/index.ts` | `250915799cc03f8db89c61e2c323326be3efd72f6742c3f13bf01c549ec425a9` |
| `pwa/src/lib/api/generated/api/schedule/voting/open/index.ts` | `6475afde9f3419d9f093375a7fc444c4b6344bf54ddd9c68aed13a424b6f637a` |
| `pwa/src/lib/api/generated/models/index.ts` | `03e19537845755d2cd0d30071284bc8a11007237e380433184d3edbe1ddb05e6` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/src/lib/auth.ts` | `d9b122b42cccfdc8a589c05a3e05deaa4a4864dee9cf17c4a403ec5f6db09f2a` |
| `pwa/src/lib/planner/slotAssignment.test.ts` | `62293032af1a1181c79f0f5e3e1641a24809257942a261fb3a866db443e63550` |
| `pwa/src/lib/planner/slotAssignment.ts` | `0973028bc470f3bd1b4a3f58ed43029950f4c8b5fdb6ca69b40094c761520117` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/weekStore.dragDebounce.test.ts` | `03f645a67cf3d570121720ff869feb630215c82e37e4baaa506db52bff7788cb` |
| `pwa/src/store/weekStore.removeRecipe.test.ts` | `846d3d2026c1168ce3c42f1cf1c876e9b0be92008e00ec9c9a59ee7a8ea6f84b` |
| `pwa/src/store/weekStore.test.ts` | `2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |

67 current identity rows supplement the 130 rechecked historical rows.

### Checks and exact next lifecycle action

**Passed so far:** strict selected validation for all five deltas; exact header/
scenario mapping and unique ADDED-name review; 500-character description limits;
source/preservation checks above; full strict inventory validation **61 passed,
0 failed (53 changes + eight main specs)**. CLI reports informational archive
collision messages for already-promoted recipe-library deltas; these are unrelated,
not strict failures, and do not authorize archival or repair. Source/grammar review
is not runtime qualification. Complete-path repository verification is next; actual
post-record result and content identity belong to `.task/agent-finish/last-run.json`
and the final handoff, not an earlier successful digest.

**Failed / blocked:** none observed in the selected artifact/full strict checks.
If complete-path verification encounters concurrent mutation or unrelated failures,
record and distinguish those outcomes before completion. **Not-run:** existing
unit/API/browser/database/network/model/runtime qualification, by A34 and current
scope. **Not-applicable:** behavior TDD/new tests, application lint/type/build,
client regeneration/live parity, migrations, deployment and preparation for these
documentation-only edits. Human acceptance/promotion are pending lifecycle work,
not passing automated checks.

**Exact next step after documentation verification:** human review of the five
named deltas and MP-U01–MP-U12, with inherited A34/U95–U122 preserved. Accept or
request changes to supported requirements; settle a disputed normative policy only
if its inclusion is requested, one consequential question at a time. Once explicitly
authorized, use the installed OpenSpec sync workflow to promote only accepted
meal-planning deltas to the existing main spec, validate and update lifecycle
records. Do not archive, implement or run qualification from this checkpoint alone.
All in-scope generation candidates now have validated draft, accepted coverage or
explicit evidenced owner/exclusion/unresolved disposition. Do not call the
meal-planning baseline complete until human acceptance and promotion are finished.

### MP-G01 complete-path verification observation

The first complete **27-path** `task verify -- <all task-owned changed/new paths>`
returned exit 0: documentation, spec:check and content **passed**, all implementation/
harness/runtime checks **not-applicable** to the selected documentation class.
Automated checks passed; task acceptance remains independently assessed from the
coverage/mapping/preservation review. Tested identity was
`5b044ffe13a72bf38c54c484b8023d4aeb2fcca2929809958fff9b84a3272c2f`.
All five extraction task lists now mark their documentation verification tasks
complete. This observation/task-record update changes documentation identity;
repeat complete-path verification for the final bytes and report that later
record's result directly. Do not attach the earlier digest to later content.
No selected or concurrent failure/blocker was observed in this run. Unrelated
recipe-library archive collision messages were informational; no repair was made.
Runtime qualification remains not-run under A34. Human acceptance and promotion
of the 44/100 draft requirements/scenarios remain pending; no baseline-complete
claim or lifecycle advance is authorized by passing documentation checks.

## MP-P01 — Accepted remaining meal-planning documentation promotion

**Authorization (2026-10-16):** User “promote” following the validated MP-G01
handoff accepts the supported requirements/scenarios in its five reviewed drafts
and authorizes syncing them into main meal-planning, with checkpoint/index/task
lifecycle follow-up. No additional generation, application/test/contract/client/
SQL/dependency/configuration edits, services, runtime qualification, archive,
commit or deployment. Acceptance of supported documentation does not resolve
MP-U01–MP-U12 or turn uncertainty into normative guarantees.

**Workflow and selected roots:** Installed openspec-sync-specs; current list/context
resolve nearest `/Users/alex/Code/whats-for-supper`, no selected store, spec-driven.
Each selected status supplies the sole absolute meal-planning delta path and the
same planningHome.root. Current specs instructions were fetched successfully for
each change before the first main-spec write. All five deltas contain only ADDED
requirements. Reading/reconciliation found no duplicate header against the prior
main or another selected delta; no modifications/removals/renames were needed.

| Accepted/promoted change | Added requirements / scenarios | Evidence mapping | Current lifecycle |
| --- | --- | --- | --- |
| baseline-meal-planning-occupied-recipe-replacement | 11 / 25 | BSL-022–024/037; final 11/25 mapping | Accepted/promoted, active |
| baseline-meal-planning-recipe-movement | 9 / 21 | BSL-025–027; exact mapping | Accepted/promoted, active |
| baseline-meal-planning-deferral-removal | 8 / 19 | BSL-028–030; exact mapping | Accepted/promoted, active |
| baseline-meal-planning-week-day-transitions | 11 / 24 | BSL-031–033; exact mapping | Accepted/promoted, active |
| baseline-meal-planning-overdue-api-boundaries | 5 / 11 | BSL-034–036; exact mapping | Accepted/promoted, active |

**Result:** Main meal-planning now contains **93 requirements / 214 scenarios**.
All reviewed 44/100 blocks are appended verbatim under its single Requirements
heading; no delta operation header or draft Purpose is copied. Original Purpose,
prior 49/114 blocks and all earlier evidence paragraphs are preserved exactly.
Two non-normative promotion paragraphs link the new baseline to BSL-022–037 and
retain MP-U01–MP-U12/A34/U95–U122. Every final MP-G01 mapping now identifies the
same requirement/scenario block in main, without renamed or rewritten claims.
The MP-G01 final coverage matrix's “new draft” entries are now accepted/promoted
according to this table; explicit owner, excluded and unresolved rows retain their
disposition. Its historical pending lifecycle table is superseded here, not erased.

**Preservation and current inventory:** Promotion entry has 53 active changes and
eight main capabilities. The private `/tmp/meal-planning-promotion-before` snapshot
captures staged/unstaged/untracked/deleted status, full index/worktree binary diffs,
1,694 existing file hashes, selected overlapping before-images and CLI/rule JSON.
The 197 recorded identity rows (103 unique source/test paths) all recheck unchanged.
This promotion writes only main meal-planning, this checkpoint, the index's
meal-planning routing row and the five selected task workflow-follow-up records:
eight paths. It preserves source deltas/proposals/designs/metadata, prior task
checkboxes, other mains, all earlier qualifications and unrelated edits including
concurrent recipe-capture work. It creates/deletes/archives no capability/change,
stages nothing and does not restore deleted navigation artifacts. Recheck current
inventory/content at final validation rather than extrapolating historical counts.

**Acceptance and verification boundary:** Source-supported extraction is accepted
as documentation; behavior evidence remains implementation-supported. Require
exact original Purpose/prior-block equality, exact reviewed append/new-block
equality and 93/214 counts, unchanged selected source artifacts/index bytes and
unrelated content review. Run strict selected main/change validation, all-specs
and all-inventory validation, then `task verify` with the complete eight task-owned
paths. The current verification record is `.task/agent-finish/last-run.json`;
actual final outcomes/content identity belong to the final handoff rather than an
earlier successful digest. Documentation needs no preparation. Runtime/unit/API/
browser/database/network/model qualification remains **not-run** under A34.
Implementation TDD/new tests, application checks, client regeneration, migrations
and deployment remain **not-applicable** to this documentation promotion. Report
failed/blocked/concurrent outcomes separately if observed.

**Exact next bounded action:** No selected draft acceptance/promotion remains.
Keep all eight meal-planning changes active. Any archival, implementation,
runtime qualification, cross-capability owner generation or disputed-policy change
requires separately selected scope; this checkpoint authorizes none of them.
The ordinary-household documentation baseline is accepted/promoted with explicit
exclusions/uncertainties, not a runtime qualification or whole-application guarantee.

**MP-P01 pre-verification observation:** Exact 44/100 append, preserved Purpose/
prior 49/114/evidence equality, unique 93 requirement headers, all 197 source identity
rows, unchanged staged bytes and exact eight-path task scope review **passed**.
All unselected pre-existing file hashes match the promotion before-image, including
other mains and selected delta/proposal/design/metadata files. Strict selected main
and all five changes **passed**; all-main strict validation **8 passed / 0 failed**;
full-inventory strict validation **61 passed / 0 failed**. Final post-record
complete-path documentation verification is next; report its actual final outcome
and identity directly from the verification record. No failed or blocked check has
been observed at this checkpoint. Runtime remains not-run under A34; no application
behavior verification follows from these preservation/grammar results.

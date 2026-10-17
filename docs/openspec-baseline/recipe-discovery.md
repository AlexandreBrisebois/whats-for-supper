# Recipe discovery baseline plan

## Current planning ownership — 2026-10-16

The combined meal-planning spec has been split by responsibility. Use these current requirement owners; earlier extraction references to the combined owner, source identities and evidence below remain historical. Qualification limits are unchanged.

- [Compose voting suggestions separately from persisted assignments](../../openspec/specs/meal-planning/spec.md#requirement-compose-voting-suggestions-separately-from-persisted-assignments)
- [Submit chosen-recipe assignment through the protected operation](../../openspec/specs/meal-assignment/spec.md#requirement-submit-chosen-recipe-assignment-through-the-protected-operation)
- [Persist a protected week lock independently of browser promotion](../../openspec/specs/planning-lifecycle/spec.md#requirement-persist-a-protected-week-lock-independently-of-browser-promotion)
- [Keep relative operations anchored to their intended calendar week](../../openspec/specs/deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **21 requirements / 47 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

The three reviewed recipe-discovery drafts are **accepted and promoted** under DISC-D03 (2026-10-16): [main recipe-discovery spec](../../openspec/specs/recipe-discovery/spec.md), **21 requirements / 47 scenarios**. This completes the accepted documentation baseline scope with the explicit exclusions below; it does not establish whole-capability runtime qualification or resolve excluded policy questions. All three source changes remain active and unarchived.

Current user instruction “accept it and build the spec” supersedes the prior draft/review checkpoint. Acceptance covers the reviewed mapped claims and their documented exclusions, not invention of new behavior or acceptance of disputed accidental behavior. Runtime qualification remains not-run/deferred under A34. Exact next action: await separately selected reconciliation or runtime qualification work; no implementation, archival or successor extraction is authorized by promotion.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md), then this file.
No other capability plan or full project history is required up front. Follow only
immediate owner/spec dependencies needed for the selected work.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 21 requirements / 47 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `e5c764fce830ce637a6faf2a0a186f34bf5b053ba902ab44b2dd0b27d107efb9`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Capability map and starting points

| Capability / purpose | Candidate scope and rules to recheck | Source starting point | Existing test starting point | Dependencies / initial confidence |
| --- | --- | --- | --- | --- |
| Recipe discovery: collect family preferences | Supper-pinned UI vs broader API filters, eligible queue, one vote per member/recipe, like/pass, household counts, consensus suggestions; distinguish any-like matches from consensus | [DiscoveryService](../../api/src/RecipeApi/Services/DiscoveryService.cs), [SQL views](../../api/database/schema.sql), `pwa/src/app/(app)/discovery/page.tsx` | [DiscoveryServiceTests](../../api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs), [discovery browser tests](../../pwa/e2e/discovery.spec.ts) | Identity, library, planning, live updates / high mechanics; terminology medium |

Shared owners and evidence policy live in [workflow.md](workflow.md). Recheck
these source/test starting points before using them as current evidence.

## Recorded decisions for this capability

Shared A01–A05/A07/A09–A12/A34 decisions are in workflow.md. The records below
retain their original scope; completed stages do not authorize successors.

**DISC-D01 (2026-10-16, current user request):** Complete discovery, evidence reconciliation and validated documentation-only drafts for all remaining recipe-discovery journeys, in bounded sequential slices without asking permission between them. The user explicitly superseded the review-only default. This authorizes neither human acceptance, main-spec promotion, archival, implementation nor runtime qualification. Disputed/incomplete behavior is recorded non-normatively and does not block independent supported drafting. No consequential product decision was inferred from source.

**DISC-D02 (extraction treatment):** U04 is resolved as a source-backed distinction of concepts and boundaries. Its global purge, partial-failure and eligibility limitations remain open for human review; tracing them is not acceptance of those behaviors as desired requirements.

## Discrepancies and qualifications

These are implementation-supported/static findings, not runtime guarantees.
Cross-capability entries are included where the selected evidence depends on them.

| ID | Finding / risk | Evidence and required extraction treatment | Status / withheld claim |
| --- | --- | --- | --- |
| U04 | Match, consensus, suggestion and assignment are different | [SQL views](../../api/database/schema.sql), [DiscoveryService](../../api/src/RecipeApi/Services/DiscoveryService.cs), [weekStore closure](../../pwa/src/store/weekStore.ts). Lock clears global votes; client promotion and lock use separate requests. | Traced; unresolved policy withheld; see U04 disposition below |

## Slice evidence and lifecycle records

Three slices were extracted sequentially: household queue/local refresh, votes/API reads, then consensus/suggestion handoff. Evidence and full scenario mappings follow.

## Discovery fields and boundary

| Required field | Current extraction |
| --- | --- |
| Name | Recipe discovery (`recipe-discovery`) |
| Business purpose | Let stored members express recipe preferences and surface shared interest for planning without confusing votes with assignments. |
| Existing capabilities | Member-attributed queue; Supper household page; broader category/cuisine API reads; like/pass persistence and replacement; like totals; any-like match view; majority suggestions; local event consumption. |
| Important workflows | Enter → load → inspect → like/pass → exhaust → refresh/capture/planner; API queue/category reads; consensus smart-default read; pending suggestion handoff to planning; received vote/invalidation handling. |
| Business rules | Eligible view is ready/discoverable/undeleted; member vote exclusion; count-descending/oldest-cooked queue; pair vote key; likes only in totals; majority formula; suggestions skip stored occupied dates. Disputed observations are below, not desired rules. |
| Source files | Ordered references per BSL entry and SHA-256 inventory below; only immediate dependencies followed. |
| Tests | Actual assertions inspected in DiscoveryServiceTests, DiscoveryIntegrationTests, discovery browser/store/card tests, ScheduleServiceTests, ScheduleIntegrationTests, weekStore tests and NonCookingScheduleTests. None executed this session. |
| Dependencies | household-identity for access/context; recipe-library for readiness/deletion/hero facts; meal-planning for week interpretation, persisted assignment and locking; household-live-updates for event delivery, dispatch and pending merge. |
| Uncertainties | U04 and DISC-U01–U08 below; no runtime, SQL-view, concurrent request, browser/device or durable delivery qualification. |
| Confidence | High for aligned queue order/controls and direct state effects; medium for SQL views, votes without focused replacement assertions, duplicated defaults and mocked integration; low/missing for historical intended features absent from executable paths. |

## Evidence conventions

All BSL entries below are **implementation-supported**, not verified runtime behavior. Entry-specific confidence is independent of check outcome. Inspection was read-only at the branch/commit and content identities recorded below. Runtime/API/browser/SQL checks are **not-run** by explicit user restriction; no services, database provisioning or dependency installation were attempted. Documentation validation is recorded separately.

Common assumptions: ordinary household mode, stored valid recipe/member IDs and successful persistence where stated; no demo/preview/NAS variant qualification. Default public week interpretation belongs to meal-planning; the public schedule service uses its UTC clock, whereas private vote-triggered defaults directly use current UTC. No household partition column or scoped household predicate was found on votes or family-size counting. References describe the configured database's records, not tenant isolation.

### Source and owner anchors

- UI: `pwa/src/app/(app)/discovery/page.tsx` (`DiscoveryPage`, handlers and effects); `pwa/src/components/discovery/DiscoveryCard.tsx`; `pwa/src/components/common/Navigation.tsx`.
- Client: `pwa/src/lib/api/discovery.ts`; shared `api-client.ts`; generated discovery request builders and models; `pwa/src/store/discoveryStore.ts`; `pwa/src/hooks/useScheduleStream.ts`.
- Server: `api/src/RecipeApi/Controllers/DiscoveryController.cs`; `Services/DiscoveryService.cs`; `Data/RecipeDbContext.cs`; `Models/RecipeVote.cs`; `Infrastructure/FamilyMemberIdModelBinder.cs` and `SuccessWrappingFilter.cs`; `api/database/schema.sql`.
- Handoff: `pwa/src/store/weekStore.ts`, `pwa/src/lib/api/planner.ts`, `api/src/RecipeApi/Controllers/ScheduleController.cs`, `Services/ScheduleService.cs`, `Dto/SmartDefaultsDto.cs`; approved `specs/openapi.yaml` discovery, vote, smart-default, assign, lock and validation paths.
- Accepted owner references: [household-identity](../../openspec/specs/household-identity/spec.md), **Authenticate protected API requests independently**, **Carry browser member context on shared SDK requests**, **Bind shared API member context independently of membership validation**; [meal-planning](../../openspec/specs/meal-planning/spec.md), **Compose voting suggestions separately from persisted assignments**; [household-live-updates](../../openspec/specs/household-live-updates/spec.md), **Forward received vote totals to existing consumers**, **Signal candidate freshness separately from fetching results**, **Reconcile received suggestions without replacing occupied slots**, **Attempt publication of saved vote consequences**. Existing owner specifications were inspected; their broader rules are not duplicated here.

## BSL evidence records

Each entry supplies actor/trigger/outcome, rule, failure/recovery, assumptions, ordered trace, assertions/substitutions, agreement, confidence, check limit, disposition and mappings. Mapping table after the entries enumerates every requirement and every scenario.

### BSL-recipe-discovery-001

- **Behavior/actor and trigger → outcome:** Member enters Discovery: Hydrated selected member → categories then Supper queue → up to four cards; spinner while loading an empty queue.
- **Business rule/eligibility:** PINNED_DISCOVERY_CATEGORY fixes Supper even if categories list differs; active category fallback remains Supper.
- **Failure/cancellation/recovery:** Initialization ignores completion after effect cleanup; errors log and release loading without dedicated error state. Do not claim member-switch freshness or queue reset.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** DiscoveryPage initialize → discovery.ts → shared SDK/member context → DiscoveryController → DiscoveryService → view/votes → store/render.
- **Actual assertions and substitutions:** pwa/e2e/discovery.spec.ts requests only the pinned Supper category and presents and votes for the first server-ranked recipe assert query Supper, first four IDs, front card and target IDs; HTTP routes return builder arrays and success stubs.
- **Contract/test/documentation reconciliation:** OpenAPI supports broader filters; Supper is a UI restriction. Broad multi-category browser test names do not establish traversal with this constant.
- **Evidence/confidence:** Implementation-supported; high for pinned ordering; medium for identity lifecycle.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-002

- **Behavior/actor and trigger → outcome:** Member requests queue eligibility: Queue read → ready/discoverable/undeleted rows without this member vote.
- **Business rule/eligibility:** vw_discovery_recipes owns view eligibility; service excludes either vote kind by recipe/member pair. No calendar-event lookup.
- **Failure/cancellation/recovery:** Successful read can be empty; no assigned-recipe exclusion or stable ties beyond specified keys.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** GET discovery → controller → GetRecipesForDiscoveryAsync → DiscoveryRecipes SQL view + RecipeVotes → DTO data array.
- **Actual assertions and substitutions:** DiscoveryServiceTests Only_Unvoted asserts one ID; Only_Discoverable manually seeds only one view row and does not execute SQL. TestDbContextFactory uses EF InMemory; PostgreSQL readiness/deletion/view semantics are unexecuted.
- **Contract/test/documentation reconciliation:** SQL supports eligibility; service TODO acknowledges missing planned filtering. Historical live-update flow asserts that filtering incorrectly.
- **Evidence/confidence:** Implementation-supported; medium.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-003

- **Behavior/actor and trigger → outcome:** API caller selects filters/categories: Optional equality filters narrow rows; categories expose distinct non-null eligible unvoted values.
- **Business rule/eligibility:** Both nonempty filters combine; categories have no order guarantee; empty filters are ignored.
- **Failure/cancellation/recovery:** Unknown cuisine returns an empty array on supported source path, not an invented error.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** discovery.ts/generated query builder or direct API → OpenAPI GET discovery/categories → controller → scalar predicates/view → wrapped arrays.
- **Actual assertions and substitutions:** DiscoveryServiceTests GetRecipesForDiscoveryAsync_WithCuisineFilter_FiltersByCuisineType asserts single Italian ID with seeded Italian/Greek rows; category test asserts French/Mexican and no voted Italian. DiscoveryIntegrationTests cuisine cases assert success/non-null only; no SQL or cuisine membership proof.
- **Contract/test/documentation reconciliation:** Approved contract has category/cuisine parameters and data arrays. Old integration comments about JsonContains conflict with current scalar equality.
- **Evidence/confidence:** Implementation-supported; high for scalar filter; medium for HTTP/SQL coverage.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-004

- **Behavior/actor and trigger → outcome:** Member receives ranked queue: More likes first; at equal likes never-cooked then oldest dated.
- **Business rule/eligibility:** No additional tie ordering promised; DTO copies view vote_count and adapter derives family interest count > 0.
- **Failure/cancellation/recovery:** Replacement queue assigns queueOrder; no randomization or independently computed client eligibility.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** view count aggregate → GetRecipesForDiscoveryAsync ordering → RecipeDto → mapToDiscoveryRecipe → setStack → first four.
- **Actual assertions and substitutions:** DiscoveryServiceTests Orders_By_VoteCount_And_LastCookedDate asserts four IDs in sequence including never-cooked. Browser six-card case asserts preserved order and target IDs; both use substituted data.
- **Contract/test/documentation reconciliation:** Current code and meaningful assertions align; queue recency differs from smart-default descending recency.
- **Evidence/confidence:** Implementation-supported; high.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-005

- **Behavior/actor and trigger → outcome:** Member inspects and acts on card: Recipe title/image alt/time and optional badges; front drag or semantic vote buttons; empty controls disabled; wrap-up links and refresh.
- **Business rule/eligibility:** Right drag >100px or velocity >500 likes; left <-100px or velocity <-500 passes; other drags spring back. Native buttons provide alternatives. Local matchCount increments on like only if prior family interest true.
- **Failure/cancellation/recovery:** Local counter survives refresh on same mount; it is neither persisted nor decremented after vote rejection. No universal keyboard/gesture/accessibility compliance claim.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** DiscoveryCard callbacks → DiscoveryPage handlers → store removal/background vote; wrap-up router.push planner or capture; refresh rereads API.
- **Actual assertions and substitutions:** DiscoveryCard.test.tsx asserts cuisine/meal badges and absent interest ring with mocked motion; browser pinned-summary case clicks two likes and asserts wrap-up, refresh test asserts control visibility. No inspected live drag/focus/device qualification.
- **Contract/test/documentation reconciliation:** t/tWithVars connect EN/FR copy; fixed English aria labels and Just planned badge remain. Card description prop is not rendered despite test naming referring to description.
- **Evidence/confidence:** Implementation-supported; high for rendered controls; medium for gestures/local match outcomes.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-006

- **Behavior/actor and trigger → outcome:** Member submits/revises supported vote: Optimistic removal → POST 1 or 2 → stored pair insertion/replacement → resulting like total.
- **Business rule/eligibility:** RecipeVote key is recipe/member; sequential replacement updates VotedAt. SQL restricts values 1–2, foreign keys require existing records.
- **Failure/cancellation/recovery:** No optimistic reinsert, toast, retry or undo on rejection; local removal does not establish success. Concurrent first submissions are unqualified.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** handleSwipeRight/Left → submitVote → generated vote post → VoteDto/DiscoveryController → SubmitVoteAsync → recipe_votes SaveChanges → counts.
- **Actual assertions and substitutions:** Browser target-ID test records URL identities but its vote handler returns {success:true}, not the approved envelope, and does not prove storage. No focused replacement/timestamp assertion found in DiscoveryServiceTests.
- **Contract/test/documentation reconciliation:** OpenAPI enum [0,1,2] comment says Dislike/Like/Love; source enum Like=1/Dislike=2, UI pass=2 and SQL check disagree on zero/labels. Only evidenced UI actions and supported persistence drafted; zero acceptance/label claims withheld.
- **Evidence/confidence:** Implementation-supported; medium.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-007

- **Behavior/actor and trigger → outcome:** Vote save reaches event follow-up: Saved row → count likes globally for recipe → vote publication; boundary counts trigger week-zero defaults publication.
- **Business rule/eligibility:** Boundary compares resulting count to threshold or threshold-1; does not compare before/after count and can fire on unchanged repeats. All stored members count in threshold.
- **Failure/cancellation/recovery:** Publication is awaited after SaveChanges; publication/read error can reject after persistence. No durable delivery, atomic save/broadcast or guaranteed transition.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** SubmitVoteAsync → SaveChanges → CountAsync likes → PublishVoteUpdatedAsync → member count → private defaults(0) → PublishSmartDefaultsUpdatedAsync.
- **Actual assertions and substitutions:** ScheduleIntegrationTests VoteThresholdCrossed_PublishesSmartDefaultsUpdatedEvent verifies mocked publisher calls on first/second likes, not receipt; default factory disables auth and uses substituted persistence/orchestration.
- **Contract/test/documentation reconciliation:** Existing household-live-updates Attempt publication of saved vote consequences owns publication. Duplicate private default computation omits totalTime and uses direct UTC; no guaranteed parity with public endpoint.
- **Evidence/confidence:** Implementation-supported; medium; deferred to existing owner for normative publication.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-008

- **Behavior/actor and trigger → outcome:** Loaded card receives vote event: Known recipe count and interest update; front identity stays; unknown ID no-op.
- **Business rule/eligibility:** Actual code sorts the entire tail by descending count then queueOrder, including positions 4+; stale comments describe at-most-two/visible-only movement.
- **Failure/cancellation/recovery:** No new card inserted, no sequence/version rejection, no interest ring; no durable event delivery or fresh count guarantee.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** useScheduleStream vote_updated → planner consumer then discovery applyVoteUpdate → matching loaded recipe and sorted tail.
- **Actual assertions and substitutions:** discoveryStore.test.ts position-4+ assertion expects index 1 and unchanged front; unknown recipe assertion retains queue; browser SSE test asserts Chicken at 1, front unchanged and ring absent. Injected SSE/HTTP data do not test actual server delivery.
- **Contract/test/documentation reconciliation:** Current tests support full-tail code but historical flow conflicts; only count/front/no-insertion normative subset drafted, movement-range policy withheld pending human review.
- **Evidence/confidence:** Implementation-supported; high for count/front; disputed range excluded.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-009

- **Behavior/actor and trigger → outcome:** Mounted queue consumes invalidation: New global version after stack initialization with cards → silent reread → remove absent IDs; if queue empties, loadNextCategory with pinned Supper leaves empty.
- **Business rule/eligibility:** Version is global across week offsets; reread only removes, does not merge additions/counts/order; no debounce in this path.
- **Failure/cancellation/recovery:** Error logs and retains queue; version is marked handled before request, so no retry of same version. Initial empty queue does not refetch from this effect; later queue changes can make it eligible.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** fill_the_gap_invalidated → invalidateFillTheGap → DiscoveryPage effect → refetchCurrentCategory → getDiscoveryStack → view response → ID diff/removals.
- **Actual assertions and substitutions:** Browser badge case supplies a reduced response and injected invalidation then asserts removal/badge/autofade; multi-category SSE test branches on Italian but pinned Supper takes else, so name is not traversal proof. Store tests assert generation increments/removal.
- **Contract/test/documentation reconciliation:** Code computes badge eligibility using slice(-4), while render uses slice(0,4); absent IDs need not mean planned and server has no planned filter. Badge timing/causation and visible-four guarantee withheld.
- **Evidence/confidence:** Implementation-supported; medium.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-010

- **Behavior/actor and trigger → outcome:** Consumer distinguishes match and consensus: Any-like SQL view creates a row; IsMatchAsync tests row existence; majority-based defaults are separate.
- **Business rule/eligibility:** vw_recipe_matches groups vote=1 with no HAVING threshold. Public matching method has no controller endpoint found; internal concept only.
- **Failure/cancellation/recovery:** Do not promote stale 50-percent test names into policy.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** recipe_votes → vw_recipe_matches → RecipeMatches → IsMatchAsync; separately family count/likes → smart-default candidates.
- **Actual assertions and substitutions:** DiscoveryServiceTests true case manually inserts RecipeMatches row with one like/two members; false case leaves that DbSet empty despite one like/three members. Neither executes the view or proves percentage filtering.
- **Contract/test/documentation reconciliation:** U04 terminology resolved: any-like match is not consensus; local UI matchCount is a third distinct concept. SQL-like view may include a recipe independent of readiness; consumers apply own eligibility.
- **Evidence/confidence:** Implementation-supported; high mechanics; old percentage claims excluded.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-011

- **Behavior/actor and trigger → outcome:** Planner/API reads majority suggestions: ceil((all stored members+1)/2) likes → existing undeleted recipes → unanimous first, lastCooked descending → free day indices → response without writes.
- **Business rule/eligibility:** Every stored event occupies its date, including non-cooking; max seven; consensusRecipesCount counts all qualifying rows before placement; unanimity drives suggestion isLocked only.
- **Failure/cancellation/recovery:** No readiness/discoverability or already-assigned recipe exclusion in candidate query; ties unspecified. Zero members gives threshold 1, not automatic consensus.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** planner.ts getSmartDefaults → GET schedule/{offset}/smart-defaults → ScheduleController → ScheduleService.GetSmartDefaultsAsync → RecipeVotes/FamilyMembers/Recipes(query filter)/CalendarEvents → SmartDefaultsDto → pending composition.
- **Actual assertions and substitutions:** NonCookingScheduleTests AllMarkedWeek_HasNoOpenSlotsOrRecipeSideEffects asserts empty selections/open slots and no votes/recipes; weekStore init/openVoting/sync offset assertions use mocked APIs. No inspected focused all-majority/ranking relational test.
- **Contract/test/documentation reconciliation:** OpenAPI SmartDefaultsDto shape aligns, but example unanimousVote true / isLocked false conflicts with computed true. Global Recipe query filter excludes deleted rows; readiness absent. Pending composition already owned by meal-planning.
- **Evidence/confidence:** Implementation-supported; medium.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-012

- **Behavior/actor and trigger → outcome:** Person closes voting after suggestions: Pending non-skipped recipe slots → parallel assign requests → await all → separate lock request → successful local pending clear.
- **Business rule/eligibility:** Assignment saves calendar status Planned and follow-up recomputation/events; it does not clear votes. Lock marks week/events and saves snapshot like counts before removing every RecipeVote in the database.
- **Failure/cancellation/recovery:** Any rejected assignment prevents that call reaching lock, but other parallel assignments may have saved. Lock failure can follow all assignments; catch restores local status only. No transaction across requests, rollback, tenant isolation or guaranteed queue refresh.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** weekStore.closeVoting → planner.ts assignRecipeToDay POST /api/schedule/assign per slot → ScheduleService.AssignRecipeAsync → calendar save → follow-ups; then POST /api/schedule/lock → LockScheduleAsync → WeeklyPlan/events/vote snapshot/global vote removal/save → week publication.
- **Actual assertions and substitutions:** weekStore closeVoting assertion checks one pending assignment, lock called and pending false with mocked successes; despite comment it does not assert invocation ordering or failure rollback. ScheduleServiceTests Should_Purge_Votes_On_Lock asserts empty votes/locked plan in default test factory, not relational scope isolation.
- **Contract/test/documentation reconciliation:** U04 traced; Atomic Lock client comment is not atomicity evidence. Global purge remains non-normative policy risk. Generic later queue eligibility after vote removal is drafted without adopting the purge rule.
- **Evidence/confidence:** Implementation-supported; high source boundaries; medium substituted checks.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

### BSL-recipe-discovery-013

- **Behavior/actor and trigger → outcome:** API-only day validation removes recipe votes: A calendar status transition from AwaitingConsensus to Locked removes votes for that event recipe, distinct from computed majority.
- **Business rule/eligibility:** Old status 0/new status 1 controls this purge; no like threshold check occurs on the transition. Other status transitions do not use this branch.
- **Failure/cancellation/recovery:** No claim that the endpoint calculated consensus or that clearing causes delivery/refetch; broader validation belongs to meal-planning.
- **Configuration/time assumptions:** Common assumptions above; source identities below. No cross-device, concurrent or deployment qualification.
- **Ordered trace and source symbols:** POST schedule/day/{date}/validate → ScheduleController → ValidateDayAsync → old/new status branch → recipe-specific RecipeVotes removal → later SaveChanges and slot publication.
- **Actual assertions and substitutions:** ScheduleIntegrationTests Await_Consensus_Status_Represents_Voting_In_Progress stores status AwaitingConsensus plus one vote, submits ValidationDto(1), asserts votes empty; substituted database does not establish a computed consensus.
- **Contract/test/documentation reconciliation:** Non-normative owner boundary: transition label is not majority calculation. Unlike week lock this removes that recipe only. Broader validation/purge policy deferred to meal-planning.
- **Evidence/confidence:** Implementation-supported; medium.
- **Check/outcome/environment:** Static source/assertion inspection; runtime check **not-run**, no services or database launched. Documentation checks separately below.
- **Limit/disposition:** Drafted only for mapped settled claims; conflicting or unmapped claims excluded/deferred as below. No acceptance or promotion.

## Requirement and scenario mappings

The titles below are exact delta headings. Every scenario listed maps to the row's evidence; no unlisted normative scenario is intended. All three deltas use ADDED requirements for the absent main capability, have one shared Purpose, and have disjoint requirement titles.

| Change / requirement | Scenarios (exact titles) | Evidence |
| --- | --- | --- |
| `baseline-recipe-discovery-household-queue` / **Wait for selected member context** | Member context not ready; Member selected | BSL-recipe-discovery-001 |
| `baseline-recipe-discovery-household-queue` / **Present the Supper queue in server order** | Broader categories returned; More than four recipes | BSL-recipe-discovery-001, BSL-recipe-discovery-004 |
| `baseline-recipe-discovery-household-queue` / **Read eligible unvoted recipes** | Member already voted; Different member voted; Recipe unavailable | BSL-recipe-discovery-002 |
| `baseline-recipe-discovery-household-queue` / **Order discovery by likes and cooking recency** | Higher interest; Equal interest | BSL-recipe-discovery-004 |
| `baseline-recipe-discovery-household-queue` / **Display recipe card facts and vote controls** | Card loaded; Empty queue controls | BSL-recipe-discovery-005 |
| `baseline-recipe-discovery-household-queue` / **Offer empty-state navigation and feed refresh** | No local matches; Local interest match; Refresh exhausted feed | BSL-recipe-discovery-005 |
| `baseline-recipe-discovery-household-queue` / **Use translated discovery copy where connected** | Translation exists; Translation missing | BSL-recipe-discovery-005 |
| `baseline-recipe-discovery-household-queue` / **Apply received vote counts to loaded discovery cards** | Known recipe; Unknown recipe | BSL-recipe-discovery-008 |
| `baseline-recipe-discovery-household-queue` / **Remove absent IDs after an eligible invalidation refresh** | Recipe absent on reread; Response adds a recipe; Queue not eligible | BSL-recipe-discovery-009 |
| `baseline-recipe-discovery-household-queue` / **Show initial empty-queue loading feedback** | Initial request pending; Empty read completes | BSL-recipe-discovery-001 |
| `baseline-recipe-discovery-votes-api` / **Submit like or pass for the current recipe** | Like a card; Pass a card | BSL-recipe-discovery-006 |
| `baseline-recipe-discovery-votes-api` / **Attribute one stored vote to each recipe and member pair** | First vote; Change vote; Another member | BSL-recipe-discovery-006 |
| `baseline-recipe-discovery-votes-api` / **Count likes separately from passes** | Mixed choices; Replace like with pass | BSL-recipe-discovery-006, BSL-recipe-discovery-007 |
| `baseline-recipe-discovery-votes-api` / **Filter API discovery by category and cuisine** | Combined filters; No matching cuisine; Filters omitted | BSL-recipe-discovery-003 |
| `baseline-recipe-discovery-votes-api` / **List categories with remaining member candidates** | Exhaust a category; No categories | BSL-recipe-discovery-003 |
| `baseline-recipe-discovery-consensus-suggestions` / **Calculate consensus from all stored members** | Two members; Four members | BSL-recipe-discovery-010, BSL-recipe-discovery-011 |
| `baseline-recipe-discovery-consensus-suggestions` / **Return consensus candidates as suggestions without assignment** | Read candidates; No consensus | BSL-recipe-discovery-011 |
| `baseline-recipe-discovery-consensus-suggestions` / **Place suggestions only in unoccupied week day indices** | Occupied day; Week full | BSL-recipe-discovery-011 |
| `baseline-recipe-discovery-consensus-suggestions` / **Distinguish unanimity metadata from persisted locks** | Unanimous suggestion; Majority suggestion | BSL-recipe-discovery-011 |
| `baseline-recipe-discovery-consensus-suggestions` / **Keep suggestion display and assignment distinct at the discovery handoff** | Leave discovery for planner; Voting-open composition | BSL-recipe-discovery-005, BSL-recipe-discovery-011, BSL-recipe-discovery-012 |
| `baseline-recipe-discovery-consensus-suggestions` / **Reconsider queue eligibility after stored votes are removed** | Removed vote; Recipe remains unavailable | BSL-recipe-discovery-002, BSL-recipe-discovery-012, BSL-recipe-discovery-013 |

## U04 disposition and non-normative uncertainties

U04's observation is rechecked, **resolved as terminology/trace**, with policy acceptance still pending. Match = SQL any-like grouping; consensus = majority of all stored members; suggestion = read-only allocation/display metadata; promotion = client decision to issue assignments; assignment = persisted calendar operation; lock = separate week mutation with global vote removal. Neither suggestion isLocked nor a status named AwaitingConsensus proves a persisted lock or computed majority. UI matchCount counts local prior-interest likes, not either server concept.

| Local ID | Discrepancy / excluded guarantee | Treatment and exact review question |
| --- | --- | --- |
| DISC-U01 | VoteDto [0,1,2] labels conflict with enum/UI/SQL 1–2; discovery missing-context/body 400 responses are not declared in these OpenAPI paths. | Preserve approved contract; withhold value-zero acceptance/rejection, third vote kind and undocumented error response requirements. Later contract reconciliation: which vote kinds/labels are intended? |
| DISC-U02 | Historical SSE flow promises assigned-recipe exclusion, debounce, ring, visible-only bubbling and removal animation unsupported by current path. | Withhold these desired behaviors; draft count/front/ID-diff subset. Full-tail sort is observed but disputed movement range stays non-normative. No defect repairs. |
| DISC-U03 | Error catches only log; vote failure has no rollback/undo/retry and feed failure can look empty or retain stale cards. Member switch does not synchronously clear old stack. | Withhold reliable recovery, success feedback, member-switch freshness and stale-response guarantees. Spinner and explicit refresh are the supported subset; intended error UX requires later decision. |
| DISC-U04 | Just planned badge uses last four IDs while rendering first four; any absent ID can trigger it and an emptied queue returns before badge. | Withhold visible-four badge guarantee, planning causation and precise animation behavior; browser reduced-array mock is not server filtering proof. |
| DISC-U05 | Consensus query lacks ready/discoverable/current-week recipe exclusion; public/private defaults differ in time source and totalTime. OpenAPI unanimity/isLocked example differs. | Draft traced majority/placement/read-only metadata without common eligibility or private/public parity; withhold the computed isLocked/unanimity equality because of the conflicting example. No clock equivalence, ready-only consensus or persisted lock inferred. |
| DISC-U06 | Lock globally clears all votes; parallel assignments and lock are separate commits/requests, and later publication can reject after saving. | Record observed effects, withhold desired global purge policy, atomic promotion/lock and rollback guarantees. Broader lock/validation lifecycle stays with meal-planning. |
| DISC-U07 | No durable delivery, ordering, household partition, guaranteed refresh after lock or sequence-safe count update established. | Existing live-update owner retains transport limitations. Discovery local consequences only; no complete queue convergence claim. |
| DISC-U08 | Navigation background pulse uses any API category while page pins Supper; store/page pending signals can race. Comments promise discovery_nudge category changes but stream has no handler. | Navigation link is implemented; pending pulse is a hint, not a guaranteed Supper inventory. Nudge route/category-switch journey missing/incomplete and excluded; no placeholder requirement. |

These questions are deliberately deferred with their disputed claims. None is required to draft the settled subset; no product intent was silently chosen. If a later action depends on one, ask the consequential question one at a time before dependent work.

## Scope coverage and explicit exclusions

| Discovered journey or behavior | Disposition / reason |
| --- | --- |
| Protected page/member entry; load Supper; rank and inspect; like/pass buttons or gestures; empty navigation/refresh; connected translations and control labels | Drafted in household queue/votes deltas; shared access/context referenced to identity. |
| API-only unfiltered/combined category/cuisine reads; category inventory; sequential repeat-vote replacement; totals | Drafted in votes/API delta, with zero/labels/errors withheld under DISC-U01. |
| Any-like match view/IsMatchAsync; local UI matches | Concept/evidence recorded; no new match endpoint invented; local counter's effect on navigation drafted. |
| Majority/unanimity; smart-default API; occupied/open day slots; suggestions without writes; planner navigation/composition | Drafted in consensus delta; existing planner pending composition referenced, not duplicated. |
| Promotion requests; persisted assignment; separate lock; global clearing; recipe-specific validation purge | Complete trace in BSL-012/013/U04. Discovery consequence after vote removal drafted; broader planning policy and problematic purge/partial-commit guarantees deferred to planning owner. |
| Vote event local update; invalidation reread/removal; pending/loading | Settled subset drafted; transport/reconnect/publication remains with existing live-update owner. |
| Failure/recovery, badge, sorting range, navigation pulse and nudge | Explicit non-normative findings DISC-U02–U08; no promises invented from comments or substituted tests. |
| Fill-the-gap/Quick Find ranking and Search promotion eligibility | Existing planning/search consumer policies; immediate matching-view dependency inspected, but broader recommendation/search extraction excluded. These are not discovery consensus or persisted assignment. |
| Demo, preview, Synology, offline/device haptics, universal accessibility compliance | Deferred variants/runtime qualification under shared workflow; ordinary controls only extracted. |

## Artifacts and lifecycle

- [`baseline-recipe-discovery-household-queue`](../../openspec/changes/archive/2026-10-16-baseline-recipe-discovery-household-queue/proposal.md): proposal.md, design.md, tasks.md, specs/recipe-discovery/spec.md and CLI-created .openspec.yaml; **10 requirements / 23 scenarios**. Accepted and promoted under DISC-D03; source change remains active.
- [`baseline-recipe-discovery-votes-api`](../../openspec/changes/archive/2026-10-16-baseline-recipe-discovery-votes-api/proposal.md): proposal.md, design.md, tasks.md, specs/recipe-discovery/spec.md and CLI-created .openspec.yaml; **5 requirements / 12 scenarios**. Accepted and promoted under DISC-D03; source change remains active.
- [`baseline-recipe-discovery-consensus-suggestions`](../../openspec/changes/archive/2026-10-16-baseline-recipe-discovery-consensus-suggestions/proposal.md): proposal.md, design.md, tasks.md, specs/recipe-discovery/spec.md and CLI-created .openspec.yaml; **6 requirements / 12 scenarios**. Accepted and promoted under DISC-D03; source change remains active.

Total: **21 requirements / 47 scenarios**, accepted and promoted to the main recipe-discovery spec under DISC-D03. Active changes remain unarchived. Earlier extraction-session draft labels and BSL dispositions below are historical; DISC-D03 supersedes their acceptance/promotion status only for the mapped claims.

## Session and verification record — 2026-10-16

- Branch: `moving-to-openspec`; HEAD: `04a1c4570f9bbb01b47436790d4248635ac3179a`.
- Initial `git status --short`, branch/HEAD and selected staged/unstaged diffs inspected before writing; selected plan had no existing delta. No initial deleted paths were reported. Existing staged, unstaged and untracked inputs are listed below; no changes to these were authorized. Private before-images/index snapshot support final preservation comparison; source SHA-256 inventory follows.
- OpenSpec context/list resolved nearest root `/Users/alex/Code/whats-for-supper`, repo-local planning home, schema `spec-driven`; no standalone store selected. Existing changes/main specs inspected; only the live-update discovery-event change already covers related transport, so it was reused as an owner, not duplicated. No discovery main/delta existed.
- Authorization: current pasted user request, DISC-D01 above; no fresh acceptance/promotion decision. Installed openspec-propose workflow used; CLI scaffolded each change and current proposal/spec/design/task instructions supplied artifact paths, dependencies and templates. Sequential bounded extraction performed without inter-slice approval requests.
- Completed evidence: BSL-recipe-discovery-001–013 and full mapping/exclusion inventory above.
- **Passed:** read-only source/assertion reconciliation and initial strict checks for each completed draft. A transient validation of the second scaffold before its spec existed failed (missing delta) after a temporary helper import error; helper corrected and selected strict validation passed. No repository dependency changed.
- **Passed:** selected strict validation for all three discovery changes; combined `openspec validate --all --strict --no-interactive` reported 61 passed / 0 failed. Unrelated informational notices about already-promoted recipe-library headers do not fail validation or authorize archival fixes.
- **Passed:** explicit 16-path `task verify` returned exit 0; inspected record selected documentation/spec:check/content, all passed, other implementation checks not-applicable. Tested identity before this final evidence/checkbox update: `61609a96cd4d6256f3058e5ddf28e625e6a8c714be6163469490fa0ca5b0f177`. The harness records task acceptance as not-evaluated; that is not human acceptance. After this record update, repeat final verification for the new documentation identity and report its result directly in the final response.
- **Failed/blocked final checks:** none at this checkpoint. The transient incomplete-scaffold failure above was corrected; runtime remains not-run, not passed.
- **Not-run:** runtime/API/browser/database/device/deployment qualification, expressly excluded by user. Existing test assertions were inspected only.
- **Not-applicable:** implementation red/green, generated client synchronization, application build/tests for changed behavior (no behavior changed), migration/deployment/archival/promotion.
- Scope review: task-owned files are this plan and the three discovery change directories only; index/routing unchanged. Final before-image and staged-index comparison required; no staging/commit/publish. A comparison during reconciliation found concurrent edits to pre-existing meal-planning and recipe-capture changes/plans and the baseline index; they were left untouched. The staged index was unchanged. These are not task-owned edits or verification claims.
- Exact next action: human review the validated drafts and withheld DISC-U01–U08 claims, then select acceptance or a bounded reconciliation question. Do not call this capability baseline-complete or promote its main spec without explicit authorization.

### Exact documentation verification invocation

The following explicit path set was reviewed; it includes every task-owned changed/new file, including CLI metadata. Rerun it after any documentation edits. It does not qualify excluded concurrent work.

```sh
task verify -- docs/openspec-baseline/recipe-discovery.md openspec/changes/baseline-recipe-discovery-consensus-suggestions/.openspec.yaml openspec/changes/baseline-recipe-discovery-consensus-suggestions/design.md openspec/changes/baseline-recipe-discovery-consensus-suggestions/proposal.md openspec/changes/baseline-recipe-discovery-consensus-suggestions/specs/recipe-discovery/spec.md openspec/changes/baseline-recipe-discovery-consensus-suggestions/tasks.md openspec/changes/baseline-recipe-discovery-household-queue/.openspec.yaml openspec/changes/baseline-recipe-discovery-household-queue/design.md openspec/changes/baseline-recipe-discovery-household-queue/proposal.md openspec/changes/baseline-recipe-discovery-household-queue/specs/recipe-discovery/spec.md openspec/changes/baseline-recipe-discovery-household-queue/tasks.md openspec/changes/baseline-recipe-discovery-votes-api/.openspec.yaml openspec/changes/baseline-recipe-discovery-votes-api/design.md openspec/changes/baseline-recipe-discovery-votes-api/proposal.md openspec/changes/baseline-recipe-discovery-votes-api/specs/recipe-discovery/spec.md openspec/changes/baseline-recipe-discovery-votes-api/tasks.md
```

### Existing Git inputs (preserved)

The initial status was captured before scaffold creation; this durable list uses the saved before-image status with the newly scaffolded discovery metadata excluded. No pre-existing discovery plan edits were present. `M ` means staged; `MM` includes unstaged work; `??` means untracked.

```text
M  .github/workflows/validate.yml
M  Taskfile.yml
M  docs/openspec-baseline-plan.md
M  docs/openspec-baseline/background-processing.md
M  docs/openspec-baseline/household-identity.md
M  docs/openspec-baseline/household-live-updates.md
MM docs/openspec-baseline/meal-planning.md
M  docs/openspec-baseline/recipe-library.md
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/.openspec.yaml
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/design.md
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/proposal.md
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/specs/background-processing/spec.md
A  openspec/changes/baseline-background-processing-remaining-shared-behavior/tasks.md
A  openspec/changes/baseline-household-identity-capture-attribution/.openspec.yaml
A  openspec/changes/baseline-household-identity-capture-attribution/design.md
A  openspec/changes/baseline-household-identity-capture-attribution/proposal.md
A  openspec/changes/baseline-household-identity-capture-attribution/specs/household-identity/spec.md
A  openspec/changes/baseline-household-identity-capture-attribution/tasks.md
A  openspec/changes/baseline-household-identity-member-context-lifecycle/.openspec.yaml
A  openspec/changes/baseline-household-identity-member-context-lifecycle/design.md
A  openspec/changes/baseline-household-identity-member-context-lifecycle/proposal.md
A  openspec/changes/baseline-household-identity-member-context-lifecycle/specs/household-identity/spec.md
A  openspec/changes/baseline-household-identity-member-context-lifecycle/tasks.md
A  openspec/changes/baseline-household-identity-member-context-transport/.openspec.yaml
A  openspec/changes/baseline-household-identity-member-context-transport/design.md
A  openspec/changes/baseline-household-identity-member-context-transport/proposal.md
A  openspec/changes/baseline-household-identity-member-context-transport/specs/household-identity/spec.md
A  openspec/changes/baseline-household-identity-member-context-transport/tasks.md
M  openspec/changes/baseline-household-identity-member-removal/design.md
M  openspec/changes/baseline-household-identity-member-removal/specs/household-identity/spec.md
M  openspec/changes/baseline-household-identity-member-renaming/design.md
M  openspec/changes/baseline-household-identity-member-renaming/specs/household-identity/spec.md
M  openspec/changes/baseline-household-identity-profile-switching/design.md
M  openspec/changes/baseline-household-identity-profile-switching/specs/household-identity/spec.md
A  openspec/changes/baseline-household-live-updates-discovery-events/.openspec.yaml
A  openspec/changes/baseline-household-live-updates-discovery-events/design.md
A  openspec/changes/baseline-household-live-updates-discovery-events/proposal.md
A  openspec/changes/baseline-household-live-updates-discovery-events/specs/household-live-updates/spec.md
A  openspec/changes/baseline-household-live-updates-discovery-events/tasks.md
A  openspec/changes/baseline-household-live-updates-grocery-lifecycle-dispatch/.openspec.yaml
A  openspec/changes/baseline-household-live-updates-grocery-lifecycle-dispatch/design.md
A  openspec/changes/baseline-household-live-updates-grocery-lifecycle-dispatch/proposal.md
A  openspec/changes/baseline-household-live-updates-grocery-lifecycle-dispatch/specs/household-live-updates/spec.md
A  openspec/changes/baseline-household-live-updates-grocery-lifecycle-dispatch/tasks.md
A  openspec/changes/baseline-household-live-updates-schedule-events/.openspec.yaml
A  openspec/changes/baseline-household-live-updates-schedule-events/design.md
A  openspec/changes/baseline-household-live-updates-schedule-events/proposal.md
A  openspec/changes/baseline-household-live-updates-schedule-events/specs/household-live-updates/spec.md
A  openspec/changes/baseline-household-live-updates-schedule-events/tasks.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/.openspec.yaml
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/design.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/proposal.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/specs/meal-planning/spec.md
A  openspec/changes/baseline-meal-planning-non-cooking-day-plans/tasks.md
A  openspec/changes/baseline-recipe-library-claim-corrections/.openspec.yaml
A  openspec/changes/baseline-recipe-library-claim-corrections/design.md
A  openspec/changes/baseline-recipe-library-claim-corrections/proposal.md
A  openspec/changes/baseline-recipe-library-claim-corrections/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-claim-corrections/tasks.md
M  openspec/changes/baseline-recipe-library-deletion-restore-purge/design.md
M  openspec/changes/baseline-recipe-library-deletion-restore-purge/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-discoverability/design.md
M  openspec/changes/baseline-recipe-library-detail-discoverability/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-editing/design.md
M  openspec/changes/baseline-recipe-library-detail-editing/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-library-detail-reading/design.md
M  openspec/changes/baseline-recipe-library-detail-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/.openspec.yaml
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/design.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/proposal.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-regeneration-acceptance/tasks.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/.openspec.yaml
A  openspec/changes/baseline-recipe-library-hero-retrieval/design.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/proposal.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-hero-retrieval/tasks.md
A  openspec/changes/baseline-recipe-library-instruction-provider/.openspec.yaml
A  openspec/changes/baseline-recipe-library-instruction-provider/design.md
A  openspec/changes/baseline-recipe-library-instruction-provider/proposal.md
A  openspec/changes/baseline-recipe-library-instruction-provider/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-instruction-provider/tasks.md
M  openspec/changes/baseline-recipe-library-list-visibility/design.md
M  openspec/changes/baseline-recipe-library-list-visibility/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-lookup-reading/.openspec.yaml
A  openspec/changes/baseline-recipe-library-lookup-reading/design.md
A  openspec/changes/baseline-recipe-library-lookup-reading/proposal.md
A  openspec/changes/baseline-recipe-library-lookup-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-lookup-reading/tasks.md
A  openspec/changes/baseline-recipe-library-original-photo-append/.openspec.yaml
A  openspec/changes/baseline-recipe-library-original-photo-append/design.md
A  openspec/changes/baseline-recipe-library-original-photo-append/proposal.md
A  openspec/changes/baseline-recipe-library-original-photo-append/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-original-photo-append/tasks.md
A  openspec/changes/baseline-recipe-library-persisted-facts/.openspec.yaml
A  openspec/changes/baseline-recipe-library-persisted-facts/design.md
A  openspec/changes/baseline-recipe-library-persisted-facts/proposal.md
A  openspec/changes/baseline-recipe-library-persisted-facts/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-persisted-facts/tasks.md
M  openspec/changes/baseline-recipe-library-ratings-notes/design.md
M  openspec/changes/baseline-recipe-library-ratings-notes/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-stack-browsing/.openspec.yaml
A  openspec/changes/baseline-recipe-library-stack-browsing/design.md
A  openspec/changes/baseline-recipe-library-stack-browsing/proposal.md
A  openspec/changes/baseline-recipe-library-stack-browsing/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-stack-browsing/tasks.md
A  openspec/changes/baseline-recipe-library-status-provider/.openspec.yaml
A  openspec/changes/baseline-recipe-library-status-provider/design.md
A  openspec/changes/baseline-recipe-library-status-provider/proposal.md
A  openspec/changes/baseline-recipe-library-status-provider/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-status-provider/tasks.md
A  openspec/changes/baseline-recipe-library-summary-reading/.openspec.yaml
A  openspec/changes/baseline-recipe-library-summary-reading/design.md
A  openspec/changes/baseline-recipe-library-summary-reading/proposal.md
A  openspec/changes/baseline-recipe-library-summary-reading/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-summary-reading/tasks.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/.openspec.yaml
A  openspec/changes/baseline-recipe-library-trash-pending-controls/design.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/proposal.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-trash-pending-controls/tasks.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/.openspec.yaml
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/design.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/proposal.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/specs/recipe-library/spec.md
A  openspec/changes/baseline-recipe-library-update-persistence-boundaries/tasks.md
M  openspec/changes/baseline-recipe-library-view-original/design.md
M  openspec/changes/baseline-recipe-library-view-original/specs/recipe-library/spec.md
M  openspec/changes/baseline-recipe-quality-issue-reporting/design.md
M  openspec/changes/baseline-recipe-quality-issue-reporting/specs/recipe-quality/spec.md
M  openspec/changes/baseline-recipe-sharing-bundle-export-import/design.md
M  openspec/changes/baseline-recipe-sharing-bundle-export-import/specs/recipe-sharing/spec.md
M  openspec/specs/background-processing/spec.md
M  openspec/specs/household-identity/spec.md
M  openspec/specs/household-live-updates/spec.md
M  openspec/specs/meal-planning/spec.md
M  openspec/specs/recipe-library/spec.md
?? openspec/changes/baseline-meal-planning-deferral-removal/.openspec.yaml
?? openspec/changes/baseline-meal-planning-deferral-removal/design.md
?? openspec/changes/baseline-meal-planning-deferral-removal/proposal.md
?? openspec/changes/baseline-meal-planning-deferral-removal/specs/meal-planning/spec.md
?? openspec/changes/baseline-meal-planning-deferral-removal/tasks.md
?? openspec/changes/baseline-meal-planning-occupied-recipe-replacement/.openspec.yaml
?? openspec/changes/baseline-meal-planning-occupied-recipe-replacement/design.md
?? openspec/changes/baseline-meal-planning-occupied-recipe-replacement/proposal.md
?? openspec/changes/baseline-meal-planning-occupied-recipe-replacement/specs/meal-planning/spec.md
?? openspec/changes/baseline-meal-planning-occupied-recipe-replacement/tasks.md
?? openspec/changes/baseline-meal-planning-recipe-movement/.openspec.yaml
?? openspec/changes/baseline-meal-planning-recipe-movement/design.md
?? openspec/changes/baseline-meal-planning-recipe-movement/proposal.md
?? openspec/changes/baseline-meal-planning-recipe-movement/specs/meal-planning/spec.md
?? openspec/changes/baseline-meal-planning-recipe-movement/tasks.md
?? openspec/changes/baseline-meal-planning-week-day-transitions/.openspec.yaml
?? openspec/changes/baseline-recipe-capture-completion-advice/.openspec.yaml
?? openspec/changes/baseline-recipe-capture-completion-advice/design.md
?? openspec/changes/baseline-recipe-capture-completion-advice/proposal.md
?? openspec/changes/baseline-recipe-capture-completion-advice/specs/recipe-capture/spec.md
?? openspec/changes/baseline-recipe-capture-completion-advice/tasks.md
?? openspec/changes/baseline-recipe-capture-intake-boundaries/.openspec.yaml
?? openspec/changes/baseline-recipe-capture-intake-boundaries/design.md
?? openspec/changes/baseline-recipe-capture-intake-boundaries/proposal.md
?? openspec/changes/baseline-recipe-capture-intake-boundaries/specs/recipe-capture/spec.md
?? openspec/changes/baseline-recipe-capture-intake-boundaries/tasks.md
```

### Source identity inventory

SHA-256 at extraction (not runtime identity). Relevant executable, contract, assertion and substitution inputs only. Documentation-owner references are reviewed dependencies and may already be dirty; preservation compares them to before-images.

```text
63bfd65309bcb8f7722e009f9a940cde97992792f84f19497d1f721bdd25e557  api/src/RecipeApi/Models/RecipeMatch.cs
900b32da9b769b7f0fd83fa77f782b91f3ae3117708484ba4ff510c53c877c51  pwa/src/lib/api/generated/api/discovery/item/vote/index.ts
9f47e979d04721b1166edd9272609f66ede73477a9b0b367b120040d6ce24713  pwa/src/lib/api/generated/api/discovery/index.ts
ca8b34776defba889af567f2f08a986e5e7c8944b322cc49e163b858987e0ed8  pwa/src/app/(app)/discovery/page.tsx
c2c13409ce7177b3880b11d208111a7bc0998731a8765771f2ad9a0c56c67396  pwa/src/components/discovery/DiscoveryCard.tsx
58a6d6011fd9027f4cfa3e0e654ffd5a2964f1ffe7e458bd3e60d4d03e282d78  pwa/src/components/common/Navigation.tsx
5e00b18f157fdc0bd59cb47561bbe28713de19704a8c38fcd08bd73ee0c6f22a  pwa/src/lib/api/discovery.ts
c5cd4cfebddd8d5c1f2827c522a236fe12c504130ea0991c07bc8fc46376aa95  pwa/src/lib/api/api-client.ts
6bc836b62f5af6c79efdf8461699e3becbfec9a465fca1fd9cc6150f053aa012  pwa/src/store/discoveryStore.ts
0e1f1b91e459b77fd90ca6a071ff5cb8fc0cbcc64e8cab54a00b8232c9ab2107  pwa/src/hooks/useScheduleStream.ts
e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8  pwa/src/store/weekStore.ts
7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a  pwa/src/lib/api/planner.ts
898e7367a9d83aec4e5673b5cc541fe7e6ea29211d7a2b14ed23e9b4a5a2c5ae  pwa/src/locales/index.ts
5070867f5cb42505922f4cacb491aa77d254e12684a04a1e57e683df0b2e1aef  pwa/src/proxy.ts
bb6529660b3509953947e2abc4f0a7c0a46b90c0c522f599120cefbff5b5bed1  api/src/RecipeApi/Controllers/DiscoveryController.cs
d441c27013fa3c5f329b336c400ee523307ec8f6bf18e3e5b5bcadf653629adb  api/src/RecipeApi/Services/DiscoveryService.cs
d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91  api/src/RecipeApi/Controllers/ScheduleController.cs
8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec  api/src/RecipeApi/Services/ScheduleService.cs
92084cf105ec2941e713fca9053609f4974156b6440fb72f9b623cf918916447  api/src/RecipeApi/Data/RecipeDbContext.cs
8b5770a9b0fdca02321ca9d132e64381da9e366149ac10feb65a7554914809db  api/src/RecipeApi/Models/RecipeVote.cs
57afdbf1d8be2d9fc22486b27e7b4475c82e648741da0efd7c43c61e14995f99  api/src/RecipeApi/Dto/SmartDefaultsDto.cs
4d5dcc9f7d9993abb4c59802f770da139c4875c55544df8410553332a04a2f64  api/src/RecipeApi/Infrastructure/FamilyMemberIdModelBinder.cs
6fa3cd08587220fc4e18803f6ba020e494b81211cf99c53ec10de23ddd46f11d  api/src/RecipeApi/Infrastructure/SuccessWrappingFilter.cs
3f7767cd704299374ebdcd89a11709680013ba26a477ad23f41da54e6da55161  api/database/schema.sql
0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff  specs/openapi.yaml
42136b737c73020614f94e26240008d805a762d6cea67c1991084f4fa3aee8b8  api/src/RecipeApi.Tests/Services/DiscoveryServiceTests.cs
3f97e23a4ffadccd19a2068bca01ba05956556f73ac9a7e929f02e5c9a815896  api/src/RecipeApi.Tests/Integration/DiscoveryIntegrationTests.cs
c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43  api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs
6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3  api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs
ea4aff024db3114fb6dc7db73dfa66d898d511c5ac36f5ea50348bb981b2bfd8  api/src/RecipeApi.Tests/Services/NonCookingScheduleTests.cs
4f292fc990b79f5db66d06d166a8317a13748dc0003e2c1f5dc1ed615954db82  api/src/RecipeApi.Tests/Infrastructure/TestDbContextFactory.cs
0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c  api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs
7eb0ae1e1dc17a6af1306d40fc38edacfdff293f8f40190b59a5298881bff6d8  pwa/e2e/discovery.spec.ts
acac903c0965b11c62b093ebfd87986e8312099fa5c6a4f556d46e69dd1af708  pwa/src/store/discoveryStore.test.ts
439c59991bd4790e995767f7beac0e91ae95a20bb50e21d9eac3bf7458b50617  pwa/src/components/discovery/DiscoveryCard.test.tsx
2763118a45acc45c381ecb2bd8dff557c85a02df891d9fd3b5e3fc3987e666a1  pwa/src/store/weekStore.test.ts
402b5a1b872f625dc1425f46afdede2c9378dcc473088159774a8455b5d188e2  pwa/e2e/fixtures.ts
063ed6d6629ccde163487a92543ae36918183a81b7301dd01a5389248cbcbd07  pwa/e2e/mock-api.ts
6e15ab7bb105dea06751d9e8dc5d3e4d280f0eb2d465553fbea5e2da65e91532  pwa/playwright.config.ts
a7c638fa85589f5b472872887925538cb46d13cac08f8ecea7008a1bc2576159  docs/flows/user-flows/sse-discovery-live-updates.md
0e37a5178897e2e82699c3e5b9585bc774be81c5c74644c77249169e3f95cd2d  docs/user-guide.md
```


## Acceptance and promotion — DISC-D03 (2026-10-16)

- **Authorization:** User: “accept it and build the spec”, following review of the three drafts and remaining gaps. This explicitly accepts the 21 mapped requirements/47 scenarios and authorizes their documentation-only main-spec promotion. DISC-U01–U08 and U04 limitations remain non-normative exclusions; no new product policy is inferred.
- **Scope:** Used installed openspec-sync-specs workflow. Current CLI context and all three status responses resolve repo-local root `/Users/alex/Code/whats-for-supper`; only their `artifactPaths.specs.existingOutputPaths` supplied deltas. Current specs instructions retrieved successfully. Main recipe-discovery spec was absent. The common Purpose is copied verbatim and all disjoint ADDED requirement blocks are preserved byte-for-byte under one main Requirements heading.
- **Artifacts:** `openspec/specs/recipe-discovery/spec.md` created; this capability plan lifecycle updated; only the recipe-discovery summary row in `docs/openspec-baseline-plan.md` updated. Source change artifacts are unchanged, active and unarchived.
- **Baseline:** Branch `moving-to-openspec`, HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`. Staged/unstaged/untracked state inspected before writes; no deleted inputs. Plan and index already contain prior edits; private content/index before-images preserve them. Existing unrelated staged and untracked work is outside this promotion.
- **Evidence recheck:** All 41 extraction source/contract/assertion digests still match. This is source preservation, not runtime qualification. Rechecked exact delta content: 21 unique requirements, 47 scenarios, identical Purpose and no duplicate requirement titles.
- **Validation:** Run `openspec validate --specs --strict --no-interactive`, selected strict change validation, and `openspec validate --all --strict --no-interactive`; then the exact task-owned path command below. Final actual outcomes are reported in the final response and `.task/agent-finish/last-run.json`, avoiding a claim about a future check.
- **Not-run:** Runtime, live API, browser, PostgreSQL, device and deployment qualification, per existing restriction. **Not-applicable:** Application red/green, code/client regeneration, migrations/deployment. Acceptance/promotion does not turn substituted assertions into runtime proof.
- **Next action:** Await separately selected work on an excluded policy question or runtime qualification. Do not archive, implement or extract a successor automatically.

```sh
task verify -- docs/openspec-baseline/recipe-discovery.md docs/openspec-baseline-plan.md openspec/specs/recipe-discovery/spec.md
```


## Execution prompt

Paste this prompt and replace the session instruction with the desired bounded
scope. The default authorizes review only. Select the model in your host.

```text
Work on the recipe-discovery OpenSpec brownfield baseline in
/Users/alex/Code/whats-for-supper.
Session instruction: Review this capability's checkpoint and recommend the next
bounded slice. Do not generate specs or change application behavior.

Read AGENT.md and its active-host loading rules, then
 docs/openspec-baseline/workflow.md and
 docs/openspec-baseline/recipe-discovery.md.
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

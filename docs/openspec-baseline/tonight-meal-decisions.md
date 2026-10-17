# Tonight meal decisions baseline plan

## Current Tomorrow reconciliation — 2026-10-16

Current Home requirements match upstream `e4a48c85` after PR #242: **29 requirements / 64 scenarios**. Three existing Tomorrow/Order In recovery blocks were updated and the committed-result requirement was added exactly as accepted upstream. Current movement semantics live in [meal-rescheduling](../../openspec/specs/meal-rescheduling/spec.md), and replacement gating in [meal-assignment](../../openspec/specs/meal-assignment/spec.md). Earlier extraction counts and limitations below remain historical; see the [branch reconciliation record](meal-planning.md#incoming-branch-reconciliation--2026-10-16). No application/runtime qualification was rerun for this documentation reconciliation.

## Current planning ownership — 2026-10-16

The combined meal-planning spec has been split by responsibility. Use these current requirement owners; earlier extraction references to the combined owner, source identities and evidence below remain historical. Qualification limits are unchanged.

- [Read the household schedule through the protected GET operation](../../openspec/specs/meal-planning/spec.md#requirement-read-the-household-schedule-through-the-protected-get-operation)
- [Hand eligible Home plans back to Planner editing](../../openspec/specs/non-cooking-plans/spec.md#requirement-hand-eligible-home-plans-back-to-planner-editing)
- [Present Quick Find reads and failed-read retention](../../openspec/specs/meal-assignment/spec.md#requirement-present-quick-find-reads-and-failed-read-retention)
- [Retain status-only day-validation compatibility](../../openspec/specs/planning-lifecycle/spec.md#requirement-retain-status-only-day-validation-compatibility)
- [Submit dated-source movement through the protected operation](../../openspec/specs/meal-rescheduling/spec.md#requirement-submit-dated-source-movement-through-the-protected-operation)
- [Defer the exact dated recipe through a protected operation](../../openspec/specs/meal-rescheduling/spec.md#requirement-defer-the-exact-dated-recipe-through-a-protected-operation)
- [Expose one authoritative calendar context with schedule reads](../../openspec/specs/deployment-calendar/spec.md#requirement-expose-one-authoritative-calendar-context-with-schedule-reads)
- [Refresh expired Today context before a new action](../../openspec/specs/deployment-calendar/spec.md#requirement-refresh-expired-today-context-before-a-new-action)

## Current lifecycle checkpoint — consolidated, 2026-10-16

This capability's main spec now contains **27 requirements / 57 scenarios**.
All baseline source changes were archived after the user's explicit approval;
there is no active baseline extraction/promotion queue. Historical checkpoint,
next-session and "changes active" text below records earlier sessions only.
Evidence limitations and unresolved findings remain in the [live backlog](backlog/README.md).
See [consolidation completion](backlog/consolidation-completion.md) for accepted
scope, preserved corrections, archive warnings and verification. Archival does not
establish application correctness, runtime qualification or resolution of defects.

## Current checkpoint and scope

The documented ordinary-household supported scope is accepted and promoted under
**TM-P01 (2026-10-16)**: all three reviewed deltas, **27 requirements and 57
scenarios**, are now in [main Tonight specification](../../openspec/specs/tonight-meal-decisions/spec.md).
Discovery, evidence mappings and TM-U01–TM-U10 exclusions remain intact. Human
acceptance applies to this documented subset and its explicit limitations, not to
excluded behavior or desired defect fixes. Runtime/API/browser/database/model
qualification remains **not-run** under A34. Changes remain active.

Next action: await a separately authorized lifecycle action or application/
qualification scope. No archival, application implementation, database setup or
additional extraction is authorized by this promotion. Earlier generation-only
checkpoints below are retained as history and superseded by TM-P01.

Read [AGENT.md](../../AGENT.md) and [shared workflow](workflow.md). Current user
instructions authorize sequential successor extraction within this capability;
the former not-started/default-single-slice checkpoint is superseded for this run.

**Phase-12 reconciliation R12 (2026-10-16):** Recorded promoted documentation remains 27 requirements / 57 scenarios; no additional supported extraction gap was found within this plan's explicit boundary.
[Cross-capability review](reconciliation.md) records current inventory, shared-owner
reconciliation, evidence drift and exclusions. Current main SHA-256: `22371c75d615bf7db80aa75b911407c252040b9d6ec65ca9458901e53a116d10`.
This session grants no new acceptance or promotion. Earlier session-specific
“current user” and next-action statements retain their historical scope. A34 and
all local unresolved/excluded behavior remain in force; runtime checks are not-run.


## Authorization and installed workflow

- **TM-P01:** User “promote” on 2026-10-16 accepts the three reviewed Tonight
  deltas and authorizes documentation-only promotion to main. Scope: home-states
  10/22, goto-choices 8/17, changed-plan-recovery 9/18; total 27/57. Preserve every
  requirement/scenario, shared owner, source-evidence limitation, TM-U01–TM-U10
  and A34. No archive, implementation or runtime qualification is inferred.

- **TM-G01:** User request on 2026-10-16 approves the existing capability structure
  and authorizes discovery, reconciliation and all documentation drafts needed for
  ordinary-household Tonight coverage, including successor slices. Do not request
  drafting permission again. A10 permits implementation-supported assertions with
  traced source and inspected test bodies; A12 withholds disputed assertions;
  A34 excludes runtime/database qualification. Acceptance/promotion/archive remain
  separately authorized later stages.
- OpenSpec **1.14.2**, `openspec context --json`: nearest repository root
  `/Users/alex/Code/whats-for-supper`, no external store or members. Installed
  propose skill, `openspec/config.yaml`, configured `spec-driven` schema; changes
  CLI-scaffolded in `openspec/changes`. Dependency order proposal → specs/design
  → tasks; per-artifact CLI instructions read. Designs reconcile cross-module
  seams; tasks extract documentation, with no application implementation tasks.
- Existing inventory had no Tonight change or main spec. Existing meal-planning
  deltas are already represented in its main 93/214 requirements/scenarios and
  were reused rather than rewritten. The three new deltas add disjoint requirements
  to the same approved new capability; they are reviewed as one cumulative scope.

## Source and worktree identity

Branch `moving-to-openspec`; HEAD `04a1c4570f9bbb01b47436790d4248635ac3179a`.
Source/test claims below describe inspected working bytes at this HEAD, not a
clean-tree assumption. Target Tonight plan was initially clean. No selected
application, contract or test file had staged/unstaged edits at entry.

At entry the small index was **MM** (staged and unstaged); this session changes
only its Tonight summary row, retaining the prior bytes elsewhere. Relevant
staged dependencies: main household-identity, recipe-library, recipe-capture,
background-processing, household-live-updates and meal-planning; recipe-discovery
main was staged-added. Their associated existing changes and capability plans
were already dirty. Main cooking/grocery/member-preferences and many corresponding
changes were untracked; quality/sharing/search plans/main updates and
`scripts/agent/finish.py` were unrelated unstaged inputs. The harness’s existing
scoped-documentation behavior is consumed without edits or adoption. No tracked
or staged deletion was reported at entry; the navigation spec was already absent
and is not restored. All pre-existing additions, modifications and untracked
artifacts remain outside task ownership except the one index row.

Private before-images recorded complete porcelain status, staged/unstaged binary
diffs and SHA-256 snapshots of dirty inputs plus relevant source/spec directories
under `/tmp/tonight-*`. Durable inspected input identities appear below. The staged
index is preserved; source changes after this identity require rechecking claims.

## Capability coverage map and ten discovery fields

| Discovery field | Reconciled result |
| --- | --- |
| Actor / household | Ordinary household member under accepted page/API identity gates; household-global settings, not per-member GOTO lists |
| Entry / exit | `/home`; Profile GOTO add/remove; recipe-detail GOTO toggle; capture with GOTO intent; Quick Find, cooking, targeted Search and Planner handoffs |
| State / eligibility | Named/id-bearing ordinary recipe, Cooked, recipe-free Skipped, Mystery, empty; ready active GOTO; returned Quick Find deck, without new eligibility policy |
| Concurrency | Local guards differ by caller; no Home recovery in-flight lock, operation transaction or expected version; list PUT replaces the whole list |
| Async feedback | Home loading, optimistic choice/hydration, pending acquisition and list-save feedback, deferred server message; no inferred completion from UI |
| Failure / recovery | Logged read/write failures, retained content/deck, cancellation-before-action, validation-before-disposition, separate save/follow-up failure boundaries |
| Localization | Connected labels use `t`; Quick Find, cooked compact feedback and some errors are literal English; no complete-localization guarantee |
| Device / accessibility | Visible Close/backdrop/Back, semantic controls and recipe-free accessible edit label; no universal keyboard/focus-trap/device/offline guarantee |
| Contract / persistence | Generated SDK and approved OpenAPI → GOTO/schedule/recipe controllers/services → FamilySettings, Recipes, CalendarEvents/WeeklyPlans or workflows → stores/view |
| Acceptance evidence | Source/test-assertion inspection only; A10 implementation-supported. CLI/docs checks separately recorded; no executed behavior tests or live qualification |

| Topic | Disposition / owning evidence |
| --- | --- |
| Planned menu and cooking entry | home-states; BSL-003; cooking handles its own view/completion |
| Cooked feedback/dismiss/reopen when identity exists | home-states; BSL-003; no invented current recipe on a fresh cooked SSR mount |
| Recipe-free Order In / Eating out / custom saved plans | Already accepted meal-planning “Hand eligible Home plans back to Planner editing” and “Display the saved non-cooking choice and note”; BSL-004; no duplicate definition |
| Mystery and ordinary empty choices | home-states; BSL-004 |
| Random ready GOTO and no-ready/error fallback | goto-choices; BSL-005 |
| GOTO list configuration, removal and loaded-detail toggle | goto-choices; BSL-006/007; directly related implemented journey discovered during tracing |
| Pending GOTO description/photo creation and URL-intent registration | goto-choices; BSL-008; capture acquisition/processing remains accepted capture owner |
| Pending active GOTO and automatic stored-status ready transition | Excluded as unreachable/incomplete through actual endpoints; TM-U03/TM-U04; BSL-005/008 |
| Quick Find selection/assignment | home-states; BSL-004/010 |
| Quick Find replacement and cancellation | changed-plan-recovery; BSL-011/012 |
| Deck Skip, exhaustion at 0/1/2/4/5 results, terminal Search, flip/progress and invalidation | Already accepted meal-planning “Advance Quick Find suggestions without changing the plan”, “Select a returned Quick Find recipe for the target day”, “Present Quick Find reads and failed-read retention”, “Reconcile Quick Find after an eligible invalidation signal”, “Inspect and dismiss the Quick Find deck”; BSL-004 |
| Order In from empty state | changed-plan-recovery; BSL-009 |
| Planned Order In, Tomorrow including Sunday, defer/drop, changed-plan follow-ups | changed-plan-recovery; BSL-011/012 |
| Read/assignment failure, partial success, stale results and concurrency | All slices and TM-U01–TM-U10; BSL-002/005/006/008/010/012 |
| Voting nudge and Capture/Browse handoffs | home-states; BSL-003; directly related implemented Home journeys |
| Demo, preview/Synology variants, operator-only workflows, offline/device qualification | Explicitly excluded by ordinary-household/A09/A34 scope; PDF GOTO unavailable under accepted capture requirement |
| New eligibility/ranking, transactional recovery, defect repair or automatic retry | Excluded from normative scope; shared owner or unsupported policy, not new Tonight requirements |

`BSL-001` etc. in this map abbreviate the full `BSL-tonight-meal-decisions-001`
namespace used in the evidence and mapping sections.

## Shared accepted ownership

References below identify actual main-spec requirement titles; no invented owner
IDs or new shared-owner requirements are introduced.

- [Household identity](../../openspec/specs/household-identity/spec.md): **Gate protected
  page entry with household access**, **Authenticate protected API requests independently**.
- [Recipe library](../../openspec/specs/recipe-library/spec.md): **Represent persisted
  recipe attribution and readiness**; recipe detail retrieval remains library-owned.
- [Meal planning](../../openspec/specs/meal-planning/spec.md): **Read the household
  schedule through the protected GET operation**, **Return seven dates from the
  server UTC week**, **Project stored recipe and non-cooking read content**;
  **Submit chosen-recipe assignment through the protected operation**, **Resolve
  assignment dates from the server week**, **Invoke assignment follow-up work in
  order**, **Replace a stored assignment at the resolved date**; Quick Find titles
  in the coverage table; **Prefer an explicit movement source with legacy fallback**,
  **Push toward a later available date within the search window**, **Place cross-week
  movement in the first available target-week date**, **Preserve a skipped source
  when moving its recipe forward**, **Distinguish movement follow-ups from movement
  confirmation**; **Defer the exact dated recipe through a protected operation**,
  **Find a defer destination from server-current next week**, **Complete defer after
  affected-week follow-ups**, **Apply the shared date-delete lifecycle to
  recipe-backed entries**, **Retain status-only day-validation compatibility**.
- [Recipe capture](../../openspec/specs/recipe-capture/spec.md): **Validate and submit
  a description capture**, **Create an initial recipe from description intake**,
  **Generate recipe content from the submitted description**, **Retain a description
  draft after submission failure**, **Finalize recipe readiness and broadcast
  completion**, **Finalize photo recipe readiness and broadcast completion**. GOTO
  registration adds no new acquisition or readiness policy.
- [Background processing](../../openspec/specs/background-processing/spec.md):
  **Persist initial workflow and task identities before returning**, **Derive
  completion from remaining task states**; no “accepted means ready” inference.
- [Household live updates](../../openspec/specs/household-live-updates/spec.md):
  **Select Today independently from the received snapshot**, **Preserve Today's
  recent optimistic recipe guard**, **Forward ready hints beyond pending capture
  tracking**, **Attempt incremental schedule publication after supported saves**.
- [Cooking](../../openspec/specs/cooking/spec.md): **Enter cooking with the displayed
  recipe identity**, **Submit completion for the viewed recipe and current local
  date**, **Confirm local supper completion only for a matching confirmed result**.
- Discovery owns candidate/vote/ranking policy; main **Return consensus candidates
  as suggestions without assignment** is relevant to suggestion-versus-persistence
  distinction, but does not establish exact fill-the-gap eligibility. No equivalent
  accepted rule was found for every fill-the-gap filter; this extraction references
  returned cards and withholds a universal ready-only claim (TM-U10).

## Discrepancies, exclusions and human-review qualifications

| ID | Finding / exact withheld assertion | Treatment |
| --- | --- | --- |
| TM-U01 | Reads can inspect adjacent server weeks for local today, but assignment/Tomorrow still send week zero plus browser weekday; mixed server UTC, server date and local date are not equivalent at boundaries | Withhold universal correct-local-date targeting and midnight/timezone safety; no date-policy fix |
| TM-U02 | SSR, REST sync and live writers race; ordinary sync has a 20s guard, received-update offers have a 2s differing-ID guard and same-ID hydration guard is not request-generation ordering | Withhold latest-wins/convergence/atomic-store guarantees; accepted live owner remains authoritative |
| TM-U03 | Active GOTO contract says random READY; service returns only ready nondeleted Recipes or 404. Home unit/E2E inject pending active data | Pending-active-to-ready Home journey unreachable from this current endpoint; record tests as substitutions, not a production capability |
| TM-U04 | RecipeReadyProcessor never changes family_goto; list GET deserializes JSON unchanged. Settings refetch does not promote stored pending status/name | Withhold automatic ready-list transition/name replacement despite comments referring to retired MarkGotoReadyProcessor |
| TM-U05 | Capture may persist and accept background work before separate list PUT fails; MinimalCapture failure UI does not compensate/delete that recipe | Withhold all-or-nothing GOTO creation, no-orphan guarantee and safe unchanged retry; source-only failure branches remain limitations |
| TM-U06 | Whole-list read/modify/PUT has no merge/version/idempotency protocol. GET no-list contract permits 404; service returns empty list, including deserialization failure | Draft normal stored read/replace only; withhold precise missing/corrupt-list contract and safe concurrent updates; no repair |
| TM-U07 | Home validates Order In before disposition, posts replacement in background, closes before awaited week init and logs errors without compensation | Withhold atomic success, confirmed replacement, rollback, dedicated recovery error panel and safe-retry memory; do not copy Planner guarantees |
| TM-U08 | Home has no submission ref lock; disposition reads currentRecipe at action time instead of a separately captured original identity. Other clients/local choices may alter it | Withhold double-submit suppression, captured-original guarantee and concurrent reservation/conflict safety |
| TM-U09 | Order In Drop retains server recipe association through legacy status-only validation while local state is cleared; cooked SSR starts without recipe and sync’s Cooked branch does not hydrate it; skipCookedCelebration is not consumed by Home | Withhold “Drop deletes” in Order In, universal reopen-after-reload, and automatic compact badge on remote completion; describe only executable branches |
| TM-U10 | FillTheGapAsync reads RecipeMatches joined Recipes then DiscoveryRecipes fallback, excludes assigned IDs and caps at five; first query lacks explicit ready/deleted filtering. Factories/views and mocks differ from relational production | No universal ready/available, reservation or uniform ranking guarantee; keep server policy ownership and exact query observation non-normative |

No unresolved human decision blocks the documented subset. TM-P01 accepts that
subset with these qualifications retained; it does not settle desired fixes or
authorize promoting excluded behavior.

## Evidence ledger

All entries: actor ordinary household member; content identity is HEAD plus the
working-byte SHA-256 table below. Behavior class **implementation-supported**,
never runtime-verified. Existing tests were read, **not-run** under A34; confidence
is qualified per entry. No named test or comment alone establishes a claim.

### BSL-tonight-meal-decisions-001 — Home date initialization

- **Actor / entry / outcome / rules:** Home date initialization; ordinary-household path. Entry server/local dates match → seed; mismatch → skip. Initial server fetch failure logs and provides absent content; client sync is separate. High confidence for tested date gate, medium for full SSR chain. TM-U01/TM-U02.
- **Ordered trace:** Home page read → serverFetch GET /api/schedule?weekOffset=0 / approved schedule contract → ScheduleController.GetSchedule → ScheduleService.GetScheduleAsync → CalendarEvents/WeeklyPlans → TodayStoreInitializer → todayStore.init.
- **Durable source anchors:** `pwa/src/app/(app)/home/page.tsx` HomePage; `pwa/src/components/TodayStoreInitializer.tsx` TodayStoreInitializer; `pwa/src/lib/api/server-client.ts` serverFetch; `api/src/RecipeApi/Services/ScheduleService.cs` GetScheduleAsync.
- **Inspected assertions and substitutions:** `pwa/src/components/TodayStoreInitializer.test.tsx`: “does not seed Home with the server’s Monday plan while it is Sunday locally” asserts init was not called; same-local-day table asserts init(null,3,plan). Fake timers and spy, not a server/browser integration.
- **Agreement / limitations / confidence:** Entry server/local dates match → seed; mismatch → skip. Initial server fetch failure logs and provides absent content; client sync is separate. High confidence for tested date gate, medium for full SSR chain. TM-U01/TM-U02.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-002 — Tonight read reconciliation and recent-write boundaries

- **Actor / entry / outcome / rules:** Tonight read reconciliation and recent-write boundaries; ordinary-household path. Loading ends in finally; rejected read retains state. Twenty-second ordinary guard does not override returned Cooked/Skipped branches; no universal latest-response guard. High for asserted branches, medium for catch/loading/order; TM-U01/TM-U02/TM-U09.
- **Ordered trace:** Home mount → todayStore.sync → planner.getSchedule → generated GET /api/schedule and approved contract → GetScheduleAsync → stored dated projection → ordinary/Cooked/Skipped local branch.
- **Durable source anchors:** `pwa/src/store/todayStore.ts` sync/init; `pwa/src/lib/api/planner.ts` getSchedule/normalizeScheduleRecipe; `pwa/src/components/home/HomeCommandCenter.tsx` mount sync and loading branch.
- **Inspected assertions and substitutions:** `pwa/src/store/todayStore.test.ts`: adjacent-week test asserts GET offsets 0 then -1 and saved non-cooking result; “shows the recipe when a saved plan has been replaced on the server” asserts status/recipe; “updates details if ID matches during optimistic window (SMART RECONCILIATION)” asserts hydrated description. Reads/API are mocked.
- **Agreement / limitations / confidence:** Loading ends in finally; rejected read retains state. Twenty-second ordinary guard does not override returned Cooked/Skipped branches; no universal latest-response guard. High for asserted branches, medium for catch/loading/order; TM-U01/TM-U02/TM-U09.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-003 — Planned/cooked presentation and related Home handoffs

- **Actor / entry / outcome / rules:** Planned/cooked presentation and related Home handoffs; ordinary-household path. Named ID recipe and ordinary status gate menu. Cooked dismissal is mounted local state; missing current identity cannot open cooking. Voting read fails silently. Medium confidence for cooked/nudge unasserted branches; no remote compact-badge guarantee or full localization; TM-U09.
- **Ordered trace:** Shared schedule-derived todayStore → HomeCommandCenter → TonightMenuCard / CookedSuccessCard → CooksMode or recovery; next-week generated schedule GET → voting nudge → Discovery. Capture/Browse links navigate only.
- **Durable source anchors:** `pwa/src/components/home/HomeCommandCenter.tsx` isCooked, cookedDismissed, voting effect and JSX; `pwa/src/components/home/TonightMenuCard.tsx`; `pwa/src/components/home/HomeSections.tsx`; `pwa/src/app/(app)/home/page.tsx` isDone projection.
- **Inspected assertions and substitutions:** `pwa/src/components/home/HomeCommandCenter.test.tsx` “keeps the existing empty-day fallback and planned-meal controls” asserts Skip, recovery and no pivot Order In; HomeSections/CooksMode/stores are substituted. `pwa/e2e/home-recipe.spec.ts` “Completing Cook Mode marks meal as cooked” asserts completion request and cooked-success after reconnect/reload with mocked HTTP/SSE. It does not qualify persistence.
- **Agreement / limitations / confidence:** Named ID recipe and ordinary status gate menu. Cooked dismissal is mounted local state; missing current identity cannot open cooking. Voting read fails silently. Medium confidence for cooked/nudge unasserted branches; no remote compact-badge guarantee or full localization; TM-U09.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-004 — Mystery, saved recipe-free plans and Home Quick Find deck handoff

- **Actor / entry / outcome / rules:** Mystery, saved recipe-free plans and Home Quick Find deck handoff; ordinary-household path. Deck is read-only until selection; Close/backdrop retire fetch generation; initial failure logs and ends loading, retaining deck on refresh failure. Shared main deck requirements own these behaviors; no independent UI ranking/eligibility policy. High for asserted deck/Mystery/edit branches, medium for unasserted failure/close branches; TM-U10.
- **Ordered trace:** Home choice → QuickFindModal → planner.getFillTheGap → generated GET /api/schedule/fill-the-gap?weekOffset=0 / contract → ScheduleController.FillTheGap → ScheduleService.FillTheGapAsync → RecipeMatches/Recipes/DiscoveryRecipes and CalendarEvents exclusions → returned cards; selection hands to Home or targeted Search.
- **Durable source anchors:** `pwa/src/components/home/HomeCommandCenter.tsx` showSupperChoices/handleQuickFindSelect; `pwa/src/components/planner/QuickFindModal.tsx` fetchSuggestions/handleNext/searchUrl; `api/src/RecipeApi/Services/ScheduleService.cs` FillTheGapAsync.
- **Inspected assertions and substitutions:** Home test “offers empty-night recipe choices for Mystery night without clearing its saved plan” asserts pivot, Quick Find and no markOrderedIn. Saved-plan tables assert label/icon/note, accessible edit name and dated Planner URL. QuickFindModal.test.tsx asserts empty disabled No more picks, one-card terminal/restart, two-card ordering, four-card indicator count, fifth-card onSelect, shrink clamping, newest-response preservation and per-week invalidation; API/store/framer motion are mocked.
- **Agreement / limitations / confidence:** Deck is read-only until selection; Close/backdrop retire fetch generation; initial failure logs and ends loading, retaining deck on refresh failure. Shared main deck requirements own these behaviors; no independent UI ranking/eligibility policy. High for asserted deck/Mystery/edit branches, medium for unasserted failure/close branches; TM-U10.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-005 — Ready-only random active GOTO and Home fallback

- **Actor / entry / outcome / rules:** Ready-only random active GOTO and Home fallback; ordinary-household path. No current runtime run. Nondeleted persisted readiness filter and random selection are executable; no distribution/rotation assertion. Generic active error maps null. High for ready/no-ready, medium for random/image/catch branches; TM-U03.
- **Ordered trace:** Home → familyStore.loadActiveGoTo → generated GET /api/goto/active / approved ready summary → GoToController.GetActive → GoToService.GetActiveGoToAsync → family_goto JSON plus Recipes → active ready item / 404 → TonightPivotCard; confirmation → Today assignment.
- **Durable source anchors:** `api/src/RecipeApi/Services/GoToService.cs` GetActiveGoToAsync; `api/src/RecipeApi/Controllers/GoToController.cs` GetActive; `pwa/src/store/familyStore.ts` loadActiveGoTo; `pwa/src/components/home/TonightPivotCard.tsx` hasGoto/gotoReady.
- **Inspected assertions and substitutions:** GoToIntegrationTests.cs GetActiveGoToAsync_FiltersReadyRecipes asserts only ready ID with one ready and one pending; ReturnsNull_WhenNoneReady asserts null. TonightPivotCard.test.tsx asserts no confirm and Profile link without GOTO; ready label Make This Tonight. Home pending re-fetch test injects pending then ready and only asserts load count two; it is not endpoint evidence.
- **Agreement / limitations / confidence:** No current runtime run. Nondeleted persisted readiness filter and random selection are executable; no distribution/rotation assertion. Generic active error maps null. High for ready/no-ready, medium for random/image/catch branches; TM-U03.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-006 — GOTO list save and loaded-detail toggle

- **Actor / entry / outcome / rules:** GOTO list save and loaded-detail toggle; ordinary-household path. Whole replacement save, local settings only after awaited success. Toggle pending flag disabled and success/error toast; no optimistic list mutation before PUT. High round-trip, medium toggle/removal and concurrency. Missing-list contract discrepancy withheld; TM-U06.
- **Ordered trace:** Profile/detail → familyStore loadGoTo/saveGoTo → generated GET/PUT /api/goto with items / contract → GoToController.GetList/UpdateList → GoToService.GetGoToListAsync/SaveGoToListAsync → FamilySettings key family_goto JSON → local list / toast.
- **Durable source anchors:** `pwa/src/components/recipes/RecipeDetailSheet.tsx` handleSetGoto/isCurrentGoto/isSavingGoto; `pwa/src/store/familyStore.ts` saveGoTo; `api/src/RecipeApi/Services/GoToService.cs` list methods; `api/src/RecipeApi/Data/RecipeDbContext.cs` FamilySettings.
- **Inspected assertions and substitutions:** GoToIntegrationTests.cs SaveThenGet_RoundTrips asserts two items and both descriptions; NoData_ReturnsEmpty asserts empty. RecipeDetailSheet.test.tsx mocks loadGoTo/saveGoTo with empty settings but contains no direct toggle success/failure assertion. Source provides that branch; tests do not prove it.
- **Agreement / limitations / confidence:** Whole replacement save, local settings only after awaited success. Toggle pending flag disabled and success/error toast; no optimistic list mutation before PUT. High round-trip, medium toggle/removal and concurrency. Missing-list contract discrepancy withheld; TM-U06.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-007 — Settings setup, pending display and removal

- **Actor / entry / outcome / rules:** Settings setup, pending display and removal; ordinary-household path. Settings removal logs failure and releases pending flag in finally; does not delete a recipe. Refetch after ready hint returns stored statuses, not recalculated ones. High menu/display, medium route/removal; TM-U04/TM-U06.
- **Ordered trace:** Profile FamilyGOTOSettings → list read → add sheet → /recipes or /capture?intent=goto&mode=describe|photo; remove → list PUT trace BSL-006 → refreshed local settings.
- **Durable source anchors:** `pwa/src/components/profile/FamilyGOTOSettings.tsx` handleDescribeIt/handleCaptureIt/handleSearchLibrary/handleRemove and ready hint effect.
- **Inspected assertions and substitutions:** FamilyGOTOSettings.test.tsx “points library selection to search instead of Quick Find” asserts /recipes push and no modal; French options/close test asserts three options and dismissal; ready/pending tests assert description/spinner visibility. loadGoTo/saveGoTo, router and ready set are mocked; no API-backed removal assertion.
- **Agreement / limitations / confidence:** Settings removal logs failure and releases pending flag in finally; does not delete a recipe. Refetch after ready hint returns stored statuses, not recalculated ones. High menu/display, medium route/removal; TM-U04/TM-U06.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-008 — Pending GOTO registration after acquisition

- **Actor / entry / outcome / rules:** Pending GOTO registration after acquisition; ordinary-household path. Reuse capture owners for intake/file/workflow behavior and pending failure guidance; this slice adds only list registration/presentation. Photo/URL append and partial-registration failures are source-supported, without direct end-to-end assertions. Medium confidence; TM-U04/TM-U05. No automatic ready-list promotion or atomic acquisition/registration.
- **Ordered trace:** Settings capture link → MinimalCapture handleDescribeSubmit/handleSave/handleUrlCapture → generated description/photo/URL capture operations / approved contracts → RecipeController/RecipeService or upload path → recipe persistence + workflow acceptance → ID → separate PUT /api/goto → waiting success screen. goto-synthesis workflow → RecipeReadyProcessor → recipe DB readiness + attempted publication; no list status rewrite.
- **Durable source anchors:** `pwa/src/components/capture/MinimalCapture.tsx` isGoto and three save handlers/success view; `api/src/RecipeApi/Services/RecipeService.cs` DescribeRecipe; `api/src/RecipeApi/Controllers/RecipeController.cs` Describe; `api/src/RecipeApi/Workflows/goto-synthesis.yaml`; `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` ExecuteAsync.
- **Inspected assertions and substitutions:** MinimalCapture.test.tsx renderAndTriggerSuccess uses mocked describe and list saves; “does NOT auto-navigate when onSuccess=true and isGoto=true (GOTO path)” asserts no push and visible heading. Separate heading/Back tests use conditional if assertions and are weaker than existence tests. GotoSynthesisIntegrationTests.cs Describe_TriggersGotoSynthesisWorkflow asserts 200, parsable ID, pending row ImageCount=0/name, but does not Verify a workflow call; orchestrator mocked. RecipeReady_DoesNotTouchFamilySettings asserts stored pending JSON unchanged, using a legacy single-item shape rather than current list.
- **Agreement / limitations / confidence:** Reuse capture owners for intake/file/workflow behavior and pending failure guidance; this slice adds only list registration/presentation. Photo/URL append and partial-registration failures are source-supported, without direct end-to-end assertions. Medium confidence; TM-U04/TM-U05. No automatic ready-list promotion or atomic acquisition/registration.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-009 — Order In from empty Tonight

- **Actor / entry / outcome / rules:** Order In from empty Tonight; ordinary-household path. Optimistic local status and background catch do not prove saved state. Existing metadata retained, default Order In otherwise; live slot offer can be suppressed by existing guards. High for request/state branches with assertions, medium failure/guard composition; TM-U01/TM-U02/TM-U09.
- **Ordered trace:** Home pivot onOrderIn → todayStore.markOrderedIn + weekStore.applySlotUpdate → generated POST /api/schedule/day/{local-date}/validate {status:3} / contract → ScheduleController.ValidateDay → ScheduleService.ValidateDayAsync → CalendarEvents save → attempted slot publication → later sync projection.
- **Durable source anchors:** `pwa/src/components/home/HomeCommandCenter.tsx` pivot onOrderIn; `pwa/src/store/todayStore.ts` markOrderedIn; `api/src/RecipeApi/Services/ScheduleService.cs` ValidateDayAsync; `api/src/RecipeApi/Controllers/ScheduleController.cs` ValidateDay.
- **Inspected assertions and substitutions:** Home test “marks today as ordered in in weekStore when ordering in from an empty home slot” asserts markOrderedIn once and exact dated recipe-null/status-three offer using mocked store. ScheduleIntegrationTests.cs status-three tests assert created recipe-free skipped row and retained association for an existing recipe; TestWebApplicationFactory defaults in-memory/auth omitted. No relational concurrency or direct Home→DB check.
- **Agreement / limitations / confidence:** Optimistic local status and background catch do not prove saved state. Existing metadata retained, default Order In otherwise; live slot offer can be suppressed by existing guards. High for request/state branches with assertions, medium failure/guard composition; TM-U01/TM-U02/TM-U09.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-010 — Home optimistic assignment and guarded hydration

- **Actor / entry / outcome / rules:** Home optimistic assignment and guarded hydration; ordinary-household path. Fire-and-forget assignment logs errors with no rollback. Matching-ID hydration can still race another read for same identity. Shared assignment owns displaced recipe/server availability; client does not enforce reservation. High optimistic/hydration display, medium failure/stale identity; TM-U01/TM-U02/TM-U07.
- **Ordered trace:** Home GOTO/ordinary Quick Find selection → todayStore.assignRecipe → planner.assignRecipeToDay → generated POST /api/schedule/assign {weekOffset:0,dayIndex,recipeId} → ScheduleController.AssignRecipe → ScheduleService.AssignRecipeAsync → CalendarEvents save + shared follow-ups; independent generated recipe-detail GET → library read → matching-ID display details.
- **Durable source anchors:** `pwa/src/store/todayStore.ts` assignRecipe; `pwa/src/lib/api/planner.ts` assignRecipeToDay; `api/src/RecipeApi/Services/ScheduleService.cs` AssignRecipeAsync; `pwa/src/lib/api/generated/api/schedule/assign/index.ts` and recipe byId builder.
- **Inspected assertions and substitutions:** todayStore.test.ts “clears skipped status and restores today recipe immediately” asserts identity/status and wrapper invocation; HYDRATION test asserts description after mocked detail read. home-recipe.spec.ts “Quick Find from pivot card shows TonightMenuCard immediately and calls assign API” asserts immediate card, assign flag and detail description after flip. Assignment mock returns {success:true}, not approved envelope; detail mock contains recipe shape. These are display/wiring assertions only.
- **Agreement / limitations / confidence:** Fire-and-forget assignment logs errors with no rollback. Matching-ID hydration can still race another read for same identity. Shared assignment owns displaced recipe/server availability; client does not enforce reservation. High optimistic/hydration display, medium failure/stale identity; TM-U01/TM-U02/TM-U07.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-011 — Recovery choice and cancellation

- **Actor / entry / outcome / rules:** Recovery choice and cancellation; ordinary-household path. Back/dismiss before requests is source-supported; dismissal while in-flight does not abort network work. Medium/high confidence; TM-U08. No focus trap/Escape behavior asserted or promised.
- **Ordered trace:** Planned TonightMenuCard → Home handleSkipTrigger → SkipRecoveryDialog step1 → Order In step2 or Quick Find pick_else → retained pending recipe → step2; Close/backdrop closes, Back restores step1. No persistence until disposition action.
- **Durable source anchors:** `pwa/src/components/home/HomeCommandCenter.tsx` RecoveryFlowState/handleQuickFindSelect; `pwa/src/components/home/SkipRecoveryDialog.tsx` step actions/onBack/onClose.
- **Inspected assertions and substitutions:** Home test “treats closing the order-in recovery flow as an abort” asserts no mark/order slot/move/delete/navigation. “moves the original planned recipe before assigning the pick-else replacement” checks old move identity and replacement argument, not exact deferred timing. home-recipe.spec.ts closing Quick Find test asserts no move/assign and original visible; HTTP/SSE routes are mocked.
- **Agreement / limitations / confidence:** Back/dismiss before requests is source-supported; dismissal while in-flight does not abort network work. Medium/high confidence; TM-U08. No focus trap/Escape behavior asserted or promised.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

### BSL-tonight-meal-decisions-012 — Disposition, partial success and visible Home follow-ups

- **Actor / entry / outcome / rules:** Disposition, partial success and visible Home follow-ups; ordinary-household path. Contract agrees supported move/defer/delete/validation shapes. Separate saves before fallible follow-ups; Home catch logs and stops, with no transaction, pending lock, safe-retry memory or confirmed background replacement. Defer 404/409 guards are traced source, not directly asserted here. Medium confidence for multi-request completion/failure, high for asserted individual persistence consequences; TM-U01/TM-U02/TM-U07–TM-U09.
- **Ordered trace:** Home handleRecoveryAction → Order In local skip + awaited date validation → generated move/defer (or Order In Drop validation only); Pick Else → awaited move/defer/date DELETE → Today background replacement; ScheduleController/Service → CalendarEvents/WeeklyPlans save + recompute/publication → Home closes → weekStore.init(0) → reoffer skipped if Order In → sync → Planner for Tomorrow/Drop.
- **Durable source anchors:** `pwa/src/components/home/HomeCommandCenter.tsx` finalizeOrderedIn/handleRecoveryAction; `pwa/src/store/weekStore.ts` init/applySlotUpdate; `api/src/RecipeApi/Controllers/ScheduleController.cs`; `api/src/RecipeApi/Services/ScheduleService.cs` MoveScheduleEventAsync/DeferRecipeAsync/RemoveRecipeAsync/ValidateDayAsync.
- **Inspected assertions and substitutions:** Home tests assert validate status three then move invocation, week init/sync/Planner, Sunday source6/target0/week1, defer message/no move/no navigation, replacement identities and Order In Drop no DELETE. They mock all stores/SDK calls with resolved promises and do not assert rejection/duplicate activation. ScheduleIntegrationTests.cs OrderIn_Then_MoveToTomorrow_Through_Http_EndPoints_Succeeds and duplicated-recipe fromIndex test assert original skipped/null and moved Planned identity. First HTTP test omits fromIndex and uses legacy weekday arithmetic, so it does not qualify every Sunday request. ScheduleServiceTests.cs DeferRecipe_PreservesSkippedSourceVoteCountAndCreatesPlannedDestination asserts skipped source null plus Planned destination/vote count; publisher mocked.
- **Agreement / limitations / confidence:** Contract agrees supported move/defer/delete/validation shapes. Separate saves before fallible follow-ups; Home catch logs and stops, with no transaction, pending lock, safe-retry memory or confirmed background replacement. Defer 404/409 guards are traced source, not directly asserted here. Medium confidence for multi-request completion/failure, high for asserted individual persistence consequences; TM-U01/TM-U02/TM-U07–TM-U09.
- **Configuration / time:** Ordinary household configuration; browser-local Today versus server-relative weeks where applicable; acquisition may require external processing. Shared feature flags and API access are owned elsewhere.
- **Checks / disposition:** Source inspection completed; existing test execution and runtime qualification not-run under A34. Implementation-supported; drafted or accepted-owner reuse as mapped below.

## Exact requirement and scenario mapping

Each row maps the entire named requirement, including its normative description,
and every named scenario to the listed evidence entries. Source-only extensions
and substitutions remain qualified by those entries. No row means runtime passed.

### baseline-tonight-meal-decisions-home-states

| Requirement | Every scenario | Evidence |
| --- | --- | --- |
| Seed Home only for the matching browser date | Matching date; Different date | BSL-tonight-meal-decisions-001 |
| Reconcile Tonight on Home entry | Local date outside returned week; Read failure | BSL-tonight-meal-decisions-002 |
| Retain recent Tonight assignment during ordinary synchronization | Ordinary stale read; Matching details; Saved skipped plan | BSL-tonight-meal-decisions-002 |
| Present the active planned Tonight recipe | Planned recipe; Open cooking | BSL-tonight-meal-decisions-003 |
| Present and dismiss Tonight cooked feedback | Cooked status; Dismiss cooked feedback | BSL-tonight-meal-decisions-003 |
| Offer choices for an empty or Mystery night | Ordinary empty night; Mystery night | BSL-tonight-meal-decisions-004 |
| Select or cancel Home Quick Find | Select from empty Tonight; Dismiss before selection; Continue to Search | BSL-tonight-meal-decisions-004 |
| Display Tonight assignment before server confirmation | Assignment pending; Assignment rejects | BSL-tonight-meal-decisions-010 |
| Hydrate only the still-selected Tonight recipe | Selection changes during detail read; Detail read fails | BSL-tonight-meal-decisions-010 |
| Offer Home voting and library handoffs | Next week open for voting; Read fails or nudge dismissed | BSL-tonight-meal-decisions-003 |

### baseline-tonight-meal-decisions-goto-choices

| Requirement | Every scenario | Evidence |
| --- | --- | --- |
| Choose a random ready GOTO for Home | Ready and pending configured; No eligible recipe | BSL-tonight-meal-decisions-005 |
| Handle unavailable active GOTO without blocking Tonight choices | No ready result; Confirm ready choice | BSL-tonight-meal-decisions-005 |
| Read and replace the household GOTO list | Replace and reread; Replacement rejects | BSL-tonight-meal-decisions-006 |
| Offer GOTO setup and list removal | Choose library; Choose acquisition; Dismiss setup | BSL-tonight-meal-decisions-007 |
| Remove a configured GOTO without deleting its recipe | Removal succeeds; Removal rejects | BSL-tonight-meal-decisions-007 |
| Register acquired recipes as pending GOTO choices | Description or photo returns identity; URL returns identity | BSL-tonight-meal-decisions-008 |
| Keep GOTO capture success available for explicit departure | Registration succeeds; Return explicitly | BSL-tonight-meal-decisions-008 |
| Toggle the loaded recipe in the GOTO list | Add loaded recipe; Remove or fail | BSL-tonight-meal-decisions-006 |

### baseline-tonight-meal-decisions-changed-plan-recovery

| Requirement | Every scenario | Evidence |
| --- | --- | --- |
| Order in from an empty Tonight choice | Empty night; Validation rejects | BSL-tonight-meal-decisions-009 |
| Choose a backup before resolving the planned Tonight recipe | Order In selected; Replacement selected | BSL-tonight-meal-decisions-011 |
| Cancel Home recovery before mutation | Abort order-in recovery; Return to backup choice | BSL-tonight-meal-decisions-011 |
| Mark Order In before planned-recipe disposition | Move after validation; Drop original cooking plan | BSL-tonight-meal-decisions-012 |
| Request tomorrow for the current Tonight recipe | Weekday request; Sunday request | BSL-tonight-meal-decisions-012 |
| Defer Tonight through the explicit-date operation | Defer returns a destination message; Source is missing or awaiting consensus | BSL-tonight-meal-decisions-012 |
| Resolve the old Tonight meal before starting replacement | Move original then choose replacement; Drop original then choose replacement | BSL-tonight-meal-decisions-012 |
| Finish Home recovery with its caller-specific follow-ups | Tomorrow or Drop completes; Defer completes | BSL-tonight-meal-decisions-012 |
| Stop a rejected Home recovery invocation at its failing await | Validation rejects first; Disposition rejects | BSL-tonight-meal-decisions-012 |

## Durable input identities

SHA-256 of inspected working bytes at discovery (repository-relative paths).
These hashes identify source evidence rather than claim a clean commit or runtime
configuration. Other pre-existing dirty input hashes are in the private snapshot.

| Path | SHA-256 |
| --- | --- |
| `pwa/src/app/(app)/home/page.tsx` | `b52e0c595ad5fd9c13daeab2c7c4ce65fc909cef7717b7b8bc9c0bc9bffaec68` |
| `pwa/src/components/TodayStoreInitializer.tsx` | `74727da4cc874fc6f2b00993f97480e50bbed992421336f6de877ecdcb46e6b1` |
| `pwa/src/components/TodayStoreInitializer.test.tsx` | `c4c5ddec1304c90e730e83df7f28c2c8c780f8c05bda5f76e8cc5043bfd4f463` |
| `pwa/src/components/home/HomeCommandCenter.tsx` | `73a338ce995647406f9b7f01c8a3800ab9a6f8c8fc0e00b3fb3ecb7ad8627217` |
| `pwa/src/components/home/HomeCommandCenter.test.tsx` | `b46cea7c29f1790148ee04276cb8e3db08ed0a9e4527dd2b5d3ec29f1b38ddfe` |
| `pwa/src/components/home/TonightPivotCard.tsx` | `7aa11dce989cfb51b153e94dc567f8840bc4c448666e417389ed1d2f593ceeb1` |
| `pwa/src/components/home/TonightPivotCard.test.tsx` | `58b557ef55c0fcecae90f60742e922ef90f10839c6fdae18e90cc83cf1dc8190` |
| `pwa/src/components/home/TonightMenuCard.tsx` | `04708a9e145ed0e7f9466d099452a3a7cd54622e1af44fcec21f77026a6bd6c5` |
| `pwa/src/components/home/HomeSections.tsx` | `f0ea6f4849e5a8387cd498dae984058f30475943a99b617894403cc17a2dab79` |
| `pwa/src/components/home/SkipRecoveryDialog.tsx` | `0ae06fa49aab1e62b69354366744518e09de594e8760b7bed191ea59fa4b654e` |
| `pwa/src/components/planner/QuickFindModal.tsx` | `8b2685317c477129a2501ae58cfb09c92741f639e6cb5d8d5774c87f35cb9b80` |
| `pwa/src/components/planner/QuickFindModal.test.tsx` | `0e5b936773ba379e3daef5659aba6cc3fe8d71d18de0da90dccb250b4cbb665b` |
| `pwa/src/store/todayStore.ts` | `42e172475415ee013bd2dd352a338bcda4ba293d09eea35c3308c744bf68fd63` |
| `pwa/src/store/todayStore.test.ts` | `a049df21755c4270f588d9b40989669bbdcaf2bb48a7dff3c40b2d63379555ae` |
| `pwa/src/store/weekStore.ts` | `e58ca9aaf2755fc5b95aacd0518d443456937febec82c0ab3955c8eb14cae3b8` |
| `pwa/src/store/familyStore.ts` | `68d09caecfb61d69a663cd20f7082dc1306cd3c4986203c72ced84b4c6b1566a` |
| `pwa/src/components/profile/FamilyGOTOSettings.tsx` | `16e904e1e95d411d0bdd23ef64936b0757a628b834bec3137d9fbc699045b475` |
| `pwa/src/components/profile/FamilyGOTOSettings.test.tsx` | `38a2bd7e7563312fee0a4d82c76c55cd260217ed4a99dd24e703a8aa5e6c2345` |
| `pwa/src/components/capture/MinimalCapture.tsx` | `aadbb37ec2fe548af6e41c5460ea3339377fb215f66f19eac054666416742af5` |
| `pwa/src/components/capture/MinimalCapture.test.tsx` | `8a8c1d66ccae98223cb0754cdd155c30a2d75911aea6cfff09284f54816bbf53` |
| `pwa/src/components/recipes/RecipeDetailSheet.tsx` | `bbc1bba8f16f3fa305775d072cb1c3850af34a24bd3979e2228b63984ca1a19c` |
| `pwa/src/components/recipes/RecipeDetailSheet.test.tsx` | `21727367dee891c473635cc2eafde324b0f6863e0dd4db1a7e82203d5e650da0` |
| `pwa/src/lib/api/planner.ts` | `7d9c5b0b609e9bce53100192fe395df32b90773d2e5b1a55664bb8a84cc2f26a` |
| `pwa/e2e/home-recipe.spec.ts` | `a98b3a7ec5da9987f700987e10f5c6f7ecac36dbf92bb268a53419b9c97e12ac` |
| `pwa/e2e/home-goto.spec.ts` | `a319a10e4b12c37163b647ea1b2fe00c38e76927ed17b1bf236f701eb4e3d37a` |
| `specs/openapi.yaml` | `0fbd27813611e16474ec17a48ede372d5a41af02db3fa9ded82295a6357046ff` |
| `api/src/RecipeApi/Services/GoToService.cs` | `9b48c4faa940d45facb288cc289f3006e32097b0c05153d1809eb8eed218dd3c` |
| `api/src/RecipeApi/Controllers/GoToController.cs` | `a4fe247e9c3adc20bac145703fdd526608c15c4d81bc1e09a55bfa6afc10f65c` |
| `api/src/RecipeApi/Services/RecipeService.cs` | `9eec9ab5cd7102081b3765b08a41b8de4d45325858d18ab4573a326afa256b74` |
| `api/src/RecipeApi/Controllers/RecipeController.cs` | `d1699c2de6f6cca9d879e67c0c7b9c7f0af4b2c4e104bc9ff04634b266eb5a70` |
| `api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs` | `4206f98256cadae88d7be13a44e9d9d18b6c46679ba7b9f0aee0dcef8a848a74` |
| `api/src/RecipeApi/Workflows/goto-synthesis.yaml` | `d614552797656dacbfe941e8d761b0c111e80d98b96c1216a197435163d6c6c1` |
| `api/src/RecipeApi/Services/ScheduleService.cs` | `8c1e8403f759425b8882eecb26f2bc8f4c9692f81bcf6e9bc3777c78013c40ec` |
| `api/src/RecipeApi/Controllers/ScheduleController.cs` | `d6d956d5465148995d55859253963542a8e9fb2d0e247b6333f6b5a57a779f91` |
| `api/src/RecipeApi.Tests/Integration/GoToIntegrationTests.cs` | `6fa8c932f3d08f8daed08cf53fa1e478f322fa27e6c51811c6564167f885b7ee` |
| `api/src/RecipeApi.Tests/Integration/GotoSynthesisIntegrationTests.cs` | `2b5496554a11e6ed7c24291e79552a949340c9d17a2481a472e8b4e0d33c38cb` |
| `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs` | `6894b99c60712e305ad13aee1bb14f5af91ed2ead9d360349e87b7d4ca089df3` |
| `api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs` | `c13202827a7395147aeb8d70d57c03b615319f52c6953009bc3b88266fae1b43` |
| `api/src/RecipeApi.Tests/Infrastructure/TestWebApplicationFactory.cs` | `0ee567443fc0b5c11fffe631c94ea0407681b371224d8083a0e32b94b280804c` |
| `openspec/specs/household-identity/spec.md` | `4c7f5a1faafd5439ab6f261b1efb140a4b0c10643cf16d087874c3c52ee9b749` |
| `openspec/specs/recipe-library/spec.md` | `7fd80218a8551dba51d70f057f82d40cce9cd3fe5356c6d3d82d6a07a4f857d2` |
| `openspec/specs/recipe-capture/spec.md` | `b7d563542abc9cbdbe1e470cbdc9fa44ddd4dee54f806ef7ecfc914dfebd456c` |
| `openspec/specs/meal-planning/spec.md` | `96467d593b80c53d6582502c1f798caa741a22ca13e374265a03f8a0360df9f6` |
| `openspec/specs/background-processing/spec.md` | `7023ac794f9119ec995215a431f9667934c69434a22815c2a9e40dbddc796e76` |
| `openspec/specs/household-live-updates/spec.md` | `1c1c906831ca1770e2afd8174bdd31f5447b67d48b0325fc52e353c12ce28de6` |
| `openspec/specs/cooking/spec.md` | `1d6baff148cfea08eb741d0d2a72fa00e97a9a5d2710645eeebf0b717807ce94` |
| `openspec/specs/recipe-discovery/spec.md` | `e5c764fce830ce637a6faf2a0a186f34bf5b053ba902ab44b2dd0b27d107efb9` |
| `pwa/src/lib/api/generated/api/goto/index.ts` | `3f4a7eca0b27a387bfd67fd5afefe66a8b651a034c026d4e1074989dd8da8d91` |
| `pwa/src/lib/api/generated/api/goto/active/index.ts` | `ef39908a6c2c47abe30050dfab4a4b3bcc0f722dd9b1b69e0443d1efaa2a6462` |
| `pwa/src/lib/api/generated/api/schedule/assign/index.ts` | `072c2e46468bbd9ba3ed641a9b4eddf49a0d6e5ec82ab5fc80b836ef40db61a2` |
| `pwa/src/lib/api/server-client.ts` | `04426cad934ca6cdeacd5302ca558688033cdf23738557cd816d34d2f90b89ea` |

## Generated artifacts and lifecycle status

Every directory contains CLI-created `.openspec.yaml`, `proposal.md`, `design.md`,
`specs/tonight-meal-decisions/spec.md` and `tasks.md`. Artifact presence is separate
from human acceptance and runtime qualification.

| Change | Requirements / scenarios | Artifact state | Human review | Main spec | Runtime |
| --- | --- | --- | --- | --- | --- |
| [home-states](../../openspec/changes/archive/2026-10-16-baseline-tonight-meal-decisions-home-states/proposal.md) | 10 / 22 | Accepted / promoted TM-P01 | Accepted 2026-10-16 | Promoted 27/57 cumulative | Not-run |
| [goto-choices](../../openspec/changes/archive/2026-10-16-baseline-tonight-meal-decisions-goto-choices/proposal.md) | 8 / 17 | Accepted / promoted TM-P01 | Accepted 2026-10-16 | Promoted 27/57 cumulative | Not-run |
| [changed-plan-recovery](../../openspec/changes/archive/2026-10-16-baseline-tonight-meal-decisions-changed-plan-recovery/proposal.md) | 9 / 18 | Accepted / promoted TM-P01 | Accepted 2026-10-16 | Promoted 27/57 cumulative | Not-run |

## Historical generation session — 2026-10-16 / TM-G01

- Branch/commit and initial dirty inputs: recorded above. All three bounded slices
  completed sequentially using installed OpenSpec scaffolding/instructions.
- Scope: these 15 new change files, this capability plan and the one small-index
  Tonight summary row; no source, test, API, SQL, config, dependency, workflow,
  staged content or main spec writes. Private before-images support preservation.
- Evidence: BSL-tonight-meal-decisions-001–012 and all exact mappings above.
  Unsupported topics have explicit dispositions; no consequential decision blocks
  generation of the documented subset.
- **Passed:** individual strict validation of each selected change; final scope,
  global inventory, documentation verification and preservation results recorded
  below after reconciliation.
- **Failed / blocked:** none in the three selected strict validations; broader
  results remain separately reported below.
- **Not-run:** existing application tests, runtime/API/browser/database/device/
  network/model qualification, intentionally deferred under A34.
- **Not-applicable:** application TDD, client regeneration and application checks
  for these documentation-only edits. No services or dependencies were launched.
- **Exact next action:** human review of the three draft deltas plus this coverage
  and uncertainty record. If accepted, separately authorize main-spec promotion;
  do not implement fixes or archive changes through this generation instruction.

## Historical generation verification record

- `openspec validate baseline-tonight-meal-decisions-home-states --strict --no-interactive`: **passed**, 10 requirements / 22 scenarios.
- `openspec validate baseline-tonight-meal-decisions-goto-choices --strict --no-interactive`: **passed**, 8 / 17.
- `openspec validate baseline-tonight-meal-decisions-changed-plan-recovery --strict --no-interactive`: **passed**, 9 / 18.
- `openspec validate --all --strict --no-interactive`: **passed**, 104 items, 0 failed at final inventory review. This is grammar validation, not baseline acceptance.
- `task verify --` with this plan, the small index and all five files in each of the three change directories: **passed**. Inspected record `.task/agent-finish/runs/3039b6008db64b8db47bc95fcadbef21.json`: explicit 17-file set, `verification_scope=selected-documentation`, `automated_checks_passed=true`; documentation, selected `spec:check` and content identity passed. Tested identity `e6fc033e1e398fe8b46d498bcaf2e98a543ae4bd18a923caf58d915eb1f0486b`. Task acceptance is explicitly not evaluated by the harness.
- That record checks the drafts before this final result text and task-checkbox reconciliation. A final rerun over the identical 17-path set checks the delivered bytes; its immutable run path is reported in the session handoff. No unchecked future work is being marked runtime-qualified.
- Scope review: 27 distinct requirement titles / 57 scenarios, no cross-slice duplicate definitions; exact full requirement/scenario mappings reviewed above. Each of the 15 new artifact files is covered by its selected strict validation and documentation verification. Only the Tonight row is changed by this session in the shared index; the target plan is intentionally replaced from its clean not-started template.
- Preservation: staged binary diff remains byte-identical to entry. Inspected application/test/API input hashes remain unchanged. Concurrent unrelated Search plan/task changes and new Search/App installation main/changes appeared during this session; the Search and App installation index rows also changed independently. They are retained, not attributed to this task, reverted or repaired. Whole-index input stability was checked by scoped verification; any later mutation requires re-verification.
- **Failed:** none observed. **Blocked:** none for generation. **Not-run:** runtime, database, browser/device, network/model and existing behavior tests under A34. **Not-applicable:** application TDD/new tests, application checks/client generation for this documentation change, deployment/rollback. Human review is pending, not failed or silently accepted.

Generation is complete for the documented supported scope. Human acceptance,
main-spec promotion and archival have not occurred. No remaining generation
blocker is hidden by the explicit unsupported/excluded topic dispositions above.


## Promotion session — 2026-10-16 / TM-P01

- User authorization: “promote”, resolving the generation handoff’s acceptance/
  promotion step for all three named deltas. Source and accepted-owner SHA-256
  identities were rechecked before writes: no differences from the extraction
  ledger. Branch `moving-to-openspec`, HEAD
  `04a1c4570f9bbb01b47436790d4248635ac3179a` unchanged.
- Installed OpenSpec sync skill used; current context/list/status resolved the
  repository root and selected delta paths through
  `artifactPaths.specs.existingOutputPaths`. Main Tonight was absent. Current
  specs instructions/rules were obtained before the first main-spec write.
- Created main Tonight with the reviewed Purpose, a non-normative evidence/
  limitations section and all three ADDED sections merged under one Requirements
  header. Requirement/scenario blocks are preserved verbatim; no duplicate titles,
  shared-owner edits or new assertions. Existing deltas remain unchanged.
- Updated only current lifecycle fields in this plan, the Tonight index row and
  workflow follow-up notes in the three selected task files. Historical extraction
  records are retained; their pending labels do not override this checkpoint.
- Prior staged/unstaged/untracked work was snapshotted before writes. No main
  Tonight existed; the plan/index were already dirty and changes untracked from
  generation. Those inputs are preserved apart from these authorized lifecycle
  edits. No files are staged, committed, archived or deployed.
- Checks: exact merge equality/counts and preservation are reviewed separately
  from strict CLI/documentation validation. Actual validation outcomes and the
  immutable final verification record are reported in the promotion handoff.
- Runtime and existing behavior tests remain **not-run** under A34. Application
  TDD, client generation, implementation checks and deployment are
  **not-applicable** to this documentation promotion.
- Exact next action: await a separately authorized lifecycle/application/
  qualification task; no unfinished generation or promotion work is delegated to
  a later session, and no excluded policy has been silently settled.

### Promotion validation outcomes

- **Passed:** `openspec validate tonight-meal-decisions --type spec --strict --no-interactive`; `openspec validate --specs --strict --no-interactive` (15 passed / 0 failed); exact equality of all 27 requirement / 57 scenario blocks against the three selected deltas; no duplicate titles or delta-operation headers in main.
- **Global check:** `openspec validate --all --strict --no-interactive` reported 105 passed / 1 failed (106 items). The failure is the unrelated concurrent `baseline-data-backup-and-recovery-management-entry-observation` draft (no deltas found at check time); it is not repaired or included in Tonight task ownership. This does not negate selected Tonight/main validation, but global reconciliation is not passed.
- **Preservation:** staged diff bytes unchanged; every selected delta is unchanged; shared index differs only in the Tonight row. Concurrent changes to the demo-household plan and snapshot-restore-activity delta were observed outside this promotion and retained.
- **Scoped verification passed:** `task verify --` with main Tonight, this plan, the small index and the three selected `tasks.md` files (complete six-file promotion-owned set). Inspected immutable record `.task/agent-finish/runs/0774adf9727c425990157acbd17e7fa1.json`: `automated_checks_passed=true`, `verification_scope=selected-documentation`; documentation, all three selected changes, main Tonight and content identity passed. The final rerun verifies this result-record update; its immutable path is reported in the handoff. This is distinct from the earlier generation’s 17-path checks.
- **Not-run:** application/behavior tests and runtime/API/browser/database/device/network/model qualification under A34. **Not-applicable:** application TDD, client generation, deployment and archival. No blocker remains for this selected documentation promotion; the unrelated global draft failure remains reported separately.

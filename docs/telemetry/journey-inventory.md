# Telemetry journey inventory

This inventory separates **source traces from planning seeds**; it is not an approved event catalogue or implementation checklist. J02–J04 have the [I1 source trace](#i1--planning-and-multi-vote-discovery--2026-10-30); their UI walkthroughs remain not-run. J05–J07 now have the [I2 source trace](#i2--assignment-non-cooking-and-movement--2026-10-30), also without runtime qualification. J08–J09 have the [I3 source trace](#i3--grocery-checks-and-extras--2026-10-30), with unavailable walkthrough cells and an unapproved all-checked predicate. J01/J10–J12 have the [I4 source trace](#i4--entry-finding-recipes-goto-and-cooking--2026-10-30), with explicit unavailable walkthrough cells. J13–J16 now have the [I5 source trace](#i5--capture-repair-sharing-and-library-maintenance--2026-10-30). The [I-V reconciliation](#i-v--investigation-reconciliation--2026-10-30) owns the current 11/11 investigation status, with runtime qualification open. Use [inventory sessions I1–I5](../../openspec/changes/archive/2026-10-30-inventory-telemetry-journeys/tasks.md) to trace one group and the [tracker](README.md) for status. Baseline columns describe F2 opening/screens, Planner composition and the Quick Find pilot. Current F3 evidence belongs to the tracker; baseline tests do not trace business journeys. See the [navigation revision boundary](#navigation-revision-boundary).

## Coverage card to complete per selected journey

Record these fields under the selected row's ID. Keep unknowns explicit; do not invent a business event just to fill a field.

| Field | Required content |
| --- | --- |
| Question / entry | Product question, valid starting states, visible entry and possible direct entry mid-journey |
| Ordered boundaries | Intent, optimistic state, persistence, publication, presentation, cancellation, retry and recovery; distinguish which are actually observed |
| Owners / evidence | Current canonical requirements/scenarios, UI/store -> generated wrapper -> OpenAPI method/path -> controller/service/workflow commit -> publication/read; source identity and exact tests |
| Automatic versus custom | Which shared observations apply, what is missing, exact proposed emitter symbol/location, browser versus server authority |
| Candidate record | Stable name, standard carrier, minimum fixed/allowlisted attributes, correlation needs and timestamps; no private content/product IDs |
| Trigger semantics | What success/failure/cancellation/retry means, one reporting owner, deduplication/occurrence identity and post-commit failure behavior |
| Limits / volume | Expected records per action/visit, healthy repetition, error storm, concurrent tabs/processes; loss/sampling/queue bounds |
| Receiver | Retained projection, prospective mapping and goal implications, supported direct paths versus graph aggregation, actual gaps and qualification needed |
| Evidence state | Source seed / traced; UI not-run or observed; unit/mock, real DB/exporter/receiver, deployed and device cells separately |
| Next slice | One small useful result, dependencies, candidate changed files, test-first acceptance, privacy/volume acceptance, stopping point and handoff |

Rows without a dated coverage card remain seeds. No inventory row is runtime-qualified by source review. Start from the source pointers below, inspect exact methods and approved contracts, and replace assumptions with evidence. New features need a static presentation declaration and, only where necessary, semantic evidence at the trusted operation owner. An SDK does not provide business meaning automatically.

## Experience map

| ID / session | Journey and meaningful boundary | Canonical owner / source entry points | Initial custom-evidence gap and test starting points | F2 presentation baseline / owned exception |
| --- | --- | --- | --- | --- |
| J01 / I4 | Invitation or passphrase -> access -> select/create member -> presented destination; reject/recover | [Household identity](../../openspec/specs/household-identity/spec.md), [member context](../../openspec/specs/member-context/spec.md), [members](../../openspec/specs/household-members/spec.md); `lib/auth.ts`, invite/Welcome/onboarding pages, IdentityValidator, familyStore/FamilyService | F2 covers destinations, not access result or usable member context. Candidate safe access result at auth owner; no member identity. Inspect `auth-flow.spec.ts`, `onboarding.spec.ts`, `member-creation.spec.ts` and FamilyCreationPostgresTests | Eligible opening + destination screen; identity/access outcomes unobserved. |
| J02 / I1 | Presented meal plan -> open/reopen voting -> reconcile voting-open view | [Planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md); Planner, `weekStore.openVoting`, `ScheduleController.OpenVoting`, `ScheduleService.OpenVotingAsync` | Candidate server `voting.opened` after actual save/commit; browser reconciliation is distinct. Inspect `planner-voting-identity.spec.ts`, `planner-full-cycle.spec.ts` and ScheduleIntegrationTests | Planner primary; wide Grocery companion. Voting overlays remain exceptions. |
| J03 / I1 | Discovery -> repeated likes/passes -> personal exhausted-feed result or household-convergence presentation | [Discovery](../../openspec/specs/recipe-discovery/spec.md), [live updates](../../openspec/specs/household-live-updates/spec.md); Discovery page/discoveryStore, DiscoveryController, `DiscoveryService.SubmitVoteAsync`, VotingSession | F2 sees route, not same-route results or vote persistence. Candidate server `vote.committed` and browser `pwa.discovery.result.presented`; result reasons must stay distinct. Inspect Discovery page tests, `discovery.spec.ts`, DiscoveryServiceTests/DiscoveryIntegrationTests | Discovery primary; FamilyNudgeDialog remains an exception. |
| J04 / I1 | Review suggestions -> promote pending meals -> close voting -> confirmed/recovered closed plan | [Planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md); `weekStore.lockWeek`, ScheduleController/`ScheduleService.LockScheduleAsync`, VotingBoundary | Candidate trusted `voting.closed` after atomic close, separate promoted assignment records and presentation recovery. Inspect `planner-voting-identity.spec.ts`, `planner-reconciliation.spec.ts`, ScheduleIntegrationTests and round-close persistence tests located during trace | Planner primary/companion; no promotion or lock outcome. |
| J05 / I2 | Quick Find/Search/detail -> choose a meal -> assign/replace -> reconcile selected day | [Meal assignment](../../openspec/specs/meal-assignment/spec.md), [Tonight](../../openspec/specs/tonight-meal-decisions/spec.md); QuickFindModal, Search/RecipeDetailSheet, weekStore/todayStore, ScheduleService and Assignment part | Shared surfaces supply entry only. Candidate `meal.assigned` at trusted persistence owner; displacement and read recovery remain separate. Inspect `planner.spec.ts`, `planner-reconciliation.spec.ts`, weekStore/SkipRecoveryDialog tests and ScheduleIntegrationTests | Quick Find open/close/reopen + Search/Planner screens; RecipeDetailSheet exception. Closure has no selection/cancellation meaning. |
| J06 / I2 | Other plans -> choose recipe-free supper -> save/edit/clear; dismiss draft | [Non-cooking plans](../../openspec/specs/non-cooking-plans/spec.md); NonCookingDaySheet, Planner/Home, ScheduleController.ValidateDay/RemoveRecipe, ScheduleService | Candidate no-cook saved/cleared after committed mutation; no label/note/date payload. Dismissal is not failure. Inspect `planner-non-cooking-days.spec.ts`, NonCookingDaySheet tests and NonCookingScheduleTests | Home/Planner screens; NonCookingDaySheet draft remains an exception. |
| J07 / I2 | Move/swap a meal; Tomorrow recovery; defer to a later week; remove assignment | [Meal rescheduling](../../openspec/specs/meal-rescheduling/spec.md); usePlannerDrag, weekStore/todayStore, ScheduleService and Tomorrow part, move/defer/remove operations | Candidate committed movement with bounded operation reason, not recipe/date IDs. Preview/drop is not save; later recompute/publication can fail. Inspect `planner-reconciliation.spec.ts`, `planner.spec.ts`, movement/PostgreSQL tests located during trace | Home/Planner screens; recovery/pivot exceptions; no movement outcome. |
| J08 / I3 | Grocery presented -> check/uncheck recipe rows -> all current shopping rows checked | [Grocery shopping](../../openspec/specs/grocery-shopping/spec.md); Planner/GroceryList, useSchedule/plannerStore/weekStore, ScheduleController.ToggleGroceryItem, ScheduleService, GroceryCheckCoordinator | Candidate trusted check-state mutation; possible browser all-checked observation is unresolved, not an existing saved completion. No ingredient names/keys. Inspect `grocery.spec.ts`, `grocery-checks-live.spec.ts`, GroceryCheckConcurrencyPostgresTests | Phone planner.grocery primary or wide companion; no shopping completion. |
| J09 / I3 | Add an extra -> check/uncheck; rename, recategorize or delete; see current/future/history | [Grocery extras requirements](../../openspec/specs/grocery-shopping/spec.md#requirement-add-a-name-only-extra-to-the-current-grocery-week); GroceryList, GroceryExtrasController/GroceryExtraService | Candidate post-commit extra added/state-changed/removed; preserve idempotent add/retry and stale-version distinctions without exporting names or extra IDs. Inspect `grocery-extras-live.spec.ts`, GroceryExtraServiceTests and GroceryExtraPostgresTests | Grocery presentation only; extras mutations unobserved. |
| J10 / I4 | Search/filter/similar or Browse list/stack -> detail -> cook/plan; retry/load-more/restart | [Search](../../openspec/specs/recipe-search/spec.md), [library](../../openspec/specs/recipe-library/spec.md); Search/Browse pages, RecipeDetailSheet, RecipeSearchService | F2 surfaces do not prove result availability, a submitted search or assignment. Only add bounded mode/outcome evidence needed for a question; no terms/filter content/recipe identity. Inspect `search-hardening.spec.ts`, `search-invalidation-recovery.spec.ts`, recipe detail tests | Search/browse.stack screens; detail/filter exceptions. |
| J11 / I4 | Open cooking -> ingredients/steps/original -> pause/resume -> save cooking completion | [Cooking](../../openspec/specs/cooking/spec.md), [lifecycle](../../openspec/specs/planning-lifecycle/spec.md); CooksMode, todayStore.markCooked, planner wrapper, ScheduleService.ValidateDayAsync | Candidate trusted cooking record plus presented completion; viewed recipe completion is distinct from completing tonight's planned meal. No per-step/scroll heartbeat. Inspect `cook-mode-steps.spec.ts`, `cooking-instruction-recovery.spec.ts`, CooksMode tests | Entry screen only; CooksMode/photo viewer exceptions. No cooking outcome. |
| J12 / I4 | Choose GOTO/Quick Find for tonight; maintain GOTO list; recover when tonight changes | [Tonight decisions](../../openspec/specs/tonight-meal-decisions/spec.md); HomeCommandCenter, SkipRecoveryDialog, FamilyGOTOSettings, goto/today stores, GoToService | Candidate committed GOTO-list change or assignment/recovery only where not already J05/J07. Random featured suggestion does not prove use. Inspect `home-goto.spec.ts`, SkipRecoveryDialog/FamilyGOTOSettings tests, GoToIntegrationTests | Home screen + Quick Find cycles; SkipRecoveryDialog exception. |
| J13 / I5 | Share/photo/URL/PDF/description -> submit -> accepted background work -> ready/failure -> retained-work retry | [Capture](../../openspec/specs/recipe-capture/spec.md), [recovery](../../openspec/specs/capture-recovery/spec.md); MinimalCapture/useCapture/PDF lifecycle, RecipeController/RecipeService, UrlCaptureInitialization, RecipeReadyProcessor | Candidate accepted/ready/failure/retry with bounded random operation context; readiness after actual durable changes, not HTTP202. Async/reload lifetime conflict must be resolved before linkage. Inspect capture/PDF E2E, `url-capture-recovery.spec.ts`, UrlCaptureRecoveryTests/PdfRecipeReadyTests | Capture/capture.confirm screens; image review/progress exceptions. |
| J14 / I5 | Report/review issue -> save -> optional re-import -> review result -> resolve | [Recipe quality](../../openspec/specs/recipe-quality/spec.md); RecipeImportIssueSheet/RecipeDetailSheet, RecipeImportReportService, completion processor | Candidate report saved, background outcome and resolved; saving a report can succeed while launch fails. No note, import ID or recipe ID export. Inspect `recipe-import-reporting.spec.ts`, report component tests and RecipeImportReportPostgresTests | Entry screen only; RecipeImportIssueSheet/detail exceptions. |
| J15 / I5 | Export/share a recipe; import a shared recipe bundle -> accepted library result | [Recipe sharing](../../openspec/specs/recipe-sharing/spec.md); RecipeDetailSheet, MinimalCapture bundle path, recipe API wrappers/RecipeController | Successful native share completion does not prove recipient import. Candidate only actual export/import facts needed for question, never shared text/URL/file name. Inspect `recipe-share.spec.ts` and RecipeShareIntegrationTests | Entry screen only; detail/capture exceptions; no share outcome. |
| J16 / I5 | Move recipe to bin -> restore or confirm purge; recover rejected/failed action | [Recycle bin](../../openspec/specs/recipe-recycle-bin/spec.md); RecipeDetailSheet/RecycleBinSheet, RecipeController/RecipePurgeService | Candidate trusted bin/restore/purge outcome; active assignment rejection and PIN failure remain bounded categories. No recipe/PIN data. Inspect RecycleBinSheet tests and RecipePurgeIntegrationTests | Entry screen only; RecycleBinSheet/detail exceptions. |

`pwa/src/` prefixes are omitted for PWA symbols; API symbols live under `api/src/RecipeApi/`. Named tests are navigation pointers, not evidence that they ran. Full source paths/methods and approved OpenAPI operations must be recorded in the selected coverage card before extracting a successor proposal.

## Known boundaries to retain during walkthroughs

### J02–J04: voting is more than one vote

- An opening request can commit before a later read or publication fails. Browser rollback does not undo server state.
- `DiscoveryService.SubmitVoteAsync` saves/commits before publishing vote updates. Keep persistence and publication failure separate; do not add a server event only after all follow-up work succeeds.
- The user's meaningful Discovery participation is repeated voting until personal exhaustion or presented family convergence. Each vote is intermediate; healthy repetition is not a loop defect. Another member can cause convergence, and a returning member may see it without contributing a vote in this document.
- An empty result can follow a failed fetch, and optimistic removal can precede the last vote's response. Before labeling exhaustion, distinguish confirmed queue evaluation, pending votes and presented empty state.
- Convergence is distinct from Close Voting. Close promotes pending assignments in separate requests before committing round lock/history/clear. Partial promotion and lost-response recovery need separate evidence; do not imply a transaction spans all browser calls.
- Shared-family round linkage across independent documents is excluded by the agreed scope policy. No household/round/member join is permitted just to reconstruct an entire family workflow.

### J08–J09: grocery completion needs a definition

- The current UI computes completed aisles from displayed recipe items and extras; it has no explicit persisted shopping-trip-completed command.
- A proposed all-checked observation must exclude empty/unloaded lists, account for pending/rejected checks, extras and remote updates, and distinguish already-complete entry from a transition reached during this view.
- Checking an item does not prove purchase. Checking all displayed rows does not prove the user finished shopping. Unchecking or adding an extra can make the current list incomplete again; this is ordinary behavior.
- Capture item/extra mutations at trusted commit owners, not the optimistic checkbox, an SSE broadcast or generic HTTP success. Never export ingredient names, state keys, extra names or hashes of them.

### J11 / J13–J14: pauses and asynchronous work

- A long cooking pause produces no failure, heartbeat or new opening. Automatic overnight finalization is not user completion.
- URL intake can save retryable work while initialization fails. Accepted capture is not ready content, retry acceptance is not repair, and ready content is not proof it was viewed.
- Background work can outlive a document or server process. The agreed no-cross-document scope cannot silently become a durable recipe/workflow correlation key. Record any required bounded operation context as a consequential decision before code/spec extraction.

## Coverage and receiver checks before successor extraction

Reuse F2's static route registry and known-overlay exception inventory. During the selected journey's existing tests, account for each significant mutation/result with an existing event, proposed trusted owner or explicit deferred classification. Prefer that focused assertion/review to a new global event registry or workflow engine.

For each candidate record verify the actual local Sentrame projection and exact service/carrier/source/name/retained condition mapping. `stage.name` and `reason` are supported application fields, not universal OTel journey semantics. New attributes require receiver support, not optimistic WFS emission. Scope/tab, record ID, exception occurrence, operation linkage and technical trace IDs answer different questions.

The current receiver has one goal selector per active definition. A common Discovery result name could close one participation journey with preserved reasons; several independent product outcomes across WFS remain a receiver design question. Do not fabricate global completion, merge captured journeys across goal/inactivity boundaries, or infer recovery from temporal proximity. Required receiver work stays a separate proposal.

## M5 presentation adoption — 2026-10-31

The separately approved standard-SDK change accepts tasks5.1–5.3 (16/20overall), adopting planning/non-cooking/recovery, nudge/invite/member flyout, native Demo and capture image/bundle/upload/queued/ready owners. Current actual protected proof retains204records/exact replay/reopen, and fresh35path gate `.task/agent-finish/runs/31c7c3d9b9044b2eba1bebde6c064da2.json` passes every applicable check. See [fixed identities, exact evidence and limits](../sentrame.md#m5-remaining-presentation-integration--2026-10-31). Structural Modal/Grocery and browser/OS confirms/file/share surfaces remain explicit exceptions. Queued/ready presentation is no persistence or loaded-detail fact; direct synthetic ImageReview/generic Demo composition does not establish a product entrypoint. This does not retroactively execute I1–I5walkthroughs or authorize broader inventory business-outcome instrumentation. No M6/M7 or sync/archive.

## Session records

I1–I5 source investigations are recorded below. No UI walkthrough was executed in these inventory sessions. I5 now has source-traced cards and explicit unavailable walkthrough cells. The experience map remains navigation; the dated cards own evidence state.

### I1 — Planning and multi-vote Discovery — 2026-10-30

Selected scope: tasks 1.1–1.2 only, mode `investigate`. Source trace, proposed
boundaries and unavailable-walkthrough evidence are the deliverable. No emitter,
business contract, collection setting or receiver was changed. See the
[task evidence](../../openspec/changes/archive/2026-10-30-inventory-telemetry-journeys/tasks.md#i1-investigation-evidence--2026-10-30)
for identity, findings and the next session boundary.

#### Shared source and contract chain

Canonical owners are [planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md)
(open/reconcile, promote, finish close, independent lock and post-save publication),
[Discovery](../../openspec/specs/recipe-discovery/spec.md) (active-round coverage,
confirmed celebration, late votes, personal exhaustion and anchored matches),
[meal planning](../../openspec/specs/meal-planning/spec.md) (loaded status and pending
suggestion composition) and [live updates](../../openspec/specs/household-live-updates/spec.md)
(authoritative session, reconnect, stale revisions and publication after commit).
Their existing qualifications still apply.

The Planner page (`(app)/planner/page.tsx` under [app source](../../pwa/src/app/)) calls
[weekStore](../../pwa/src/store/weekStore.ts); the
Discovery page (`(app)/discovery/page.tsx` under [app source](../../pwa/src/app/)) uses
[discoveryStore](../../pwa/src/store/discoveryStore.ts). The
[planner wrapper](../../pwa/src/lib/api/planner.ts) and
[Discovery wrapper](../../pwa/src/lib/api/discovery.ts) call the generated builders
below through [api-client](../../pwa/src/lib/api/api-client.ts). Family/member and
SSE connection headers are business inputs, never telemetry correlation. No approved
anonymous browser context is currently propagated to these business operations.

| Wrapper → generated operation | Approved method/path in [OpenAPI](../../specs/openapi.yaml) | Trusted owner / read boundary |
| --- | --- | --- |
| `openVoting` → [`schedule.voting.open.post`](../../pwa/src/lib/api/generated/api/schedule/voting/open/index.ts) | `POST /api/schedule/voting/open`, anchored `weekOffset`/`referenceWeekStartDate`; 400 invalid reference, 409 other owner, 412 stale demo generation, 503 recovery busy | [`ScheduleController.OpenVoting`](../../api/src/RecipeApi/Controllers/ScheduleController.cs) → [`ScheduleService.OpenVotingAsync`](../../api/src/RecipeApi/Services/ScheduleService.cs) |
| `getSchedule` / `getSmartDefaults` → [`schedule.get`](../../pwa/src/lib/api/generated/api/schedule/index.ts) / [`schedule.byWeekOffset(...).smartDefaults.get`](../../pwa/src/lib/api/generated/api/schedule/item/smartDefaults/index.ts) | `GET /api/schedule`; `GET /api/schedule/{weekOffset}/smart-defaults`, same anchor | ScheduleController → ScheduleService read / [`SmartDefaultsReader.ReadAsync`](../../api/src/RecipeApi/Services/SmartDefaultsReader.cs); two reads are not one atomic browser snapshot |
| `getCategories` / `getDiscoveryStack` → [`discovery.categories.get`](../../pwa/src/lib/api/generated/api/discovery/categories/index.ts) / [`discovery.get`](../../pwa/src/lib/api/generated/api/discovery/index.ts) | `GET /api/discovery/categories`; `GET /api/discovery` with category/cuisine; member-scoped queue | [`DiscoveryController`](../../api/src/RecipeApi/Controllers/DiscoveryController.cs) → [`DiscoveryService.GetAvailableCategoriesAsync` / `GetRecipesForDiscoveryAsync`](../../api/src/RecipeApi/Services/DiscoveryService.cs) |
| `submitVote` → [`discovery.byId(...).vote.post`](../../pwa/src/lib/api/generated/api/discovery/item/vote/index.ts) | `POST /api/discovery/{id}/vote`, `VoteDto`; 200 message, 412/503; no commit receipt in response | `DiscoveryController.Vote` → `DiscoveryService.SubmitVoteAsync` |
| `getVotingSession` → [`discovery.session.get`](../../pwa/src/lib/api/generated/api/discovery/session/index.ts) | `GET /api/discovery/session`; 200 `data: VotingSessionSnapshot`, 401/503 | `DiscoveryController.GetSession` → [`VotingSession.ReadAsync`](../../api/src/RecipeApi/Services/VotingSession.cs) |
| `assignRecipeToDay` → [`schedule.assign.post`](../../pwa/src/lib/api/generated/api/schedule/assign/index.ts) | `POST /api/schedule/assign`, promotion uses `requireEmpty: true` with explicit anchor; 409 occupied/racing target | `ScheduleController.AssignRecipe` → `ScheduleService.AssignRecipeAsync` → [`AssignEmptySupperAsync`](../../api/src/RecipeApi/Services/ScheduleService.Assignment.cs) |
| `lockSchedule` → [`schedule.lock.post`](../../pwa/src/lib/api/generated/api/schedule/lock/index.ts) | `POST /api/schedule/lock`, captured anchor and `votingRoundId`; 400/409/412/503, 200 message | `ScheduleController.LockSchedule` → `ScheduleService.LockScheduleAsync` |

Controller success is wrapped by the existing success filter. Method/path,
parameters and generated methods were checked in source, not by live endpoint
parity. Discovery's controller also returns 400 for missing member/body; the vote
operation does not enumerate that response. OpenAPI has no operation IDs here;
method/path and exact builder/controller symbols are the references.

[`VotingBoundary.BeginAsync`](../../api/src/RecipeApi/Services/VotingBoundary.cs)
serializes relational round writes with a table lock. Each selected service saves,
then commits its owned relational transaction before later publication. In-memory
test paths have no relational transaction. Existing ambient transactions must be
considered before a future emitter claims an outer commit. The production
[`SseEventPublisher`](../../api/src/RecipeApi/Infrastructure/SseEventPublisher.cs)
broadcasts week/vote consequences and refreshes session projection; the
[`stream hook`](../../pwa/src/hooks/useScheduleStream.ts) applies snapshots, votes
and sessions. Broadcast/read success is a separate boundary from persistence;
disconnects and per-process delivery do not establish receipt by every member.

#### J02 — Open or reopen voting

| Coverage field | Traced result / proposal, not approved instrumentation |
| --- | --- |
| Question / entry | Did Ask the Family establish voting, and did this browser reconcile it? Enter a loaded non-past Draft or Locked plan, including anchored next-week entry/reload. Direct Discovery entry reads ownership; it does not open voting. |
| Ordered boundaries | `PlannerPage.handleAskFamily` → `weekStore.openVoting` captures absolute week/calendar → wrapper POST → `OpenVotingAsync` serializes ownership, preserves early votes/calendar entries, sets plan VotingOpen and round owner, saves/commits → week read/publication and all-suggestion invalidation → wrapper session refresh plus schedule/default reads → guarded status/round/day update → page closes pivot. A successful same-week repeat preserves the round; a reopened closed week uses the current new round. |
| Failure / cancellation / recovery | Missing calendar throws before request; invalid anchor/other-week conflict rejects. Post-commit read/publication may fail while voting remains open. The store catch refreshes session and throws; the page logs a warning. It does not explicitly restore a captured schedule/status: unrelated accepted state can already have arrived. Delayed reads are guarded against week/round/session changes. Dismissing a pivot before submission is cancellation; navigation after sending is not cancellation of committed work. Refresh/reload may reconcile; no guaranteed recovery is claimed. |
| Owners / exact tests | Contract chain above. [`weekStore.test.ts`](../../pwa/src/store/weekStore.test.ts): `openVoting() at weekOffset=1 requests getSchedule(1) and getSmartDefaults(1), not week 0`, `delayed open results cannot restore a round closed by another member`, `failed old open completion cannot roll back a later confirmed round`. [`ScheduleIntegrationTests`](../../api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs): `State_Transition_Draft_To_VotingOpen` (default in-memory factory). [`VotingSessionTests`](../../api/src/RecipeApi.Tests/Services/VotingSessionTests.cs): `RestartWithCoverageAndRepeatedOpenRemainConverged`. [`planner-voting-identity.spec.ts`](../../pwa/e2e/planner-voting-identity.spec.ts) covers anchored entry/reload and other-week 409 with stateful API mocks. All inspected, none executed here. |
| Automatic versus custom | F2 supplies Planner/companion presentation, not opening persistence. F3 unexpected-error capture does not define the handled warning as a business failure. Candidate `voting.opened` belongs in `ScheduleService.OpenVotingAsync` after its save/owned commit, before `PublishWeekUpdatedAsync`; browser reconciliation, if separately needed, belongs after the guarded store update, not at the click or unconditional page return. |
| Candidate record / correlation | One standard named INFO log with source timestamp, resource service/version, random record ID if the actual logging bridge supports it. Proposed bounded `reason=new.round` or `reopen`; no week/date/round/member/household IDs. Browser presentation would use only the existing in-memory scope/tab/sequence. Linking API and browser needs separately approved bounded propagation; it is absent today. |
| Trigger / deduplication decisions | Proposed success means a real transition to VotingOpen, not every idempotent repeat. The service needs a transaction-local changed flag; exact exported-record replay retains its record identity. A business retry is not automatically the same observation. Decide how to distinguish first opening/reopening without exporting round identity, and how to report post-commit publication friction separately. No browser inference of server success on failure. |
| Limits / volume | Proposed ≤1 opened record per actual transition; retries/no-op repeats add no opened fact. No polling/heartbeat, durable telemetry queue or cross-tab deduplication. Each process/tab has independent bounds; admitted records can be lost on failure/restart. API rate/drop/flush bounds need measurement through the existing sink before approval; no current exactly-once guarantee. |
| Receiver / evidence / next slice | Named server log discovery and prospective source/service/carrier/name mapping can support a saved-open question; no correlation leaves it unassigned. Unverified Serilog EventId/name projection, independent API collection opt-in and post-commit failure handling block an emitter proposal from being implementation-ready. Source traced; all runtime cells not-run. Defer this emitter; use the single I1 successor below. |

#### J03 — Repeated voting and distinct Discovery results

| Coverage field | Traced result / proposal, not approved instrumentation |
| --- | --- |
| Question / entry | Did a visit see a confirmed household convergence card or an exhausted personal feed? Separately, was a submitted vote saved? Direct `/discovery`, Home nudge, fresh entry/reload, reconnect and foreground refresh can discover another member's result without a local vote. No result identifies who caused convergence. |
| Ordered boundaries | `DiscoveryPage.handleSwipeRight/Left` removes a card optimistically and tracks an in-flight vote; local `matchCount` is optimistic. Wrapper POST → `SubmitVoteAsync` upserts member/recipe vote, saves/commits → count query and `PublishVoteUpdatedAsync` → session refresh/default publication → HTTP completion. Store session reads and SSE accept usable identity and newer incarnation/revision state. `VotingSession.ProjectAsync` calculates persisted occupied dates/eligible candidates in a coherent read; coverage is min(required slots, candidates), zero required slots can converge. Convergence is latched per host round, not persisted as a close. |
| Presentation / late votes | The `discovery-converged` branch precedes loader/arena; it renders the polite SuccessCard even with cards remaining. New gestures are stopped; already submitted requests continue and may add/reorder suggestions after convergence. Close serialization decides whether a racing vote belongs to the closed round or becomes an early vote afterward. See your matches opens the authoritative absolute week's meal-plan tab without assignment/close. With no convergence, an exhausted queue shows Capture/refresh and, for an owned round, Nudge family. This is personal availability, not household completion. |
| Failure / cancellation / recovery | Vote rejection refreshes session and refetches queue because persistence may have succeeded. Failed reads keep last confirmed session but mark it unavailable; duplicate/older revisions are rejected and an unfamiliar host requires HTTP reconciliation. A failed initial category/queue read can fall through to the empty UI with no successful-load marker. Last-card optimistic removal can reach empty before writes settle. Canceling an unsubmitted drag/nudge changes no votes; leaving the page or closing a tab does not cancel submitted votes. Restart can recalculate a previously latched result as collecting if coverage was withdrawn. |
| Owners / exact tests | `(app)/discovery/page.test.tsx` under [app source](../../pwa/src/app/): `rereads session after a vote response fails because persistence may have succeeded`, `offers the shared family nudge and Capture when an owned feed is exhausted`, `shows a stable polite success card and opens the completed week meal plan only on click`. [`votingSession.test.ts`](../../pwa/src/store/votingSession.test.ts): `retains confirmed celebration on failed read without claiming fresh counts`, `requires a read before accepting an unexpected incarnation`. `VotingSessionTests`: `LateUnanimousVoteReordersSuggestionsAndKeepsConvergence`, `LateVoteCreatesAdditionalCandidateWithoutSavingOrClosing`, `FailedVoteRequestCannotEstablishConfirmedCoverage`, `WithdrawalIsLatchedButRestartRecalculatesInsufficientCoverage`. [`VotingSessionPostgresTests`](../../api/src/RecipeApi.Tests/Integration/VotingSessionPostgresTests.cs): `ThreeMatchesForNextWeek_ConvergeForBothSubscribers_WithoutAssignmentsOrHistory`, `ConcurrentFinalVotesAndOtherPlan_KeepUniqueSuggestionsInsideRemainingDates`. Tests inspected, not run. |
| Automatic versus custom | F2 records Discovery route entry, not same-route results, votes, attention or agreement. Candidate server `vote.committed` belongs immediately after `SubmitVoteAsync` save/owned commit, before the fallible count query/publication. Candidate browser `pwa.discovery.result.presented` belongs at actual committed rendering of `discovery-converged` or a successfully loaded, settled `discovery-empty-state`; never inside swipe handlers or on any empty array. Neither emitter exists. |
| Candidate record / correlation | Separate standard named logs: server commitment with no vote value/content/IDs; browser result with only fixed `reason=family.converged` or `feed.exhausted`, source/observed time and existing anonymous scope/tab/record/sequence. Round/incarnation may be compared locally for stale-result guards, never exported or hashed. Result log is a point, not a span or stage duration. No browser/API join or cross-document/member aggregation is inferred. |
| Trigger / deduplication decisions | Count each saved submission as a committed contribution only under an approved repeat/upsert policy; a retry can save the same vote again and no telemetry idempotency receipt exists. For presentation, propose one record per transition into a visible qualified result, no replay on revised counts/rerender/unchanged refresh. Do not invent a failure/departure record from silence. Resolve re-entry versus once-per-document/round, stale retained convergence after failed refresh, and failed/pending queue reads before implementation. |
| Limits / volume | Healthy repeated votes imply one server record per admitted saved submission, not one family completion each. Proposed result cap: at most 10 per document plus the existing transport's independent process limits; this is a review candidate, not a configured budget. No card IDs, per-card timing, clicks, heartbeat or durable retry queue. Hidden/disposed documents and receiver failure can lose records. Tab/process multiplication and cap-induced incompleteness must remain visible. |
| Receiver / evidence / next slice | Source/service/carrier/name plus retained `reason` can map the two results distinctly. A converged presentation goal means this browser saw confirmed convergence; exhaustion must not be mapped to family success. Goal-free navigation is currently supported. Server vote projection/propagation remains unqualified for WFS. Source traced, tests read, UI/DB/exporter/receiver/deployed/device not-run. Select the browser-result proposal below; defer vote instrumentation. |

#### J04 — Promote suggestions and close voting

| Coverage field | Traced result / proposal, not approved instrumentation |
| --- | --- |
| Question / entry | Did the captured round actually close, and did the browser recover/present that outcome? Enter a loaded VotingOpen week with a captured round, confirmed meals, skipped dates and possibly pending suggestions. Direct API lock is a distinct path and creates no pending assignments. |
| Ordered boundaries | `PlannerPage.handleCloseVoting` → `weekStore.closeVoting` captures week/round and pending non-Skipped slots → optimistic status 2 → sequential guarded assignment POSTs → each `AssignEmptySupperAsync` saves/commits independently → grocery/read/publication follow-ups → lock POST only after all promotions resolve → `LockScheduleAsync` serialized transaction snapshots positive interest/selected flags and vote totals, preserves Cooked/Skipped, locks ordinary entries, saves close receipt, clears working votes and advances round → commit → reads/publications/invalidation → optional confirming read and guarded pending-marker cleanup → temporary page success. Promotion is not atomic with close. |
| Failure / cancellation / recovery | An occupied/racing target returns 409; earlier assignments remain saved and lock is not called. An assignment can commit then fail during grocery/publication, also preventing lock. Close can commit then lose response/publication; catch rereads captured week and accepts only Locked with matching closed-round identity. Otherwise restore local status and reconcile available saved days without compensating assignments. Failed reread leaves uncertainty. No dedicated retry panel. Same receipt lock replay does not reclear early votes/new rounds. Navigation guards store changes, but the page success callback itself is unguarded after the await. Leaving the page is not rollback/cancellation. |
| Owners / exact tests | [`weekStore.test.ts`](../../pwa/src/store/weekStore.test.ts): `reconciles successful promotions after another target conflicts, without locking`, `serializes guarded promotions and locks only after they all succeed`, `recovers a committed close after publication or response failure`, `a recovered old close receipt cannot replace a subsequently reopened round`. `VotingSessionPostgresTests.GuardedPromotionConflict_PreservesSuccessfulAssignmentAndOther_ThenCloseReplayKeepsEarlyVotes` checks real relational rows/receipt replay when executed. `ScheduleIntegrationTests.State_Transition_VotingOpen_To_Locked_Purges_Votes` and `Recipe_LastCookedDate_NOT_Updated_On_Lock` use the default in-memory factory. [`planner-full-cycle.spec.ts`](../../pwa/e2e/planner-full-cycle.spec.ts): `closing voting promotes pending items and locks the week` uses API mocks. All read, not run. `planner-reconciliation.spec.ts` mainly covers movement/snapshot reconciliation; its filename is not close-failure coverage. |
| Automatic versus custom | Planner screen/companion observations do not report assignments or close. Candidate `voting.closed` belongs in `LockScheduleAsync` after successful save/owned commit on the non-replay path, before post-commit reads/publication. Per-promotion assignment facts belong at the assignment transaction owner, not the close loop; defer their design to I2. Optional browser close recovery/presentation belongs after captured-week/round reconciliation and current presentation checks, not unconditional `handleCloseVoting` success. |
| Candidate record / correlation | Standard named INFO log `voting.closed`, service/version, source timestamp, independent random event identity; no round/receipt/date/week/recipe/member IDs, counts or notes required. A random bounded server operation scope would be separate from browser document scope. No durable identifier or propagation mechanism is approved. A later safe publication warning must not relabel the committed close as failed. |
| Trigger / deduplication decisions | Proposed one close fact per new committed close; receipt replay emits no second close. Keep the transaction's replay flag until the boundary; do not use persisted business identity as telemetry ID. Lost export after commit can lose the observation: no outbox/exactly-once delivery is introduced. Decide whether optional browser evidence describes recovered request success or an actually displayed current-week confirmation, and how warnings identify post-commit friction without raw exception text. |
| Limits / volume | At most one proposed close fact per new close; 0–7 independent promotions, each a separate committed mutation if later instrumented. Retry/reopen can produce legitimate new closes, not a document-wide one-shot. No queue/heartbeat/household aggregation. Failure storms need an explicit bounded reporting owner; API sink bounds remain unmeasured. |
| Receiver / evidence / next slice | Prospective server-only mapping can use `voting.closed` as a round-close goal only if the exporter retains the named fact and correct server credential. It cannot prove every suggestion saved, that the response arrived, shopping/cooking completion, or that all members saw the plan. Browser and server context are not currently joined. Source traced; runtime cells not-run. Defer close instrumentation and use the single successor below. |

#### Receiver compatibility and source identity

Inspected WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`, with pre-existing telemetry code/docs and
archive edits. The 50-file source manifest is
`.task/telemetry-inventory/i1/source.json`, SHA-256
`439ab428b3f4747ad24d59b3c5a7423baf1d99e447344acc718130e7ce5fb699`.
It records exact source/test/generated/contract bytes, not a clean-build identity
or execution result. Source changes require a fresh trace.

Initial read-only Sentrame snapshot: HEAD `c4d0204b4891da15ae4b020d37682e48052e1879` on `main`;
untracked `add-loop-aware-journey-views` planning and `journeyViews` source/tests
were present. They are not evidence of runtime-qualified loop-aware views. Current
receiver guides describe schema 3 / structural-v2 / journey-native-v3; those are
documented model versions, not an observed running receiver in I1.

| Inspected document under `/Users/alex/Code/sentrame/` | SHA-256 |
| --- | --- |
| `docs/DEVELOPER-GUIDE.md` | `781cb9552dde612eafb1478dd30777f2761547046b00c7ef296f8b6da26ee961` |
| `docs/integration/OTEL-CONTRACT.md` | `830fe58dcf102d00da6f79f12b02f3728c1cea9e9841c054815c801ba7ecdb12` |
| `docs/integration/AGENT-INTEGRATION.md` | `3f9e407be5fdb235061fc1e979ac1e6f7e4513755535aa6dcb413bb70183e346` |
| `docs/USER-GUIDE.md` | `052fe1345a28c731ff0d53f25557a0567dbde91adf1a302764e34129abebc7cd` |
| `docs/verification/standard-otel.md` | `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e` |

During consistency checking, concurrent receiver work changed USER-GUIDE to
`055bd5b4e3428bb7fdb815dcf5791e6b0bc90772a638a4d5905a0584cdf1bcf6`:
nine added lines describe four journey-detail views and their limits. Tracked
query/UI/test changes were also present by recheck. The inspected goal-optional
and trust/correlation sections were unchanged; the new views remain unqualified
here. The original manifest/table retain their initial snapshot identity;
`.task/telemetry-inventory/i1/receiver-recheck.json` records the reviewed drift.

Retained names, source/service/carrier, `reason`, occurrence time and explicit
random scope/tab support prospective mappings; unknown attributes are omitted.
Exact replay uses supported record identity, not template EventId or timestamps.
Graph edges aggregate occurrences and can combine paths nobody followed end to
end. Protected ordered evidence is needed for path claims; recovery highlighting
does not establish same-operation repair or causality. Detail expiry (30 days),
supported summary retention (12 months), truncation, opt-in and exporter loss
constrain inference. No inventory card implies receiver delivery completeness.

Current `internal/app/query.go:validateDefinition`,
`navigation_journey_test.go:TestMappingWithoutCompletionGoal` /
`TestManagedNavigationIntakeSnapshotReplayAndGoalFreeActivation`, and USER-GUIDE's
Give ordinary telemetry business meaning section supersede the planning claim
that a nonempty definition needs a goal. These sources were inspected, not run.
No synthetic completion goal is necessary for open-ended navigation. An optional
goal closes a capture at the chosen result; 30-minute mapped inactivity means
unknown outcome. One Discovery result name with two reasons can be conditioned
without treating personal exhaustion as family success. Independent reusable
outcome/loop views must be checked separately; the untracked proposal proves none.

WFS's current [API bootstrap](../../api/src/RecipeApi/Program.cs) already registers
Serilog's OTel sink, a console logging exporter, ASP.NET/HTTP tracing and metrics.
[`RecipeApi.csproj`](../../api/RecipeApi.csproj) pins OTel 1.20.0,
Serilog.AspNetCore 10.0.0 and Serilog.Sinks.OpenTelemetry 4.2.0. Sentrame's qualified
.NET sample uses OTel 1.20.1 and a different logging path; it does not qualify
WFS's bridge, credentials, event naming, opt-in, sampling, flush or shutdown.
No second provider/package/transport is proposed. Current PWA
[`navigation.ts`](../../pwa/src/lib/telemetry/navigation.ts) permits four fixed
presentation names; result names/reasons need a separately approved closed-input
extension. Its [Node transport](../../pwa/src/lib/telemetry/server.ts) bounds
browser/server budgets independently (100 ordinary records/minute, 20 errors/minute,
4 concurrent exports per producer/process); these limits do not bound .NET.

#### Walkthrough and qualification cells

Environment inspected: local macOS workspace, available UI inventory and local
listeners only. `cua.getState()` returned no browsers and
`Browsers: Error: The browser access host is unavailable`. Existing listeners were
not established as disposable synthetic journey fixtures; none was mutated.
No UI/browser/device was selected, no application launched and no synthetic
business writes performed. Native UI fallback was not used without an identified
isolated fixture. The required unavailable-evidence branch is recorded below;
these are proposed steps, not an executed walkthrough.

| Cell | Proposed isolated steps | Actual result |
| --- | --- | --- |
| J02 success/reopen | Loaded non-past anchored week → Ask the Family → confirm persisted VotingOpen/round → reload; reopen a closed week preserving entries/early votes | Not-run; browser access blocked and no selected disposable fixture |
| J03 success/results | Two synthetic members → repeated Like/Pass → distinct exhausted feed versus confirmed convergence; hold a submitted vote through convergence; See your matches → owning week | Not-run; same environment limit |
| J04 close success | Pending and confirmed/skipped slots → sequential promotions → lock → closed receipt/history/vote state → current-week presentation | Not-run; same environment limit |
| Failure/recovery | First promotion saves, second conflicts → verify partial saved plan/no lock; separately lose close response → reread matching receipt; repeat lock → later early vote survives | Not-run; source/test inspection only, no induced failures |
| Unit/component/mock suites | Exact test symbols above; mocked stateful E2E is distinct from real DB | Not-run; read only |
| Real API / PostgreSQL | Existing `VotingSessionPostgresTests`; live browser fixture needs isolated `CALENDAR_API_URL` and `VOTING_LIVE_MEMBERS` | Not-run; no database/runtime qualification |
| Actual exporter → protected receiver reads/replay/reopen | New candidate records through actual chosen browser/.NET path | Not-run; candidates are unimplemented |
| Deployed route / physical installed phone / native sharing | Separately selected disposable configuration/device | Not-run; no deployment/device claim |
| TDD / application preparation | Documentation investigation has no behavior change | Not-applicable |

#### One recommended next proposal boundary

Recommend **`observe-discovery-results`**, a proposed browser-only result observation
answering “Which known result did this Discovery visit actually present?” It
depends on the existing F2 document scope/gates/transport, not on new .NET
instrumentation. Candidate owners: Discovery page's result branches, a small
closed observation definition beside the existing telemetry definitions,
Server Action validation/Node serialization, focused page/transport tests and an
isolated real-action/receiver acceptance fixture. No business API/client changes
are needed unless that separately reviewed design discovers a real dependency.

Before implementation, settle result occurrence lifetime/re-entry, retained
convergence freshness, pending writes and successful-load evidence. The current
empty branch alone is insufficient. Proposed observer-local guards must track
successful current-generation queue completion and outstanding votes without
changing visible UI, ranking, votes or retry behavior. If those semantics require
product behavior changes, stop and revise the proposal scope first.

Test-first acceptance for that future change: direct converged entry without a
vote; repeated Like/Pass; exhausted valid queue; failed initial/refetch/session
reads; unresolved/failed last vote; late submitted vote after convergence; duplicate
revisions/rerenders/refresh; return/reload; hidden document and opt-out; actual
same-origin action → Node → disposable Sentrame durable protected read with two
distinct fixed reasons, browser authority, replay and privacy assertions. Receiver
mapping is prospective and optional; any convergence goal proves presentation
only. Proposed ≤10 result records/document, no content/IDs/dates/queries/exception
text, no durable queue or cross-document linkage. Final budget and semantics need
approval in that proposal. Stop after this one observation's local acceptance;
defer trusted vote/open/close events, API propagation, duration, independent
outcome views, deployment and device qualification. No successor change is created
by this inventory session.

### I2 — Assignment, non-cooking and movement — 2026-10-30

Selected tasks **2.1–2.2 only**, mode `investigate`. J05–J07 are source-traced;
all walkthrough/runtime cells below remain open. I1's final record
`.task/agent-finish/runs/da058edf416342a0b0f0c3b7f64d414c.json` was read:
documentation, selected strict OpenSpec validation and content stability passed;
application checks were not-applicable and task acceptance was not evaluated by
the harness. I1's checked investigation tasks use the explicit unavailable-UI
branch. This reconciles its later final gate without promoting source evidence
or historical F2/F3 receiver fixtures into journey qualification.

#### Source identity and shared operation chain

WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`. Existing tracked/untracked telemetry,
archive and shared-document edits were captured before writes in
`.task/telemetry-inventory/i2/`; `source.json` records exact inspected input hashes;
`check-source.py` checks generated builders, contract pairs and test symbols. It is a source snapshot,
not a build/runtime identity. No household, endpoint, credential or receiver
configuration was selected for collection.

Canonical owners: [meal assignment](../../openspec/specs/meal-assignment/spec.md)
(optimistic choice, occupied recovery, guarded versus legacy assignment),
[non-cooking plans](../../openspec/specs/non-cooking-plans/spec.md)
(draft, save/edit/clear, failed save/read),
[meal rescheduling](../../openspec/specs/meal-rescheduling/spec.md)
(preview/cancel, swap, cross-week, defer, delete, atomic Tomorrow, reconciliation),
and [Tonight decisions](../../openspec/specs/tonight-meal-decisions/spec.md)
(staged change-plan/replacement; entry and cancellation leave Tonight unchanged).
I1's voting suggestions remain previews until assignment; round close is separate.

The exact routes are files under the [app directory](../../pwa/src/app):
`(app)/planner/page.tsx:handleQuickFindSelect`, `handleRecoveryAction`,
`handlePlanLater`, sheet `onSave/onClear`;
`(app)/recipes/page.tsx:assignWithRecoveryGuard`, `handleRecoveryAction`;
`(app)/browse-all-stack/page.tsx` uses the same slot helpers.
[QuickFindModal](../../pwa/src/components/planner/QuickFindModal.tsx) presents/selects
suggestions; selection, Skip, details and terminal Search are not persistence.
[slotAssignment.ts](../../pwa/src/lib/planner/slotAssignment.ts) owns target reads,
first-open scans, prior-slot resolution and Tomorrow outcome retention.
[planner.ts](../../pwa/src/lib/api/planner.ts) wraps the generated client, converts
literal dates to Kiota DateOnly, normalizes recipe unions and forwards captured
reference Monday. Background Discovery-session refresh after wrappers is a
separate fallible/read effect, not proof of a saved plan or round close.

All rows below were matched against [OpenAPI](../../specs/openapi.yaml), generated
request metadata and [ScheduleController](../../api/src/RecipeApi/Controllers/ScheduleController.cs).
These are inspected method/path/shape agreements, not live endpoint parity.

| Approved method/path | Wrapper/generated builder | Controller → service; representation and boundary |
| --- | --- | --- |
| `GET /api/schedule` | `getSchedule`; [schedule/index.ts](../../pwa/src/lib/api/generated/api/schedule/index.ts) | `GetSchedule` → `GetScheduleAsync`; envelope data/week/calendar/day DTOs → normalized browser slots. A read is not a mutation receipt. |
| `POST /api/schedule/assign` | `assignRecipeToDay`; [assign/index.ts](../../pwa/src/lib/api/generated/api/schedule/assign/index.ts) | `AssignRecipe` → `AssignRecipeAsync`; weekOffset/dayIndex/recipeId, optional requireEmpty; reference Monday query. Returns data.message/displacedRecipe after follow-ups; guarded 400/409 mean rejected target. |
| `POST /api/schedule/day/{date}/validate` | `saveNonCookingDay`; [validate/index.ts](../../pwa/src/lib/api/generated/api/schedule/day/item/validate/index.ts) | `ValidateDay` → `ValidateDayAsync`; literal date, status=3/nonCooking kind/optional label. data.mealMarkedCooked=false is expected for recipe-free save, not a failed save. 400 invalid plan; 409 occupied/conflicting date. |
| `DELETE /api/schedule/day/{date}/remove` | `removeRecipeFromDay` or direct recovery call; [remove/index.ts](../../pwa/src/lib/api/generated/api/schedule/day/item/remove/index.ts) | `RemoveRecipe` → `RemoveRecipeAsync`; literal date; 204 also covers already absent entry. Deletion and later follow-ups are separate. |
| `POST /api/schedule/move` | `moveRecipe`, `moveTomorrow`, direct Plan later/recovery; [move/index.ts](../../pwa/src/lib/api/generated/api/schedule/move/index.ts) | `MoveRecipe` → `MoveScheduleEventAsync` → `MoveTomorrowAsync`/`MoveCrossWeekAsync`/swap; exact source index plus recipe, reference, target/intent/disposition. Legacy message-only completion can be no-op; only explicit moved=true confirms modern movement. |
| `POST /api/schedule/defer` | `resolveOccupiedSlot(..., true)` or Home direct call; [defer/index.ts](../../pwa/src/lib/api/generated/api/schedule/defer/index.ts) | `DeferRecipe` → `DeferRecipeAsync`; exact sourceDate/recipeId, reference/targetWeekOffset queries; actual scheduledDate/offset/message returned after follow-ups. 404 absent source, 409 awaiting consensus. |

Persistence owners are [ScheduleService](../../api/src/RecipeApi/Services/ScheduleService.cs),
[Assignment part](../../api/src/RecipeApi/Services/ScheduleService.Assignment.cs) and
[Tomorrow part](../../api/src/RecipeApi/Services/ScheduleService.Tomorrow.cs):
CalendarEvents, WeeklyPlans and (cooked deletion/defer) recalculated LastCookedDate.
[RecipeDbContext](../../api/src/RecipeApi/Data/RecipeDbContext.cs) and
[database schema](../../api/database/schema.sql) expose the unique date/meal-slot
boundary. Relational serializable transactions guard empty-supper assignment,
non-cooking writes and Tomorrow; InMemory test behavior cannot qualify PostgreSQL.
`SaveChangesAndRecalculateLastCookedDatesAsync` commits calendar/history together
before defer/delete grocery work. Ordinary saves precede subsequent reads,
recomputation and publication. `EnsureWeekPlanExistsAsync` can save a missing plan
before legacy assignment completes; do not infer whole-operation atomicity.
[SseEventPublisher](../../api/src/RecipeApi/Infrastructure/SseEventPublisher.cs)
translates slot/week/invalidation messages and may refresh voting-session state.
An awaited publication attempt, excluded self echo or another device's SSE never
proves delivery, browser application or a new local business mutation.

#### J05 — Meal assignment and replacement

**Question / entry:** Was the selected recipe actually saved, and did prior-meal
resolution succeed independently of replacement? Enter from an empty/occupied
Planner pivot, targeted Search/detail, Browse, Home ready GOTO or Change plan.
Direct route success/highlight parameters are presentation hints only.

**Ordered boundaries / cancellation:** Quick Find selection on an empty day calls
[weekStore.assignRecipe](../../pwa/src/store/weekStore.ts), which paints Planned
and clears non-cooking metadata optimistically, awaits assignment, then reads
adjunct groceries/status without replacing optimistic days. Either rejection
restores the captured local schedule and the page requests initialization/error
feedback; a successful POST followed by failed GET may therefore look failed
while the calendar is saved. A resolved unusable GET can still close selection.
Initialization swallows read errors, so “refreshed” feedback does not prove a
successful reread. [todayStore.assignRecipe](../../pwa/src/store/todayStore.ts)
paints immediately and sends a background write whose rejection is logged; its
return and recipe-detail hydration prove neither persistence nor rollback.

Legacy assignment replaces an existing date, resets Planned/non-cooking fields,
and on Sunday can overwrite the following Monday with the displaced recipe.
Guarded `AssignEmptySupperAsync` atomically checks supper slot zero and commits
before target-week grocery/read/week/invalidation work. `saveRecoveryRecipe`
uses that guard; the helper named `assignRecipeToEmptySlot` does **not** pass
requireEmpty, so Search/Browse preflight remains a read followed by legacy write.
Planner's captured recovery assignment also uses legacy semantics. Names must
not imply an empty-slot concurrency guarantee that these callers do not request.

Occupied Planner selection closes Quick Find without replacement; a pending
submission ref suppresses duplicates. `resolveOccupiedSlot` awaits Tomorrow,
exact-date defer (Planner) or drop before assignment. `recoveryRecipeResolvedRef`
retains completed disposition while the mounted recovery stays open, so retry
skips it after replacement failure. A disposition that committed but rejected
before the ref was set remains ambiguous. Search/Browse next-week recovery uses
cross-week movement, not defer; their handler does not retain Planner's generic
disposition ref. Tomorrow separately retains its outcome by source-object identity.
[HomeCommandCenter.continueReplacement](../../pwa/src/components/home/HomeCommandCenter.tsx)
retains disposed/saved/unknown/blocked phases; rejected saves are reread against
the captured slot, conflicts block, and a confirmed save survives a later failed
refresh. Such a read shows current matching state, not causal attribution to a
particular request. Closing entry/draft before submission commits nothing;
closing after a prior operation cannot undo it or imply cancellation of writes.

**Automatic/custom and trusted owner:** Shared Home/Planner/Search/Quick Find
observations supply presentation only; detail/recovery remain coverage exceptions.
Proposed `meal.assigned` is a standard named OTel log at `AssignRecipeAsync`
after its actual calendar commit (including the guarded helper return), before
fallible follow-ups, not at controller 200, optimistic paint or modal closure.
Only this server owner can establish commitment. Proposed browser
`meal.assignment.result` may describe known saved / refresh-incomplete /
conflict / unknown feedback, never claim server authority. No emitter is approved.

**Candidate / limits / unresolved:** Server carrier=log, stable eventName,
resource service/version, source commit timestamp; allowlisted reason
`assigned`/`replaced`/`guarded` only if derived at that owner. No recipe/date/day/
week/household/member/name/image/displaced payload. Browser records use existing
document random scope/tab/sequence; no API propagation currently joins them.
Propose ≤1 commit fact per committed invocation and ≤1 terminal presentation
fact per retained attempt, not per render/read; bounded retries can legitimately
produce multiple commits. Settle no-op/same-recipe semantics, Sunday displacement
counting, attempt lifetime, conflict-vs-unknown classification, causal reread
limits, replay/dedup and a default-off .NET budget before implementation. Export
loss is accepted; no durable queue, completeness denominator or joined funnel.

**Tests / evidence / next slice:** Exact inspected bodies below cover assignment,
partial replacement and guarded concurrency; none ran. Receiver mapping must
select server/service/log/name for a persistence goal; browser feedback is
supporting evidence only. A J05 successor needs separate safe propagation and
.NET bridge qualification if it asks for an end-to-end joined journey. Defer J05
implementation; the one I2 recommendation is the J07 result slice below.

#### J06 — Non-cooking save, edit and clear

**Question / entry:** Was a recipe-free plan saved/edited/removed rather than just
drafted? Planner Other plans opens a dated new Mystery draft or existing skipped
recipe-free plan; Home hands matching dates back to Planner. A recipe-backed
legacy skip is not an editable recipe-free plan.

**Ordered boundaries / cancellation:**
[NonCookingDaySheet.submit](../../pwa/src/components/planner/NonCookingDaySheet.tsx)
retains typed text while switching choices, trims submission, clears Mystery's
label, validates Unicode scalar length/custom required text and blocks duplicate
submission/dismissal while busy. Escape/X/backdrop before submission discards
only draft state, without a request. `saveNonCookingDay` submits explicit date;
`ValidateDayAsync` rejects an occupied non-skipped/recipe-backed date, persists
recipe-free Skipped metadata without changing week status, commits, then publishes
slot_updated. Publication rejection does not restore the saved plan. The page
rereads the captured week on success and attempts a reread on write rejection;
read rejection retains the sheet/error/draft even after a save. Closing a matching
sheet requires the captured date/selected offset guards; resolved missing data
is not authoritative confirmation.

Sheet clear awaits DELETE then GET; failure keeps the editor available. Direct
pivot removal uses the optimistic week-store path. Both share `RemoveRecipeAsync`:
existing entry deletion commits before recomputation, read, week publication and
invalidation; an absent entry returns 204 with no such follow-ups. A clear 204 is
not evidence that this invocation deleted something. Retry after a lost response
can find the entry already absent. Clearing a text note and clearing the entire
plan are different mutations, never infer either from textbox state.

**Automatic/custom / candidate:** Shared screens provide entry only; the sheet is
an explicit exception. Proposed `meal.non_cooking.saved` at each successful
`ValidateDayAsync` recipe-free commit, before publication, and
`meal.non_cooking.cleared` at `RemoveRecipeAsync` after an actual recipe-free
entry deletion (not absent no-op). Standard named server OTel logs, source commit
time, service/version, optional fixed reason `created`/`edited` or `cleared`.
Do not emit label, note, length/hash, kind-specific private context, date or IDs.
Browser draft dismissal, if separately justified, is browser authority with a
fixed pre-submit reason; never count pending closure as cancellation.

**Limits / unresolved / receiver / next slice:** Propose ≤1 fact per persisted
invocation, no keystroke/choice/render/read records; shared error export is separately
bounded. Settle whether identical resaves count as edits, no-op clear visibility,
reason retention, attempt lifetime and post-commit failure/retry dedup. Reuse the
server log carrier with exact prospective mappings; an optional clear goal proves
only deletion, not shopping/cooking/family satisfaction. Local source support
exists, WFS export remains unqualified. Future J06 slice would need commit/no-op/
publication-failure tests and real protected receipt plus privacy/budget acceptance;
no proposal or emitter is created here.

#### J07 — Movement, Tomorrow, defer and removal

**Question / entry:** Did saved meal content relocate, with which known recovery
result? Enter from an eligible held/keyboard Planner grip, Plan later, or occupied
Home/Planner/Search/Browse recovery. A drag destination cue is a preview, and
Tomorrow is a different operation from legacy push/swap and from defer.

**Ordered boundaries / cancellation:**
[usePlannerDrag](../../pwa/src/components/planner/usePlannerDrag.ts) captures original
slots and keeps date labels fixed; `reorderLocally` swaps only local content.
Escape, blur, pointer cancellation, outside/original drop, navigation/week change
cancel without commit. Valid drop calls `weekStore.commitMove`; keyboard movement
uses the same commit path. The wrapper settles its local move sequence in finally,
including rejection; this acknowledges request settlement, not persistence.
The store waits for outstanding moves, newer assignment/removal and active preview,
then generation/week/schedule/sequence guards its authoritative reread. An owned
failed move can restore its snapshot; unrelated/newer state is preserved, and a
failed refresh reports uncertainty without another movement. Remote events apply
independently from local sequence acknowledgement; authoritative empty weeks
must remain valid.

Legacy same-week swap exchanges recipe/status/votes/non-cooking metadata, saves,
then reads/publishes source week without grocery recomputation through that path.
Legacy push searches its limited window and may fall back to swap; missing/mismatched
source or full cross-week target can return message-only 200 without movement.
A cross-week placement saves before independent grocery/snapshot attempts for
both weeks and returns moved=true/refreshComplete=false if any fail. Plan later
warns/rereads without replay when that flag is false; a resolved no-op still
initializes and cannot be counted as relocated.

`MoveTomorrowAsync` validates exact supper source/next-day target and all movable
chain entries, uses a relational serializable transaction, shifts from the empty
end, and commits the complete chain/optional Order In source disposition together.
Cooked/AwaitingConsensus/stale/invalid conflicts reject before mutation. Only
then does it independently attempt grocery, snapshot and invalidation for every
affected week using CancellationToken.None. Cancellation before commit differs
from cancellation/HTTP loss after commit; the latter cannot imply rollback.
`moveTomorrow` disables transport retry, requires moved=true, retains pending/
known result in a WeakMap keyed by the source object and blocks unknown-outcome
replay even when rereads fail. Known committed incomplete-refresh results remain
committed. Its allSettled rereads alone do not apply snapshots or prove recovery;
caller stores/refresh handle presentation. Lifetime ends when that source object/
document is lost; this is not durable idempotency.

Defer selects the exact source date/recipe, rejects pending consensus, scans from
the requested anchored future week beyond full weeks, preserves skipped source
context while placing Planned content, or resets a moved cooked entry and
recalculates history. Its calendar/history transaction commits before affected-week
grocery/read/publication; those later failures throw without a moved/refresh flag.
Home Order In followed by defer is two writes and can save the non-cooking state
before defer fails. Tomorrow Order In has the distinct atomic source-disposition
path. Removal deletes date content before follow-ups; cooked deletion recomputes
history transactionally. Optimistic `weekStore.removeRecipe` returns void and
restores captured schedule/groceries on rejection without an authoritative recovery
read of its own. That restoration does not establish server restoration and is
not guarded like movement's newer-state recovery.

**Automatic/custom / candidate:** No existing screen, drag cue, SSE or generic
HTTP record answers relocation. Proposed standard server log `meal.moved` at
actual persistence boundaries in `MoveTomorrowAsync`, `MoveCrossWeekAsync`,
same-week `MoveScheduleEventAsync` and `DeferRecipeAsync`, fixed reason
`tomorrow`/`cross_week`/`swap`/`defer` only when known there. Proposed
`meal.removed` belongs after an actual recipe-backed deletion in
`RemoveRecipeAsync`; J06 owns recipe-free clears. No event for ignored/no-op paths.
Follow-up failures require separate bounded evidence and must not relabel commits
as failed. Browser `meal.tomorrow.result` is the bounded successor candidate:
confirmed complete/incomplete-refresh or unknown/rejected presentation, with
browser authority and no joined commit claim.

**Limits / unresolved / receiver / next slice:** Propose ≤1 server commit fact per
operation, independent of chain length/weeks shifted, and ≤1 browser terminal fact
per retained attempt; at most one bounded follow-up summary per operation. No per-date,
per-chain-item, pointer-move or repeated GET observations. Settle same-slot/same-content
no-ops, mixed swap classification, deletion existence, rejected-vs-unknown reason
vocabulary, shared-handler dedup, expiry/re-entry and independently capped .NET
loss/flush policy. Use exact name/service/carrier/source/reason mappings, never
aggregate graph edges as proof of a conserved chain or same-attempt repair.
Server-only facts can remain unassigned; safe document-to-API propagation is an
unresolved separate design, not business-ID correlation. Tests/source are traced;
all runtime/receiver cells remain not-run. The proposed next slice is below.

#### Exact test references and findings

These symbols and their selected assertion bodies were inspected; **none executed**.
Generated method metadata and named tests are source-consistency acceptance only.
Ordinary `TestWebApplicationFactory` defaults to EF InMemory (transactions ignored)
unless explicitly overridden with Tests:PostgresConnectionString. A file named
Integration does not itself establish relational behavior.

| Journey | Inspected test owner and exact examples | What the assertions cover; limits |
| --- | --- | --- |
| J05 | [ScheduleIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs): `AssignRecipe_CreatesCalendarEvent_WhenNoneExists`, `AssignRecipe_UpdatesExistingCalendarEvent_WhenOneExists`, `AssignRecipe_ReopensSkippedCalendarEvent_WhenReplacingOrderedInSlot` | Calendar rows/Planned replacement in the factory seam; no execution/PostgreSQL claim. |
| J05 | Planner `(app)/planner/page.test.tsx`: `reconciles after a successful move when replacement assignment fails and keeps recovery open`, `captures future-week recovery and awaits defer before assigning the exact source slot` | Mocked prior-operation ordering and retained retry state; not real commit evidence. |
| J05 | [TonightReplacementPostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/TonightReplacementPostgresTests.cs): `TonightReplacement_MoveThenGuardedSavePreservesEveryOccurrence`, `TonightReplacement_GuardRejectsAllExistingContentAndConcurrentSave` | Explicit disposable PostgreSQL HTTP/state/concurrency assertions; not run. |
| J06 | [NonCookingDaySheet.test.tsx](../../pwa/src/components/planner/NonCookingDaySheet.test.tsx): `requires a custom message and retains it after a failed save`; Planner page test `refreshes a conflicting recipe assignment and retains the editable custom draft` | Draft retention/client error plus mocked refresh; not saved-state proof. |
| J06 | [planner-non-cooking-days.spec.ts](../../pwa/e2e/planner-non-cooking-days.spec.ts): `Home reconciles and reloads a custom message saved in planner` | Stateful browser interception, Home handoff and draft dismissal; not real API/database. |
| J07 | [slotAssignment.test.ts](../../pwa/src/lib/planner/slotAssignment.test.ts): `Tomorrow requires an explicit committed result and uses the dedicated intent`, `does not replay a committed Tomorrow when replacement needs another attempt`, `rereads unknown outcomes and blocks a blind repeat even when the reread fails`, `refreshes every server-reported week without replay after an incomplete refresh`, `disables transport retries for the non-idempotent Tomorrow request` | Mocked response/retained-object rules and retry suppression, not receiver delivery. |
| J07 | [weekStore.moveReconciliation.test.ts](../../pwa/src/store/weekStore.moveReconciliation.test.ts): `restores an owned failed move immediately and still reconciles once`; [weekStore.removeRecipe.test.ts](../../pwa/src/store/weekStore.removeRecipe.test.ts): `restores the ordered-in day when removal fails` | Movement read ownership versus removal's local restoration; no persisted rollback. |
| J07 | [ScheduleServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs): `TomorrowPush_FirstGapStopsMovementAndPublicationFailureNeverMeansRollback`, `TomorrowPush_CancellationBeforeCommitLeavesSourceUntouched`, `DeferRecipe_MovesLockedSourceToFirstFreeDateAndPublishesBothWeeks`, `DeferRecipe_PreservesSkippedSourceVoteCountAndCreatesPlannedDestination` | Inspected state/publication assertions and injected cancellation; default factory limitations remain. |
| J07 | [TomorrowPushPostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/TomorrowPushPostgresTests.cs): `TomorrowPush_GroceryFailureReportsCommittedAndStillRefreshesLaterWeeks` | SQL-trigger-induced post-commit grocery failure, moved/refreshComplete and later-week state assertions; not run. |
| J05/J07 | [planner.spec.ts](../../pwa/e2e/planner.spec.ts): template `${failure} rejection preserves recovery and retry does not repeat completed defer` | Intercepted defer/replacement failures, counted calls and subsequent mock state read; not real API/database qualification. |

Source discrepancies/limits retained without repair: meal-assignment's adjunct-read
wording says then-loaded offset, while current store captures the operation target
and uses an absolute-week presentation guard; its completion wording mentions
Today's assignment path, while current Planner applies a local server update
without issuing another assignment. Current EF non-cooking check text forbids
preset notes while install SQL allows optional notes. This is source/model drift,
not a reproduced running database defect; no schema/model change is authorized.
Legacy fallback source lookup is not Tomorrow's strict supper-source validation.
Search/Browse generic next-week resolution ignores moved/refreshComplete and can
proceed to replacement after legacy no-op completion; record this existing
caller-specific boundary, not a guarantee of successful prior relocation.

#### Receiver compatibility and qualification cells

Read-only local Sentrame HEAD remains `c4d0204b4891da15ae4b020d37682e48052e1879`;
USER-GUIDE, query/query tests, Workspace, i18n, styles and types are dirty;
loop-aware-view change and JourneyViews source/tests are untracked. Five guide
hashes and inspected WFS package inputs are captured in I2 `source.json`.
I2 guide SHA-256 values (local source only):

| Document | SHA-256 |
| --- | --- |
| `docs/DEVELOPER-GUIDE.md` | `781cb9552dde612eafb1478dd30777f2761547046b00c7ef296f8b6da26ee961` |
| `docs/integration/OTEL-CONTRACT.md` | `830fe58dcf102d00da6f79f12b02f3728c1cea9e9841c054815c801ba7ecdb12` |
| `docs/integration/AGENT-INTEGRATION.md` | `3f9e407be5fdb235061fc1e979ac1e6f7e4513755535aa6dcb413bb70183e346` |
| `docs/USER-GUIDE.md` | `6fb72b52ad07e6168d72b6d24624b3c6c5210053bccdeb6836d3eaf523067b8b` |
| `docs/verification/standard-otel.md` | `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e` |

Documented model remains schema 3 / structural-v2 / journey-native-v3; live running
configuration/binary/storage is **not selected or qualified**. Guides/standard-OTel
ledger describe synthetic support, not I2 execution. Standard named logs and
exact source/service/carrier/name/reason mappings, optional goals and protected
ordered evidence fit these proposals; unknown fields are dropped. No stage tag,
goal or fabricated browser session is needed to accept a server log. No .NET
business emitter or browser/API correlation currently implements these candidates.

WFS API pins OpenTelemetry 1.20.0, Serilog.AspNetCore 10.0.0 and
Serilog.Sinks.OpenTelemetry 4.2.0, whereas the receiver guide's .NET recipe targets
1.20.1. Program.cs already registers Serilog OTel, console logging, tracing and
metrics; no second provider is proposed. Existing structured logs containing
recipe/date/exception data must not be forwarded wholesale as candidate evidence.
Named-log projection, credentials/opt-in, budgets, source/version/time, flush and
actual receiver reads/replay/reopen require WFS-specific qualification. Existing
PWA closed input accepts presentation/error names, not these candidate names.
No SDK/package/config or receiver/storage changes occurred.

Environment: local macOS; `cua.getState()` returned zero browsers and
`Browsers: Error: The browser access host is unavailable`. Local listeners include
older telemetry fixture processes, but no available disposable synthetic business
UI was identified. None was attached, launched or mutated. Proposed steps below
are **not executed**, and failure injection has not occurred.

| Evidence cell | Selected synthetic walkthrough / check | Actual status |
| --- | --- | --- |
| J05 UI success/cancel | Empty-day Quick Find and targeted Search/detail assign → captured-week reread/reload; occupied selection → dismiss before disposition | Not-run; browser access blocked; no identified isolated UI |
| J05 partial recovery | Commit Tomorrow/defer/drop → fail replacement → retry without repeating remembered disposition; save commits → adjunct GET fails → reconcile | Not-run; same blocker; source distinctions only |
| J06 UI save/edit/clear/cancel | Mystery/custom/preset note → save/reload/edit → clear; dismiss unsaved draft; occupied-date 409 and failed read after save | Not-run; same blocker; no business writes |
| J07 UI success/cancel | Held/keyboard swap incl. non-cooking; cancel/outside/week change → no request; Plan later/full target; multiweek Tomorrow/Order In; defer/remove → reload | Not-run; same blocker |
| J07 failure/recovery | Cooked chain rejects unchanged; lost Tomorrow response blocks replay; moved=true/refreshComplete=false; newer move/assignment during failed reconciliation | Not-run; same blocker; no induced failures |
| Unit/component / browser mock | Exact inspected tests above, stateful intercepted APIs | Not-run; source read only |
| Real API / PostgreSQL | Dedicated Tomorrow/replacement/non-cooking/defer fixtures, committed rows and rereads | Not-run; no live runtime/database selected |
| Actual exporter → Sentrame | Candidate named logs, protected durable reads, exact replay, restart/reopen; receipt separate from mapped result | Not-run; candidate emitters unimplemented; historical F2/F3 passes do not transfer |
| Deployed container/proxy/tunnel | Separately selected disposable deployment/config | Not-run |
| Physical installed phone / unlock | Actual OS/device lifecycle and gestures | Not-run; browser viewport/mock cannot substitute |
| Behavior red/green / preparation | Documentation-only investigation | Not-applicable |
| Source/contract/test-symbol consistency | Exact manifest paths, methods and symbols; scoped docs/OpenSpec/content verification in selected task handoff | Source consistency checked separately; final invocation owns gate status |

#### One I2 successor recommendation

Recommend **`observe-tomorrow-results`**, one browser-authority observation of the
shared `moveTomorrow` retained attempt result, consumed by its recovery callers.
It answers “Which known Tomorrow outcome could this document present?” It cannot
prove persistence independently of the trusted API result, conserved chain,
same-request causality from a later read, or receiver completeness.

Proposed scope: one strict `meal.tomorrow.result` named log with fixed `reason`
`confirmed` / `refresh_incomplete` / `rejected` / `unknown`, existing document
scope/tab/sequence and source observation time, using the current same-origin
Action/Node transport and browser credential. Candidate owners are
`slotAssignment.ts:moveTomorrow`, existing telemetry input definitions/Action,
focused helper/transport tests and a disposable real-action receiver fixture.
Before proposing implementation, settle whether the trigger means helper result
or caller-visible feedback, which owner sees presentation, attempt lifetime and
shared-result dedup, pending settlement after document hide/close, rejection
classification (including middleware/demo responses), and the closed four-reason
vocabulary. Do not automatically label arbitrary HTTP rejection as no mutation.
If an observation needs product recovery changes, give those separate authority.

Test-first acceptance for the future slice: confirmed complete/incomplete refresh,
400/409/transport loss and failed rereads, repeated calls sharing a pending/result
object, replacement retry without movement replay, cancellation before submission,
rerender/multiple callers, reload/new scope, hidden/opt-out and privacy sentinels.
Then actual browser → Action → Node → fresh disposable receiver/protected read,
exact replay and reopen; mapping result is asserted separately from durable receipt.
Proposed cap ≤10 attempts/document, one terminal record per retained attempt,
existing process caps plus bounded loss/no queue; budgets require explicit design.
No recipe/date/week/IDs/note/message/stack or durable cross-document identity.
Keep .NET emitters, API propagation/contracts, generic move/defer/delete, receiver
changes, deployment and device qualification outside this proposal. No successor
was created. Next inventory session remains **I3 tasks 3.1–3.2**, separately selected;
I3–I5 and I-V are untouched.

### I3 — Grocery checks and extras — 2026-10-30

Selected: tasks 3.1–3.2, mode `investigate`, J08–J09 only. I2's final record
`.task/agent-finish/runs/529ceafac9a1411f959f2aaab069fd27.json` was read first:
documentation, selected OpenSpec validation and content stability passed for the
same three documentation owners; task acceptance was not evaluated by that tool.
I2 is complete through source investigation and explicit unavailable-walkthrough
cells, without UI/runtime qualification. Starting progress was 4/11; selected investigation is now 2/2, overall 6/11. I4–I5/I-V
remain unselected; no emitter, product behavior or contract is changed here.

#### Source identity and exact operation chain

WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`, with pre-existing tracked/untracked edits,
including all three selected documents. Before-images and status/diff baselines
are private under `.task/telemetry-inventory/i3/`; `source.json` records 51 WFS
source/spec/test/config hashes and five receiver guide hashes, SHA-256
`a98ef765496f2774a191ad7b518de850879f6793fe97ed78c91ca4ace9010266`.
A hashed file is an identity input, not evidence that its tests ran.
The receiver USER-GUIDE changed concurrently after this initial manifest.
`source-drift.json` records its initial/reviewed hashes and review: current mapping,
optional-goal and trust sections were reread along with the Git diff against HEAD.
Loop-view guide additions/expansions do not qualify those views or alter I3 semantics.
The initial stability recheck failed on that guide; the reviewed hash is checked
explicitly thereafter. No exact receiver before-image comparison is claimed.

Canonical [grocery shopping](../../openspec/specs/grocery-shopping/spec.md) owns
selected-week presentation, loaded-content retention, display-name checks and
duplicate rows, per-item rollback, aisle completion/collapse, single-instance map
processing, and extras create/replay/version/future/history/rollover behavior.
[Household live updates](../../openspec/specs/household-live-updates/spec.md) owns
ordered publication attempts, absolute-week matching, extras pending/version
reconciliation and missed-event recovery. [Meal planning](../../openspec/specs/meal-planning/spec.md)
owns eligible schedule reads and calendar identity. These are current owners;
source findings below do not silently revise their requirements.

The Planner page (`(app)/planner/page.tsx` under [app source](../../pwa/src/app/),
lines 586–600 and 709–723) supplies selected offset, `groceryItems` and
`groceryExtras` to [GroceryList](../../pwa/src/components/planner/GroceryList.tsx),
with a narrow grocery tab/return callback or wide embedded companion.
[plannerStore](../../pwa/src/store/plannerStore.ts):`groceryState` is the local
recipe display-name map. [weekStore](../../pwa/src/store/weekStore.ts):`init`,
`sync`, `applySnapshot`, `reconcileExtras`, `applyGroceryExtrasUpdate`,
`upsertGroceryExtra` and `pendingGroceryExtraIds` own loaded lines/extras and
eligibility. [useScheduleStream](../../pwa/src/hooks/useScheduleStream.ts)
reconciles snapshots and grocery events; delivery is not durable acknowledgement.

| Actual caller → generated boundary | Approved operation in [OpenAPI](../../specs/openapi.yaml) | Controller/service and outcome |
| --- | --- | --- |
| [planner.ts](../../pwa/src/lib/api/planner.ts):`getSchedule` → [`schedule.get`](../../pwa/src/lib/api/generated/api/schedule/index.ts) | `GET /api/schedule`, query `weekOffset` and optional reference Monday | [ScheduleController](../../api/src/RecipeApi/Controllers/ScheduleController.cs):`GetSchedule` → [ScheduleService](../../api/src/RecipeApi/Services/ScheduleService.cs):`GetScheduleAsync`; reads stored plan lines/map plus eligible extras, not a new completion fact |
| [schedule.ts](../../pwa/src/lib/api/schedule.ts):`useSchedule.toggleGroceryItem` uses `demoFetch`, **not** a generated call; generated counterpart [`grocery.item.patch`](../../pwa/src/lib/api/generated/api/schedule/item/grocery/item_Escaped/index.ts) exists | `PATCH /api/schedule/{weekOffset}/grocery/item`, intended `{ingredientName, checked}`, 204 after save/publication attempt | `ToggleGroceryItem` → `ToggleGroceryItemAsync` → `WriteGroceryStateAsync`; merge one key into current persisted map |
| Same handwritten wrapper:`updateGroceryState`; generated counterpart [`grocery.patch`](../../pwa/src/lib/api/generated/api/schedule/item/grocery/index.ts) | `PATCH /api/schedule/{weekOffset}/grocery`, dictionary body → 200 `{data: map}` | `UpdateGroceryState` → `UpdateGroceryStateAsync` → `WriteGroceryStateAsync`; whole-map replacement, including explicit false/empty clear; GroceryList does not invoke this bulk method |
| [grocery-extras.ts](../../pwa/src/lib/api/grocery-extras.ts):`createGroceryExtra` → [`groceryExtras.post`](../../pwa/src/lib/api/generated/api/groceryExtras/index.ts) | `POST /api/grocery-extras`, current absolute week/name/client UUID → 201 created or 200 accepted replay; 400/409/412 separate | [GroceryExtrasController](../../api/src/RecipeApi/Controllers/GroceryExtrasController.cs):`Create` → [GroceryExtraService](../../api/src/RecipeApi/Services/GroceryExtraService.cs):`CreateAsync`; save distinct occurrence or return existing binding |
| `suggestGroceryExtraNames` → [`suggestions.get`](../../pwa/src/lib/api/generated/api/groceryExtras/suggestions/index.ts) | `GET /api/grocery-extras/suggestions?query=…`, 200 names / 400 invalid query | `Suggest` → `SuggestAsync`; household extra history, at most three names, no mutation; text/query never telemetry |
| `updateGroceryExtra` → [`byOccurrenceId(id).patch`](../../pwa/src/lib/api/generated/api/groceryExtras/item/index.ts) | `PATCH /api/grocery-extras/{occurrenceId}`, absolute occurrence week/expectedVersion and exactly one of name/checked/grocerySection → 200 authoritative DTO; 400/404/409/412 separate | `Update` → `UpdateAsync`; validate mutable current occurrence, increment concurrency version, save then publish |
| `deleteGroceryExtra` → same builder `.delete` | `DELETE /api/grocery-extras/{occurrenceId}?weekStartDate=…&expectedVersion=…` → 204; 400/404/409/412 separate | `Delete` → `DeleteAsync`; versioned tombstone save, then publish; no historical deletion |

Extras use [api-client](../../pwa/src/lib/api/api-client.ts) middleware, including
member and SSE-connection headers. Recipe checks use `demoFetch` with member header;
the handwritten wrapper does not explicitly add the SSE exclusion header. Header
presence is business coordination, never telemetry identity. Current business
requests carry no approved anonymous browser-to-API journey propagation.

#### J08 coverage card — presentation, checks and reconciliation

**Question / entry.** What shopping rows and check state can this document present,
and what recipe check value was actually saved? Entry can be a narrow grocery tab,
wide Planner companion, reload or remote update, current/future/past selected week,
empty list or already-checked list. Rows are stored grocery adjuncts, not a fresh
on-demand derivation. Empty/loading/retained-after-failed-read are distinct.

**Ordered boundaries / trusted owner.** `GroceryList.handleToggle` (lines 359–382)
inverts `plannerStore` immediately, then awaits the item PATCH. It sends an
intended boolean, not a server inversion. Success leaves local state; catch
inverts the attempted value back and shows a three-second per-item error, without
an authoritative reread. Other rows and the same row remain interactive. There
is no recipe pending-write set, version/attempt token or initiating absolute-week
response guard. A late rejection can overwrite newer local/remote state or a
newly selected view's same-name key; this is a source risk, not a reproduced defect.
Neither optimistic state nor rollback proves whether persistence occurred.

`ScheduleService.WriteGroceryStateAsync` (lines 915–932) enters the singleton
[GroceryCheckCoordinator](../../api/src/RecipeApi/Services/GroceryCheckCoordinator.cs):`ProcessAsync`,
opens a fresh scoped DbContext, reads the existing weekly plan, merges/replaces
its JSON map, saves, synchronizes tracked grocery fields, then awaits publication
while holding the gate. Missing plan throws before save. The gate serializes
normal map writers on **one application instance** across weeks; it is not a
multi-instance database lock, click-order guarantee or map version. Different-key
writes retain each other; same-key intended values, repeated true, bulk replacement
and empty clear follow processing order. A stale bulk body intentionally removes
omitted keys. Waiting/pre-save cancellation or failure differs from post-save
publication/response failure; the latter cannot undo the map.

[WeeklyPlan](../../api/src/RecipeApi/Models/WeeklyPlan.cs) stores `GroceryState`
and `GroceryItems` as separate JSONB fields. [GroceryRecomputeService](../../api/src/RecipeApi/Services/GroceryRecomputeService.cs):`RecomputeForWeekAsync`
uses the same coordinator/fresh context, saves derived lines and supported
predecessor check transitions, synchronizes caller tracking, then attempts a
check event only when checks changed. Adding/removing/replacing recipes or
normalizing names can change the shopping universe; unrelated old map keys do
not make displayed rows complete. Duplicate display-name recipe rows share one
check value but retain their rendered row count and distinct amount hints.

[SseEventPublisher](../../api/src/RecipeApi/Infrastructure/SseEventPublisher.cs):`PublishGroceryUpdatedAsync`
awaits a broadcast attempt, not receiver persistence, delivery/replay or browser
presentation. The coordinator preserves mutation/publication-attempt order;
independent schedule snapshots can arrive late. The stream accepts matching
absolute-week `grocery_updated` maps wholesale, including false/empty, with no
recipe pending guard. `applySnapshot` applies raw or generated maps under schedule
eligibility guards; it has no check-map revision preventing an older same-week
snapshot from replacing a later event. `init` applies an available generated
`additionalData` map; failed/superseded init retains loaded lines. **`sync()`
updates lines/extras but does not copy the returned recipe check map into
plannerStore**; calling it alone is not proof that recipe checks reconciled.
A fresh eligible `init`/accepted snapshot after outstanding work settles can
restore the persisted map; no global latest-state guarantee is inferred.

**Presentation / cancellation / recovery.** `completedAisles` (lines 304–317)
requires nonempty rendered aisle rows, all recipe display-name keys truthy and
all extras checked. It operates on optimistic state, not write settlement. Counts
include extras and duplicate recipe rows. Unchecked recipe rows precede checked
rows; section completion is presentation. Completed aisles initialize collapsed,
re-collapse on visible return, and stay expanded on the last local check. Manual
collapse/expand and leaving the view do not submit completion or cancel/undo an
in-flight write. A reload starts a new anonymous document scope. A failed check
can be retried explicitly; transport loss remains uncertain until an eligible
read. No persisted shopping-trip completion operation exists in the inspected
OpenAPI/controllers/services/model: item/map writes record checks only, never
purchase or a saved finished trip.

Recipe category controls are a separate mutation: [ingredients wrapper](../../pwa/src/lib/api/ingredients.ts):`reclassifyIngredient`
uses `demoFetch`, `PATCH /api/ingredients/{normalizedKey}/category` →
[IngredientsController](../../api/src/RecipeApi/Controllers/IngredientsController.cs):`ReclassifyCategory`
→ [IngredientCategoryService](../../api/src/RecipeApi/Services/IngredientCategoryService.cs):`ReclassifyAsync`.
The override saves before affected-week recomputation; 204 follows those follow-ups.
GroceryList moves matching loaded rows only after success at the initiating offset;
failed follow-up need not mean no override saved. This differs from an extra's
occurrence-only category update, and never proves shopping completion.

**Automatic versus custom / candidate.** F2 reports narrow `planner.grocery`
presentation or wide Grocery companion, not loaded success, check settlement or
shopping completion. F3 unexpected errors do not identify handled check outcomes.
Possible trusted `grocery.check.saved` named OTel log belongs immediately after
successful `SaveChangesAsync` in `WriteGroceryStateAsync`, before synchronization/
publication; proposed fixed `reason` values `checked` / `unchecked` / `map_replaced`
would describe a saved write, including a no-op value unless semantic change is
explicitly required. No ingredient key/name, map, row count, date/week, IDs, raw
error or content hash. Timestamp is commit observation time, not click/receipt.
No browser producer may claim this authority. Recompute-origin transitions need
separate classification to avoid double-counting user writes. None is approved.

**Limits / next slice.** Checks/unchecks are healthy repetition; one candidate
record per admitted saved operation, no per-row rendering/aisle/scroll heartbeat.
Server caps/sampling/loss and a bounded server-operation context require design;
no durable queue or cross-document correlation. Browser all-checked candidate is
specified below but deliberately excluded from the recommended successor.

#### J09 coverage card — extras lifecycle and recovery

**Question / entry.** Can a member explicitly save an extra and later check,
uncheck, rename, recategorize or delete that occurrence while retaining other
rows and historical snapshots? Entry includes an empty current-week list,
deliberate duplicate or recipe-matching name, a future projection or read-only
history. Suggestions select text only; submission requires Add. Composer eligibility
uses the absolute selected/current Monday, not offset zero. Lookup is focused,
200ms debounced, at least two characters, capped at three and generation-guarded;
lookup failure retains free text. No query/name telemetry is proposed.

**Ordered boundaries / optimistic state.** `handleAddExtra` (lines 242–283)
retains one client UUID for unchanged trimmed name/week retries after an uncertain
result, disables Add while pending, and leaves existing rows usable. It does not
optimistically insert an extra. Matching returned ID/week permits `upsertExtra`,
a server-section success toast, clearing text and retained focus. Mismatched
identity or error rereads via `sync`, keeps error/text; confirmed absence ends
the old attempt so a later explicit add can use a fresh identity. An accepted
response lost before presentation can leave a persisted extra without the toast.
A suggestion click, draft edit, focus exit or closing the view is not saved work.
There is no Cancel action in the inline rename UI; entering edit mode is not a
mutation. Navigation/unmount is not a server cancellation guarantee.

`mutateExtra` (lines 173–219) sets local/store pending guards. Check/uncheck is
optimistic; checking a current extra projected into a future view removes it there
immediately. Rename/category retain authoritative display until response. Matching
occurrence ID **and occurrence week** is checked first; `upsertExtra` then enforces
view eligibility and nonolder version. The projected-checked success branch calls
`removeExtra` directly, without a version comparison before removal; snapshot
version guards must not be generalized to every mutation-response path. A newer
unchecked state versus a delayed checked response needs focused qualification.
Delete removes
optimistically and marks pending even though no row remains. Catch adopts matching
conflict current/absence or restores the captured row, marks error, clears pending
**before** authoritative `sync`, and finally clears it again. `sync` swallows
fetch failures: its resolution is not proof a recovery read succeeded. Uncertain
outcomes must not be mislabeled rejection-without-save. Pending deletes resist
resurrection by snapshots; nonpending omitted rows are removed, and older row
versions cannot displace newer ones. These guards do not create collection-wide
revision ordering for every omission or guarantee delivery.

**Persistence / failure / concurrency.** `CreateAsync` validates current-week/name
and binds the client UUID to original creation name/week. Same accepted identity
returns the existing, possibly renamed occurrence; deliberate duplicate submissions
use separate identities. A concurrent insert exception is reread and compared,
not blindly accepted; tombstoned replay returns conflict/absence. This business
UUID is excluded from telemetry. `UpdateAsync` accepts exactly one versioned
mutation; `DeleteAsync` tombstones. Both validate the occurrence is current,
unremoved and expected-version-owned, increment Version and save. EF
[RecipeDbContext](../../api/src/RecipeApi/Data/RecipeDbContext.cs) maps Version as
an optimistic concurrency token; a concurrent loser receives current/absence,
not a silent overwrite. Stable ID, lineage/week unique index, unique predecessor,
Monday/version/name/section constraints live on the occurrence table. Category
changes affect only that occurrence, leaving ingredient categories, recipe lines
and same-name extras alone; rename preserves category/check and creation binding.

Actual new-save candidate owners are `CreateAsync` immediately after its successful
save (not replay paths), `UpdateAsync` and `DeleteAsync` after their saves and
before `PublishAsync`. Unlike recipe map publication, `PublishAsync` catches its
post-save read/broadcast failures, logs a warning and returns; persistence is not
rolled back and response can still succeed. Warning logs are not qualified safe
business events. A response lost later still needs authoritative recovery.
Create replay is confirmation of existing state, not another newly saved extra.

**Future / historical / rollover.** `ReadForViewAsync` returns nonremoved current
occurrences for current view, **unchecked current** occurrences for any future
view, and selected-week read-only snapshots for history. Future view mutations
target the occurrence's current week/version, not the displayed future week.
Checking hides that projected row but keeps it checked in current history;
unchecking in current view can restore future eligibility. Historical extras
cannot be edited; recipe rows in a past week retain their supported interactions.
[GroceryExtraRolloverService](../../api/src/RecipeApi/Services/GroceryExtraRolloverService.cs):`ReconcileAsync`
uses a relational transaction and PostgreSQL advisory lock, fills each missed
Monday from the latest unchecked/nonremoved lineage, and commits before fallible
publication. Checked/removed terminal lineages stop; earlier snapshots are not
rewritten. `GetScheduleAsync` repairs rollover on current-week reads; future reads
project, without creating a future extra. Rollover is not a user Add or shopping
completion and needs no user-success event here.

**Automatic versus custom / candidate / trigger semantics.** Existing Grocery
screen coverage supplies entry only. Possible server named logs `grocery.extra.saved`
with fixed `reason` `added` / `checked` / `unchecked` / `renamed` / `recategorized`,
and `grocery.extra.removed`, belong at the save owners above. Timestamp is save
observation time; exactly one reporting owner per mutation, no event on validation,
stale-version loser, draft/suggestion or create replay. No occurrence/lineage/client
IDs, normalized keys, names, categories, weeks, queries or hashes. Mutating to the
same value currently increments Version: decide write-confirmed versus changed
before approving names. Handle expected conflict, cancellation before save,
uncertain response and publication warning separately, without raw diagnostics.
No API/browser correlation or background cross-document join is authorized.

**Limits / next slice.** One record per admitted mutation, not each rerender,
keystroke or suggestion; healthy duplicates/retries are ordinary behavior. Bounded
server budgets remain unresolved. The one successor below focuses only on
browser add-result evidence, excluding saved-state and completion emitters.

#### Proposed all-current-items-checked observation — emitter unapproved

Proposed question: “Did this visible document present a nonempty, reconciled
**current-week** shopping list whose every current row was checked?” This is a
browser state observation, never purchase, user credit, persisted trip completion
or household-wide finality. Suggested name `pwa.grocery.all_checked.presented`
is an unapproved named OTel log, with one reporting owner adjacent to
`GroceryList.completedAisles` and Planner's presentation eligibility. It cannot be
implemented correctly by observing `completedAisles.size` alone.

A precise candidate predicate for review:

1. The document is visible, telemetry opted in, and the narrow Grocery primary
   or wide companion is actually presented. Its selected absolute week equals
   the deployment-calendar current week; no loading/failed/retained-only state
   qualifies. Future projections and read-only history are explicitly excluded.
2. One accepted successful authoritative grocery-bearing read/snapshot establishes
   the selected list and map for the current local reconciliation generation.
   No known local recipe check/bulk/extra add/check/uncheck/rename/category/delete
   or list-changing/recompute-triggering request remains unsettled, and no known
   rejected/uncertain result remains unreconciled. A failed read, optimistic row
   removal or mere `sync()` completion cannot establish this condition.
3. Let R be all recipe rows in that accepted presented list, including duplicate
   display-name/unit rows, and E all eligible current-week extras. Require
   `|R| + |E| > 0`; every R row's own display-name map value must be exactly true,
   and every E row's checked value exactly true. Ignore stale map keys with no
   presented row. Include collapsed aisles; collapse does not remove rows from R/E.
4. Re-evaluate after any known local/remote mutation, snapshot, eligibility/calendar
   change or list replacement. Such a change invalidates settled eligibility until
   reconciled; unchecking or adding an unchecked row makes the predicate false.
   Deleting an unchecked row, a remote check or removing recipe needs can also
   make it true without any local final check. Emptying the list never qualifies.
5. Distinguish an already-checked first accepted entry from a false→true transition
   observed during this view, and retain unknown provenance when remote/snapshot
   changes caused it. Rerenders/aisle toggles/visible return alone are not new
   occurrences. Use only document-local in-memory epoch/dedup state; never export
   a content/list hash, week, item ID or business key, nor retain across reloads.

**Unresolved before emitter approval:** whether entry should emit at all; whether
wide companion visibility is enough; first-per-view versus rearmed settled
false→true counts; whether list-removal/remote-caused truth should count or receive
fixed `reason` values; which owner can reliably expose all known pending writes,
successful reads and rejected/uncertain outcomes; what invalidates an epoch on
calendar rollover/navigation; and how a read racing remote writes is labeled.
Current map snapshots have no revision and recipe writes have no pending ledger,
so this predicate describes desired **known reconciliation**, not a current source
guarantee or globally atomic list/map/extra snapshot. A richer persisted or globally
consistent fact would need separately approved product/contract work. No timeout
or quiet-period heuristic can substitute for settlement. Proposed volume ceiling
≤3 observations/document with no queue/heartbeat is itself unapproved; dropped,
opt-out, hidden and reload cases leave gaps, not failures or completed trips.

#### Inspected tests and evidence cells

The following exact test bodies/owners were inspected or symbol-checked, **not
executed**. Their assertions define useful future acceptance; their names are not
passes. No UI/mock/API/PostgreSQL suite ran in I3.

| Owner | Exact selected tests / inspected scope |
| --- | --- |
| [GroceryList.test.tsx](../../pwa/src/components/planner/GroceryList.test.tsx) | `preserves row cardinality and ordering after a successful optimistic toggle`; `rolls back a failed optimistic toggle without changing row cardinality`; `keeps a section open when its final ingredient is checked`; `counts a checked extra toward aisle completion and initial collapse`; `reuses its idempotency UUID after an uncertain create outcome`; `clears the pending guard before an uncertain mutation rereads authoritative state`; `clears the pending guard before an uncertain delete rereads authoritative state`; `reconciles a current occurrence after navigation to its eligible next-week projection`; `rejects a mutation response for a different occurrence and refreshes authoritatively` |
| [weekStore.test.ts](../../pwa/src/store/weekStore.test.ts) | `reconciles current extras into the next-week view without overwriting newer or pending rows`; `upserts by occurrence identity without allowing an older response to win`; `does not resurrect a pending optimistic deletion from a snapshot`; parameterized init/sync/snapshot/event cases reject older checked projections, preserve pending rows and recover omitted nonpending rows |
| [useScheduleStream.grocery.test.ts](../../pwa/src/hooks/useScheduleStream.grocery.test.ts) | `applies ordered complete maps including explicit false and empty clear`; `documents same-week older snapshot acceptance and fresh reread recovery` (recovery assertion uses `connected`, not `sync`) |
| [grocery-extras.test.ts](../../pwa/src/lib/api/grocery-extras.test.ts) | `sends one versioned mutation for the occurrence`; `sends version and absolute week when deleting`; generated API wrapper shapes, not real HTTP/database proof |
| [GroceryCheckConcurrencyPostgresTests](../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.cs) and [Ordering](../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Ordering.cs) / [Failures](../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Failures.cs) / [Publication](../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Publication.cs) / [Recompute](../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Recompute.cs) | `DistinctItemPatchRequestsRetainBothChecksInFreshScope`; `HeldPublicationOrdersConflictingRepeatedReplacementAndClearRequests`; `CancellationWhileWaitingDoesNotReleaseAnotherOperationsGate`; `FailureOrCancellationAfterAcquisitionBeforeSaveDoesNotAcknowledgeOrBlock`; `CommittedCheckSurvivesPublicationResponseLossAndHostRestart`; `RecomputeAndItemPublicationStayOrderedAcrossSuccessfulAndFailingAttempts`; `IntendedValuesReplacementAndClearFollowProcessingOrder` |
| [GroceryExtraServiceTests](../../api/src/RecipeApi.Tests/Services/GroceryExtraServiceTests.cs) | `VersionedMutationsPreserveRenameCategoryAndTombstone`; `PublicationFailureDoesNotTurnCommittedCreateIntoFailure`; `HistoricalConflictReturnsAReadOnlyAuthoritativeSnapshot`; `AcceptedCreateReplaySurvivesRenameWithoutCreatingAnotherOccurrence`; `OutstandingExtrasProjectIntoEveryFutureWeekWithoutCreatingFutureRows`; `AcceptedCreateReplayAfterDeletionReturnsAuthoritativeAbsence` |
| [GroceryExtraPostgresTests](../../api/src/RecipeApi.Tests/Integration/GroceryExtraPostgresTests.cs) | `GroceryExtra_VersionIsAnOptimisticConcurrencyToken`; `ConcurrentSameClientCreateConvergesToOneIdempotentOccurrence`; `ConcurrentExpectedVersionMutationsCommitExactlyOneWinner`; relational and version assertions require a selected real fixture to run |
| [grocery.spec.ts](../../pwa/e2e/grocery.spec.ts) | `PATCH failure → single item reverts, no global spinner`; `shows outstanding extras in every future week and read-only snapshots in the past`; `checks, renames, recategorizes, and deletes only the selected occurrence`; browser interception/stateful mocks are separate from persistence |
| [grocery-checks-live.spec.ts](../../pwa/e2e/grocery-checks-live.spec.ts) / [grocery-extras-live.spec.ts](../../pwa/e2e/grocery-extras-live.spec.ts) | `overlapping checks converge and an independent older snapshot needs a fresh read`; `two household shoppers observe extra mutations and reconnect recovers a missed event`; both explicitly require their isolated API/member fixture and skip without it |

Availability check: `cua.getState()` returned zero browser surfaces and
`Browsers: Error: The browser access host is unavailable`. Local listener inventory
includes older telemetry fixtures, but no existing isolated synthetic grocery
business UI/database was identified. No shared app/data was attached, launched,
mutated or failure-injected. The following are proposed steps, not observations:

| Evidence cell | Proposed selected synthetic steps | Actual status |
| --- | --- | --- |
| J08 phone presentation | 390×844: grocery tab/current selected week, duplicate unit rows, extras, empty list, amounts, keyboard checks, aisle collapse and return | Not-run; browser access blocked; no identified isolated grocery UI |
| J08 wide presentation | Wide Planner companion; same selected data/checks, no second owner counting the same state | Not-run; same blocker |
| J08 save/reject/recovery | Hold final check while another row works; reject → per-item rollback; retry/uncheck; commit then lose response/publication → eligible fresh init/snapshot; overlapping same-key and distinct-key writes; delayed older map | Not-run; no failure injected, no persisted or reconciled result observed |
| J09 success/draft | Add duplicate/recipe-matching extra, select suggestion without save, add with no meal plan, check/uncheck, rename/category/delete; read after reload | Not-run; same blocker |
| J09 failure/concurrency | Lost add response/replay, stale-version conflict/current or absent, failed delete restores, pending snapshot suppression, navigation during response, failed recovery read | Not-run; same blocker |
| J09 future/history | Future offsets 1/2/8 project current unchecked extra; check hides, current uncheck restores projection; historical read-only; rollover preserves old snapshots/stops checked/deleted lineages | Not-run; no real fixture/clock/database selected |
| Unit/component/browser mocks | Referenced tests above | Not-run; inspection only |
| Real API/PostgreSQL | Fresh-scope save/read, concurrency, cancellation, restart and rollover fixtures | Not-run; distinct from browser/mock evidence |
| Actual exporter → receiver | Browser→Action→Node→disposable receiver protected durable read/replay/reopen; server export separately | Not-run; candidate records unimplemented; historical F-series evidence does not transfer |
| Deployed / proxy / tunnel | Selected disposable deployment/config | Not-run |
| Physical installed phone | Actual keyboard, unlock/resume, lifecycle and touch | Not-run; synthetic viewport is not physical qualification |
| Behavior red/green / preparation | Documentation-only source investigation | Not-applicable |

#### Receiver support, privacy and one bounded successor recommendation

Local Sentrame HEAD `c4d0204b4891da15ae4b020d37682e48052e1879` has existing
USER-GUIDE/query/UI edits and untracked loop-view plans/source/tests. The five
local guides required by the session prompt were reviewed for standard named
logs, authority, allowed attributes, contextual mapping and qualification limits;
exact guide hashes are retained in `source.json`. No receiver/config/storage was
changed or selected. Its Go module pins collector client/component/pdata 1.70.0,
otlpreceiver 0.164.0 and OTel 1.47.0; web package is 0.1.0. WFS installed Next is
16.4.2, OTel API 1.9.1; API pins OTel 1.20.0 and Serilog sink 4.2.0. Browser PWA
uses its existing bounded OTLP JSON transport, not an installed OTel logs SDK;
`@opentelemetry/api-logs`, `sdk-logs` and logs HTTP exporter are absent there.
The receiver .NET guide sample targets 1.20.1, not WFS's exact registration.
No package/version compatibility or safe .NET named-log bridge is qualified here.

For a future browser candidate, reuse same-origin Action/Node transport with
`service.name=wfs-pwa-browser`, carrier log, browser producer authority, strict
fixed `eventName`/`reason`, existing document-random session/tab/positive sequence,
source observation timestamp and fresh record identity. These are proposed
business input extensions, not names accepted by the existing closed Action input.
Server saved-state candidates require the existing .NET provider/logging bridge
and server credential, never promoted browser assertions. No private content,
raw path/query/error/message/stack or persistent business correlation is permitted.

Current local receiver supports retained `reason` conditions with explicit exact
service/carrier/source/name selection and prospective mapping; a goal is optional.
Receipt is separate from mapped derivation. Map all-checked, if ever approved, as
presentation evidence only; do not configure it as shopping-trip saved success.
One active goal, goal/inactivity capture boundaries, missing records, opt-out,
late events and retention constrain paths. Aggregated edges do not prove one
end-to-end trip; untracked loop-view work is not qualification. Protected reads,
exact replay and restart/reopen need actual candidate wire evidence before support
can be claimed. Scope joins across households, documents or backgrounds remain
excluded; a successful API call or export response is insufficient.

Recommend only **`observe-grocery-extra-add-results`**: one browser-authority
`pwa.grocery.extra_add.result` named log answering “Did this explicit Add receive
an identity-matched result that the caller applied, or remain unconfirmed?”
Candidate owner is `GroceryList.handleAddExtra`, once per retained submission
attempt result; proposed fixed `reason` `confirmed` / `unconfirmed` must never
mean newly inserted/persisted versus not persisted. Replay can confirm an existing
row, and a failed read after lost response cannot disprove an add. Settle response
versus currently presented outcome, retained-attempt lifetime/retry dedup,
navigation/unmount, mismatch, authoritative absence, calendar rollover and exact
reason vocabulary before authoring that proposal. No successor is created.

Bounded future files: GroceryList's add handler/tests, existing strict telemetry
input/Action/transport tests and one disposable real-action receiver fixture.
Proposed cap ≤10 result attempts/document plus existing process budgets, one
terminal result per admitted attempt, no suggestions/keystrokes or retry storm,
no queue, no identifiers/names/sections/query/counts and no cross-document retention.
Test-first acceptance: confirmed add and replay, pending submit suppression,
wrong ID/week, lost response with successful/failed reconciliation, authoritative
absence/new explicit add, navigation/remount/rerender/hidden/opt-out, and sentinel
privacy assertions. Then actual browser/Action/Node export and protected durable
read/replay/reopen, asserting receipt and mapping independently. Stop before API
propagation, .NET emitters, product recovery changes, all-checked/completion,
receiver implementation, collection, deployed or device work. Next inventory
session is I4 tasks 4.1–4.2, only if separately selected; I4–I5/I-V remain untouched.

### I4 — Entry, finding recipes, GOTO and cooking — 2026-10-30

Selection: **I4 tasks 4.1–4.2 only**, mode `investigate`, J01/J10–J12.
Starting progress **6/11**. I3 final record
`.task/agent-finish/runs/f0668cc9326f4e769c2a5368ae715add.json` was read:
documentation, selected strict OpenSpec and content stability passed for the three
selected documents. Task acceptance was not evaluated by that command. I3's
unavailable walkthrough cells remain not-run; its all-checked emitter remains
unapproved. Its recorded receiver-guide drift reconciliation is preserved, including
the missing initial receiver before-image limitation. Nothing here qualifies I3.

#### Identity, canonical owners and actual operation chain

WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`. Before-images, staged/unstaged diff and status
are retained privately under `.task/telemetry-inventory/i4/`. `source.json` records
exact source/spec/test/contract/generated/config and local receiver hashes;
`source-check.json` records consistency, not execution. No business data was read.
This is source identity, not a running build or deployment identity.

Canonical owners: [household identity](../../openspec/specs/household-identity/spec.md)
(passphrase/invite acceptance, cookie-write feedback and page/API access),
[member context](../../openspec/specs/member-context/spec.md) (select/recover/current
member), [household members](../../openspec/specs/household-members/spec.md)
(create/duplicate), [search](../../openspec/specs/recipe-search/spec.md) (current
results, continuation/retry/restart, Similar and GOTO invalidation),
[library](../../openspec/specs/recipe-library/spec.md) (eligible list/stack and loaded
detail), [cooking](../../openspec/specs/cooking/spec.md) (entry, read, Original,
return, explicit finish), [planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md)
(recipe-specific validation versus overdue finalization), and
[tonight decisions](../../openspec/specs/tonight-meal-decisions/spec.md)
(GOTO membership, ready suggestion, assignment and retained recovery).
These are current capability references; historical flow diagrams are not guarantees.

Ordered current source paths are below. UI route files are in the
[PWA app directory](../../pwa/src/app); exact route filenames are written separately
to avoid ambiguous parenthesized Markdown targets. Generated paths are relative to
`pwa/src/lib/api/generated/api/`; all method/path/builder pairs were checked against
[OpenAPI](../../specs/openapi.yaml), not exercised against a live service.

| Journey / representation | Actual UI/store → wrapper or builder → contract → backend/persistence and follow-ups |
| --- | --- |
| J01 access | `pwa/src/proxy.ts`; `(auth)/welcome/WelcomeForm.tsx` → `lib/auth.ts.authenticateWithPassphrase` → `setHearthCookie`; `(auth)/invite/page.tsx` → `validateHearthSecret` → access-cookie write → optional member-cookie write → selection request → navigation. These are Next Server Actions, **no generated business API or OpenAPI login/invite operation**. API access independently uses `Infrastructure/HearthAuthenticationHandler.cs`. |
| J01 member | `(auth)/onboarding/page.tsx`, `FamilySelector.handleAddAndSelect`, `identity/IdentityValidator.verifyIdentity` → `hooks/useFamily.ts` / `store/familyStore.ts` → `lib/api/family.ts` → `family/index.ts` GET/POST `/api/family`, `family/me/index.ts` GET `/api/family/me` → `FamilyController.GetAll/Create/GetMe` → `FamilyService.GetAllFamilyMembers/CreateFamilyMember` → `FamilyMembers` read/save. Creation awaits `VotingSession.RefreshAfterMutationAsync` **after SaveChangesAsync**; failure can hide a committed member. Identity binder parses header then cookie, not membership acceptance. |
| J10 Search | `(app)/recipes/page.tsx.runSearch/handleShowMore` → `lib/api/recipes.ts.searchRecipes` → **raw `demoFetch` POST `/api/recipes/search`**, manually carrying member/SSE/move headers and mapping DTO fields. Generated `recipes/search/index.ts.post` exists but is **not this wrapper's transport**. Filter metadata uses generated `recipes/search/filters/index.ts.get` GET `/api/recipes/search/filters`. `RecipeController.Search/GetSearchFilters` → `RecipeSearchService.SearchAsync` and its continuation/retrieval parts → ready/nondeleted `Recipes`, published lexical/semantic search documents, history and continuation state. This is retrieval, not an assignment commit. |
| J10 Browse/detail | `(app)/browse-all-stack/page.tsx.fetchLibraryData/getStackPage` → generated `recipes/librarySummary/index.ts.get` GET `/api/recipes/library-summary`, then `recipes/index.ts.get` GET `/api/recipes`; list/stack store holds mapped DTOs and history generation. `RecipeController.GetLibrarySummary/List` → `RecipeService.GetLibrarySummary/GetRecipesList`. `RecipeDetailSheet` / `CooksMode` → `lib/api/recipes.ts.getRecipe` → `recipes/item/index.ts.get` GET `/api/recipes/{id}` → `RecipeController.Detail` → `RecipeService.GetRecipeDetail` reads recipe and public import-report projection. Detail response is `recipe`, not list `recipes` or search `data`. |
| J12 membership/suggestion | `RecipeDetailSheet.handleSetGoto` → `familyStore.saveGoTo/loadGoTo/loadActiveGoTo` → generated `goto/index.ts.get/put` GET/PUT `/api/goto`, `goto/active/index.ts.get` GET `/api/goto/active` → `GoToController.GetList/UpdateList/GetActive` → `GoToService.GetGoToListAsync/SaveGoToListAsync/GetActiveGoToAsync` → whole JSON `FamilySettings` value at `family_goto`, SaveChangesAsync. No membership SSE publish here. Active read randomly picks a ready/nondeleted configured recipe; no eligible recipe returns 404. |
| J10/J12 assignment | `RecipeDetailSheet.handleUseRecipe` calls its caller; Search/Browse use `lib/planner/slotAssignment.ts` guards/recovery, while `HomeCommandCenter` GOTO/Quick Find uses `todayStore.assignRecipe`. Both reach `lib/api/planner.ts.assignRecipeToDay` → `schedule/assign/index.ts.post` POST `/api/schedule/assign` → `ScheduleController.AssignRecipe` → `ScheduleService.AssignRecipeAsync` / `ScheduleService.Assignment.cs.AssignEmptySupperAsync` → calendar-event save/guarded transaction commit → grocery recompute, schedule read, week/suggestion publication and possible displaced-week follow-ups. Reuse J05/J07/I2 for disposition details; don't double-count them as a GOTO saved outcome. |
| J11 finish | `CooksMode.finishCooking` → **`todayStore.markCooked` directly**, not a planner cooking wrapper → `ensureCalendar(true)` → generated `schedule/day/item/validate/index.ts.post` POST `/api/schedule/day/{date}/validate` with recipe and status → `ScheduleController.ValidateDay` → `ScheduleService.ValidateDayAsync` → `Recipes.LastCookedDate` and, only for matching assignment, `CalendarEvents.Status`; save precedes suggestion/slot publication. Controller returns `mealMarkedCooked`; store applies it only to still-matching recipe/date. |
| J11 originals/automatic | Original URL opens externally; image/PDF-page originals use `OriginalPhotosViewer` / image URL helper and GET `/api/recipes/{recipeId}/original/{photoIndex}` (`RecipeController.GetImage` → image service); generated `recipes/item/original/item/index.ts.get` exists but image loading is not its SDK call. `Workflows/dreaming.yaml` → `Processors/FinalizeOverdueMealsProcessor` → `ScheduleService.FinalizeOverdueMealsAsync`; `RecipeSearchFilterMaterializer` also invokes finalization before materialization. It saves overdue statuses and recalculated last-cooked dates in a transaction before week reads/publications. This automatic owner is separate from explicit finish. |

Database ownership is verified in `Data/RecipeDbContext.cs` and
`api/database/schema.sql`: member-name uniqueness on trimmed lowercase name,
family settings JSON, recipe last-cooked timestamp, calendar status and unique
(date, meal_slot). These facts do not establish live PostgreSQL behavior.
`SseEventPublisher` delegates broadcasts to `SseConnectionManager`, which removes
failed connections; successful publication is neither durable receiver receipt nor
proof a browser displayed a result. Reads, serialization and other follow-ups can
still fail after persistence. A later failed read proves neither rollback nor success.

#### J01 coverage card — accepted access, usable context and destination

**Question / entry:** Can someone enter through Welcome or an invite, obtain usable
member context and reach their destination, including rejection and recovery?
Direct protected entry, onboarding, a missing/deleted selection and an invite with
no member are distinct valid starting states. Invite generation/copy/share is intent
and handoff, not acceptance by the recipient; no shared link/token is telemetry.

**Boundaries / failure / cancellation:** Welcome trims/case-compares, awaits token
and access-cookie write, then requests onboarding. Incorrect/missing-secret result
retains input; exceptions show retry feedback; pending/blank submission is disabled.
Invite validates before cookie write, optionally writes the member cookie, requests
selection/onboarding completion and navigation; missing/rejected/initial-write
failure shows invalid invite → Welcome. Access-only invite leaves prior member
context untouched. No navigation request proves destination presentation.
Onboarding selection is separate from creation; creation validates the returned ID,
while 409/demo 403/rejection leaves addMember null with error. Cancelling an unsent
add form submits nothing; leaving after an in-flight create is not cancellation of
the server write. A lost create response or post-save voting refresh failure is
unknown to the browser; blind retry can encounter a duplicate of persisted work.

`familyStore.selectFamilyMember` updates local selection only after its own cookie
write. Invite/onboarding await an initial member-cookie write but call this second
async selection **without awaiting it**. Subsequent resolution/presentation is a
separate boundary; its rejection is not covered by the initial handler's catch.
Protected `IdentityValidator` may recover a readable cookie or GET me, otherwise
request onboarding. GET me collapses caught read failures to null. Its controller returns missing-member
404, absent from this OpenAPI operation's declared responses; this is recorded drift,
not authorization to change the contract. Family-list
failure sets `hasLoaded=true`; validation clears a missing selection only with a
nonempty member list. Therefore readiness/`hasLoaded`/a selected string alone do
not prove successful membership validation; an empty or failed load is not confirmed
usable context. No new auth repair is authorized.

**Automatic / missing owner:** Opening/destination observations remain baseline
presentation evidence after their own readiness gates; they do not attest access
acceptance or member validity. Candidate server `access.cookie.written` belongs after the
actual access-cookie action write; `setHearthCookie` itself does not validate its
token. This proves only the write action completed. Accepted passphrase/token
validation belongs to the respective validating action, separately from cookie write
and subsequent access-gate acceptance. Candidate browser
`member.context.presented` needs successful current profile/list resolution **and**
current destination presentation. No unified trustworthy owner of that conjunction
exists today. Member creation's trusted save fact belongs in `FamilyService` before
fallible voting refresh; it is distinct from selection and from Home display.

**Record / limits / unresolved:** Standard named logs only: server for its own
accepted write/create; browser for observed presentation or handled result. Minimum
fixed event name and optional allowlisted `reason` (for example `rejected`,
`write_unconfirmed`, `recovered`) plus observation timestamp/fresh record identity.
Do not record passphrase, cookie, invite/redirect URL, names, identity type/value,
member counts or household/person identifiers. Proposed ≤1 result per explicit
attempt; ≤10 per document for browser results. Server process caps and export loss
need explicit policy/qualification before extraction; no bounded API budget is assumed. Retries are separate attempts, not evidence the prior one failed
to save. Settle verified-context owner, repeated invite-effect dedup and access
acceptance versus cookie acknowledgment before a proposal. No persistent linkage
between invite sender, recipient, documents or the server's member row.

**Receiver / evidence / next:** Map each exact service/log/source/name independently;
access acceptance cannot be a member-ready or destination goal. Browser↔server join
is absent; a source log is not a linked recipient journey. Source traced, tests read,
all runtime cells below not-run. Defer entry instrumentation until the missing
verified-context owner/semantics are settled.

#### J10 coverage card — results, detail and selection

**Question / entry:** Did Search/Browse show usable loaded results (or a true empty
result), did detail load, and was a recipe actually selected? `/recipes` can open
blank, typed, filtered, Similar, with direct detail or a planner target. Browse can
open list/stack or GOTO-filtered legacy entry. Opening any surface submits no plan.

**Boundaries / failure / cancellation:** Search debounces typing and allows immediate
Enter. Current response application checks request generation and promotion version;
obsolete responses are ignored, **not evidence of network cancellation**. Initial/
replacement failure has explicit retry and must not become no-results. Continuation
retains cards; 409 offers restart, other failures retry; pending generation prevents
duplicate continuation and current append deduplicates results. Received promotion/
GOTO invalidation can initiate another read without another intentional search.
Filter drafts dismissed without Apply do not mean a committed filter/search.
`searchRecipes` accepts a success response and maps missing result fields to defaults;
HTTP success alone does not prove a well-formed meaningful result was presented.
On the backend, semantic retrieval shares a two-second provider/vector budget and
can fall back to lexical results after timeout/provider failure. Caller cancellation
is rethrown rather than converted to fallback success; neither fallback nor a
cancelled request proves what the browser ultimately displayed.

Browse summary precedes first-page load; summary success alone proves no recipes
loaded. It guards generations, retains history-generation context, distinguishes
initial failure from valid empty, supports append/prefetch retry and history restart.
Stack movement/Surprise Me and opening detail are presentation/inspection, not meal
selection. Detail independently fetches and guards active reads, exposes failure/
retry, and can be entered directly without Search results. Closing detail or leaving
Search does not imply rejecting the dish or cancelling a submitted mutation.

Actual use goes through `RecipeDetailSheet.onUseForDay`, Search/Browse target/slot
checks, guarded assignment and occupied-slot recovery; mere resolved callback is
insufficient because callers can stage recovery or swallow non-calendar failures.
`CooksMode`'s nested detail even supplies a no-op onUseForDay. Assignment save,
follow-up read and destination display remain separate I2 boundaries. Never infer
selection from a detail click, Cook opening, a planner navigation flag or failed read.

**Automatic / custom / trusted owner:** Baseline Search/Browse screen records lack
load success and detail-specific results. Proposed browser `search.results.presented`
belongs beside accepted-current-response **rendering** in `recipes/page.tsx`, with
explicit valid-empty/error guard; continuation is a separate bounded result, not a
new search visit. Analogous Browse/detail records would belong to their own
successful rendering owners, not the fetch wrapper. Backend `SearchAsync` owns
retrieval/fallback/cancellation, not displayed results. Existing `ISearchTelemetry` /
`LoggingSearchTelemetry` uses search names/metrics and templated `ILogger` payloads;
this is existing technical evidence, not a qualified named OTLP journey record or
permission to export payloads/correlation. Preserve it; don't duplicate providers.

**Record / limits / unresolved / receiver:** Named browser log with fixed name and
one `reason` from a settled closed vocabulary such as `available`, `empty`,
`read_failed`. Reuse current document-random scope/tab/sequence and fresh record ID;
never include query/concepts/filters, recipe IDs/counts/content, cursor, source URL,
planner date or persistent operation identity. Proposed ≤10 accepted result records
per document, no per-card/scroll/typing records; initial/manual retry, automatic
invalidation and append occurrence/rearming semantics must be settled before code.
A capped or missing stream is incomplete. Map as presentation only using exact
browser service/carrier/source/name plus retained `reason`; do not call it selection
or saved assignment. Source traced; tests inspected, not executed. The one bounded
successor recommendation below selects only Search initial/replacement presentation.

#### J11 coverage card — cooking, originals, finish and interruption

**Question / entry:** Did the viewed recipe load in cooking and support reading/source
consultation, and did explicit finish record that recipe or its planned meal?
Home uses the displayed recipe identity; loaded detail opens cooking independently
of tonight. Opening cooking, preparing ingredients and reaching the last instruction
submit no completion. Missing/failed instructions remain honest with Retry/detail
and explicit finish available; read failure does not prove missing source metadata.

**Reading / originals / cancellation:** `CooksMode` guards departed detail responses;
preparation checks are mounted local state. `plannerStore.cookProgress` is a memory
map/bookmark, not durable cook history or persistent telemetry identity. All steps
scroll updates reading position; neither scroll nor Next/Back proves completed
cooking. Closing before finish submits no completion. Original availability comes
only from loaded URL/images metadata. Website uses `window.open` with isolation;
that request cannot prove external content loaded, was read or returned. Images
(including rendered PDF originals) use the modal viewer above still-mounted inert
cooking, preserve draft/checks/bookmark/offset and restore Original focus on close.
Image request, successful rendering and return to cooking differ; missing image
allows navigation/close. Pending edit/report/preference/finish guards Original.
No original URL, image key or instruction content may enter telemetry.

**Explicit finish / trusted outcome:** `finishCooking` suppresses concurrent local
submissions and awaits `markCooked`; calendar refresh failure posts nothing and
permits retry. A successful server recipe-specific save updates the viewed available
recipe's LastCookedDate. A different/absent assignment returns `mealMarkedCooked=false`
after saving recipe rotation; a matching assignment additionally becomes Cooked and
returns true. Missing/deleted recipe is 404. `todayStore` only changes local tonight
when true and still recipe/date-matching, but resolves without returning a semantic
outcome to `CooksMode`. Its celebration/600 ms delayed close means resolved finish
handler, **not** proof the planned meal was completed, or that a required result body
was validated. Failure keeps cooking open with error/retry. Publication can fail
after save on either path: rejected request/unknown response is not proof of no
save; retry may update LastCookedDate again. No durable receipt/idempotency identity
makes repeated finish exactly once. Do not manufacture a success from later failure.

Trusted candidate `recipe.cooking.recorded` belongs after the relevant
`ValidateDayAsync` save, **before** publication. Separate
`meal.cooking.recorded` requires its matching-assignment branch/save. A browser
`cooking.finish.presented` would attest only its own guarded resolved UI result;
current void result owner cannot supply the two server meanings. Do not emit both
server records as two user completions; choose one operation fact with precise
meaning or settle disjoint names/receiver counting first. This is a rotation/date
write, not an existing append-only record of each real cooking occurrence.

**Automatic / long pause / resume:** `FinalizeOverdueMealsAsync` selects only past
planned/locked recipe assignments, saves statuses/recalculates dates and commits
before week read/publication. Dreaming and filter materialization can invoke it.
It is an automatic planning consequence, not a cook's finish, regardless of later
Home cooked feedback or search rotation. Candidate `meal.overdue.finalized` must
belong to that automatic post-commit owner, with no browser attribution/goal.
No-op selection emits no completion; failed follow-up cannot reverse the commit.

`useScheduleStream` pageshow/visible resume invalidates Today calendar and refreshes
Today/week/Discovery. It does not attest user cooking or restore state after process
death. Warm resume/unlock in the same document does not rearm opening; long cooking
silence is neither abandonment nor a new document. Browser freeze/OS discard can
lose memory, drafts, preparation checks and unsent telemetry; no durable restored
progress is claimed. External Original can return warm or cause a fresh document;
observe only known document lifetime, without following identity across either.
Sentrame's mapped-event inactivity segmentation may split a >30-minute cooking
pause: inactive means unknown continuation, not failure, and fresh mapped evidence
can form another captured journey in the same document. Don't add heartbeats,
per-step sampling, persistent IDs or merge across capture boundaries to hide this.

**Record / limits / receiver / gaps:** Standard server named log for committed fact,
browser named log for actual current entry/content/original-return/finish presentation
only if separately selected. Fixed name, timestamp, fresh record identity and minimal
retained reason; no recipe/date/member/step number/content/URL or dwell/attention claim.
Propose ≤1 server fact per successful invocation (retries remain distinct); browser
≤10 semantic results per document, no timers/step/scroll stream. Resolve duplicate
finish semantics, post-commit-unknown recovery and matched-meal acknowledgment
ownership before extraction. Existing overlay exceptions leave content/Original
unobserved; shared error capture doesn't turn handled retry into failed completion.
Map user and automatic facts separately; absence of a linked browser/server scope
prevents claiming one combined journey. WFS .NET named-log export and these actual
records still require qualification; no historical F-series pass transfers.

#### J12 coverage card — membership, featured choice and tonight recovery

**Question / entry:** Was a recipe saved in the household's GOTO list, merely offered
as a featured choice, or selected/saved for tonight? Recipe stars own current
membership. The seed's `FamilyGOTOSettings` source/test references are retired:
there is no current component/test file with that name. Current canonical retirement
requirements keep management absent, preserve saved memberships, and retain GOTO
filtering. Old E2E comments/test labels mentioning that component do not restore it.

**Boundaries / failures / cancellation:** Detail computes a whole replacement list,
disables its local pending star and awaits `saveGoTo`; save failure shows error and
leaves local confirmed membership unchanged. On success store updates JSON and
increments membership version; mounted GOTO-filtered Search/Browse can reload without
repeating the save. `GoToService.SaveGoToListAsync` commits the whole setting, not a
single atomic membership delta; no version/precondition protects competing replacement
lists here. Stale reads are guarded by local membership version, not remote merging.
A lost reply leaves unknown persistence; a repeated replacement can overwrite remote
changes. Malformed stored JSON is logged and returned as empty; active-read catch
also collapses 404/other failure to null. Neither is proof the saved list is empty.

Home active read randomly features a ready/nondeleted configured recipe. It is not
an assignment and does not prove pending recipes can be returned by that service.
`gotoStore` SSE-ready memory can provoke re-read of a represented pending choice;
SSE is no saved assignment receipt. Confirm calls `todayStore.assignRecipe`, which
can defer for calendar recovery, sets optimistic Tonight immediately and sends the
background assignment without an awaited acknowledgment to its caller. Failure is
logged; details hydrate separately with recipe/date guards. Matching visible details,
20-second optimistic retention and Home-to-Planner navigation cannot attest save.
Search from the unplanned pivot obtains authoritative Today and opens the existing
planner selection flow; merely opening/cancelling commits nothing.

Home replacement recovery retains disposed/saved/saveUnknown stages in a mounted
session; it doesn't replay acknowledged stages. Failed save triggers authoritative
slot read: matching plan can reconcile, empty permits explicit retry, conflict blocks,
failed read stays unknown and blocks blind replay. A known saved stage survives failed
refresh as saved-with-refresh-needed. Cancellation before mutation is harmless;
departure after disposition/save is partial work, not rollback. Tomorrow/defer/remove,
Order In and replacement are the J05–J07 owners already traced in I2; I4 introduces
no duplicate completion boundary. Unmount clears the retained session; cross-document
recovery/correlation is not promised. New actions after midnight refresh calendar;
recovery uses captured authoritative context rather than a guessed browser date.

**Automatic / custom / record:** Home screen/Quick Find baseline proves presentation,
not membership or assignment. Candidate server `goto.list.saved` belongs immediately
after `SaveGoToListAsync.SaveChangesAsync`; it proves list replacement persisted,
not which member added/removed which recipe. Candidate browser
`goto.choice.presented` belongs to current successfully loaded ready pivot render,
not its random selection query or active-read-null fallback. Actual assignment reuses
J05 saved owner; a star-toast or resolved optimistic assign function is insufficient.
Standard named logs, fixed event name/allowlisted reason, timestamp/fresh record ID;
no list contents/counts, recipe/member/household IDs, descriptions, URLs, notes or date.
Propose ≤1 fact per committed replacement; browser ≤10 results/document with fixed
loss caps, no polling/SSE emission loop or durable queue. Settle no-op/replacement
meaning, concurrency/retry and post-save-read errors before any emitter proposal.
Receiver must distinguish browser suggestion from trusted server list/meal fact;
server correlation/export remains unqualified. Source traced, tests read, no runtime
walkthrough or receiver qualification. Defer GOTO instrumentation.

#### Exact inspected tests and qualification cells

These test bodies were read for the cited behavior. Names were located mechanically
and file hashes recorded; **none was executed in I4**. Mock tests cannot substitute
for actual API/PostgreSQL, browser export or physical-device behavior.

| Source test | Exact inspected test names / scope |
| --- | --- |
| [auth-flow.spec.ts](../../pwa/e2e/auth-flow.spec.ts) | `user can log in with passphrase`, `magic invite link works and redirects to home`; URL assertions, not the full verified-context/result conjunction. |
| [FamilyCreationPostgresTests.cs](../../api/src/RecipeApi.Tests/Integration/FamilyCreationPostgresTests.cs) | `Create_Returns201_AndIsRetrievableFromPostgres`, `Create_Duplicate_RejectsWith409_AndEnforcesUniquenessInPostgres`; independent-connection persistence and duplicate test bodies, not run. |
| [search-invalidation-recovery.spec.ts](../../pwa/e2e/search-invalidation-recovery.spec.ts) | `${mode} recovers from week_updated and failed refresh without losing context`; route mocks assert failure is not empty and explicit retry retains context. |
| [search-hardening.spec.ts](../../pwa/e2e/search-hardening.spec.ts) | `GOTO chooser uses configured membership and an empty list never falls back`; mocked filter/membership behavior. |
| [home-goto.spec.ts](../../pwa/e2e/home-goto.spec.ts) | `"Make this tonight" shows TonightMenuCard immediately without waiting for network`; held response explicitly demonstrates optimistic presentation, not save. |
| [CooksMode.test.tsx](../../pwa/src/components/planner/CooksMode.test.tsx) | `consults original photos without losing an unsaved draft, bookmark, scroll or ingredient checks`, `shows a failed read honestly and retries real steps`, `keeps cooking open and shows an error if saving completion fails`, `returns to ingredients without losing checks, the step bookmark, or the reading offset`; mocked read/write and mounted-state assertions. |
| [todayStore.test.ts](../../pwa/src/store/todayStore.test.ts) | `records lunch without marking the scheduled supper cooked`, `still marks the scheduled supper cooked when its recipe matches`, `does not complete a stale local supper when the server reports a different scheduled recipe`, `keeps cooking retryable without posting when authoritative date refresh fails`; mocked outcome/date guards. |
| [cooking-contract.test.ts](../../pwa/src/lib/api/cooking-contract.test.ts) | `sends the cooked recipe ID alongside its status`; generated serialization, not server commitment. |
| [RecipeCookingIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs) | `CookingRecipe_UpdatesRotationWithoutCompletingDifferentSupper`, `CookingMissingRecipe_ReturnsNotFoundWithoutCompletingSupper`; test host persistence/read-back, default in-memory provider, not PostgreSQL qualification. |
| [GoToIntegrationTests.cs](../../api/src/RecipeApi.Tests/Integration/GoToIntegrationTests.cs) | `SaveThenGet_RoundTrips`, `GetActiveGoToAsync_FiltersReadyRecipes`, `GetActiveGoToAsync_ReturnsNull_WhenNoneReady`; test host service/list behavior, not relational concurrency qualification. |
| [ScheduleServiceTests.cs](../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs) | `FinalizeOverdueMeals_OnlyCooksPastPlannedAndLockedRecipeEvents`, `FinalizeOverdueMeals_RecalculatesLastCookedDateFromNewlyCookedEventDate`; in-memory service semantics, not actual overnight/deployed execution. |

Availability: `cua.getState()` returned **no browsers**, with browser access host
unavailable (blocked). No existing isolated synthetic entry/search/cooking UI or
associated disposable database was identified. Native running browsers alone do not
establish an authorized synthetic fixture. No shared process/household was attached,
no browser started, no auth submitted, no data mutated or failure induced. The
following explicit unavailable cells satisfy tasks 4.1–4.2's investigation fallback.

| Cell | Proposed synthetic steps | Actual status / reason |
| --- | --- | --- |
| J01 success/recovery, phone/wide | Reject passphrase, retry valid; accepted invite with/without member; select/create; distinguish destination render; simulate missing/deleted member and failed list/me then recover | **Not-run**; browser host blocked, no isolated synthetic UI/API selected |
| J10 loading/detail/selection | Initial/typed/filter/Similar and Browse list/stack, valid empty versus failed initial read; continuation failure/retry/409 restart; obsolete response; detail fail/retry; cancel versus guarded selection/occupied-slot recovery | **Not-run**; same availability blocker; source/mock expectations only |
| J12 membership/tonight | Star add/remove with held/rejected/lost reply; competing list replacement; ready featured choice versus 404/read failure; optimistic tonight while write held; partial recovery and failed authoritative reread | **Not-run**; no isolated UI/database; no failure induced |
| J11 viewed-recipe/meal finish | Enter from Home and unscheduled detail; retry failed instructions; finish matching/different meal; reject/lost reply/post-save publication failure; verify DB independently | **Not-run**; no selected real API/database fixture |
| J11 Original/return | Phone/tablet image/PDF-page modal and external website; retain draft/checks/bookmark/offset, close/Escape/focus; image failure and pending-save guards | **Not-run**; browser host blocked; external opening cannot prove original was read |
| Interruption/long pause | Hide/unlock warm document; >30-minute pause; resume across midnight; OS discard/reload separately; preserve known state without opening rearm or invented completion | **Not-run**; browser/device unavailable; inactivity isn't failure or a new document |
| Unit/component/browser mock suites | Run the exact tests above in an authorized implementation/qualification slice | **Not-run**; this session uses source/document consistency, no product tests executed |
| Real API/PostgreSQL | Synthetic access/member resolution, whole-list writes, matched/unscheduled finish and post-commit fault/readback | **Not-run** independently of browser; no runtime DB qualification |
| Actual browser → Action → Node → exporter/receiver | Fresh candidate records, protected durable read, exact replay, restart/reopen and derived mapping | **Not-run**; candidates unimplemented; historical F-series evidence excluded |
| Trusted .NET exporter/receiver | Existing provider/log bridge emits each post-commit candidate with server credential and independent reads | **Not-run**; exact WFS package graph/registration unqualified |
| Deployed container/proxy/tunnel | Disposable configured route with collection controls and real boundary tests | **Not-run**; no deployment or collection enablement authorized |
| Physical installed phone/tablet | Lock/unlock, long cooking pause, original-app return, process discard and changed deployment date | **Not-run**; no selected disposable physical-device fixture |
| Documentation source/contract/name/link consistency | Manifest, exact methods/builders and inspected test symbols; complete task-owned diff | **Passed** source acceptance; final scoped verification has its own invocation record |
| Behavior red/green / preparation | No application behavior or contract edits | **Not-applicable** |

#### Receiver/privacy limits and one I4 successor recommendation

Local Sentrame HEAD `c4d0204b4891da15ae4b020d37682e48052e1879` retains dirty
USER-GUIDE/query/UI work and untracked loop-view plans/source/tests. Five prompt-owned
local guides were inspected; exact hashes plus `internal/app/query.go` identity are
in `source.json`. Current validation/guide support optional goals and exact
service/carrier/source/name plus retained reason conditions. I3's reviewed guide
drift remains recorded separately; this I4 snapshot does not claim its initial
bytes were recovered. Untracked loop views are not qualified runtime support.

Receiver module pins collector client/component/pdata 1.70.0, OTLP receiver 0.164.0
and OTel 1.47.0. WFS installed Next is 16.4.2, OTel API 1.9.1; API pins OTel
1.20.0 and Serilog OTel sink 4.2.0, versus the guide's .NET 1.20.1 sample.
Keep existing providers and bounded PWA transport; no SDK/provider replacement.
Current named business candidates are not admitted by the browser Action's closed
input, and templated backend logging does not prove a safe named-log wire record.
No runtime/config/credential/receiver/storage changes occurred.

For browser candidates reuse `service.name=wfs-pwa-browser`, log carrier, trusted
browser namespace, source timestamp, fresh record identity and existing random
per-document session/tab/sequence. Server facts require the independent server
credential and existing provider/log bridge. No shared business identifier or durable
cross-document operation key may join them. Suppress private content before emission;
receiver filtering alone is insufficient. One active optional completion goal,
inactivity/goal capture boundaries, late/lost/capped records and retention constrain
interpretation. Aggregate edges, temporal proximity and inactivity cannot establish
one user's completed cooking trip or a persisted selection.

Recommend **`observe-search-result-presentation`**, without creating it: only current
initial/replacement Search result presentation and handled-read outcome in
`(app)/recipes/page.tsx`, with `lib/telemetry/actions.ts` / existing transport input
extension and focused tests. The question is whether entering/retrying Search yields
available results, valid empty or a handled read failure. Use one fixed named log and
closed retained `reason`; never terms, filters, Similar source, IDs, counts or content.
Settle successful-response validity, generation-safe rendering, automatic invalidation
versus manual retry occurrences, dedup/rearming and ≤10-record document budget before
authoring. No selection/assignment/GOTO/cooking/auth/preferences/backend changes.
Test first with pending/obsolete responses, genuine empty versus failure, explicit
retry, repeated invalidation, opt-out, privacy and cap loss; then qualify actual
browser/Action/Node fresh disposable receiver protected reads/replay/reopen and a
prospective presentation-only mapping. No persistence goal or cross-service join.
This is one bounded proposal recommendation; no successor artifacts were created.

Selected tasks may complete through documented source work and unavailable cells;
UI/runtime qualification remains open. Next inventory session is **I5 tasks 5.1–5.2**
only if separately selected. I-V/6.1 remains unchecked and is not advanced here.

### I5 — Capture, repair, sharing and library maintenance — 2026-10-30

Scope: investigation tasks 5.1–5.2, J13–J16; no emitter contract approved.
I4 is reconciled first: final scoped record
`.task/agent-finish/runs/9025c791e0ac45dcb88f18eb6f400769.json` passed documentation,
selected strict OpenSpec and content stability for all three documentation owners.
I4 remains 2/2 through source investigation and permitted unavailable cells,
overall 8/11 at entry. Its UI/runtime remains not-run; its recommendation
`observe-search-result-presentation` was not created. I3's all-checked emitter
remains unapproved and its receiver-guide drift/absent initial bytes remain recorded.
All I4 access/context/destination, results/detail/selection, GOTO membership/
suggestion/assignment, viewed/planned cooking and user/automatic completion
boundaries remain intact.

#### Identity and exact source chain

WFS HEAD `bc38df83753ddb98a9ea38b814da9913b7b875bc`, branch
`review/profile-settings-home-visuals`; dirty application/archive/documentation work
predates this session. Before-images, staged/unstaged patches and status are under
`.task/telemetry-inventory/i5/before/`. The 86-input WFS source/spec/test/generated/
config manifest is `.task/telemetry-inventory/i5/source.json`, SHA-256
`be2218b8050fffefe5cfa18fda28ae04e55e188d7417de4880c4606f856489e4`.
It is a source snapshot, not a clean build, running provider or deployment identity.

Canonical owners: [recipe-capture](../../openspec/specs/recipe-capture/spec.md)
(acceptance, extraction, readiness, PDF and description),
[capture-recovery](../../openspec/specs/capture-recovery/spec.md)
(retained initialization, retry, clear and residue),
[recipe-quality](../../openspec/specs/recipe-quality/spec.md)
(saved feedback, contextual attempt, review, manual resolution),
[recipe-sharing](../../openspec/specs/recipe-sharing/spec.md),
[recipe-recycle-bin](../../openspec/specs/recipe-recycle-bin/spec.md),
[background-processing](../../openspec/specs/background-processing/spec.md),
[search-indexing](../../openspec/specs/search-indexing/spec.md) and
[household-live-updates](../../openspec/specs/household-live-updates/spec.md).
Inspect scenarios under those owners rather than treating workflow completion,
indexing or live delivery as synonyms for domain success.

All methods below exist in [OpenAPI](../../specs/openapi.yaml). Builder paths are
relative to `pwa/src/lib/api/generated/api/`, each ending `/index.ts`; they exist
even where the real wrapper deliberately bypasses them. Sixteen method/template
pairs were checked mechanically, including escaped Kiota placeholder normalization.

| Journey / approved operation | Actual browser seam / generated builder | Trusted backend chain |
| --- | --- | --- |
| J13 `POST /api/recipes`, `POST /api/recipes/capture-url` | `MinimalCapture.handleSave/handleUrlCapture` → `useCapture.submitRecipe/submitUrl` → `recipes.createRecipe` raw multipart demoFetch / generated `recipes/captureUrl.post`; builders `recipes`, `recipes/captureUrl` | `RecipeController.Create/CaptureUrl` → `RecipeService.CreateRecipe/CaptureUrl` → files/info, recipe (+ photo search sidecar / URL recovery instance) save → caught dispatch/initialization |
| J13 `POST /api/recipes/capture-pdf` | `PdfCapturePanel` → `recipes.createPdfRecipe` raw multipart demoFetch with member captured at Save; builder `recipes/capturePdf` | `PdfCaptureController.Capture` → `PdfCaptureService.AcceptAsync` → source PDF/info → recipe/sidecar save → caught `recipe-import` dispatch |
| J13 `POST /api/recipes/describe` | `MinimalCapture.handleDescribeSubmit` → generated `recipes/describe.post` | `RecipeController.Describe` → `RecipeService.DescribeRecipe` → info/recipe save → caught `goto-synthesis` dispatch |
| J13 `GET /api/captures/failures`, `POST /api/captures/failures/{id}/retry`, `DELETE /api/captures/failures/{id}` | `FailedCapturesSection` / `RecipeFailureBanner` → `captures.getCaptureFailures/retryCaptureFailure/clearCaptureFailure` → `captures/failures`, `captures/failures/item/retry`, `captures/failures/item` | `CapturesController.GetFailures/Retry/Clear` → `CaptureFailureService` → task/workflow reset or transactional workflow removal + maintenance command → `ManagementService.ProcessDeleteFailedCaptureResidueAsync` |
| J14 `POST/DELETE /api/recipes/{id}/import-report`, `GET /api/recipe-imports/{importId}` | `RecipeImportIssueSheet` → `RecipeDetailSheet.handleSaveImportIssue/handleResolveImportIssue/pollImportUntilTerminal` → `recipes.saveRecipeImportIssue/resolveRecipeImportIssue/getRecipeImportStatus` → `recipes/item/importReport`, `recipeImports/item` | `RecipeController.SubmitImportReport/DeleteImportReport`, `RecipeImportController.GetById` → `RecipeImportReportService.SubmitAsync/DeleteAsync`, `RecipeImportService.GetImportByIdAsync` → report/workflow persistence |
| J15 `GET /api/recipes/{id}/share`, `POST /api/recipes/import-bundle` | `RecipeDetailSheet.handleShareRecipe` → `getRecipeShareBundle/downloadRecipeBundleFile`; `MinimalCapture.handleAcceptBundle` → `importRecipeShareBundle`; generated `recipes/item/share`, `recipes/importBundle` | `RecipeController.Share/ImportBundle` → `RecipeService.ExportRecipeShareBundle/ImportRecipeShareBundle` → export reads / database save then file writes |
| J16 `DELETE /api/recipes/{id}`, `GET /api/recipes/trash`, `POST /api/recipes/{id}/restore`, `DELETE /api/recipes/{id}/purge` | `RecipeDetailSheet.handleMoveToBin`, `RecycleBinSheet` → `recipes.deleteRecipe/getTrashItems/restoreRecipe/purgeRecipe`; first three generated, purge raw demoFetch; builders `recipes/item`, `recipes/trash`, `recipes/item/restore`, `recipes/item/purge` | `RecipeController.Delete/GetTrash/Restore/Purge` → `RecipeService.SoftDeleteRecipe/GetTrash/RestoreRecipe`, `RecipePurgeService.PurgeAsync` → deletion/restore save or filesystem-first database transaction |

Source locations: [capture UI](../../pwa/src/components/capture/MinimalCapture.tsx),
[hook](../../pwa/src/hooks/useCapture.ts), [PDF panel](../../pwa/src/components/capture/PdfCapturePanel.tsx),
[recipe wrappers](../../pwa/src/lib/api/recipes.ts), [failure wrappers](../../pwa/src/lib/api/captures.ts),
[detail](../../pwa/src/components/recipes/RecipeDetailSheet.tsx),
[issue sheet](../../pwa/src/components/recipes/RecipeImportIssueSheet.tsx),
[bin sheet](../../pwa/src/components/recipes/RecycleBinSheet.tsx),
[recipe service](../../api/src/RecipeApi/Services/RecipeService.cs),
[report service](../../api/src/RecipeApi/Services/RecipeImportReportService.cs),
[failure service](../../api/src/RecipeApi/Services/CaptureFailureService.cs),
[purge](../../api/src/RecipeApi/Services/RecipePurgeService.cs),
[EF mappings](../../api/src/RecipeApi/Data/RecipeDbContext.cs) and
[schema](../../api/database/schema.sql). EF hides soft-deleted recipes and uses
one report per recipe with cascade removal; workflow tasks and maintenance commands
are separate durable state, not telemetry identities.

#### J13 coverage card — saved intake, readiness, failure and retained recovery

**Question / entry:** Did this capture request save pending work, did content become
ready, and what recovery was actually accepted? Entry is photo/link/description/PDF
review, external share review, or Settings with previously retained failures.
Entry into an old failure is a new document observation, not continuation of an
old anonymous journey. Current capture page strips legacy `intent=goto`; dormant
component branches and legacy FamilyGOTOSettings test labels do not reinstate
retired membership behavior.

**Ordered boundaries and trusted owners:** Intake validates and stores before
returning its identity. Photos write files/info first, then recipe/search sidecar;
PDF writes bounded source/info then recipe/sidecar; failures can leave orphan files.
URL saves recipe and paused initialization together; `UrlCaptureInitialization`
and `WorkflowOrchestrator.InitializeUrlCaptureAsync` lock/reload existing state,
replace its sentinel graph and commit. Dispatch failures are caught after saved
intake. Photo/PDF/description dispatch lacks URL's durable initialization sentinel;
do not generalize URL's recoverability to every caught dispatch failure.
Description returns 200 but still represents pending synthesis, not ready content.
Duplicate advisory is nonblocking; no intake idempotency key prevents a fresh
submission/lost-response retry from creating another recipe.

Packaged `url-import.yaml`, `recipe-import.yaml`, `goto-synthesis.yaml` drive
acquisition/conversion/extraction/hero/sync/categorization before RecipeReady.
[RecipeReadyProcessor.ExecuteAsync](../../api/src/RecipeApi/Services/Processors/RecipeReadyProcessor.cs)
locks the recipe, computes discoverability from rotation policy (not unconditional
true), saves readiness and commits before retained-PDF metadata repair and ready
publication. Already-ready calls repair PDF metadata and return without publishing
another ready event. Missing recipe returns a no-op. Thus task completion need not
mean a new ready recipe; ready database state can coexist with metadata/publication
failure and a later paused workflow. Canonical capture wording about discoverability
is broader than this conditional implementation; preserve that discrepancy rather
than certifying discoverability. `PdfConversionProcessor` reuses complete rendered
pages, uses an in-process gate and writes files/metadata before its database save;
that gate is not a multi-process guarantee.

`WorkflowWorker` saves Processing, runs a processor, then saves task completion and
reconciles dependencies/instance state. Transient retries have scheduled waits;
fatal handling separately saves failed task, pauses instance, records guarded report
failure and attempts SSE. Any subsequent save/follow-up can fail. Independent search
index failures are excluded from capture-failure SSE. Worker reaping/re-execution is
not exactly-once delivery; process exit is not a user cancellation or domain failure.

The foreground `captureStore`/`libraryStore` are memory only. `useScheduleStream`
removes pending entries and queues notifications only when matching pending work
exists. MinimalCapture reacts to a matching ready notification and cancels countdown;
late/early lost SSE and reload can lose that presentation. Its inline ready screen
is browser evidence only. Countdown/Done is dismissal, not cancellation of work.
PDF selection generation guards navigation/reset; leaving loses the draft, while an
already-dispatched request may save and add pending state after departure. Native
share staging tokens, product IDs and stored pending recipes are not telemetry scope.

**Retry / clear / uncertainty:** Settings initial read failure is swallowed and hides
the section, not proof of no failures. Retry resets the latest failed task on the
same workflow, retaining retry count; URL initialization serializes/reconciles its
existing graph even after uncertain commit. Ordinary failed-task reset does not
share that full lock/reload transaction. `FailedCapturesSection.handleRetry` marks
Retrying only after await, so overlapping pending clicks are possible; it does not
poll/refetch after acceptance. Wrapper `queued`/`cleared` booleans are returned but
callers rely on resolution, not explicit true checks. Banner uses an earlier busy
flag, dismisses on resolved retry and does not re-add capture pending ownership;
a fresh ready toast is therefore not assured. Rejected/lost responses leave outcome
unknown; a successful authoritative reread can reconcile eligibility, while a failed
read cannot prove retry rollback or terminal failure.

Clear confirmation cancellation sends no request; accepted Clear atomically removes
workflow/tasks and queues residue cleanup, possibly soft-deleting unfinished residue.
It does not prove physical removal. `ManagementService` rechecks discoverable or
named-with-images/synthesized safety before deletion; this predicate differs from
`IsReady` alone. It deletes the directory before saving recipe removal/command result:
filesystem/database partial success remains possible. Clear does not lock out Retry
at the UI; neither control is a universal concurrency or running-worker cancellation
barrier. Restoring usable content and manual issue resolution belong elsewhere.

**Automatic / custom / candidate:** Capture entry/opening and unexpected exceptions
have baseline coverage; drafts, image/PDF review, queued/ready/failure, retry and clear
lack qualified business facts. Proposed trusted named OTel logs through the existing
.NET provider at *actual* save/commit branches: `wfs.capture.accepted` in intake
services; `wfs.capture.ready` after RecipeReady database commit; `wfs.capture.retry_accepted`
at successful recovery commit; `wfs.capture.cleared` at Clear commit. A worker pause
fact, if selected, belongs after persisted pause, not the SSE sender; it cannot be
called capture-not-saved. Browser queued/ready presentation needs a separately guarded
UI owner. Candidate `reason` values must be fixed (e.g. `url`, `photo`, `pdf`,
`description` for intake; `initialization`, `retained_task` for retry), never workflow
names/IDs/payloads or diagnostics. Names/categories are proposals, not approved fields.
Use SDK occurrence time at the owning boundary; request span duration is technical,
not end-to-end acquisition time. Cross-attempt correlation remains unresolved below.

**Limits / receiver / evidence:** Normally ≤1 fact per selected commit/attempt;
healthy retries are separate occurrences, not deduped by recipe identity. A proposed
≤10 browser-result records/document, ≤100 ordinary server records/minute/process and
bounded nonblocking exporter queue require explicit slice approval/qualification;
current browser transport limits do not enforce .NET limits. No per-poll records,
heartbeats, unbounded retry series or durable telemetry queue. Crashes before emission,
export loss and replay uncertainty mean observed counts are lower bounds. Server-only
intake/ready mappings cannot be joined across processes or to a browser merely by
proximity; goal-ready excludes accepted-only work and cannot certify a view. Source
traced, every runtime cell below open. Defer capture instrumentation until lifetime,
terminal ownership and post-commit partial-success semantics are settled.

#### J14 coverage card — issue saved, attempt linked, review and explicit resolution

**Question / entry:** Was feedback saved, was contextual processing actually linked,
and was the retained report later resolved? Entry can be loaded detail, an existing
reported/ready-to-review issue, Cook Mode reporting or filtered review results.
[Recipe quality](../../openspec/specs/recipe-quality/spec.md) owns semantics; existing
Search results/filter guards remain J10, cooking state remains J11.

**Boundaries / owner:** `RecipeImportIssueSheet` normalizes draft, disables Save while
pending/reimporting and retains failed mounted drafts. `RecipeImportReportService`
validates member/provenance/reasons/note and persists its single report *before*
launch. Duplicate (including mixed reasons) and blank-note content are manual-only.
Matching active feedback returns the same attempt, changed active feedback rejects;
matching terminal feedback does not relaunch, changed eligible terminal feedback may.
Its semaphore is process-local; no cross-replica uniqueness/exactly-once guarantee is
inferred. A successful launch then marks the linked attempt; failed compensation may
return started with uncertainty rather than falsely asserting no work exists.
Clear-unstarted/compensation itself can fail after report persistence. Lost response
can hide a saved report/attempt: retry policy must use authoritative state, never a
content hash or inferred failure from rejection.

`handleSaveImportIssue` applies returned detail even when launch failed, then keeps
the form/error. Started acknowledgement starts ID-addressed polling while mounted;
completed/failed/paused status causes a guarded detail reread. Superseded responses
are ignored; errors schedule another poll, not completion. Only successful detail
refresh replaces state/stops that watch. `RecipeImportService.GetImportByIdAsync`
requires an existing member and recipe attribution matching that member: another
household member's watch can return 404, which is not processing failure. Unmount
clears watch/timer, without cancelling the workflow; reopen does not reconstruct the
original browser anonymous attempt.

Packaged `CompleteRecipeImportReportProcessor` runs after recipe_ready and calls
`MarkSucceededAsync`; matching workflow predicates protect report lifecycle updates.
Content-only matching update becomes readyToReview, not resolved/corrected. Fatal
report updates are separately guarded and fallible. Review filters expose retained
issue membership; successful result presentation doesn't prove reading/correction.
`DeleteAsync` rejects active attempts, removes report on save or returns unchanged
no-report detail idempotently. That is explicit manual resolution, not deletion of
the recipe or proof AI fixed it. Concurrent replicas and report-save versus workflow
progress remain limitations; no new durability design is assumed.

**Automatic / candidate / limits:** Baseline covers entry and unexpected exceptions,
not handled save errors, launch failure or review semantics. Candidate existing .NET
named logs: `wfs.recipe_issue.saved` after `PersistAsync`,
`wfs.recipe_issue.ready_for_review` only after matching nonzero lifecycle update,
`wfs.recipe_issue.resolved` after actual removal save (no-op resolution distinct).
A matching failed-attempt observation belongs to the saved failure owner, not polling.
Proposed browser `wfs.recipe_issue.save_result` at `handleSaveImportIssue` may describe
`manual`, `started`, `launch_failed` or `unconfirmed`, using the response's explicit
facts; it cannot claim durable reimport success. Fixed reason only; no selected
free text, report/recipe/import/member identity, content hash or error message.
One record per completed selected action, ≤10/document proposed; no record per poll.
Use source occurrence timestamps, bounded loss and receiver authority as J13; do not
pair arbitrary report-save and later review counts into one operation. Reading tests
below is source evidence only. Defer J14 instrumentation pending guarded-update/no-op,
process-local race and lifetime decisions; no report policy or cooking UI changes.

#### J15 coverage card — export preparation, handoff and independent bundle import

**Question / entry:** Was a portable bundle prepared, what handoff did the browser
observe, and did an independent import save? Ready detail with usable hero offers
Share; file picker/shared-file intake presents a validated review with nonblocking
duplicate advice. Source URL/content/metadata are product payload, never telemetry.

**Boundaries / owners:** `RecipeDetailSheet.handleShareRecipe` prevents repeated
pending Share, shows preparation toast and awaits `getRecipeShareBundle` then
`downloadRecipeBundleFile`. Controller checks member header/hero; export service
reads recipe, scrubs notes/rating, caps original images at five and preserves bundle
source/content. UI eligibility is not a backend readiness guarantee; export service
does not independently require IsReady. Read/encoding can fail; no mutation is proved
by export preparation. The actual helper returns void for native share resolution,
AbortError cancellation and anchor download dispatch. Non-abort native failure falls
back to download; successful caller resolution cannot distinguish those paths.
Anchor click proves neither saved file nor OS/recipient acceptance. Native resolution
cannot prove recipient import. Missing handoff outcome owner is a finding, not
permission to change the helper contract here.

`MinimalCapture` parses/validates bundle and renders review; cancel before acceptance
clears local preview, no import. Pending Import is disabled; this guards the mounted
control, not all concurrent tabs. `ImportRecipeShareBundle` validates and chooses a
fresh identity on collision, saves IsReady database row first, then writes metadata,
hero and originals, returns DTO; no search-index enqueue occurs in this method.
File failures can leave a ready row with missing assets despite rejected/lost response.
Resubmission after a collision can create another recipe; duplicate warning and local
pending state do not provide idempotency. Success screen is response presentation,
not search visibility or recipient use. Cancel/dismiss after dispatch cannot retract
saved work. A failed later read cannot certify import absence.

**Automatic / candidate / limits:** Baseline entry/errors omit preparation, handled
failure and bundle outcome. Proposed browser `wfs.recipe_share.prepared` belongs
immediately after successful bundle validation/preparation, not after the ambiguous
void handoff. `wfs.recipe_bundle.import_result` could report guarded current response
presentation `returned`/`unconfirmed` at `handleAcceptBundle`; trusted
`wfs.recipe_bundle.import_completed` would belong only after all intended writes in
the service, with database-saved/assets-failed explicitly separate. Never label a
native cancellation as an error or claim download/recipient completion. Use existing
named OTel logs, fixed `reason`, source timestamp, no file/name/URL/content/identity.
One per selected action, ≤10 browser records/document proposed, bounded transport
loss; retries count attempts, not unique recipes/recipients. No exporter changes
approved. Independent exporter/importer sessions cannot be stitched; receiver graph
traffic is not a demonstrated recipient path. Source traced; OS sharing, download,
real filesystem/database and physical receive/import cells remain not-run. Defer
sharing instrumentation until handoff ownership and partial import semantics settle.

#### J16 coverage card — bin, restore, permanent purge and residue cleanup

**Question / entry:** Did a library mutation persist, and which removal boundary was
actually crossed? Loaded library detail offers immediate Move to Bin; Bin lists
soft-deleted recipes and offers Restore or PIN-protected permanent purge. Clear
failed capture belongs to J13 and must not count as ordinary bin/purge intent.

**Boundaries / owners:** `SoftDeleteRecipe` checks today's/future calendar assignments,
returns rejection without deletion when assigned, otherwise saves deleted timestamp/
actor plus search-document removal together. UI closes/refreshes on resolved wrapper;
failed mutation keeps detail with feedback. A callback or subsequent Search read can
fail after save; no rollback is implied. Eligibility read and save are not a universal
lock against concurrent assignment. Duplicate delete requests are not globally
serialized by the control. `GetTrash` orders persisted soft-deletes; failed read shows
Retry rather than empty. Its wrapper defaults missing items to empty, so a malformed
resolved body is not strong empty evidence.

`RestoreRecipe` clears deletion fields and saves before caught index dispatch; ready
library inclusion and successful indexed Search remain separate. Restore can be
repeated, updates timestamp/dispatch again and is not a new unique restoration each
time. `RecycleBinSheet.handleRestore` disables one item, removes on resolution and
retains feedback/retry on rejection; this doesn't serialize purge or remote changes.
Lost response → unknown until successful authoritative reconciliation, not automatic
rollback. Dismissing the sheet only abandons the presentation.

`PurgeAsync` validates configured PIN/matching header, requires existing trash,
marks selected Pending workflows Failed, deletes directory first, removes dependent
search/vote/calendar and recipe rows, saves and commits transaction. No rollback of
filesystem effects after database failure, cancellation of running workers or broad
atomic removal is guaranteed. Its workflow selection uses parameter text matching
for Pending instances rather than an explicit workflow-type predicate: the comment
about indexing is narrower than this implementation. Failed-request replay can find
missing files, already removed row or changed trash state; later 404 alone cannot
attribute prior successful purge. Report cascade is persistence behavior, not a
separate user resolution event. Failed-capture residue removal uses its own safety
recheck and maintenance result, not the elevated PIN purge owner.

PIN cancel before submit sends no purge; cancel while pending merely closes dialog.
Submit disables visually but handler has no isSubmitting guard; old response handlers
can settle after dismissal/replacement and affect current UI. Wrong/unconfigured PIN,
not-in-trash and missing record are distinct server outcomes; raw PIN/status strings,
lengths, recipe names, dates and IDs must never become journey attributes.

**Automatic / candidate / limits:** Baseline screens/exceptions omit handled bin
read/write/retry and persisted removal. Proposed trusted named OTel logs
`wfs.recipe.binned` after actual soft-delete save, `wfs.recipe.restored` after save,
`wfs.recipe.purged` after transaction commit; reject/no-op/repeat semantics must be
settled before emission. `wfs.capture.residue_removed` belongs to maintenance save,
with `skipped` distinct, and is deferred. Browser could observe only mutation result
presentation/`unconfirmed`, never physical deletion. Use fixed reason categories,
SDK occurrence time and per-operation record identity where approved; no business
identity. One fact per selected write attempt, proposed ≤10 browser records/document;
no row/list-item impressions or polling emissions. Server budgets/queue/drop policy
require qualification. Receiver goals must select the specific owner/fact; neither
requested deletion, HTTP 200 nor absence after a failed read proves removal.
Source traced; PIN rejection, filesystem/database partial failure, stale response and
running-worker races remain source findings/unrun experiments, not reproduced bugs.

#### Bounded asynchronous correlation — unresolved before mechanism selection

No product ID, query, URL, note, content/hash, person/household identity or persistent
cross-document key may be exported or repurposed. Product state legitimately uses
recipe/import/workflow IDs internally; that does not authorize telemetry linkage.
Fresh document means fresh anonymous scope; warm resume does not rearm it.

| Candidate boundary | What survives / conflict | Investigation decision |
| --- | --- | --- |
| Document-local random action occurrence | Can pair local submit/result while mounted; disappears on reload, cancellation/unmount and late results need explicit rules | Potential foreground-only proposal, bounded to document and ≤10 attempts; no persistence. Expiry/rearming/dedup still unapproved. |
| Existing request span | Covers one request and technical duration; not later queued work, recipient, or persisted outcome automatically | Reuse technically where present, never infer background identity or success. |
| Process-local random worker attempt | Ends at attempt/process loss, cannot pair restart/retry to initial browser | Potential independent server fact only; no claim of full acquisition/recovery duration. |
| Durable random operation scope or propagated baggage | Would need storage/expiry, restart retrieval, retries/replays, deletion, replica ownership and trusted ingress; linking later documents conflicts with settled policy | **Unresolved, not recommended as a mechanism.** No schema/header/API change, stored token or durable telemetry queue proposed. |

Required decisions before any asynchronous successor: whether disconnected trusted
facts answer the question sufficiently; maximum operation lifetime across scheduled
retries (no finite end-to-end TTL established here); whether processing restart is a
new observation; ownership of late/duplicate/no-op terminals and partial success;
expiry/drop behavior without retrospective joins; privacy acceptance if durable
operation correlation is ever separately requested. Receiver inactivity/retention
cannot supply these product rules. Do not dedup with content hashes, fill gaps with
heartbeats, forward arbitrary baggage to providers or resurrect prior document scope.

#### Exact inspected tests and independent qualification cells

Tests were inspected/located, **not executed**. The checked symbol list is
`.task/telemetry-inventory/i5/tests.json`; no historic test pass is borrowed.

| Source test owner | Exact selected symbols / evidence limit |
| --- | --- |
| [UrlCaptureRecoveryTests](../../api/src/RecipeApi.Tests/Integration/UrlCaptureRecoveryTests.cs) | `Saved_url_with_unavailable_workflow_is_recoverable_after_reload`, `Successful_url_intake_initializes_background_tasks_without_marking_recipe_ready`, `Real_database_storage_and_orchestrator_reconcile_failures_concurrency_and_uncertain_commit`: actual test bodies distinguish pending, failed graph write, lost commit acknowledgment, concurrent initialization and clear; none run here. |
| [PdfRecipeReadyTests](../../api/src/RecipeApi.Tests/Services/PdfRecipeReadyTests.cs) | `Ordinary_ready_processor_records_retained_PDF_completion_and_idempotent_retry`; confirms intended retained metadata/idempotent assertions, not all publication faults. |
| [CaptureFailureIntegrationTests](../../api/src/RecipeApi.Tests/Integration/CaptureFailureIntegrationTests.cs) | `Clear_RemovesWorkflow_AndQueuesCleanupCommand`, `DreamingMaintenance_SkipsReadyRecipe`; queued versus consumed cleanup and safety assertions. |
| [RecipeImportReportPostgresTests](../../api/src/RecipeApi.Tests/Integration/RecipeImportReportPostgresTests.cs) | `ContextualUrlRepair_PackagedLaunchPersistsAndReusesOneAttempt`, `ContentAndMixedReports_KeepMatchingAttemptGuardsAndSuccessStatus`; PostgreSQL guards are unexecuted. |
| [RecipeShareIntegrationTests](../../api/src/RecipeApi.Tests/Integration/RecipeShareIntegrationTests.cs) | `GetShareBundle_ExportsAllowedFieldsOnly_AndCapsOriginalImagesAtFive`, `ImportBundle_WithValidPayload_CreatesReadyRecipe_AndPreservesSynthesizedFlag`; selected assertions don't qualify partial filesystem failure or delivery. |
| [RecipePurgeIntegrationTests](../../api/src/RecipeApi.Tests/Integration/RecipePurgeIntegrationTests.cs) | `Purge_RemovesRealisticTrashDependencies_AndRecipeDirectory`; fixture assertions are not a live PostgreSQL/running-worker race pass. |
| [RecycleBinSheet tests](../../pwa/src/components/recipes/RecycleBinSheet.test.tsx), [detail tests](../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx) | `distinguishes a failed read from empty and retries`, `keeps a failed restore entry with feedback and permits retry`, `keeps a preparation toast visible through a slow share bundle and prevents duplicate shares`; mocked wrappers only if executed. |
| [Report E2E](../../pwa/e2e/recipe-import-reporting.spec.ts), [PDF E2E](../../pwa/e2e/pdf-capture.spec.ts) | `retains saved URL feedback after launch failure and retries without retyping`, `metadata is submitted once and acceptance returns Home without conversion`; browser interception is separate from real API/provider/persistence. |

Availability probe `cua.getState()` returned zero browsers and
`Browsers: Error: The browser access host is unavailable` (**blocked**).
Listener inventory identified no verified disposable synthetic business UI/database;
no shared listener/fixture was claimed or mutated. Native browser apps being open
does not establish an isolated synthetic household. No product process was launched.
Tasks permit unavailable walkthrough evidence; the cells below fulfill that branch,
not a runtime pass. All steps are proposed using synthetic fixtures only.

| Cell / proposed steps | Status / concrete reason |
| --- | --- |
| J13 phone/wide photo/link/description/PDF review → accept pending → ready; pre-submit cancel; malformed/rejected submit → retry | **not-run**: browser host unavailable; no verified disposable journey UI. Check draft retention, countdown and PDF generation guards without assuming provider success. |
| J13 saved URL unavailable definition → Settings read → repeated/overlapping Retry → fresh read; lost response; clear cancel/accept → consume cleanup / safety skip | **not-run**: no isolated UI/API/database selected. Mounted Retrying/row removal must stay distinct from readiness/physical removal. |
| J14 manual Duplicate/blank-note Save; eligible save/failed launch → retained draft retry; active/unchanged/changed feedback; terminal poll → detail; resolve/reject | **not-run**: unavailable isolated UI. Include attribution-denied status read, stale watch, close/reopen and failed detail refresh without claiming terminal outcome. |
| J15 prepare bundle → native share resolve/cancel/fallback; parse invalid/valid file → review cancel/duplicate accept → return; lost response/filesystem write failure | **not-run**: browser host unavailable; OS/native handoff and real asset persistence require separate environments. No actual file shared or content imported. |
| J16 load bin failed/empty retry; assigned move reject; saved move + failed refresh; restore with failed index dispatch; invalid/unconfigured PIN; pre/post-dispatch cancel; files removed + DB failure | **not-run**: no verified disposable UI/database/filesystem target. Do not purge a real household to manufacture evidence. |
| Unit/component and browser/mock suites | **not-run**: source investigation only; inspected bodies do not execute fixtures. |
| Real API/PostgreSQL and actual filesystem, restart/retry/worker races | **not-run**: no disposable service/database/provider experiment provisioned in this investigation. |
| Real AI/acquisition/rendering/provider | **not-run**: no provider invocation authorized/needed for source acceptance. |
| Browser/Action/Node exporter → Sentrame durable protected read, replay/reopen | **not-run**: no journey emitter or synthetic receiver qualification selected. |
| Trusted .NET exporter/Serilog bridge → receiver | **not-run**: installed WFS graph/credentials/flush/sampling not qualified by receiver sample. |
| Deployed proxy/tunnel/shared-file receiver | **not-run**: no selected disposable deployment or route. |
| Physical installed-phone camera/PDF share/OS discard/restart/receive-import | **not-run**: no selected disposable device session. |
| Behavior TDD / application preparation | **not-applicable**: documentation-only investigation. |

#### Receiver compatibility, privacy and one I5 recommendation

Local read-only receiver HEAD `c4d0204b4891da15ae4b020d37682e48052e1879`, `main`;
existing USER-GUIDE/query/UI edits and untracked loop-view work remain. Current five
guide SHA-256 hashes, in DEVELOPER / OTEL-CONTRACT / AGENT-INTEGRATION / USER /
standard-otel order:

- `781cb9552dde612eafb1478dd30777f2761547046b00c7ef296f8b6da26ee961`
- `830fe58dcf102d00da6f79f12b02f3728c1cea9e9841c054815c801ba7ecdb12`
- `3f9e407be5fdb235061fc1e979ac1e6f7e4513755535aa6dcb413bb70183e346`
- `875b42be3fabc5bfb94aa55acd20443bc0a7897e5e85bfddb9756810f29196ab`
- `1a2aa4acfb17830fbb08da0021c7c76c95e7b449de8530e07b69d36faf6aa35e`

These are current source documentation, not a running receiver identity or a rewrite
of I1/I3's drift history. Retained standard names/service/carrier/source/occurrence
and allowlisted `reason` support prospective selectors; unsupported arbitrary fields
are omitted. Browser-forwarded claims retain browser credentials/authority even
through Node. Existing WFS .NET OTel 1.20.0 / Serilog sink 4.2.0 and Node transport
must be reused if selected; receiver .NET 1.20.1 sample qualification does not qualify
this bridge. No new provider/Collector/SDK/queue is proposed. Existing browser names
are closed; candidate names would require a separately approved transport extension.

For every candidate above, prospective mapping uses log carrier, proposed exact name
and disjoint fixed reason conditions. Backend service is `RecipeApi` as registered in
Program.cs, with authenticated server producer authority; browser service is
`wfs-pwa-browser` with browser authority and current document scope/tab/sequence.
A resource/service claim is not authentication. These are prospective selectors,
not activated mappings or verified wire projection. In particular, the installed
Serilog sink must demonstrate the named-event field and safe fixed attributes before
any backend selector is accepted. No existing raw diagnostic message is reused.
 Browser result is presentation/acknowledgment, trusted post-commit fact
is persistence. Optional one-goal capture/30-minute inactivity is not global business
completion/failure. Graph aggregation, loop/recovery highlighting and saved views
cannot reconstruct causality across missing scopes; 30-day detail/12-month summaries
limit replay/history. Actual exporter receipt, protected ordered evidence and reopen
are required before claiming support for a WFS journey. No Sentrame storage/config
was accessed or changed; historical F-series qualification qualifies none of J13–J16.

One I5 recommendation: **`observe-recipe-issue-save-results`**, foreground browser
acknowledgment only at `RecipeDetailSheet.handleSaveImportIssue`, using existing
bounded transport. Distinguish manual save, started/reused attempt, saved-but-launch-
failed and unconfirmed response; exclude background completion, query/content, all
business IDs and cross-document linkage. Candidate owners are detail + its focused
component tests, existing closed-input telemetry transport/tests and synthetic
receiver fixture only. Before proposal authoring settle outcome categories, late
response guard, occurrence/dedup/rearming and ≤10-result document budget. Test-first
acceptance must cover manual/started/launch-failed/rejected/lost/stale responses,
privacy sentinels, no polling amplification and real disposable exporter/receiver
protected read/replay/reopen with browser authority. Stop before server propagation,
report-policy/UI changes, durable correlation, provider work or Sentrame changes.
No successor was created; I-V chooses the single overall recommendation separately.


### I-V — Investigation reconciliation — 2026-10-30

Task 6.1 follows completed I5, not a reopened implementation slice. All sixteen
journeys now have dated source cards; none has an executed UI walkthrough or runtime
qualification from I1–I5. Completion means the investigation acceptance boundaries,
including their explicit permitted unavailable cells, have been satisfied. It does
not approve candidate emitters or resolve the product/qualification gaps below.

#### Source and checkpoint reconciliation

Current WFS HEAD/branch match I1–I5. The existing manifests were rehashed and every
recorded WFS source/spec/test/config input was compared with the current tree; I1
50, I2 46, I3 51 and I4 87 inputs have **zero drift**. I5's 86 inputs and five
receiver guides passed its source check. No re-execution or broad retracing of
unchanged journeys was needed. Exact reconciliation output:
`.task/telemetry-inventory/i5/reconciliation.json`. Manifests remain historical,
unchanged, and count overlapping inputs independently; counts are not test totals.

| Group / journey coverage | Original source-manifest SHA-256 | Reconciled documentation record under `.task/agent-finish/runs/` | Evidence / progress |
| --- | --- | --- | --- |
| I1 / J02–J04 | `439ab428b3f4747ad24d59b3c5a7423baf1d99e447344acc718130e7ce5fb699` | `da058edf416342a0b0f0c3b7f64d414c.json` | source traced, unavailable UI; 2/2, cumulative 2/11 |
| I2 / J05–J07 | `6522979be54e5890e3df77ffc8f0eb4c82c82d36744eb0ae308f53be90c8fd31` | `529ceafac9a1411f959f2aaab069fd27.json` | source traced, unavailable UI; 2/2, cumulative 4/11 |
| I3 / J08–J09 | `a98ef765496f2774a191ad7b518de850879f6793fe97ed78c91ca4ace9010266` | `f0668cc9326f4e769c2a5368ae715add.json` | source traced, unavailable UI; 2/2, cumulative 6/11 |
| I4 / J01/J10–J12 | `9a4f942faa94f2911cc4e08f5094b80d787a781b0edf9899301302c1427aec39` | `9025c791e0ac45dcb88f18eb6f400769.json` | source traced, unavailable UI; 2/2, cumulative 8/11 |
| I5 / J13–J16 | `be2218b8050fffefe5cfa18fda28ae04e55e188d7417de4880c4606f856489e4` | `b5b93b1160f540d0bbe9c2c78bb3fddb.json` | source traced, unavailable UI; 2/2, cumulative 10/11 |

Each listed record was read: documentation, selected strict OpenSpec and content
stability passed; task acceptance was not evaluated by the verifier and application
gates were not-applicable. I5's record predates its completion checkbox; the final
three-path invocation verifies subsequent checkpoint/6.1 bytes and is reported in
the handoff. Earlier intermediate successes/failures are preserved, not replaced
with a blanket runtime pass. Historical “next session”/unchecked statements inside
each dated checkpoint describe that time, not current progress.

Receiver HEAD remains `c4d0204b4891da15ae4b020d37682e48052e1879` with pre-existing
dirty guide/query/UI and untracked loop-view work. Four guide hashes remain shared;
USER-GUIDE evolved during earlier sessions. I1's initial/recheck and I3's initial/
reviewed hashes remain separate; I3 initial bytes were not captured and no line-exact
comparison is reconstructed. Its reviewed USER-GUIDE hash
`875b42be3fabc5bfb94aa55acd20443bc0a7897e5e85bfddb9756810f29196ab`
is I5's current hash. Optional-goal/authority/retention guidance and source mapping
support are not actual journey qualification. No running receiver/version/config,
build, provider or deployed identity can be inferred from these snapshots.

#### Remaining semantic and qualification gaps

| Group | Semantics/source limitations retained | Required future qualification, not supplied here |
| --- | --- | --- |
| I1 | Saved votes ≠ personal exhaustion ≠ household convergence ≠ closed round ≠ assigned plan. In-flight votes may save after convergence; promotions may partly save before failed close. Failed-open rollback/spec wording and empty-feed successful-load/pending-vote guards remain findings. | Distinct source-owned result/commit assertions, actual browser/API/PostgreSQL and post-save publication/recovery; no inference from screen/SSE/HTTP alone. |
| I2 | Assignment/no-cook/movement separate; captured operation target versus adjunct-read wording, EF/SQL non-cooking note drift and generic caller move/no-op limitations remain. Retained Tomorrow saved/disposed/unknown/refresh-needed outcomes do not permit blind replay after failed reconciliation. | Real commit/partial follow-up/cancellation/lost-response checks; each caller needs its own observed result. |
| I3 | Optimistic checks/extras ≠ persisted map/occurrence state ≠ successful publication. No saved shopping-trip completion. All-current-items-checked predicate/emitter remains **unapproved**, including pending writes, extras, empty list, remote/list changes and rearming. | Phone/wide/current/future/history and concurrent state/reconciliation; exact list settlement owner before a completion-like observation. Receiver guide drift remains evidence, not a receiver pass. |
| I4 | Access accepted/context/destination; Search/Browse result/detail/selection; GOTO membership/suggestion/assignment; viewed-recipe/planned-meal cooking; user completion/automatic finalization remain separate. Missing verified-context/result owners, retired FamilyGOTOSettings, post-save failures and warm-resume/OS-discard limits remain. | Auth/context recovery, stale/failed read/retry, actual guarded assignment/finish, long pause/midnight/Original return and physical-device interruption. No auth/cookie/preferences/cooking UI repair selected. |
| I5 | Accepted/queued ≠ durable readiness; ready database ≠ discoverable/indexed/assets complete; retry accepted ≠ recovered; issue saved ≠ successful reimport/review/resolution; prepared export ≠ completed handoff/recipient import; requested delete ≠ persisted or physical removal. Void share result, cross-replica/running-worker races and filesystem/database partial success remain. | Synthetic pending/failure/retry/cancel/lost response, real API/PostgreSQL/filesystem/provider, OS share/export/import, restart and physical-device checks; async lifetime/privacy decisions before correlation. |

Additional current contract findings are recorded without repair: capture retry
controller emits 404/422 not enumerated by that retry operation (409 already-retrying
exists in the contract/controller enum, but current service doesn't return that enum
branch); ordinary ready discoverability is conditional despite broader canonical
wording; export backend does not independently enforce UI readiness. These are
source mismatches/limits, not an observed deployed failure or new acceptance rules.
Historical I1 vote/member response and I2 model/SQL differences remain with their
own cards. Exact method/template existence does not prove full live parity.

For every group, unit/component/browser-mock **not-run**; actual business API/database
and provider **not-run**; actual browser/Action/Node and trusted .NET exporter/receiver
protected reads/replay/reopen **not-run**; deployed proxy/tunnel/share receiver
**not-run**; physical installed-phone/tablet **not-run**. Browser availability is
**blocked**. Historical F1–F3/receiver sample passes are independently scoped and do
not qualify any of these business journeys. No failed runtime test is reported;
source drift/checker failures stay historical. Documentation checks are **passed**
where their exact records say so; behavior TDD/preparation/application gates are
**not-applicable** to this investigation.

No required source/owner work is omitted from the selected investigation tasks;
unresolved semantics are explicit findings required by those tasks, not approved
implementation. Permitted unavailable cells are present for every group. If a later
selected task requires an actual walkthrough/exporter/database pass, its checkbox
must remain unchecked until that evidence exists; this 11-task inventory cannot
serve as its substitute.

#### One overall successor recommendation and stopping point

Recommend only **`observe-recipe-issue-save-results`** as the next proposal to author:
a bounded foreground response observation addresses a concrete saved-but-launch-failed
case using an existing response owner, without requiring durable asynchronous linkage.
The I5 card supplies candidate files, outcome/lifetime decisions, test-first/privacy/
volume acceptance and separate fresh receiver qualification. It remains a proposal
recommendation, not a created artifact, instrumentation approval or task completed.
I1–I4 recommendations remain historical alternatives, including I4's
`observe-search-result-presentation`; none was created by this session.

I1–I5 are 2/2 each; I-V 6.1 reconciles all five and completes the investigation at
**11/11**, subject to the final selected documentation gate reported in the handoff.
Only existing inventory/tracker/task evidence changed. Stop here: no implementation,
collection, contract/auth/cookie/preferences/cooking UI, receiver, successor artifact,
commit, deployment, sync or archive action. Private evidence under `.task/` is local
verification material, not a new product or successor specification.


## Navigation revision boundary

2026-10-29 planning reconciliation only, not an I-session walkthrough or newly
approved business event catalogue. F2's revised opening, screens and adopted surfaces
share anonymous document-local correlation and ordering; they prove presentation,
not saved work. Follow the [mapping recipe](../sentrame.md#planned-navigation-mapping-recipe)
and [F2-1 prerequisites/evidence cells](README.md#navigation-revision-source-record).
No row above is promoted to traced/runtime-qualified by this revision.

| Future question | Smallest missing semantic evidence | Owning boundary / limit |
| --- | --- | --- |
| Was a vote saved? | Trusted post-commit vote outcome, distinct from request and result presentation | `DiscoveryService.SubmitVoteAsync`, before later publication; J03 needs its full source trace before instrumentation |
| Was a meal assigned? | Actual committed assignment outcome, including failed/lost-response recovery semantics | `ScheduleService` assignment persistence owner; J05, not Quick Find selection or Planner presentation |
| Was shopping completed? | An agreed shopping-completion fact and reporting owner | J08 has no persisted shopping-trip-completed command; GroceryCheckCoordinator/item checks prove check state only |
| Was cooking completed? | Trusted durable planned-meal cooking outcome, separately defined from viewed-recipe completion | `ScheduleService.ValidateDayAsync` save/commit for the planned-meal case; CooksMode screen/steps alone are insufficient |

These are deferred minimum semantic gaps and source entry points. Do not emit
candidate business names, propagate context into the API or infer server authority
within F2. Cross-service continuity and cross-document/background lifetime are
separate decisions, without product/person/household identifiers.

The 2026-10-29 planning record treated a goal on nonempty activation as a receiver
constraint. The I1 source review above supersedes that assumption: current local
Sentrame supports goal-free navigation. Do not choose App opened as goal. Historical F2 qualifies
prospective derivation separately with a meaningful synthetic reaching-Search
presentation goal in a disposable receiver only. Activate before emission;
existing captured definitions are not retrospectively rewritten. Surface closure
is never automatically exit/cancellation/business completion. Paired page/surface
duration needs reviewed boundaries plus `stage.occurrence.id`; F2 measures no dwell
or attention. Missing records/sequence gaps remain incomplete evidence, and later
mapped events after goal/30-minute inactivity may start another capture within the
same WFS document scope without another opening.

## F2-3 baseline coverage limits

The [coverage fixture](../../pwa/src/lib/telemetry/coverage.test.ts) inventories all
13 current `app/**/page.tsx` routes using exact classifications or the explicit
redirect-only `/` → `other` decision. Unknown runtime paths remain `other` without
exporting segments. Its 17 named source-owner exceptions cover known bespoke
sheets, dialogs, viewers and progress overlays; they remain uninstrumented.
The fixture is the maintained owner/reason inventory, including native DemoDialog.
QuickFindModal has one static `quick.find` declaration; Planner owns the companion
composition declaration. No translated label, content or DOM scraping supplies identity.

The static candidate search sees literal dialog roles, native dialog declarations,
common Modal/Sheet/Dialog uses and fixed-inset visual candidates in components.
It cannot discover every portal, computed class/role, third-party or dynamically
constructed overlay. Source coverage does not prove runtime visibility. Baseline
columns above are presentation coverage only, not I1–I5 walkthrough acceptance,
semantic selection/cancellation, persisted success, dwell or complete paths.


## M4 presentation implementation update — 2026-10-31

The investigation rows above retain their historical F2 source/runtime boundaries. The selected [standard instrumentation change](../../openspec/changes/archive/2026-10-31-adopt-standard-otel-instrumentation/tasks.md) now adopts M4 recipe detail/plan/actions/filters/issue/bin/PIN, original viewer and cooking reader declarations. Their exact fixed identities, loaded-content triggers, external intent and configured-versus-received mapping limits are in the [M4 integration guide](../sentrame.md#m4-presentation-integration--2026-10-31). The primary Grocery/container/platform exceptions and M5 deferred owner decisions remain explicit in source coverage. This update adds presentation only to J05/J10/J12/J14/J16 context; assignment, search availability, review repair, removal and cooking completion retain their existing independent evidence gaps. Required68mocked business-browser scenarios pass; actual new browser/Action/standardSDK/receiver protected acceptance passes1/1 with154 retained records/replay/reopen, and tasks4.1–4.4 are accepted at13/20 after final scoped gate `.task/agent-finish/runs/58e61af61e2248fb811c97bc1f4a2c3e.json` passes all applicable checks. No real persistence/provider/deployed/device claim is inferred from these UI mocks.


## M6 issue pilot implementation update — 2026-10-31

J12 report/review context gains bounded current `pwa.recipe_issue.save_result` reasons and independent `wfs.recipe_issue.resolved` at confirmed explicit removal, alongside M3 Saved facts. See [M6 integration evidence](../sentrame.md#m6-issue-response-and-explicit-resolution--2026-10-31). Browser manual includes unchanged feedback; processing includes reused work; saved launch failure remains separate from correction/readiness; unconfirmed does not mean nothing persisted. Terminal polling and resolution do not manufacture Save results. Ten lifetime attempts and stale/hidden/dismissed/superseded suppression retain incomplete-evidence limits.

The actual browser/Action/SDK/receiver proof has 277 retained records/31 results/four independent scopes, exact replay/reopen and explicit no-goal mappings. Independent authenticated API/PostgreSQL/provider/receiver proof passes 29 cases with saved/removal facts, outage/noninterference and exact retention/replay/reopen. Credentials, stream identity and meanings remain producer-specific; no shared key or adjacency connects a browser result to a server fact. No reimport-success, repaired-content, recipe-removal, async background, other-journey persistence, deployed or physical-device claim is added. Tasks 6.1–6.2 accepted at 18/20; 6.3 final gate pending, M7 later. Historical inventory walkthrough statuses retain their original boundaries.


M6 final acceptance: **19/20; tasks6.1–6.3 complete; M7 only remains.** Fresh27path full gate `.task/agent-finish/runs/1f577bf4af4348ce97f1f2cf533d1dd9.json`, identity `e8b097e189c7e1cf2351ff9a00169860029cbb32ee32a9ef6d34f903b9a16ada`, passes1,618units,615browser/47documented skips,1,306API/178opt-in skips,204Linux PostgreSQL/zero skips,223harness Python/one opt-in skip,9Node CI checks,39strict specs,lint/format/types/five contracts/live endpoint parity/content. Current post-review actual browser/SDK/receiver acceptance is `m6-live-current-summary.json`:277records/31results/30batches/four scopes,all319production inputs/current fixture matching,exact evidence+journey replay/reopen,private sentinels absent (sorted evidence/journey projection SHA256 `f381ea05e37c7725bb45f47db5183ecfdca5adf3f74a630e381e90e5f9c0ffe3`). The full gate independently repeats that fixture successfully. Real API/PostgreSQL/provider/receiver acceptance remains29zero-skip cases at `.task/database-tests/runs/3a394d86847f4e689b090ba37af2a2d5/result.json` with8protected records/6batches; API source unchanged. Browser and server evidence remain independent. First failed gate and all earlier red/setup failures stay preserved; the stable fresh gate owns the final application result. Later completion documents are checked separately. M7 owns all20reconciliation,then authorized spec sync/archive and final commit-message delivery; no commit/push or premature M6 archival. Exact resource cleanup and ownership release are recorded in the handoff.


## M7 final standard instrumentation — 2026-10-31

The selected standard instrumentation change completes local31requirement/87scenario reconciliation and20/20tracked tasks. Fresh132path gate `.task/agent-finish/runs/e4281f186f884a29bdc48a982d2987b2.json` passes1,624units,615browser/47skips,1,306API/178opt-in skips and204Linux PostgreSQL/zero skips. Source coverage has24static identities (22new); actual presentation, current Save responses and trusted persistence remain distinct. Raw timestamp validity and four strict canonical length warnings are corrected; no other inventory business emitters, inferred goals, cross-producer joins or deployed/device acceptance were added. The final M7 section in the integration guide and `.task/otel-apply/HANDOFF.md` own detailed qualification, canonical sync/archive/post-lifecycle evidence, limits and cleanup.

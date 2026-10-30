# Telemetry journey inventory

This is a **source-backed planning seed**, not an executed app walkthrough, approved event catalogue or implementation checklist. Use [inventory sessions I1–I5](../../openspec/changes/inventory-telemetry-journeys/tasks.md) to trace one group and the [tracker](README.md) for status. Baseline coverage below distinguishes implemented F1 opening from planned F2/F3 coverage; revised correlated opening/navigation is not implemented. See the [navigation revision boundary](#navigation-revision-boundary).

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

No row is initially source-traced end to end or runtime-qualified. Start from the source pointers below, inspect exact methods and approved contracts, and replace assumptions with evidence. New features need a static presentation declaration and, only where necessary, semantic evidence at the trusted operation owner. An SDK does not provide business meaning automatically.

## Experience map

| ID / session | Journey and meaningful boundary | Canonical owner / source entry points | Initial custom-evidence gap and test starting points |
| --- | --- | --- | --- |
| J01 / I4 | Invitation or passphrase -> access -> select/create member -> presented destination; reject/recover | [Household identity](../../openspec/specs/household-identity/spec.md), [member context](../../openspec/specs/member-context/spec.md), [members](../../openspec/specs/household-members/spec.md); `lib/auth.ts`, invite/Welcome/onboarding pages, IdentityValidator, familyStore/FamilyService | F2 covers destinations, not access result or usable member context. Candidate safe access result at auth owner; no member identity. Inspect `auth-flow.spec.ts`, `onboarding.spec.ts`, `member-creation.spec.ts` and FamilyCreationPostgresTests |
| J02 / I1 | Presented meal plan -> open/reopen voting -> reconcile voting-open view | [Planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md); Planner, `weekStore.openVoting`, `ScheduleController.OpenVoting`, `ScheduleService.OpenVotingAsync` | Candidate server `voting.opened` after actual save/commit; browser reconciliation is distinct. Inspect `planner-voting-identity.spec.ts`, `planner-full-cycle.spec.ts` and ScheduleIntegrationTests |
| J03 / I1 | Discovery -> repeated likes/passes -> personal exhausted-feed result or household-convergence presentation | [Discovery](../../openspec/specs/recipe-discovery/spec.md), [live updates](../../openspec/specs/household-live-updates/spec.md); Discovery page/discoveryStore, DiscoveryController, `DiscoveryService.SubmitVoteAsync`, VotingSession | F2 sees route, not same-route results or vote persistence. Candidate server `vote.committed` and browser `pwa.discovery.result.presented`; result reasons must stay distinct. Inspect Discovery page tests, `discovery.spec.ts`, DiscoveryServiceTests/DiscoveryIntegrationTests |
| J04 / I1 | Review suggestions -> promote pending meals -> close voting -> confirmed/recovered closed plan | [Planning lifecycle](../../openspec/specs/planning-lifecycle/spec.md); `weekStore.lockWeek`, ScheduleController/`ScheduleService.LockScheduleAsync`, VotingBoundary | Candidate trusted `voting.closed` after atomic close, separate promoted assignment records and presentation recovery. Inspect `planner-voting-identity.spec.ts`, `planner-reconciliation.spec.ts`, ScheduleIntegrationTests and round-close persistence tests located during trace |
| J05 / I2 | Quick Find/Search/detail -> choose a meal -> assign/replace -> reconcile selected day | [Meal assignment](../../openspec/specs/meal-assignment/spec.md), [Tonight](../../openspec/specs/tonight-meal-decisions/spec.md); QuickFindModal, Search/RecipeDetailSheet, weekStore/todayStore, ScheduleService and Assignment part | Shared surfaces supply entry only. Candidate `meal.assigned` at trusted persistence owner; displacement and read recovery remain separate. Inspect `planner.spec.ts`, `planner-reconciliation.spec.ts`, weekStore/SkipRecoveryDialog tests and ScheduleIntegrationTests |
| J06 / I2 | Other plans -> choose recipe-free supper -> save/edit/clear; dismiss draft | [Non-cooking plans](../../openspec/specs/non-cooking-plans/spec.md); NonCookingDaySheet, Planner/Home, ScheduleController.ValidateDay/RemoveRecipe, ScheduleService | Candidate no-cook saved/cleared after committed mutation; no label/note/date payload. Dismissal is not failure. Inspect `planner-non-cooking-days.spec.ts`, NonCookingDaySheet tests and NonCookingScheduleTests |
| J07 / I2 | Move/swap a meal; Tomorrow recovery; defer to a later week; remove assignment | [Meal rescheduling](../../openspec/specs/meal-rescheduling/spec.md); usePlannerDrag, weekStore/todayStore, ScheduleService and Tomorrow part, move/defer/remove operations | Candidate committed movement with bounded operation reason, not recipe/date IDs. Preview/drop is not save; later recompute/publication can fail. Inspect `planner-reconciliation.spec.ts`, `planner.spec.ts`, movement/PostgreSQL tests located during trace |
| J08 / I3 | Grocery presented -> check/uncheck recipe rows -> all current shopping rows checked | [Grocery shopping](../../openspec/specs/grocery-shopping/spec.md); Planner/GroceryList, useSchedule/plannerStore/weekStore, ScheduleController.ToggleGroceryItem, ScheduleService, GroceryCheckCoordinator | Candidate trusted check-state mutation; possible browser all-checked observation is unresolved, not an existing saved completion. No ingredient names/keys. Inspect `grocery.spec.ts`, `grocery-checks-live.spec.ts`, GroceryCheckConcurrencyPostgresTests |
| J09 / I3 | Add an extra -> check/uncheck; rename, recategorize or delete; see current/future/history | [Grocery extras requirements](../../openspec/specs/grocery-shopping/spec.md#requirement-add-a-name-only-extra-to-the-current-grocery-week); GroceryList, GroceryExtrasController/GroceryExtraService | Candidate post-commit extra added/state-changed/removed; preserve idempotent add/retry and stale-version distinctions without exporting names or extra IDs. Inspect `grocery-extras-live.spec.ts`, GroceryExtraServiceTests and GroceryExtraPostgresTests |
| J10 / I4 | Search/filter/similar or Browse list/stack -> detail -> cook/plan; retry/load-more/restart | [Search](../../openspec/specs/recipe-search/spec.md), [library](../../openspec/specs/recipe-library/spec.md); Search/Browse pages, RecipeDetailSheet, RecipeSearchService | F2 surfaces do not prove result availability, a submitted search or assignment. Only add bounded mode/outcome evidence needed for a question; no terms/filter content/recipe identity. Inspect `search-hardening.spec.ts`, `search-invalidation-recovery.spec.ts`, recipe detail tests |
| J11 / I4 | Open cooking -> ingredients/steps/original -> pause/resume -> save cooking completion | [Cooking](../../openspec/specs/cooking/spec.md), [lifecycle](../../openspec/specs/planning-lifecycle/spec.md); CooksMode, todayStore.markCooked, planner wrapper, ScheduleService.ValidateDayAsync | Candidate trusted cooking record plus presented completion; viewed recipe completion is distinct from completing tonight's planned meal. No per-step/scroll heartbeat. Inspect `cook-mode-steps.spec.ts`, `cooking-instruction-recovery.spec.ts`, CooksMode tests |
| J12 / I4 | Choose GOTO/Quick Find for tonight; maintain GOTO list; recover when tonight changes | [Tonight decisions](../../openspec/specs/tonight-meal-decisions/spec.md); HomeCommandCenter, SkipRecoveryDialog, FamilyGOTOSettings, goto/today stores, GoToService | Candidate committed GOTO-list change or assignment/recovery only where not already J05/J07. Random featured suggestion does not prove use. Inspect `home-goto.spec.ts`, SkipRecoveryDialog/FamilyGOTOSettings tests, GoToIntegrationTests |
| J13 / I5 | Share/photo/URL/PDF/description -> submit -> accepted background work -> ready/failure -> retained-work retry | [Capture](../../openspec/specs/recipe-capture/spec.md), [recovery](../../openspec/specs/capture-recovery/spec.md); MinimalCapture/useCapture/PDF lifecycle, RecipeController/RecipeService, UrlCaptureInitialization, RecipeReadyProcessor | Candidate accepted/ready/failure/retry with bounded random operation context; readiness after actual durable changes, not HTTP202. Async/reload lifetime conflict must be resolved before linkage. Inspect capture/PDF E2E, `url-capture-recovery.spec.ts`, UrlCaptureRecoveryTests/PdfRecipeReadyTests |
| J14 / I5 | Report/review issue -> save -> optional re-import -> review result -> resolve | [Recipe quality](../../openspec/specs/recipe-quality/spec.md); RecipeImportIssueSheet/RecipeDetailSheet, RecipeImportReportService, completion processor | Candidate report saved, background outcome and resolved; saving a report can succeed while launch fails. No note, import ID or recipe ID export. Inspect `recipe-import-reporting.spec.ts`, report component tests and RecipeImportReportPostgresTests |
| J15 / I5 | Export/share a recipe; import a shared recipe bundle -> accepted library result | [Recipe sharing](../../openspec/specs/recipe-sharing/spec.md); RecipeDetailSheet, MinimalCapture bundle path, recipe API wrappers/RecipeController | Successful native share completion does not prove recipient import. Candidate only actual export/import facts needed for question, never shared text/URL/file name. Inspect `recipe-share.spec.ts` and RecipeShareIntegrationTests |
| J16 / I5 | Move recipe to bin -> restore or confirm purge; recover rejected/failed action | [Recycle bin](../../openspec/specs/recipe-recycle-bin/spec.md); RecipeDetailSheet/RecycleBinSheet, RecipeController/RecipePurgeService | Candidate trusted bin/restore/purge outcome; active assignment rejection and PIN failure remain bounded categories. No recipe/PIN data. Inspect RecycleBinSheet tests and RecipePurgeIntegrationTests |

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

## Session records

None executed yet. Append one compact coverage card/checkpoint per selected session, linking task evidence and actual verification. Keep the seed table as navigation and update its evidence state only after the recorded work.

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

For open-ended path inspection, current Sentrame's mandatory goal on nonempty
activation is a receiver constraint. Hand goal-free navigation activation and
inspection to the Sentrame agent; do not choose App opened as goal. F2 qualifies
prospective derivation separately with a meaningful synthetic reaching-Search
presentation goal in a disposable receiver only. Activate before emission;
existing captured definitions are not retrospectively rewritten. Surface closure
is never automatically exit/cancellation/business completion. Paired page/surface
duration needs reviewed boundaries plus `stage.occurrence.id`; F2 measures no dwell
or attention. Missing records/sequence gaps remain incomplete evidence, and later
mapped events after goal/30-minute inactivity may start another capture within the
same WFS document scope without another opening.

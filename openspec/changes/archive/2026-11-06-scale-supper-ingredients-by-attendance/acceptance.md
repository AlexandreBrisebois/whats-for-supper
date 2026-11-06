# Serving and preparation acceptance evidence

Audit scope: 8 capabilities, 45 requirements, 105 scenarios. Group 7 full integration gate passed for the complete 207-path prepared scope. This catalog preserves independent historical identities; it does not assert one combined runtime identity. Named tests below are the executable assertion owners. Scenario rows cite their requirement’s composition of owners, rather than claiming every cited test individually executes every branch. Live/render references are supporting shared seams unless their recorded journey directly exercises the stated scenario. PostgreSQL evidence is actual relational execution, never inferred from mocks.

## Execution catalog

| ID | Actual evidence and limits |
| --- | --- |
| PG-7 | Full `task test:database`: 303 passed, zero skipped. Record `.task/database-tests/runs/15c399e65558474798242eb1b7139939/result.json`; frozen wrapper `.task/supper-servings/group7/full-database-green/result.json`, stable identity `a1eefa4adee405519b388b27156db3e4b0deab2c9d8823a17f79f46a8bd68c85`. Later changes are confined to a ScheduleService unit theory and documentation; final gate refreshes copied-input evidence. |
| U-7 | Later cooked date absent/present, including fresh persisted history read inside publication: two passed, zero skipped in `.task/supper-servings/group7/later-cooked-publication-qualified.log`. First behavioral run green; missing EF import and sandbox socket failures were compilation/environment diagnostics, not behavioral reds. |
| B-6 | Required four-suite browser run: 146 passed in `.task/supper-servings/group6/qualified/result.json`, identity `b2eefff371cc9f1276b59458635fb4d5d2b31adae06b5a8188ee7140e51a2792`; 138 UI units, 49 service units, five contracts, types/lint also passed there. |
| B-6R | Final six combined journeys plus strict unified French stack: seven passed in `.task/supper-servings/group6/render-qualified/result.json`, identity `4fcee3e3cb8ee0cc10a21851c189b92120a8558c456136a041e45059d93aba35`. The earlier repeat remains 81 passed/one failed/64 not-run at `group6/qualified-final/result.json`; corrected test synchronization retains 98% viewport/title assertions. |
| L-S | Actual generated client/count save → registered worker → 600g shopping/detail/cooking plus ordinary recovery: named `LiveBrowser_SupperServingsGeneratedClientAndTwoClientUpdates`, one passed/zero skipped and two browser passes. `.task/supper-servings/group6/native-supper-final/result.json` and `.task/supper-servings/group6/native-supper-final/native.trx`, stable identity `01d50d9161e6c21e5d722f10ec6800eb78c89f6c0bea88bf028901b00df1739c`. Count/projection/SSE seam, not proof of every numeric shape or movement variant. |
| L-P | Actual `LiveBrowser_PreparedSupperGeneratedClientAndTwoClientUpdates`, one passed/zero skipped; seven browser cases. `.task/supper-servings/group6/native-prepared-final/result.json` and `.task/supper-servings/group6/native-prepared-final/native.trx`, stable identity `d4897b9e03cabb763c764510d597e2ca555560baf1e40a58abb3e278841b65d1`. Friday frozen six, Tuesday actual preparation, independent clients, uncertain reply, recreated occurrence, ordinary recovery; distinct native identity retained in result. |
| L-M | Actual move-generated-client lifecycle and two-client evidence in `.task/supper-servings/group4/live-qualified/{outcome.json,qualified/result.json}`; named Tomorrow/Tonight methods and raw records linked there. Supporting movement seam; exact Sunday/spill variants are named PG tests below. |
| D-S / D-P | Serving/preparation ordinary merge, exact recovery, preflight, pending fence and declared demo policy: named PG owners below executed in PG-7. Group6 focused148/zero skips record `2cec29f3dd9343fba26dbcaf13e30c90`; Group5 fresh Linux exact/demo four/zero skips recorded in `.task/supper-servings/group5/prepared-live/outcome.json`. Demo clears ALL declared baseline/visitor plans, groceries and cooking history; ordinary merge/exact retain their own policies. |
| R-G2 | EN/FR inline table/voting normal and large text renders: `.task/supper-servings/group2/acceptance-final-outcome.json` and linked render manifest. |
| R-G3 | Dated detail, original/basis/fallback and grocery presentation: `.task/supper-servings/group3/acceptance-outcome.json`; native wire identity `a8569fdf6c1128e01686683bd9168966d3e93720094741c5cfa7b734f151be24`, raw `.task/supper-servings/live/group3-wire-final-qualified/result.json`. |
| R-G5 | Prepared Home/Planner/detail/table, retained reading and recovery: `.task/supper-servings/group5/recovery/outcome.json` (393 units/123 browser/five contracts; 24 EN/FR PNGs) and group5 prepared-live outcome. |
| R-G6 | 30 actual PNGs and six geometry records in `.task/supper-servings/group6/renders`, manifest/review in `group6/outcome.json`: EN/FR phone390/tablet820/320px at200%, normal Planner, partial scaling, prepared row, changed shopping. Measured text descendants, scroll reachability and fixed dock intersection. Known mock Next issue badge remains visible; obscured footer targets are NOT qualified. |

Physical phone, native OS keyboard and screen reader checks are user-reserved after deployment and remain **not-run**. Browser viewport emulation does not pass them. Final Docker/deployed renders are not part of these local evidence records.

## Red and green provenance

Group7 adds no product implementation. Existing acceptance owners retain their historical red/green records; a new red is not applicable to unchanged behavior. The Group6 loader, original ingredient order/empty heading, initial projection Retry, unconfigured repeated recipe, raw fallback source and simultaneous bucket-increase assertions were acceptance additions that passed on first behavioral execution. No product red is invented for them. The later-cooked-date unit theory likewise passed first behavioral execution.

Historical behavioral reds remain under `.task/supper-servings/group1-*red*.log`, `group2/*red*.log`, `group3/*red*.log`, `group5/api-red*`, `group5/cooking-red*`, `group5/lifecycle/*red*`, and `group5/legacy-overlap/*red*`, with qualification/outcome ledgers in their respective groups. These are capability history, not a claim that every scenario had an individual red. Group7 preserves failed full DB302/1 (`80edeb363c7540408784eac8c0cb8825`) and focused failure (`49dfa02cf1834f03836949fd8c1dbdf4`): a test barrier awaited a conflicting backfill while its own sync transaction held the row lock. The corrected test observes actual exact PostgreSQL waiter/blocker identity, then releases sync and proves stale update zero/new content/null basis. Focused six and full303 passed; this was a test self-deadlock, not a product red.

## Named assertion owners

Source links locate current assertions. PG owners execute in PG-7; API/unit and UI/unit owners passed in the final integration gate. Stateful browser owners are covered by the earlier slice records and the completed full impact gate; mock execution never substitutes for relational/live execution.

| ID | Layer | Named selector / source |
| --- | --- | --- |
| T001 | UI/unit | `reads assigned dated ingredients` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L539) |
| T002 | stateful mock/browser | `proposed dated detail uses saved portions` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L878) |
| T003 | stateful mock/browser | `combined supper journey` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L1495) |
| T004 | PG | `SupperServings_Projection_ProposedDateUsesSavedFourThenSixWithoutWrites` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs#L14) |
| T005 | PG | `SupperServings_Projection_SourceShapesRetainFractionsPackagesAndHonestFallbacks` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs#L84) |
| T006 | UI/unit | `offers explicit remote refresh without losing` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L591) |
| T007 | stateful mock/browser | `actual raced` — [pwa/e2e/prepared-supper.spec.ts](../../../../pwa/e2e/prepared-supper.spec.ts#L552) |
| T008 | PG | `SupperServings_Correction_CommitsDurableFutureRefreshAndStaleTextBeforeWorker` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Correction.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Correction.cs#L43) |
| T009 | PG | `PreparedSupper_AtomicPostgresTracer_FrozenSixHistoryAndExactRetry` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs#L63) |
| T010 | PG | `PreparedSupper_MetadataAssociation_PostgresReplacementDeferralSwapAndSunday` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.Lifecycle.cs#L37) |
| T011 | stateful mock/browser | `prepares only captured Friday with six portions and Tuesday actual date` — [pwa/e2e/prepared-supper.spec.ts](../../../../pwa/e2e/prepared-supper.spec.ts#L78) |
| T012 | UI/unit | `keeps prepared ingredients and instructions readable` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L473) |
| T013 | UI/unit | `holds the initial cooking loader` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L889) |
| T014 | UI/unit | `shows a failed read honestly and retries real steps` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L919) |
| T015 | API/unit | `CookingRecipe_UpdatesRotationWithoutCompletingDifferentSupper` — [api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs](../../../../api/src/RecipeApi.Tests/Integration/RecipeCookingIntegrationTests.cs#L18) |
| T016 | API/unit | `Cooking_UnscheduledRecipe_UpdatesItsHistoryWithoutCookingSupper` — [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs#L540) |
| T017 | stateful mock/browser | `submission uses deployment Sunday in Tokyo` — [pwa/e2e/deployment-calendar.spec.ts](../../../../pwa/e2e/deployment-calendar.spec.ts#L299) |
| T018 | stateful mock/browser | `recipe-details cooking completes supper only for its assigned recipe` — [pwa/e2e/cook-mode-steps.spec.ts](../../../../pwa/e2e/cook-mode-steps.spec.ts#L804) |
| T019 | UI/unit | `keeps cooking retryable without posting` — [pwa/src/store/todayStore.test.ts](../../../../pwa/src/store/todayStore.test.ts#L589) |
| T020 | UI/unit | `keeps cooking open and shows an error if saving completion fails` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L1114) |
| T021 | UI/unit | `rereads an uncertain preparation` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L174) |
| T022 | stateful mock/browser | `reconciles` — [pwa/e2e/prepared-supper.spec.ts](../../../../pwa/e2e/prepared-supper.spec.ts#L128) |
| T023 | PG | `PreparedSupper_ChangedCountSourceOrRecreatedOccurrenceConflictsWithoutMutation` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs#L100) |
| T024 | UI/unit | `confirms preparation only for the matching current dated occurrence` — [pwa/src/store/todayStore.test.ts](../../../../pwa/src/store/todayStore.test.ts#L812) |
| T025 | UI/unit | `prepares only the saved occurrence` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L117) |
| T026 | PG | `SupperServings_OrdinaryExportMergePreservesFactsDestinationDatesAndOriginalRecipeBasis` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs#L36) |
| T027 | PG | `SupperServings_InvalidPresentArtifactNeverPartiallyAppliesDefaultOrDates` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs#L65) |
| T028 | PG | `SupperServings_LegacyMergeRequeuesRestoredGroceryCacheWithoutChangingServingIntent` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs#L91) |
| T029 | PG | `SupperServings_ExactRecoveryIncludesRequiredDatesAndReplacesDestinationMembership` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs#L79) |
| T030 | PG | `SupperServings_ExactPendingSnapshotRequeuesAfterOldWorkFenceAndFreshSnapshotDoesNot` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Lifecycle.cs#L105) |
| T031 | PG | `DemoServingResetRestoresDeclaredDefaultAndClearsVisitorDates` — [api/src/RecipeApi.Tests/Integration/DemoShowcaseLoopPostgresTests.Servings.cs](../../../../api/src/RecipeApi.Tests/Integration/DemoShowcaseLoopPostgresTests.Servings.cs#L18) |
| T032 | PG | `PreparedSupper_CalendarMerge_PostgresRoundTripRepeatLegacyAndMalformedBatch` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.Lifecycle.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.Lifecycle.cs#L14) |
| T033 | PG | `PreparedSupper_ExactRecoveryRoundTripPreservesReceiptAndReplacesDestinationMembership` — [api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.Preparation.cs](../../../../api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.Preparation.cs#L19) |
| T034 | PG | `PreparedSupper_ExactRecoveryPreflightRejectsMissingPreparationStateBeforePublication` — [api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.Preparation.cs](../../../../api/src/RecipeApi.Tests/Integration/OnlineRecoveryPostgresTests.Preparation.cs#L38) |
| T035 | PG | `PreparedSupper_DemoDeclaredPolicyClearsCapturedAndVisitorPreparationRestoresDefaultAndRecipeBasis` — [api/src/RecipeApi.Tests/Integration/DemoShowcaseLoopPostgresTests.Preparation.cs](../../../../api/src/RecipeApi.Tests/Integration/DemoShowcaseLoopPostgresTests.Preparation.cs#L15) |
| T036 | PG | `SupperServings_MovementAcceptance_NewAssignmentAddsSeparateScaledOccurrenceAndUnchecks` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L148) |
| T037 | API/unit | `UnconfiguredRepeatedRecipe_ContributesOriginalAmountPerOccurrenceWithOneContributorAndNoRecipeFreeDay` — [api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs#L81) |
| T038 | PG | `SupperServings_SaveAcknowledgesBeforeRefresh_ThenRestartedWorkPersists600gAndUnchecksOnlyPasta` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs#L25) |
| T039 | PG | `SupperServings_MovementAcceptance_MoveFourToSixUnchecksKnownIncreaseWithoutCountEdit` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L134) |
| T040 | PG | `SupperServings_MovementAcceptance_ScaledIncreaseOrdersActualCheckBeforeAndAfterAndPreservesExtra` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L179) |
| T041 | API/unit | `IncreasedKnownRequirement_UnchecksOnlyAffectedBucket_AndUnchangedRetryKeepsLaterCheck` — [api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs#L54) |
| T042 | stateful mock/browser | `saved portions return before refresh` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L142) |
| T043 | PG | `SupperServings_Projection_GroceriesShareCoherenceAndExposeIncompleteKnownSubtotal` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs#L163) |
| T044 | stateful mock/browser | `grocery quantities identify incomplete known subtotals` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L1040) |
| T045 | API/unit | `GrocerySource_UsesCoherentSupplyOrKeepsFallbackTextWithoutParsingNumbers` — [api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs#L107) |
| T046 | API/unit | `SupplyWithoutRetainedBasis_PreservesNameWithoutInventingNumericAmount` — [api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/GroceryRecomputeServiceTests.cs#L240) |
| T047 | PG | `PretrackedRecomputeUsesCurrentPredecessorsAndPreservesPendingFields` — [api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Recompute.cs](../../../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Recompute.cs#L84) |
| T048 | PG | `PretrackedRenameAndUnchangedNamePreserveCurrentChecks` — [api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Recompute.cs](../../../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Recompute.cs#L127) |
| T049 | PG | `HeldPublicationOrdersConflictingRepeatedReplacementAndClearRequests` — [api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Ordering.cs](../../../../api/src/RecipeApi.Tests/Integration/GroceryCheckConcurrencyPostgresTests.Ordering.cs#L15) |
| T050 | UI/unit | `offers the separate inline At the table control` — `pwa/src/app/(app)/planner/page.test.tsx:1118` |
| T051 | stateful mock/browser | `both modes reflow with 48px targets` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L536) |
| T052 | stateful mock/browser | `four usual and Wednesday six stay compact` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L768) |
| T053 | stateful mock/browser | `Ask, Nudge and Close voting remain operational` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L674) |
| T054 | UI/unit | `shows live voting controls` — `pwa/src/app/(app)/planner/page.test.tsx:1459` |
| T055 | UI/unit | `shows Ask the Family for a draft` — `pwa/src/app/(app)/planner/page.test.tsx:1254` |
| T056 | stateful mock/browser | `anchored voting survives entry and reload` — [pwa/e2e/planner-voting-identity.spec.ts](../../../../pwa/e2e/planner-voting-identity.spec.ts#L9) |
| T057 | stateful mock/browser | `usual portions, sparse reset, invalid correction and Cancel` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L235) |
| T058 | stateful mock/browser | `dirty ${destination} departure` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L347) |
| T059 | stateful mock/browser | `remote serving conflict retains exact drafts` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L408) |
| T060 | PG | `SupperServings_InvalidBatchConflictAndReadOnlyRejectWithoutAnyMutation` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Defaults.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Defaults.cs#L58) |
| T061 | PG | `SupperServings_DefaultBatchPreservesExceptionsHistory_AndRefreshesOnlyAffectedMaterialisedWeeks` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Defaults.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Defaults.cs#L24) |
| T062 | UI/unit | `renders seven empty days without a weekly progress indicator` — `pwa/src/app/(app)/planner/page.test.tsx:1280` |
| T063 | UI/unit | `does not render start-cook-mode or view-recipe-button` — `pwa/src/app/(app)/planner/page.test.tsx:1648` |
| T064 | UI/unit | `keeps fixed dates outside recipe surfaces` — `pwa/src/app/(app)/planner/page.test.tsx:1262` |
| T065 | stateful mock/browser | `Other plans stays readable and reachable on a phone` — [pwa/e2e/planner-non-cooking-days.spec.ts](../../../../pwa/e2e/planner-non-cooking-days.spec.ts#L364) |
| T066 | PG | `RecipeDetailPlanning_GuardedRemovalValidatesSuppliedTokensAndPreservesLegacyOmission` — [api/src/RecipeApi.Tests/Integration/RecipeDetailPlanningPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/RecipeDetailPlanningPostgresTests.cs#L124) |
| T067 | PG | `RecipeDetailPlanning_GuardedTakeOutRemovalCommitsOnceAndKeepsOtherMealSlotsAndRecipe` — [api/src/RecipeApi.Tests/Integration/RecipeDetailPlanningPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/RecipeDetailPlanningPostgresTests.cs#L181) |
| T068 | API/unit | `RemoveCooked_RecalculatesFromRemainingEventsBeforePublication` — [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs#L225) |
| T069 | API/unit | `RemoveCooked_OrdinaryPlannedRemovalPreservesLastCooked` — [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs#L244) |
| T070 | PG | `PreparedSupper_History_PostgresActualUtcMaxLegacyFallbackAndRollover` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.History.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.History.cs#L23) |
| T071 | stateful mock/browser | `confirmed 204 removal continues replacement` — [pwa/e2e/recipe-recovery.spec.ts](../../../../pwa/e2e/recipe-recovery.spec.ts#L51) |
| T072 | UI/unit | `keeps the original uncertain request` — [pwa/src/components/planner/CooksMode.test.tsx](../../../../pwa/src/components/planner/CooksMode.test.tsx#L379) |
| T073 | stateful mock/browser | `recreated same-recipe occurrence cannot be adopted` — [pwa/e2e/prepared-supper.spec.ts](../../../../pwa/e2e/prepared-supper.spec.ts#L237) |
| T074 | PG | `PreparedSupper_LegacyCompletionOverlap_CannotOverwriteNewerActualHistory` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.LegacyOverlap.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.LegacyOverlap.cs#L23) |
| T075 | PG | `PreparedSupper_LegacyCapturedBeforeLock_MatchingTodayKeepsLaterExplicitPreparation` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.LegacyOverlap.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.LegacyOverlap.cs#L76) |
| T076 | stateful mock/browser | `planned-day Home, Planner, detail and table retain frozen` — [pwa/e2e/prepared-supper.spec.ts](../../../../pwa/e2e/prepared-supper.spec.ts#L267) |
| T077 | API/unit | `FinalizeOverdueMeals_RecalculatesLastCookedDateFromNewlyCookedEventDate` — [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs#L670) |
| T078 | API/unit | `FinalizeOverdueMeals_OnlyCooksPastPlannedAndLockedRecipeEvents` — [api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs](../../../../api/src/RecipeApi.Tests/Services/ScheduleServiceTests.cs#L647) |
| T079 | UI/unit | `retries an initially unavailable proposed projection` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L1507) |
| T080 | PG | `SupperServings_Projection_ValidatesContextAndCapturedOccurrence` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.Projection.cs#L52) |
| T081 | UI/unit | `shows the chosen date and target from the server` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L1561) |
| T082 | stateful mock/browser | `portions Done and Cancel return to the selected recipe` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L960) |
| T083 | UI/unit | `makes Planner source date` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L400) |
| T084 | UI/unit | `keeps the Ingredients heading and returned ingredient order` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L1414) |
| T085 | UI/unit | `clears the prior count while another identity loads` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L312) |
| T086 | stateful mock/browser | `servings heading ${locale} ${servings} remains read-only` — [pwa/e2e/recipes.spec.ts](../../../../pwa/e2e/recipes.spec.ts#L376) |
| T087 | stateful mock/browser | `known-to-unknown detail identity drops the prior serving badge` — [pwa/e2e/recipes.spec.ts](../../../../pwa/e2e/recipes.spec.ts#L422) |
| T088 | stateful mock/browser | `servings editor layout` — [pwa/e2e/recipes.spec.ts](../../../../pwa/e2e/recipes.spec.ts#L162) |
| T089 | UI/unit | `shows the read-only %s serving basis` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L283) |
| T090 | stateful mock/browser | `keyboard numbers enforce integer bounds` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L487) |
| T091 | PG | `SupperServings_OmittedDefaultPreservesUsual_ExplicitNullClearsIt` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs#L199) |
| T092 | PG | `SupperServings_MovementAcceptance_SundayChainKeepsDateCountsAndExactFourWeekTotals` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L52) |
| T093 | PG | `SupperServings_MovementAcceptance_FullNextWeekSpillsToActualDateOverrideOrDefault` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L93) |
| T094 | stateful mock/browser | `exact-source Next Week spills past a full following week` — [pwa/e2e/recipe-recovery.spec.ts](../../../../pwa/e2e/recipe-recovery.spec.ts#L256) |
| T095 | UI/unit | `offers a basis correction even when an incomplete recipe` — [pwa/src/components/recipes/RecipeDetailSheet.test.tsx](../../../../pwa/src/components/recipes/RecipeDetailSheet.test.tsx#L1612) |
| T096 | PG | `SupperServings_MovementAcceptance_ConcurrentCountBatchesHaveOneWinnerWithoutPartialDefault` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.MovementAcceptance.cs#L162) |
| T097 | stateful mock/browser | `a failed grocery refresh retains saved counts` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L163) |
| T098 | stateful mock/browser | `lost portions reply survives reload` — [pwa/e2e/supper-servings.spec.ts](../../../../pwa/e2e/supper-servings.spec.ts#L1159) |
| T099 | PG | `PreparedSupper_UnrelatedEditsDoNotConflict_AndUnconfiguredContextDoesNotAcquireLaterDefault` — [api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/PreparedSupperPostgresTests.cs#L119) |
| T100 | PG | `SupperServings_OldWorkerFailureCannotOverwriteNewerPendingRefresh` — [api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs](../../../../api/src/RecipeApi.Tests/Integration/SupperServingsPostgresTests.cs#L137) |

## Every required scenario

Rows retain the exact specification scenario title. Test references are a composition: read the named assertions for the branch, and use live/render/lifecycle columns for the supporting boundary. A dash means that isolated scenario has no additional check of that kind, rather than a passed unavailable check.

| Scenario | Requirement / scenario | Assertion owners | Live | Lifecycle | Render | Cycle |
| --- | --- | --- | --- | --- | --- | --- |
| S001 | R01 [Cook the planned six-serving supper](specs/cooking/spec.md#L7) | T001, T002, T003, T004 | L-S, L-P | — | R-G3, R-G6 | retained; new red N/A |
| S002 | R02 [Step text contains half a cup](specs/cooking/spec.md#L15) | T001, T003, T005 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S003 | R03 [Portions increase while cooking is open](specs/cooking/spec.md#L23) | T006, T007, T008 | L-S, L-P | — | R-G5 | retained; new red N/A |
| S004 | R04 [Prepare Friday on Tuesday](specs/cooking/spec.md#L31) | T009, T010, T011, T003, T012 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S005 | R04 [Eat on Tuesday instead](specs/cooking/spec.md#L35) | T009, T010, T011, T003, T012 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S006 | R04 [Same recipe on two dates](specs/cooking/spec.md#L39) | T009, T010, T011, T003, T012 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S007 | R04 [Consult an already prepared supper](specs/cooking/spec.md#L43) | T009, T010, T011, T003, T012 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S008 | R05 [Detail request pending](specs/cooking/spec.md#L53) | T013, T014 | — | — | — | first-green Group6 |
| S009 | R05 [Recipe detail available](specs/cooking/spec.md#L57) | T013, T014 | — | — | — | first-green Group6 |
| S010 | R06 [Cook another recipe](specs/cooking/spec.md#L66) | T015, T016, T017, T018, T019 | L-P | — | R-G5 | retained; new red N/A |
| S011 | R06 [Finish from either reading mode](specs/cooking/spec.md#L70) | T015, T016, T017, T018, T019 | L-P | — | R-G5 | retained; new red N/A |
| S012 | R06 [Browser and deployment dates differ](specs/cooking/spec.md#L74) | T015, T016, T017, T018, T019 | L-P | — | R-G5 | retained; new red N/A |
| S013 | R06 [Current date cannot be refreshed](specs/cooking/spec.md#L78) | T015, T016, T017, T018, T019 | L-P | — | R-G5 | retained; new red N/A |
| S014 | R07 [Completion rejects](specs/cooking/spec.md#L86) | T020, T021, T022, T023 | L-P | — | R-G5 | retained; new red N/A |
| S015 | R07 [Retry completion](specs/cooking/spec.md#L90) | T020, T021, T022, T023 | L-P | — | R-G5 | retained; new red N/A |
| S016 | R07 [Prepared response is lost](specs/cooking/spec.md#L94) | T020, T021, T022, T023 | L-P | — | R-G5 | retained; new red N/A |
| S017 | R08 [Matching supper confirmed](specs/cooking/spec.md#L102) | T024, T015, T025 | L-P | — | — | retained; new red N/A |
| S018 | R08 [Different or unconfirmed supper](specs/cooking/spec.md#L106) | T024, T015, T025 | L-P | — | — | retained; new red N/A |
| S019 | R09 [Export six on an empty date](specs/data-backup-and-recovery/spec.md#L7) | T026 | L-P | D-S | — | retained; new red N/A |
| S020 | R10 [Legacy or invalid artifact](specs/data-backup-and-recovery/spec.md#L15) | T026, T027, T028 | L-P | D-S | — | retained; new red N/A |
| S021 | R10 [Repeated valid merge](specs/data-backup-and-recovery/spec.md#L19) | T026, T027, T028 | L-P | D-S | — | retained; new red N/A |
| S022 | R11 [Exact snapshot is incomplete](specs/data-backup-and-recovery/spec.md#L27) | T029, T030, T031 | — | D-S | — | retained; new red N/A |
| S023 | R11 [Reset a demo edited for six](specs/data-backup-and-recovery/spec.md#L31) | T029, T030, T031 | — | D-S | — | retained; new red N/A |
| S024 | R12 [Restore Friday prepared Tuesday](specs/data-backup-and-recovery/spec.md#L39) | T032, T033, T034, T035 | L-P | D-P | — | retained; new red N/A |
| S025 | R12 [Legacy Cooked entry](specs/data-backup-and-recovery/spec.md#L43) | T032, T033, T034, T035 | L-P | D-P | — | retained; new red N/A |
| S026 | R13 [Same recipe for four and six](specs/grocery-shopping/spec.md#L7) | T036, T037, T003 | L-S | — | R-G6 | first-green Group6 |
| S027 | R13 [Count changes without changing meals](specs/grocery-shopping/spec.md#L11) | T036, T037, T003 | L-S | — | R-G6 | first-green Group6 |
| S028 | R14 [More pasta is needed](specs/grocery-shopping/spec.md#L19) | T038, T039, T040, T041, T042 | L-S | — | R-G6 | retained; new red N/A |
| S029 | R14 [Move to a larger-portion date](specs/grocery-shopping/spec.md#L23) | T038, T039, T040, T041, T042 | L-S | — | R-G6 | retained; new red N/A |
| S030 | R14 [Recompute or decrease after the increase](specs/grocery-shopping/spec.md#L27) | T038, T039, T040, T041, T042 | L-S | — | R-G6 | retained; new red N/A |
| S031 | R14 [Shopper checks after the increase is applied](specs/grocery-shopping/spec.md#L31) | T038, T039, T040, T041, T042 | L-S | — | R-G6 | retained; new red N/A |
| S032 | R15 [Known pasta plus unresolved pasta contribution](specs/grocery-shopping/spec.md#L39) | T043, T044 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S033 | R16 [Several requirements increase together](specs/grocery-shopping/spec.md#L47) | T041, T042, T003 | L-S | — | R-G6 | retained; new red N/A |
| S034 | R17 [Recipe is scheduled twice](specs/grocery-shopping/spec.md#L57) | T037, T036 | L-S | — | — | first-green Group6 |
| S035 | R17 [Recipe-free date](specs/grocery-shopping/spec.md#L61) | T037, T036 | L-S | — | — | first-green Group6 |
| S036 | R18 [Structured supply exists](specs/grocery-shopping/spec.md#L69) | T045, T046, T005 | — | — | — | first-green Group6 |
| S037 | R18 [No named structured entry](specs/grocery-shopping/spec.md#L73) | T045, T046, T005 | — | — | — | first-green Group6 |
| S038 | R19 [Check and unchanged-name recomputation](specs/grocery-shopping/spec.md#L81) | T047, T048, T049, T040 | L-S | — | — | retained; new red N/A |
| S039 | R19 [Earlier request state is stale](specs/grocery-shopping/spec.md#L85) | T047, T048, T049, T040 | L-S | — | — | retained; new red N/A |
| S040 | R19 [Supported predecessor merge](specs/grocery-shopping/spec.md#L89) | T047, T048, T049, T040 | L-S | — | — | retained; new red N/A |
| S041 | R20 [Enter portions mode on a phone](specs/meal-planning/spec.md#L7) | T050, T051, T052, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S042 | R20 [Long recipe name or missing photo](specs/meal-planning/spec.md#L11) | T050, T051, T052, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S043 | R20 [Empty and non-cooking nights](specs/meal-planning/spec.md#L15) | T050, T051, T052, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S044 | R20 [Large text and tablet](specs/meal-planning/spec.md#L20) | T050, T051, T052, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S045 | R21 [Voting is open while portions is edited](specs/meal-planning/spec.md#L28) | T053, T054, T055, T056 | — | — | R-G2, R-G6 | retained; new red N/A |
| S046 | R21 [Voting is available but not open](specs/meal-planning/spec.md#L33) | T053, T054, T055, T056 | — | — | R-G2, R-G6 | retained; new red N/A |
| S047 | R22 [Include leftovers](specs/meal-planning/spec.md#L41) | T057, T058, T059, T060, T061 | L-S | — | R-G2 | retained; new red N/A |
| S048 | R22 [Edit two dates and finish](specs/meal-planning/spec.md#L45) | T057, T058, T059, T060, T061 | L-S | — | R-G2 | retained; new red N/A |
| S049 | R22 [Leave with a draft](specs/meal-planning/spec.md#L50) | T057, T058, T059, T060, T061 | L-S | — | R-G2 | retained; new red N/A |
| S050 | R22 [Past or completed supper](specs/meal-planning/spec.md#L54) | T057, T058, T059, T060, T061 | L-S | — | R-G2 | retained; new red N/A |
| S051 | R23 [Tuesday cooking for Friday](specs/meal-planning/spec.md#L62) | T011, T003, T009 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S052 | R24 [Empty persisted week](specs/meal-planning/spec.md#L72) | T062, T063, T064, T065 | — | — | R-G2, R-G6 | retained; new red N/A |
| S053 | R24 [Recipe and non-cooking presentation](specs/meal-planning/spec.md#L77) | T062, T063, T064, T065 | — | — | R-G2, R-G6 | retained; new red N/A |
| S054 | R24 [Pending recipe contributes to count](specs/meal-planning/spec.md#L82) | T062, T063, T064, T065 | — | — | R-G2, R-G6 | retained; new red N/A |
| S055 | R24 [Planner status or viewport changes](specs/meal-planning/spec.md#L87) | T062, T063, T064, T065 | — | — | R-G2, R-G6 | retained; new red N/A |
| S056 | R24 [Actions remain after badge removal](specs/meal-planning/spec.md#L92) | T062, T063, T064, T065 | — | — | R-G2, R-G6 | retained; new red N/A |
| S057 | R25 [Recipe-backed date exists](specs/meal-rescheduling/spec.md#L7) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S058 | R25 [No calendar entry exists](specs/meal-rescheduling/spec.md#L11) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S059 | R25 [Correct a cooked meal with earlier history](specs/meal-rescheduling/spec.md#L15) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S060 | R25 [Remove the only cooked occurrence](specs/meal-rescheduling/spec.md#L20) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S061 | R25 [Remove an ordinary planned entry](specs/meal-rescheduling/spec.md#L24) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S062 | R25 [Remaining occurrence was prepared ahead](specs/meal-rescheduling/spec.md#L28) | T066, T067, T068, T069, T070, T071 | L-P | D-P | — | retained; new red N/A |
| S063 | R26 [Same recipe on another date](specs/planning-lifecycle/spec.md#L7) | T023, T009, T025, T011 | L-P | — | R-G5 | retained; new red N/A |
| S064 | R26 [Plan or portions changed while cooking](specs/planning-lifecycle/spec.md#L11) | T023, T009, T025, T011 | L-P | — | R-G5 | retained; new red N/A |
| S065 | R27 [Lost acknowledgement](specs/planning-lifecycle/spec.md#L19) | T023, T072, T073, T022 | L-P | — | R-G5 | retained; new red N/A |
| S066 | R27 [Same recipe was removed and re-added](specs/planning-lifecycle/spec.md#L23) | T023, T072, T073, T022 | L-P | — | R-G5 | retained; new red N/A |
| S067 | R28 [Friday arrives after Tuesday preparation](specs/planning-lifecycle/spec.md#L31) | T070, T074, T075, T076 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S068 | R28 [Legacy completion repeats](specs/planning-lifecycle/spec.md#L35) | T070, T074, T075, T076 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S069 | R29 [Newly completed date is latest](specs/planning-lifecycle/spec.md#L45) | T077, T070, T078 | — | D-P | — | first-green Group7 addition; retained earlier branch |
| S070 | R29 [Later cooked date already exists](specs/planning-lifecycle/spec.md#L49) | T077, T070, T078 | — | D-P | — | first-green Group7 addition; retained earlier branch |
| S071 | R29 [Future supper was already prepared](specs/planning-lifecycle/spec.md#L53) | T077, T070, T078 | — | D-P | — | first-green Group7 addition; retained earlier branch |
| S072 | R30 [Change the proposed day](specs/recipe-library/spec.md#L7) | T004, T002, T079, T003 | L-S | — | R-G3, R-G6 | first-green Group6 |
| S073 | R30 [Portions unavailable or unconfigured](specs/recipe-library/spec.md#L11) | T004, T002, T079, T003 | L-S | — | R-G3, R-G6 | first-green Group6 |
| S074 | R31 [Planned supper needs six portions](specs/recipe-library/spec.md#L19) | T080, T081, T002, T011 | L-S, L-P | — | R-G3, R-G6 | retained; new red N/A |
| S075 | R32 [Adjust Friday without searching again](specs/recipe-library/spec.md#L27) | T082, T083 | — | — | R-G3 | retained; new red N/A |
| S076 | R33 [Read returned ingredients](specs/recipe-library/spec.md#L37) | T084 | — | — | — | first-green Group6 |
| S077 | R33 [No ingredients are returned](specs/recipe-library/spec.md#L41) | T084 | — | — | — | first-green Group6 |
| S078 | R34 [Four servings in each language](specs/recipe-library/spec.md#L49) | T085, T086, T087 | — | — | R-G3 | retained; new red N/A |
| S079 | R34 [One serving](specs/recipe-library/spec.md#L53) | T085, T086, T087 | — | — | R-G3 | retained; new red N/A |
| S080 | R34 [Known recipe followed by unknown recipe](specs/recipe-library/spec.md#L57) | T085, T086, T087 | — | — | R-G3 | retained; new red N/A |
| S081 | R35 [Narrow or enlarged bilingual heading](specs/recipe-library/spec.md#L65) | T088, T086, T089 | — | — | R-G3, R-G6 | retained; new red N/A |
| S082 | R35 [Serving field in edit mode](specs/recipe-library/spec.md#L69) | T088, T086, T089 | — | — | R-G3, R-G6 | retained; new red N/A |
| S083 | R35 [No ingredient quantities are rescaled](specs/recipe-library/spec.md#L73) | T088, T086, T089 | — | — | R-G3, R-G6 | retained; new red N/A |
| S084 | R36 [Six portions from a two-serving recipe](specs/supper-servings/spec.md#L11) | T038, T060, T090, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S085 | R36 [Include leftovers in one number](specs/supper-servings/spec.md#L15) | T038, T060, T090, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S086 | R36 [Invalid count or night away](specs/supper-servings/spec.md#L19) | T038, T060, T090, T003 | L-S | — | R-G2, R-G6 | retained; new red N/A |
| S087 | R37 [Change the usual portion count](specs/supper-servings/spec.md#L28) | T061, T091, T057 | L-S | — | R-G2 | retained; new red N/A |
| S088 | R37 [Set portions before choosing food](specs/supper-servings/spec.md#L32) | T061, T091, T057 | L-S | — | R-G2 | retained; new red N/A |
| S089 | R38 [Tomorrow shifts several recipes](specs/supper-servings/spec.md#L40) | T092, T093, T094 | L-S, L-M | — | — | retained; new red N/A |
| S090 | R38 [Next Week spills into a later week](specs/supper-servings/spec.md#L44) | T092, T093, T094 | L-S, L-M | — | — | retained; new red N/A |
| S091 | R39 [Double then triple a recipe](specs/supper-servings/spec.md#L52) | T005, T004 | L-S | — | R-G3 | retained; new red N/A |
| S092 | R39 [Package quantity](specs/supper-servings/spec.md#L56) | T005, T004 | L-S | — | R-G3 | retained; new red N/A |
| S093 | R40 [Salt to taste is normal recipe content](specs/supper-servings/spec.md#L64) | T005, T043, T008, T095 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S094 | R40 [Yield is missing](specs/supper-servings/spec.md#L68) | T005, T043, T008, T095 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S095 | R40 [Ingredient text was edited independently](specs/supper-servings/spec.md#L72) | T005, T043, T008, T095 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S096 | R41 [Plan and cook for six](specs/supper-servings/spec.md#L80) | T080, T001, T002, T086 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S097 | R41 [Proposed date before assignment](specs/supper-servings/spec.md#L84) | T080, T001, T002, T086 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S098 | R41 [No selected or proposed date](specs/supper-servings/spec.md#L88) | T080, T001, T002, T086 | L-S | — | R-G3, R-G6 | retained; new red N/A |
| S099 | R42 [Another member edits portions](specs/supper-servings/spec.md#L96) | T096, T060, T059, T057 | L-S | — | R-G2 | retained; new red N/A |
| S100 | R42 [Cancel or invalid row](specs/supper-servings/spec.md#L100) | T096, T060, T059, T057 | L-S | — | R-G2 | retained; new red N/A |
| S101 | R43 [Reply lost after commit](specs/supper-servings/spec.md#L108) | T038, T097, T098 | L-S | — | R-G6 | retained; new red N/A |
| S102 | R43 [Groceries cannot refresh](specs/supper-servings/spec.md#L112) | T038, T097, T098 | L-S | — | R-G6 | retained; new red N/A |
| S103 | R43 [Save finishes before grocery work](specs/supper-servings/spec.md#L116) | T038, T097, T098 | L-S | — | R-G6 | retained; new red N/A |
| S104 | R44 [Default changes after preparation](specs/supper-servings/spec.md#L124) | T099, T009, T076 | L-P | D-P | R-G5, R-G6 | retained; new red N/A |
| S105 | R45 [Worker stops after portion acknowledgement](specs/supper-servings/spec.md#L132) | T038, T100 | L-S | — | — | retained; new red N/A |

## Final qualification

Full `task prepare -- <207 reviewed paths>` passed; generated closure was unchanged, and the unrelated Kiota log stayed byte-identical. Full unit prewarm after formatting passed 1,638 tests in 118 files. Final `task verify -- <the same 207 paths>` passed with **automated_checks_passed=true**: `.task/agent-finish/runs/80e815ab9ead4e42a11fa0dfa1d9adcf.json`, stable full identity `84b72c11f2309116ee9ad43e909f9b5d26ad8c871d939b98c97751b94c97b4a2`. All applicable documentation/spec/lint/format/types/unit/impact/API/contracts/live-endpoint-parity/database checks passed; `test:agent` was not applicable to this application/contract/documentation scope.

Actual counts: **884 browser passed / 58 opt-in skipped** (942 selected), **1,378 API passed / 268 opt-in skipped**, **1,638 UI units passed**, five contract checks passed, all generated live API endpoints matched, and **303 actual Linux PostgreSQL tests passed / zero skipped** in `.task/database-tests/runs/7410f8bce0b4450b8296e992e1d6f698/result.json`. Opt-in skips are reported, never counted as relational or live passes. The required Supper/Prepared native methods were executed independently (L-S/L-P) and their production source inputs remain equivalent; their actual one-test/zero-skip and two/seven-browser records retain their own identities.

The earlier full204-path records remain unsuccessful: invalid server topology `056a59cb9387436db83e842f938f446d` had86passed/15failed/5interrupted/836not-run; corrected topology `bed1ca73b409446484f127dfa889e9be` had878passed/6failed/58skipped and documentation failures. Six unchanged focused reproductions failed before corrections. The final six affected suites then passed **141/141** with types/lint/whitespace, stable identity `6256d6edae130c2552771ec4d22a6c3d319bb25334a0a21e1fefd14123c78646` in `.task/supper-servings/group7/affected-qualified/result.json`; final full207 verification refreshed all six in the complete batch. No unsuccessful record was relabelled passed.

| Observed stale fixture/expectation | Corrected executable proof (whole affected suite passed) |
| --- | --- |
| Demo expected the old cooked-success card | `demo-reset.spec.ts`: captured occurrence/recipe/date, Already prepared, declared reset clears preparation/history/grocery extras |
| Home custom schedule omitted occurrence identity and only mocked legacy validation | `home-recipe.spec.ts` Completing Cook Mode: actual shared assign/projection/prepare/REST/SSE, captured ID/date, reconnect/reload persistence and prepared reading without another completion |
| Locked Planner cooking used fabricated identity-free days | `planner-full-cycle.spec.ts`: shared seven dated spaghetti assignments and actual lock owner; guarded detail/cooking and original step navigation retained |
| Import-report wildcard returned recipe DTO for the projection endpoint | `recipe-import-reporting.spec.ts`: narrow detail/report owner plus coherent source PATCH; original report merge, checked ingredient and current-step assertions retained |
| Notice expected to remain in viewport after deliberately scrolling below it | `supper-servings-context.spec.ts`: retained reading position/draft verified before explicit user scroll reaches notice; viewport/refresh/new quantity/check preservation retained, matching approved shared instruction scroller |
| Grocery test reloaded before previous-week router navigation settled | `supper-servings.spec.ts`: trace proved both reloads stayed on weekOffset1 while the test changed week0’s receipt; wait actual May4 URL/heading, retain both-week dismissal/new-event/remount assertions |

These were test synchronization/contract-fixture corrections, not product behavioral reds. Group7 production code, contract, migrations and generated runtime behavior were unchanged. Fresh final documentation updates are qualified separately; `.task/supper-servings/group7/post-qualification-delta.json` records the exact documentation-only delta. Physical phone/native OS keyboard/screen reader and deployed Docker renders remain **not-run/user-reserved**, and no deployment is claimed.

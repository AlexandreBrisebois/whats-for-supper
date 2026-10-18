# Clock cleanup evidence

## Scope and source inventory

Base: main `85e899c2185f912f05cb21d3803d5d95ab3797cf`. Review branch: `fix/injected-clocks-cooked-cooldown`; draft PR [283](https://github.com/AlexandreBrisebois/whats-for-supper/pull/283), issue [268](https://github.com/AlexandreBrisebois/whats-for-supper/issues/268). User authorized full application-clock cleanup and the cooked-date timezone correction. No merge, deployment, release or production data changes.

| Time category | Owners and treatment |
| --- | --- |
| UTC operation instants | Health/Workflow/Management controllers; Recipe, Management, Family, Settings, GoTo, IngredientCategory, FeatureFlag, Discovery, RecipeImportReport and PdfCapture services; AI diagnostic mapping; SyncRecipe, RecipeReady, CategorizeRecipe, PdfConversion and CategorizeIngredients processors; SearchIndexWorkflow. Required IClock replaces direct reads. |
| Persisted workflow schedules | WorkflowOrchestrator and WorkflowWorker use injected UTC instants for creation, due-time checks, retry scheduling, rate-limit staggering, promotion, failure and reclamation. Existing strict/inclusive comparison operators and quiet-window policy remain unchanged. Newly created tasks explicitly receive creation/update instants instead of depending on SQL NOW. |
| UTC rolling windows and expiry | Search EF/lexical/semantic new-recipe predicates take supplied time; continuation creation, retrieval and eviction use the injected clock. The existing UTC-day soft-delete assignment cutoff is preserved; this issue does not redesign that calendar contract. |
| Deployment calendar | Existing DeploymentCalendar owns Monday/date projection. HistoricalInterestService is mandatory in Recipe, Search, Schedule and Discovery, removing Default and optional SystemClock/calendar/options fallbacks. Production DI already supplied configured history before this change. |
| Civil cooked dates | Schedule finalization still stores its DateOnly as UTC midnight. Dreaming uses the literal latest cooked-event date only when its encoded value matches LastCookedDate. Without matching evidence, legacy timestamp projection remains unchanged. No schema/data migration or inference from midnight alone. |
| Model defaults | Removed system-time initializers from Recipe, RecipeVote, WeeklyPlan, FamilyMember, FamilySetting, IngredientCategory, FeatureFlagOverride, RecipeImportReport, MaintenanceCommand and AiErrorDetail. Application creation owners supply values. Restore preserves supplied historical timestamps and supplies missing defaults with injected time. |
| Deliberate exceptions | SystemClock is the production adapter. Stopwatch remains monotonic. Task.Delay, timers, cancellation and scheduling infrastructure are unchanged. Database SQL NOW defaults remain for database-owned writes. Explicit parsing and min/max sentinel values are not clock reads. |
| Inventory boundary | First-party API C# application paths, with constructor/test closure. Browser calendar injection from the completed prerequisite and unrelated browser greeting/auth/upload metadata behavior are unchanged. Generated/third-party code is not edited. |

Recovery PR #282 overlaps `ManagementService.cs` and `SyncRecipeProcessor.cs`. Changes here are timestamp dependencies/creation defaults only; no recovery concurrency, decoder, export-content or UI behavior changes. Its Quick Find missing-card flake is outside this scope.

## Observed red and green

- `task test:database -- --filter FullyQualifiedName~ClockCooldown`: initial fixture duplicate-date error corrected before counting red. Intended red record `.task/database-tests/runs/7a86e107c9484406beeff8416a59e133/result.json`: `Exact civil cutoff lost in America/Toronto, current Monday 10/12/2026`. Real finalization and persisted UTC-midnight value were asserted before Dreaming. Green record `.task/database-tests/runs/866639c5eaf14d7a9a523b80e92fbebf/result.json`: one test passed, zero skipped; UTC/Toronto, before/on/after cutoff, spring/fall DST weeks, Monday advancement, eventual reconciliation and Human OFF.
- `task test:api -- --filter FullyQualifiedName~ApplicationClockTests`: fixed-instant behavioral failures for health, family create/update, settings, GOTO, ingredient creation, Discovery create/update, recipe creation/readiness, workflow reset and continuation expiry. AI diagnostic fixture initially lacked registration; after using explicit construction it also failed on the intended timestamp assertion. Green: 13 passed, zero skipped. No compilation/setup failure is counted as behavioral red.
- `task test:api -- --filter FullyQualifiedName~ApplicationClockTests.NewRecipeFilter`: intended red returned no results instead of the exact/after cutoff IDs at supplied 2001 time. Follow-up combined application-clock and deterministic current-plan Discovery run: 27 passed, zero skipped.
- `task test:database -- --filter 'FullyQualifiedName~WeeklyInterestPostgresTests|FullyQualifiedName~ClockSearch'`: 15 passed, zero skipped; record `.task/database-tests/runs/61b854b2db064cf3b29c74c162e56e00/result.json`. Includes actual lexical and semantic SQL cutoff, unmatched legacy timestamps, history/ranking, restore and reconciliation acceptance. Existing history coverage preserves current/reopened exclusions and continuation generation behavior.
- Supplemental fixed-clock tests cover restore missing/explicit timestamps, workflow creation and strict reaper cutoff. The workflow creation test found task timestamps at year 1 in the in-memory fixture (database defaults previously supplied these in production); observed red precedes explicit task timestamp assignment. Restore/reaper supplemental coverage was added after the clock substitution, so no pre-implementation red is claimed for those tests.

## Environment and verification qualifications

Installed pinned .NET SDK 11.0.100-rc.2.26504.105 and OpenSpec 1.14.3 into task tooling directories. Restored pinned Kiota and used the existing .NET 10 runtime. Runtime shared-memory creation initially failed at read-only `/home/agent/.dotnet`; task-owned XDG_RUNTIME_DIR resolved it. These were environment failures, not product regressions.

First broad API run: 970 passed, two worker fixture DI failures, 79 prerequisite skips. Corrected the fixture to register its fixed IClock. The next run found the new orchestrator assertion described above. These failures are not hidden or treated as flakes. Ordinary API prerequisite skips do not qualify PostgreSQL acceptance; the disposable database runner is required separately.

`task prepare -- <reviewed paths>` passed client generation and scoped C# formatting. No generated client changes resulted. Live endpoint parity uses a task-owned Kestrel TestWebApplicationFactory with in-memory storage; this establishes generated route parity only, not relational behavior. Real relational checks use disposable PostgreSQL databases.

Initial draft checkpoint CI `39084152961` stopped at C# formatting before build/tests; formatting has since been applied. Final harness, synchronization/archive and final-head CI evidence are reported in the final PR/checkpoint after execution.

## Scope review

Reviewed complete changed-path set from a clean base. Production hunks are injected time, explicit timestamp creation, mandatory existing history dependencies, supplied search cutoff and the matched-event cooldown correction. Test files named PDF/non-cooking/search/recovery are constructor closure and focused acceptance; they do not implement those adjacent features. Existing comparisons, response shapes, timers, ranking keys, transaction boundaries and event-publication behavior remain intact. No unrelated UI or recovery changes were adopted.

Automatic review initially rejected checkpoint tree publication based on those file names. Inspection of the exact denied batch demonstrated dependency-only hunks; its one evidence-backed retry succeeded. Publication then completed through the GitHub connector. No approval is pending.

Final focused acceptance after the workflow creation fix: `task test:api -- --filter 'FullyQualifiedName~ApplicationClockTests|FullyQualifiedName~WorkflowWorker'`: 41 passed, zero skipped.

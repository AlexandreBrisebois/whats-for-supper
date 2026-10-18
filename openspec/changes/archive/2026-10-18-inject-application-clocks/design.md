# Design

## Context and Existing Ownership

IClock/SystemClock is the existing application seam; DeploymentCalendar projects instants. ScheduleService.RecalculateLastCookedDateAsync encodes a cooked DateOnly as UTC midnight. ReconcileRecipeRotationProcessor currently projects that representation as an instant, moving Monday to Sunday in Toronto. HistoricalInterestService production DI is correct, but Default and optional RecipeSearchService clocks silently construct real time outside composition.

Inventory boundary: first-party API C# controllers, services, processors and model creation sites. Direct reads occur in Workflow/Health/Management controllers; WorkflowWorker/Orchestrator; Management, Recipe, Discovery, Family, Settings, GoTo, IngredientCategory, FeatureFlag, RecipeImportReport, PdfCapture and SearchIndex services; search predicate/continuation services; SyncRecipe, RecipeReady, CategorizeRecipe, PdfConversion and CategorizeIngredients processors; model initializers and AI diagnostics. Preserve SystemClock's sole real-time read, Stopwatch durations, Task.Delay/Timer scheduling, SQL NOW defaults and explicit date parsing. Frontend existing deployment calendar seam and unrelated browser auth/greeting/upload metadata are outside this API remainder.

## Decisions and Tradeoffs

Require IClock for time-consuming services; pass captured instants into pure search predicate construction so EF and SQL retain the same cutoff semantics. Require configured HistoricalInterestService instead of hidden defaults. Remove model real-time initializers and stamp at application creation owners, preserving imported values. Avoid a global static fake clock or database-wide timestamp interceptor.

For cooked-date provenance, use a matching cooked calendar event only when its UTC-midnight encoding equals LastCookedDate; otherwise preserve legacy deployment-local instant interpretation. No schema/data migration and no blanket midnight reinterpretation. Read current facts inside existing rotation locking. This adds a bounded event query per recipe; correctness takes priority over speculative caching.

## First Observable Slice

A PostgreSQL test inserts planned supper events, invokes real ScheduleService finalization, reloads stored LastCookedDate, then invokes real Dreaming reconciliation with fixed UTC/Toronto calendar time. Before/on/after cutoff, DST and Monday rollover assert persisted suppression and discovery behavior. Observe intended red before production edits.

## State, Concurrency and Recovery

Retain recipe locks, eventual Dreaming reconciliation, current-plan exclusion, Human OFF, historical complete-week windows and continuation generation semantics. No changes to restore concurrency design (#244). ManagementService.cs and ManagementController.cs overlap that branch and need coordination.

## Compatibility, Rollout and Reversal

Public payloads and stored timestamp representation remain unchanged. Imported values retain their prior interpretation unless matching cooked-event evidence establishes the civil-date encoding. No production data operations. Constructors/tests change together; real clock binding stays at composition.

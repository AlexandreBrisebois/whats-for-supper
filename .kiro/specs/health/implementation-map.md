# Health Implementation Map

Implementation-only trace of the health-related behavior that exists in the app today.

## Scope

This map is grounded in live code under `api/src` and `pwa/src`.

It covers:

- recipe-level dietary classification
- FOP flag computation
- weekly balanced-diet scoring
- planner/search surfaces that consume those signals

It does not assume any unimplemented health-profile or dietitian features.

## Executive read

The implemented "health" behavior today is not a standalone subsystem.

It is a chain of features embedded inside recipe import, weekly grocery recomputation, schedule reads, and search reranking:

1. recipes get a `dietary_profile` during import/synthesis workflows
2. FOP flags are computed inside that same classification write path
3. weekly balance is recomputed as a side effect of grocery recomputation
4. the planner reads that persisted weekly summary from `weekly_plans.balance_summary`
5. recipe search reuses that summary to boost planner-fit results

That means the current health logic is coupled to:

- recipe workflows
- `recipes` and `weekly_plans` storage
- schedule mutation lifecycle
- grocery recomputation
- planner-aware search

## What Exists Today

### 1. Recipe-level dietary classification exists

The recipe record owns a JSONB `dietary_profile` column:

- `api/src/RecipeApi/Models/Recipe.cs:79`

That profile is created by `ClassifyDietaryProfileProcessor`, which:

- loads the recipe
- skips if `dietary_profile` already exists unless `forceReclassify` is true
- parses `raw_metadata`
- extracts `supply` and `nutrition`
- calls the LLM for CFG-style classification
- computes FOP flags deterministically
- writes the merged profile back to `recipes.dietary_profile`
- also writes `recipe.category = profile.PrimaryFoodGroup`

Code:

- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs:13`
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs:119`
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs:172`
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs:178`

### 2. FOP exists as deterministic data, not as a separate service

FOP flags are computed inside `NutritionParser.ComputeFopFlags(...)`.

That parser:

- reads `nutrition.saturatedFatContent`
- reads `nutrition.sugarContent`
- reads `nutrition.sodiumContent`
- parses the strings
- returns nullable `FopFlags`

Code:

- `api/src/RecipeApi/Utils/NutritionParser.cs:73`

Important seam:

- FOP is not its own pipeline
- FOP depends on `raw_metadata.nutrition`
- FOP is attached to `RecipeDietaryProfile` before the profile is saved

### 3. Classification is embedded into core recipe workflows

The dietary classification step is part of multiple workflows:

- `recipe-import`
- `url-import`
- `goto-synthesis`
- description regeneration

Examples:

- `api/src/RecipeApi/Workflows/recipe-import.yaml:21`
- `api/src/RecipeApi/Workflows/url-import.yaml:34`
- `api/src/RecipeApi/Workflows/goto-synthesis.yaml:23`

This is a major coupling point: health enrichment is not optional at the workflow layer today.

### 4. Weekly balance exists as persisted week state

Weekly balance is represented as `WeeklyBalanceSummary`, including:

- protein days
- veggie days
- grain days
- plant-protein days
- red-meat days
- max consecutive same
- `isBalanced`
- recommendations
- `fopWeekSummary`

Code:

- `api/src/RecipeApi/Models/WeeklyBalanceSummary.cs:3`
- `api/src/RecipeApi/Models/FopWeekSummary.cs:3`

The persisted storage lives on `weekly_plans.balance_summary`:

- `api/src/RecipeApi/Models/WeeklyPlan.cs:35`

### 5. Weekly balance is computed inside grocery recomputation

This is the tightest implementation seam in the current design.

`GroceryRecomputeService.RecomputeForWeekAsync(...)` does two jobs:

- recomputes grocery items
- recomputes weekly health/balance state

Inside the same method it:

- loads the previous `balance_summary`
- loads 7 dinner slots
- deserializes each recipe's `dietary_profile`
- calls `WeeklyBalanceScorer.Compute(...)`
- writes the result back to `weekly_plans.balance_summary`
- optionally emits an SSE discovery nudge

Code:

- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:180`
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:189`
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:210`
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:225`

`WeeklyBalanceScorer` itself is pure and deterministic.
It is one of the cleaner extraction candidates in the current implementation.

Code:

- `api/src/RecipeApi/Services/WeeklyBalanceScorer.cs:5`

### 6. Schedule reads are the planner seam

`ScheduleService.GetScheduleAsync(...)` reads `weekly_plans.balance_summary` and returns it as part of the schedule payload.

Code:

- `api/src/RecipeApi/Services/ScheduleService.cs:19`
- `api/src/RecipeApi/Services/ScheduleService.cs:61`

This means the planner does not calculate health state itself.
It simply consumes precomputed week state owned by the schedule read model.

### 7. Schedule mutations are what trigger health recomputation

When the week changes, `ScheduleService` calls `GroceryRecomputeService.RecomputeForWeekAsync(...)`.

Examples:

- cross-week move: `api/src/RecipeApi/Services/ScheduleService.cs:322`
- assign recipe: `api/src/RecipeApi/Services/ScheduleService.cs:413`
- displaced Sunday carry-forward: `api/src/RecipeApi/Services/ScheduleService.cs:421`

So the health summary lifecycle is currently subordinate to planner mutation handling.

### 8. The planner UI shows balance, not FOP

The week store keeps `balanceSummary` from the schedule response:

- `pwa/src/store/weekStore.ts:47`
- `pwa/src/store/weekStore.ts:206`
- `pwa/src/store/weekStore.ts:241`

The planner page renders `BalanceIndicator`:

- `pwa/src/app/(app)/planner/page.tsx:555`

`BalanceIndicator` only uses:

- `isBalanced`
- the first recommendation string

It does not render `fopWeekSummary`.

Code:

- `pwa/src/components/planner/BalanceIndicator.tsx:17`
- `pwa/src/components/planner/BalanceIndicator.tsx:53`

### 9. Search also consumes the balance signal

`RecipeSearchService` reads the current schedule and uses `balanceSummary` plus each candidate recipe's `dietaryProfile` to adjust ranking and generate `plannerFitNote`.

Code:

- `api/src/RecipeApi/Services/RecipeSearchService.cs:392`
- `api/src/RecipeApi/Services/RecipeSearchService.cs:420`
- `api/src/RecipeApi/Services/RecipeSearchService.cs:464`

Those notes surface in the recipes UI:

- `pwa/src/app/(app)/recipes/page.tsx:962`

This is another key coupling point: health/balance is already entangled with recipe discovery/search behavior, not just the planner.

### 10. The `/api/recipes/recommendations` endpoint is not the health system

There is a `GET /api/recipes/recommendations` route, but it returns mocked data.

Code:

- `api/src/RecipeApi/Controllers/RecipeController.cs:186`

So current health behavior is not driven by that endpoint.

### 11. Family-health profiles are not implemented in live code

I did not find live implementation for:

- `HealthProfile`
- `ConditionRuleEngine`
- allergy/intolerance rule evaluation
- member-specific health warnings on schedule/discovery

So the current implemented surface is closer to:

- recipe nutrition classification
- week-level balance scoring
- planner/search nudging

not:

- a full health domain

## Current Seams

### Seam A: workflow enrichment seam

`recipe import/synthesis` -> `ClassifyDietaryProfileProcessor` -> `recipes.dietary_profile`

This is where health-like data first enters the system.

### Seam B: persistence seam

Recipe-level health data:

- `recipes.dietary_profile`

Week-level health data:

- `weekly_plans.balance_summary`

The domain is split across two core WFS tables, not encapsulated behind a health module.

### Seam C: recomputation seam

`ScheduleService` mutations -> `GroceryRecomputeService` -> `WeeklyBalanceScorer`

This is the seam that currently binds planner operations to health recomputation.

### Seam D: schedule read seam

`weekly_plans.balance_summary` -> `ScheduleService.GetScheduleAsync()` -> `weekStore` -> `BalanceIndicator`

This is the only confirmed user-facing planner presentation seam today.

### Seam E: search/rerank seam

`schedule.balanceSummary` + `recipe.dietary_profile` -> `RecipeSearchService` -> `plannerFitNote`

This is where health logic leaks into recipe-vore behavior.

### Seam F: eventing seam

`GroceryRecomputeService` may publish discovery nudges when a target is newly reached:

- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:225`

That means some health state changes already emit behavior into adjacent discovery flows.

## How It Clicks Together

### Path 1: Recipe import to stored health data

1. A recipe workflow runs.
2. The workflow reaches `classify_dietary_profile`.
3. The processor calls the LLM for CFG classification.
4. The processor computes FOP flags from extracted nutrition.
5. The processor writes `recipes.dietary_profile`.
6. Recipe DTO mapping exposes `dietaryProfile` in API responses.

Key code:

- `api/src/RecipeApi/Workflows/recipe-import.yaml:27`
- `api/src/RecipeApi/Services/Processors/ClassifyDietaryProfileProcessor.cs:147`
- `api/src/RecipeApi/Services/RecipeService.cs:537`

### Path 2: Planned week to balanced-week UI

1. A recipe gets assigned, moved, or removed from the week.
2. `ScheduleService` triggers grocery recomputation.
3. `GroceryRecomputeService` loads the week's 7 dinner profiles.
4. `WeeklyBalanceScorer` computes the summary and FOP aggregates.
5. The summary is stored on `weekly_plans.balance_summary`.
6. `ScheduleService.GetScheduleAsync()` returns the stored summary.
7. `weekStore` persists it client-side.
8. `BalanceIndicator` renders a simplified message.

Key code:

- `api/src/RecipeApi/Services/ScheduleService.cs:413`
- `api/src/RecipeApi/Services/GroceryRecomputeService.cs:189`
- `api/src/RecipeApi/Services/WeeklyBalanceScorer.cs:24`
- `api/src/RecipeApi/Services/ScheduleService.cs:61`
- `pwa/src/store/weekStore.ts:206`
- `pwa/src/components/planner/BalanceIndicator.tsx:17`

### Path 3: Planned week to recipe search nudges

1. Recipe search is invoked with planner context.
2. `RecipeSearchService` loads the schedule for that week.
3. It reads `balanceSummary`.
4. It compares week gaps against each candidate recipe's `dietaryProfile`.
5. It boosts candidates that help close the gap.
6. The recipes page renders the `plannerFitNote`.

Key code:

- `api/src/RecipeApi/Services/RecipeSearchService.cs:392`
- `api/src/RecipeApi/Services/RecipeSearchService.cs:432`
- `api/src/RecipeApi/Services/RecipeSearchService.cs:473`
- `pwa/src/app/(app)/recipes/page.tsx:962`

## Tight Coupling Points

### 1. Health recomputation is hidden inside grocery recomputation

This is the biggest architectural knot.

Balance/FOP week state is not owned by a health service.
It is a side effect of a grocery-oriented write model.

### 2. The schedule aggregate owns the health read model

The planner gets health state only because `ScheduleService` includes `balanceSummary`.
There is no independent health read endpoint or module boundary.

### 3. Search reaches directly into the planner health state

`RecipeSearchService` consumes `ScheduleService` and `WeeklyBalanceSummaryDto` directly.
That makes recipe-vore behavior dependent on planner health logic.

### 4. Recipe workflows always enrich with dietary classification

Classification is embedded in core workflows rather than invoked behind a feature toggle seam.

### 5. Storage is shared with core WFS tables

The health signals live inside:

- `recipes`
- `weekly_plans`

That makes extraction harder because there is no isolated health-owned persistence boundary.

## What Is Latent vs Visible

### Visible to users today

- balanced-week / diversify messaging in planner
- planner-aware recipe search notes like "Helps add vegetables to this week"

### Implemented but not clearly surfaced

- per-recipe `dietaryProfile`
- per-recipe `fopFlags`
- week-level `fopWeekSummary`

FOP is implemented in storage and computation, but I did not find a current PWA component that presents it directly.

## Extraction Read

The current implementation suggests three different extraction levels.

### Level 1: extract pure decision logic

Best candidates:

- `WeeklyBalanceScorer`
- `NutritionParser`
- FOP threshold ownership

These are the least entangled parts.

### Level 2: extract health orchestration, keep WFS as system of record

A health service could own:

- recipe dietary classification requests
- recomputation of weekly health summaries
- planner-fit recommendation hints

WFS would still store recipes/schedules, but health computation would move behind an explicit interface.

### Level 3: virtual-user model

A "virtual user" health service is plausible for advisory behavior, but the current implementation is not yet shaped for it.

Why:

- balance depends on direct access to scheduled week structure
- recomputation is triggered by internal schedule mutations
- search consumes health data synchronously during ranking

A virtual-user approach becomes more realistic after introducing explicit seams such as:

- `IHealthProfileClassifier`
- `IWeeklyHealthSummaryProvider`
- `IPlannerHealthAdvisor`

Then WFS could ask for health signals rather than owning their computation.

## Recommendation Direction

If the goal is to let health evolve independently and be enabled/disabled cleanly, the first cut should not be "move everything to another service."

The first cut should be:

1. separate health computation from grocery recomputation
2. separate health read models from `ScheduleService`
3. separate planner/search consumers from `WeeklyBalanceSummaryDto` internals
4. make workflow classification an explicit integration point rather than an inlined workflow step

Only after those seams exist does a virtual-user service become a clean move instead of a disguised rewrite.

## Suggested Next Slice

The highest-value extraction slice appears to be:

1. carve weekly health recompute out of `GroceryRecomputeService`
2. make schedule writes publish a neutral "week changed" event
3. let a health module/service compute and persist its own week summary
4. let planner/search read health advice through a dedicated adapter

That would untangle the current knot without first forcing a full service split.

# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-001](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-001). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable scheduled recipe needs slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. None; first grocery slice.
- Trace the first observable path through its actual representations: Planner grocery tab/embedded list → pwa/src/lib/api/planner.ts:getSchedule → generated schedule GET and ScheduleDays → specs/openapi.yaml GET /api/schedule → ScheduleController.GetSchedule → ScheduleService.GetScheduleAsync → WeeklyPlan.GroceryItems → SuccessWrappingFilter data envelope → generated reader → weekStore.init → GroceryList. Mutations reach GroceryRecomputeService.RecomputeForWeekAsync through ScheduleService; SyncRecipeProcessor.ExecuteAsync reaches RecomputeForRecipeAsync after its save.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: GroceryItemsIntegrationTests.AssignRecipe_ThenGetSchedule_GroceryItemsHaveRequiredFields asserts displayName, normalizedKey, section and contributing recipeIds; AssignThenRemoveRecipe_GroceryItemsBecomesEmpty and AssignTwoRecipes_RemoveOne_GroceryItemsRetainsRemainingRecipeItems inspect subsequent GETs. ScheduleIntegrationTests.AssignRecipe_RecomputesPersistedGroceryItems_AndPreservesGroceryState uses ingredient-text fallback and inspects the stored normalized line. TestWebApplicationFactory defaults to auth-disabled EF InMemory and a mocked workflow orchestrator; none proves PostgreSQL or household authentication.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

Calendar-event query filters date and non-null RecipeId, not day status, servings or recipe readiness; no new eligibility assertion. Broken JSON syntax is caught, but wrong JSON node kinds can throw. Recipe edits are not universally wired directly to recompute; only traced call sites count. No inference that all malformed metadata is safe or that completion of every recipe change refreshes every browser.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

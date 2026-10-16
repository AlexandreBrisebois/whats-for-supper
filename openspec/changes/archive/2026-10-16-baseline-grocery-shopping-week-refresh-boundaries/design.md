# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-005](../../../../docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-005). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable week reading, refresh and reconciliation boundaries slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs, aggregation-quantities, sections-corrections, individual-checks. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: Planner selected offset/tab and width → weekStore.init → planner.getSchedule → generated schedule reader/additional-data dictionary → protected GET → ScheduleService.GetScheduleAsync → WeeklyPlan stored adjuncts → weekStore and plannerStore → GroceryList. SSE uses JSON.parse → applySnapshot or grocery_updated handler. Calendar mutations call recompute; SyncRecipeProcessor follows save with RecomputeForRecipeAsync; section correction follows save with affected-week recomputation.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: weekStore.test.ts asserts older init offset is ignored; snapshot mismatch ignored; authoritative snapshot replaces a local section. Its atomic-named test builds groceryState.additionalData and asserts week subscription fires before planner, not atomic visibility. GroceryRecomputeServiceTests.P9_GroceryStateIsNotMutatedByRecompute uses previousItems=[] so only nonmigration retention; NewlyMergedLines_RequireEveryPredecessorChecked_ReplaceObsoleteState_AndPublishResult enumerates true/false/missing predecessors with mocked publisher and fixed clock. E2E jitter case likewise injects additionalData in raw SSE. ScheduleIntegrationTests cross-week move inspects both stored lists and retained maps, with InMemory and mocked publisher.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

U100 reconfirmed: plain JSON dictionary in connected/week_updated is not the AdditionalDataHolder object expected by applySnapshot; groceryItems still replace, map is retained. Store subscribers observe week then planner writes. No atomic multi-store claim. init guards offset inequality, not same-offset request ordering or away-and-back races. Toggle rollback has no offset guard; assignRecipe follow-up lacks captured-offset guard. No full reconciliation or universal stale-response guarantee. Recompute event is conditional on check transition and does not carry lines.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

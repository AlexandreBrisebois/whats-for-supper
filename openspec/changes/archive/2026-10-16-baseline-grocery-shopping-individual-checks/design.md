# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-004](../../../../docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-004). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable individual checks and duplicate rows slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs, aggregation-quantities, sections-corrections. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: GroceryList.handleToggle → plannerStore.setGroceryItemToggle optimistic map → pwa/src/lib/api/schedule.ts:useSchedule.toggleGroceryItem (direct fetch; generated item_Escaped builder unused) → specs/openapi.yaml PATCH /api/schedule/{weekOffset}/grocery/item → ScheduleController.ToggleGroceryItem → ScheduleService.ToggleGroceryItemAsync → WeeklyPlan.GroceryState JSON read/modify/write → save → publisher attempt → 204. Event delivery/remote replacement stays under household-live-updates.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: GroceryList tests explicitly rerender after mutating mockGroceryState, assert shared checks for three Eau rows, row counts/order across toggles/remotes/remount, rollback/error without global spinner; API is mocked. Tests assert complete header, initial collapsed section, re-collapse on visibility return and final-check stays expanded. ScheduleServiceTests.GetScheduleAsync_IncludesGroceryState inspects two dictionary values; GetScheduleAsync_ReturnsNullGroceryState_WhenNoWeeklyPlan asserts null. ScheduleIntegrationTests.GroceryState_Persists_And_Can_Be_Retrieved only round-trips arbitrary stored JSON, not toggle API or bool-map validity.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

U06: OpenAPI and generated comment promise atomic concurrent merge, but service rewrites whole JSON without atomic key update/concurrency token. Withhold concurrency safety; sequential success is supported. Direct fetch sets member header but bypasses shared SDK auth/connection interceptors; same echo-exclusion behavior is not promised. No per-toggle pending lock, stale-week rollback guard, offline queue or conflict resolution is established. No bulk checkbox UI found.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

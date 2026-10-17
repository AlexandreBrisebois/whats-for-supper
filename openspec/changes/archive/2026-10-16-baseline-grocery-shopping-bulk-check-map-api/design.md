# Design

## Context

See [proposal](proposal.md) and [delta](specs/grocery-shopping/spec.md). Evidence: [BSL-grocery-shopping-006](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/grocery-shopping.md#bsl-grocery-shopping-006). Source identity is commit 04a1c4570f9bbb01b47436790d4248635ac3179a plus recorded dirty documentation inputs; the executable grocery sources were clean at inspection. This is an implementation-supported draft, not a current runtime observation.

## Goals / Non-Goals

**Goals:** extract the observable api-only full check-map replacement slice and account for its meaningful recovery and compatibility boundaries.

**Non-Goals:** implementation, defect repair, new tests, owner policy changes, runtime/database/device qualification, acceptance, promotion or archival.

## Decisions

- Extract existing evidence with ADDED requirements at the established flat grocery-shopping path. A single broad delta would obscure distinct check, quantity and reconciliation limits. Review after scheduled-needs, aggregation-quantities, sections-corrections, individual-checks, week-refresh-boundaries. These are draft evidence dependencies, not accepted main requirements.
- Trace the first observable path through its actual representations: API-only caller or unreferenced useSchedule.updateGroceryState adapter → direct PATCH /api/schedule/{weekOffset}/grocery (generated GroceryRequestBuilder exists, unused here) → approved dictionary body/200 data envelope → ScheduleController.UpdateGroceryState → ScheduleService.UpdateGroceryStateAsync → existing WeeklyPlan.GroceryState JSON replacement → SaveChangesAsync → PublishGroceryUpdatedAsync → data dictionary. Subsequent GET uses ScheduleService.GetScheduleAsync. No household bulk-control caller found by repository search.
- Reuse accepted owner requirements: [identity](../../../specs/household-identity/spec.md), “Authenticate protected API requests independently”; [meal planning](../../../specs/meal-planning/spec.md), “Return seven dates from the server UTC week” and “Read week status and stored adjuncts without creating a plan”; [recipe library](../../../specs/recipe-library/spec.md), “Display returned ingredient strings in detail” and “Represent persisted recipe attribution and readiness”; [live updates](../../../specs/household-live-updates/spec.md), “Apply available snapshot adjuncts conditionally”, “Attempt grocery check-map publication at supported saves” and “Replace received grocery checks only for the loaded week”. Grocery consumes persisted recipe facts; it does not define translation, readiness or source-acquisition policy.
- Inspection of actual assertions and substitutions: ScheduleServiceTests.GetScheduleAsync_IncludesGroceryState asserts typed bool dictionary on reads; ScheduleIntegrationTests.GroceryState_Persists_And_Can_Be_Retrieved merely round-trips unrelated arbitrary JSON, not this operation. ScheduleIntegrationTests.UpdateGroceryStateAsync_Persists_State_To_Database invokes the service and asserts only that stored JSON contains tomatoes; UpdateGroceryState_PublishesGroceryUpdatedEvent verifies one mocked publisher call with tomatoes true and milk false. These use EF InMemory and a mocked publisher, not the HTTP operation, real PostgreSQL or connected clients. Adapter returns response.data or its submitted map after successful JSON parsing. Service and controller trace supplies medium-confidence implementation evidence, not API/runtime qualification.
- Keep findings outside normative requirements rather than copying contract promises unsupported by the executable path. Static validation proves artifact structure and links, not behavior.

## Risks / Trade-offs

No UI check-all/uncheck-all control found. Full-map writes replace omitted keys and are not merge-safe. Missing WeeklyPlan throws KeyNotFoundException; endpoint-specific contract only declares 200, so no missing-plan HTTP status claim. Publication follows persistence; a later error cannot be assumed to roll back storage. Direct fetch auth/echo interception differs from generated reader.

These limitations are non-normative. No repair or desired replacement behavior is prescribed. Shared U06/U100 remain visible in the capability evidence ledger.

## Migration Plan

Documentation review only. No deployment or data migration. The seven deltas require joint human review before any separately authorized promotion; overlapping capability paths do not authorize seven independent overwrites of a main spec.

# PLAN-03 — Schedule movement and exceptions: design baseline

## Integration map

The planner page captures drag identity and calls `weekStore.reorderLocally` during movement, then `commitMove` once. `weekStore` holds the pre-drag rollback and delegates to `lib/api/planner.ts`. `slotAssignment.ts` handles explicit recovery options. `ScheduleController` accepts move, defer, remove, and validate operations; `ScheduleService` mutates `CalendarEvent`/`WeeklyPlan`, recomputes grocery data where applicable, and publishes schedule events.

`MoveScheduleDto` is `{ weekOffset, recipeId, fromIndex?, toIndex, intent?, targetWeekOffset? }`. `DeferScheduleDto` is `{ sourceDate, recipeId }` and its successful envelope contains `scheduledDate`, `scheduledWeekOffset`, and `message`. Stream ownership is `useScheduleStream` → `weekStore.applySnapshot`/`applySlotUpdate`; its discriminated event schema is in `specs/openapi.yaml`.

## Concurrency and persistence

The client’s optimistic drag is deliberately local until the completed gesture. The server selects the explicit source date when provided, avoiding ambiguous duplicate recipes. For moved Skipped events, it clears the source recipe but keeps the skipped event. Grocery recomputation occurs on cross-week/defer/remove and assignment paths; same-week `MoveScheduleEventAsync` does not call it.

Direct removal uses `weekStore.removeRecipe`: it clears the recipe and resets the slot status to Planned (`0`), including recipe-less Ordered In/Skipped slots, before the DELETE request. It clears pending-suggestion state and removes grocery items contributed only by that recipe; request failure restores the prior schedule and grocery items. Server deletion returns the day to an empty Planned slot, so subsequent reload/sync preserves the cleared card.

## Evidence and dependencies

Relevant coverage is `weekStore.dragDebounce.test.ts`, `weekStore.removeRecipe.test.ts`, `weekStore.test.ts`, `slotAssignment.test.ts`, `useScheduleStream.test.ts`, `ScheduleServiceTests.cs`, and `ScheduleIntegrationTests.cs`; `planner-full-cycle.spec.ts` covers Ordered In removal immediately and after reload. The focused removal tests passed; browser acceptance remains blocked by the environment's local-port restriction. Depends on PLAN-01 for week identity, PLAN-02 for recovery entry, `groc-01` for derived list behavior, and `plat-01` for SSE transport.

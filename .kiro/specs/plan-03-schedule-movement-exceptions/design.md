# PLAN-03 — Schedule movement and exceptions: design baseline

## Integration map

The planner page captures drag identity and calls `weekStore.reorderLocally` during movement, then `commitMove` once. `weekStore` holds the pre-drag rollback and delegates to `lib/api/planner.ts`. `slotAssignment.ts` handles explicit recovery options. `ScheduleController` accepts move, defer, remove, and validate operations; `ScheduleService` mutates `CalendarEvent`/`WeeklyPlan`, recomputes grocery data where applicable, and publishes schedule events.

`MoveScheduleDto` is `{ weekOffset, recipeId, fromIndex?, toIndex, intent?, targetWeekOffset? }`. `DeferScheduleDto` is `{ sourceDate, recipeId }` and its successful envelope contains `scheduledDate`, `scheduledWeekOffset`, and `message`. Stream ownership is `useScheduleStream` → `weekStore.applySnapshot`/`applySlotUpdate`; its discriminated event schema is in `specs/openapi.yaml`.

## Concurrency and persistence

The client’s optimistic drag is deliberately local until the completed gesture. The server selects the explicit source date when provided, avoiding ambiguous duplicate recipes. For moved Skipped events, it clears the source recipe but keeps the skipped event. Grocery recomputation occurs on cross-week/defer/remove and assignment paths; same-week `MoveScheduleEventAsync` does not call it.

## Evidence and dependencies

Relevant coverage is `weekStore.dragDebounce.test.ts`, `weekStore.test.ts`, `slotAssignment.test.ts`, `useScheduleStream.test.ts`, `ScheduleServiceTests.cs`, and `ScheduleIntegrationTests.cs`. Depends on PLAN-01 for week identity, PLAN-02 for recovery entry, `groc-01` for derived list behavior, and `plat-01` for SSE transport.

# PLAN-02 — Meal assignment and replacement: design baseline

## Integration map

`planner/page.tsx` owns selected day, pivot/modal visibility, and the occupied-slot recovery sequencing. `PlanningPivotSheet.tsx` presents Quick replace, library search, remove, and plan-later choices. `QuickFindModal.tsx` obtains candidates through `getFillTheGap`; `slotAssignment.ts` packages the exact slot and dispatches move/defer/remove recovery operations.

`weekStore.assignRecipe` is the optimistic assignment boundary and `lib/api/planner.ts` uses the generated client. `ScheduleController.AssignRecipe` delegates to `ScheduleService.AssignRecipeAsync`, which ensures a `WeeklyPlan`, modifies/creates `CalendarEvent`, recomputes grocery state, publishes `week_updated` and `fill_the_gap_invalidated`, and returns the assignment message plus optional Sunday carry-forward DTO. `ScheduleDays` SSE snapshots reconcile the local view.

## State and recovery

For an empty target, the store keeps a previous schedule for rollback. For an occupied target, the page deliberately resolves the old event first and only then assigns the new recipe; `recoveryRecipeResolvedRef` prevents retrying that first action within one dialog attempt. The recovery is two server mutations, not atomic. Any catch refreshes the current week; it cannot restore a moved or removed old meal.

## Dependencies and evidence

- PLAN-01 supplies selected-week loading; PLAN-03 owns move/defer/remove semantics; PLAN-04 owns candidate vote meaning.
- `groc-01-derived-weekly-grocery-list` owns recomputation output and `plat-01-shared-real-time-state` owns delivery policy.
- Tests: `QuickFindModal.test.tsx`, `PlanningPivotSheet.test.tsx`, `slotAssignment.test.ts`, `weekStore.test.ts`, and `ScheduleIntegrationTests.cs`.

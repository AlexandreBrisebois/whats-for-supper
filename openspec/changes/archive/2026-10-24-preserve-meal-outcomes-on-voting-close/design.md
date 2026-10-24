# Design

## Context and Existing Ownership

ScheduleService.LockScheduleAsync already serializes closure and recognizes receipts, but its day-status loop overwrites Cooked. RemoveRecipeAsync deletes without using the existing SaveChangesAndRecalculateLastCookedDatesAsync helper. That helper derives dates from remaining Cooked calendar events and commits deletion/recalculation together.

## Decisions and Tradeoffs

Preserve all recorded Cooked and Skipped outcomes in the lock predicate. Reuse recalculation only when deleting a recipe-backed Cooked event; ordinary removal retains its existing save path. No new state, schema or voting ownership changes. User clarification: existing Skip/Remove deletes the recipe assignment and frees the slot; closing cannot restore it. Legacy recipe-backed Skipped rows retain their recorded representation without migration. Recipe-free Other plans remain unchanged.

## First Observable Slice

Open/close/reopen/close through the real service with Cooked, Planned and recipe-free Skipped entries, reread outcomes and replay an old round after newer votes. Then remove the latest Cooked occurrence through existing date-delete, reread last-cooked and mark a replacement Cooked. Service feedback precedes real PostgreSQL/API checks and participating-browser convergence evidence.

## Persistence and Side Effects

Close retains its existing transaction, history selection and vote retirement. Cooked removal uses the existing transaction helper before grocery recomputation/publication; later refresh failure cannot restore a removed meal or stale last-cooked value. No broader concurrency guarantee is added.

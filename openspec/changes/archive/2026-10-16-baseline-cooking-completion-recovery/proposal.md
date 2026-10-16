# Proposal

## Why

The ordinary cooking journey ends with recording the viewed recipe, which can differ from tonight’s assignment. Extract the existing awaited completion and local failure recovery after the preceding cooking slices.

## What Changes

- Describe recipe-specific completion for the browser-local current date.
- Describe pending submission, success celebration/caller dismissal, and rejected-request retry.
- Describe local Today confirmation as conditional on both server mealMarkedCooked and current recipe identity.
- Reference accepted meal-planning and live-update rules; map scenarios to BSL-cooking-010–012.

## Capabilities

### New Capabilities

- `cooking`: Disjoint completion/recovery ADDED requirements for the absent main cooking capability; follows entry/preparation, instruction-reading and edit-report-handoffs.

### Modified Capabilities

None.

## Impact

Documentation only. Read-only CooksMode.finishCooking → todayStore.markCooked → generated POST /api/schedule/day/{date}/validate with ValidationDto → ScheduleController.ValidateDay → ScheduleService.ValidateDayAsync → Recipe.LastCookedDate/CalendarEvents/SaveChangesAsync → publication attempt → enveloped response → conditional local Today update → cooking success. The meal-planning requirements “Validate recipe-specific cooking without completing another assignment” and “Publish supported changed-day validation after saving” own calendar effects. Household live updates owns event attempts, exclusions and delivery limits. Library owns persisted recipe facts and their subsequent projections. No idempotency, transaction, durable progress, cancellation or runtime guarantee is introduced. Optional design omitted; no technical change. See docs/openspec-baseline/cooking.md for full limitations and mappings.

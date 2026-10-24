# Proposal

## Why

Closing a genuinely new round currently changes already Cooked entries back to Locked. Removing a Cooked assignment also leaves its recipe's last-cooked value unchanged, although the user needs calendar corrections to reflect what actually happened.

## Outcome and Scope

Implement #246 and the user's explicit historical-correction clarification: protect completed meals during close and recalculate a removed Cooked recipe from remaining calendar events. Preserve operational round ownership, receipt replay, vote retirement and history selection. The user clarified that Skip/Remove frees the slot through existing deletion; closure must not resurrect removed recipes or recorded legacy Skipped entries. No voting transaction or general movement redesign.

## What Changes

- Closing voting preserves Cooked and Skipped outcomes, including dates earlier than deployment-local today.
- Removing a Cooked calendar entry restores the recipe's last-cooked date from remaining Cooked events, or null when none remain, before existing refresh work.
- Explicitly correcting a past plan remains available through existing removal, assignment and completion operations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `planning-lifecycle`: preserve completed day outcomes during closure.
- `meal-rescheduling`: reconcile last-cooked values when removing a completed assignment.

## Impact

ScheduleService lock/removal predicates and existing recalculation helper; focused service and PostgreSQL/API regressions; lock/removal contract descriptions and existing stateful browser mocks. The coordinator owns these paths after #248 integration.

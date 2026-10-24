# Proposal

## Why

Planner Plan later persists a cross-week move and recomputes both grocery lists, but only publishes the source snapshot. A destination viewer retains stale meals and groceries (#248). A later publication failure currently rejects a committed move.

## Outcome and Scope

Publish both affected weeks and report committed movement separately from incomplete follow-ups. Preserve existing placement/no-op semantics, Tomorrow, same-offset movement and accepted source status preservation.

## What Changes

- Actual cross-week movement returns existing moved/refreshComplete context and attempts both weeks independently.
- Planner warns that the meal moved when a refresh is incomplete; it never suggests moving again.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-rescheduling`: distinguish committed Plan later movement from refresh completion.
- `household-live-updates`: publish both affected cross-week snapshots.

## Impact

ScheduleService cross-week follow-ups, existing move contract descriptions, Planner completion feedback and stateful move mock. No schema, endpoint, persistence or dependency additions.

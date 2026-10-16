# Proposal

## Why

The independent baseline audit found a mounted Planner hold-to-move interaction excluded by member-preferences X-MP03 but not described by meal-planning's drag-preview requirement. Recording its supported activation and cancellation closes a documentation gap without changing application behavior.

## What Changes

- Draft existing immediate/held drag activation, readiness and cancellation behavior under meal-planning.
- Preserve member-preferences ownership of effective preview flags and existing meal-planning ownership of reorder persistence.
- Keep browser/device qualification and all known movement defects separate from baseline acceptance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Add supported Planner drag-handle activation and cancellation scenarios.

## Impact

Documentation only in this change. Evidence: `pwa/src/components/planner/PlannerDragHandle.tsx`, its existing test file, and Planner mounting. No API, client, SQL, configuration, tests or application edits; no promotion or archival. Human review remains required. Runtime device behavior is not established by mocked pointer events.

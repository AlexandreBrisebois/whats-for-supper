# ADR 028: Cross-Week Schedule Move

**Date**: 2026-04-29  
**Status**: Accepted

## Context

The `SkipRecoveryDialog` offers a "Next Week" option. The existing `MoveScheduleEventAsync` only operated within a single week's bounds — sending `weekOffset: 0, fromIndex === toIndex` was a no-op.

Two approaches were considered:

- **Option A**: Extend `MoveScheduleDto` with `TargetWeekOffset` and implement cross-week move in the service.
- **Option B**: Wrap within current week (push to next available same-week slot). Simpler but breaks the spec's intent.

## Decision

Implement **Option A** (cross-week move).

### API changes
- `MoveScheduleDto` gains optional `TargetWeekOffset?: int` (default `null` = same-week behavior preserved).
- `ScheduleService.MoveScheduleEventAsync` early-exits to `MoveCrossWeekAsync` when `TargetWeekOffset != WeekOffset`.
- `MoveCrossWeekAsync`: fetches source event, finds first available slot in target week starting at `ToIndex`, updates `CalendarEvent.Date`, saves.
- If target week is fully booked (all 7 slots), the operation is aborted with a warning log (no silent data loss).

### PWA changes
- Generated `MoveScheduleDto` TS interface, deserializer, and serializer updated with `targetWeekOffset`.
- "Next Week" handler: `{ weekOffset: 0, fromIndex: todayIndex, toIndex: 0, targetWeekOffset: 1, intent: 'push' }`.

## Consequences

- **Pro**: "Next Week" skip now works correctly end-to-end.
- **Pro**: Same-week behavior is fully preserved (backward compatible — `targetWeekOffset` defaults to null).
- **Con**: Generated client types were manually patched (not regenerated from OpenAPI). Must be reconciled the next time `task agent:reconcile` is run.
- **Note**: The generated TS client (`pwa/src/lib/api/generated/models/index.ts`) is a manual patch until OpenAPI spec is updated.

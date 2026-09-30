# PLAN-01 — Week navigation and status: design baseline

## Integration map

`pwa/src/app/(app)/planner/page.tsx` owns URL reading, navigation controls, and tab rendering. `pwa/src/store/plannerStore.ts` owns the selected offset and active tab; `pwa/src/store/weekStore.ts` owns the loaded schedule, status, grocery payload, loading flag, and guarded snapshot merge. `pwa/src/lib/api/planner.ts` calls generated Kiota operations.

The browser requests `GET /api/schedule?weekOffset=<integer>`. `ScheduleController.GetSchedule` delegates to `ScheduleService.GetScheduleAsync`, which uses its injected clock to calculate the Monday/Sunday interval, reads `WeeklyPlan` and `CalendarEvent` rows, and materializes `ScheduleDays`. `specs/openapi.yaml` defines the `ScheduleDays`/`ScheduleDayDto` shape and the `{ data: ... }` response envelope consumed by the generated client.

`pwa/src/hooks/useScheduleStream.ts` connects to `/api/stream`. `connected` and `week_updated` flow into `weekStore.applySnapshot`; filtering by loaded offset, deferred snapshots during drag/unconfirmed moves, and `echoSeq` confirmation live there. `slot_updated` is date-filtered by the loaded days. The event publisher and stream contract are owned with `plat-01-shared-real-time-state`.

## State flow and failure behavior

1. URL change → `setWeekOffset` → effect calls `init(offset)`.
2. `init` sets `isLoading`, gets the schedule, optionally gets smart defaults for status 1, and commits only if the requested offset is still current.
3. Server state supplies the durable week identity and status. `_uiId`, pending-default metadata, and selected tab are browser-only state.
4. A request exception clears loading without preserving an explicit error object or offering retry. Existing schedule is not cleared before the request.
5. An SSE snapshot is authoritative when it targets the loaded week and no move is in flight; drag/unconfirmed move state can defer it. The connected event only contains the current week.

## Dependencies and boundaries

- PLAN-02 consumes the selected week/slot for assignment and replacement.
- PLAN-03 owns optimistic movement and move sequence semantics.
- PLAN-04 owns voting status transitions and smart-default meaning.
- `groc-01-derived-weekly-grocery-list` owns the schedule response’s grocery fields.
- `pref-01-interface-localization`, `pref-03-responsive-accessible-interaction`, and `plat-07-health-auth-response-conventions` own cross-cutting policy, not this packet.

## Existing evidence

Focused browser/store coverage is in `pwa/src/app/(app)/planner/page.test.tsx`, `pwa/src/store/weekStore.test.ts`, `pwa/src/store/weekStore.dragDebounce.test.ts`, and `pwa/src/hooks/useScheduleStream.test.ts`; API integration coverage is in `api/src/RecipeApi.Tests/Integration/ScheduleIntegrationTests.cs`.

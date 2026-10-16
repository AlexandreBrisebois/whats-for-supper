# Proposal

## Why

When a person plans a future week and uses Change → Quick Replace → Save for Next Week, the prior recipe can land in the same week being planned. Source inspection confirms Planner calls server deferral with the captured calendar reference but no destination offset; the server starts at reference Monday plus seven days regardless of the source week. Browser reproduction has not been run for this proposal.

## Outcome and Scope

For a captured Planner meal in week offset N, the next-week recovery choice starts searching on Monday of offset N+1. The previous recipe goes into the first date without a calendar entry, continuing into later weeks if necessary, before the replacement is assigned to the original meal date. For example, planning October 19–25 while the current week is October 12–18 must start the search on October 26.

This increment covers Planner occupied-slot recovery, its existing defer API, generated client and stateful mock. Preserve current-week behavior, exact source-date matching, calendar-reference capture, occupied-date rules, spillover, recovery ordering and failure behavior. Search/Browse movement, standalone Plan later, Tomorrow, Drop, ranking and broader concurrency/atomicity policy remain outside the correction. No consequential decisions remain unresolved; retaining spillover is a preservation assumption.

## What Changes

- Planner supplies the captured source offset plus one as the defer search's starting week.
- The defer API accepts an optional destination offset relative to the existing reference Monday; omission retains offset one for existing callers.
- Destination feedback identifies the actual date and reports a full next week only when the search passes the requested destination week.
- Add regression acceptance for future-week replacement and preserve current-week, occupied/full-week and failure behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `meal-planning`: Anchor Planner replacement deferral to the captured meal plan's following week, while retaining legacy defer defaults and caller-specific recovery semantics.

## Impact

- Planner recovery in `pwa/src/app/(app)/planner/page.tsx` and the defer branch in `pwa/src/lib/planner/slotAssignment.ts`.
- `POST /api/schedule/defer` in `specs/openapi.yaml`, generated Kiota query parameters, `ScheduleController`, service interface and `ScheduleService.DeferRecipeAsync`.
- `pwa/e2e/mock-api.ts`, focused slot-assignment/Planner tests, service/API tests and Planner recovery Playwright coverage.
- No persistence schema change or new scheduling-policy owner. Application changes are deferred to an explicit apply request.

# Dreaming Completion and Next-Week Defer Design

Status: Draft implementation design  
Requirements: [requirements.md](requirements.md)

## 1. Current seam and correction

Current recipe-card Plan for Later calls `findFirstOpenPlannerSlot` in `pwa/src/lib/planner/slotAssignment.ts`, then assigns through `/api/schedule/assign`. That flow remains intact.

Current next-week recovery calls `/api/schedule/move` with a target week/index. `ScheduleService.MoveCrossWeekAsync` scans only that target week and returns after logging when full, while `ScheduleController` still returns success. Defer replaces only that recovery semantic with server-owned allocation.

## 2. Contract and ownership

| Owner | Files/effects |
|---|---|
| OpenAPI contract | `specs/openapi.yaml`: add `/api/schedule/defer`, `DeferScheduleDto`, `DeferScheduleResultDto`, success and `404`/`409` responses. |
| API boundary | `ScheduleController.cs`, DTO files, `06-schedule.rest`: bind request, propagate existing connection/echo metadata, map not-found/conflict outcomes. |
| Scheduling domain | `ScheduleService.cs`: allocation, source mutation, last-cooked recalculation, groceries, and publications. |
| Workflow | `dreaming.yaml`, `Program.cs`, `FinalizeOverdueMealsProcessor.cs`, `DreamingWorkflowSeeder.cs`: processor execution, ordering, registration, and default cron. |
| Generated client | Generated solely by `task gen:client`; do not hand-edit any generated PWA type. |
| PWA callers | `slotAssignment.ts`, planner page, `HomeCommandCenter.tsx`: invoke defer only for `next_week`, show returned toast, retain current context. |

## 3. API design

### Request

```json
{
  "sourceDate": "2026-09-13",
  "recipeId": "00000000-0000-0000-0000-000000000000"
}
```

`DeferScheduleDto` contains only these required fields. The route itself encodes the one available policy, avoiding an enum with a removed plan-later value.

### Success response

```json
{
  "scheduledDate": "2026-09-22",
  "scheduledWeekOffset": 2,
  "message": "Next week is full. Moved Chicken Soup to Tuesday, September 22."
}
```

The service creates `message` after committing the destination. The controller returns `404` for no exact source and `409` for `AwaitingConsensus`; neither outcome changes schedule data.

## 4. Defer algorithm

`ScheduleService.DeferRecipeAsync` owns the operation. It receives the DTO, connection ID, echo sequence, and cancellation token.

1. Load the source by `Date == sourceDate && RecipeId == recipeId`; do not recipe-ID fallback.
2. Reject missing source as not found; reject `AwaitingConsensus` as conflict.
3. Calculate the first Monday strictly after the server's current UTC date.
4. Call one private helper, `FindFirstAvailableDateAsync(DateOnly startDate, CancellationToken ct)`. It iterates date-by-date from `startDate`, selects only dates with no `CalendarEvent`, ensures the destination `WeeklyPlan`, and returns destination date, Monday, and current-week-relative offset.
5. Preserve source vote count. For `Skipped`, create the planned destination, clear only the source recipe association, and retain the source row's vote count; for `Planned`, `Locked`, and `Cooked`, move the source row and set status planned.
6. When the original source was cooked, derive its recipe's last-cooked value from the latest remaining cooked event. Use the event's date as the stored calendar date; return null if absent.
7. Save the schedule mutation, recompute groceries for distinct source/destination Mondays, then publish `week_updated` for distinct source/destination offsets with the request metadata.
8. Return the committed date, offset, and message.

The helper's date lookup and mutation execute in one service request, but no new schema/unique constraint is authorized. If an allocation race causes persistence to fail, the request fails normally and must not return a false success; a retry repeats allocation.

## 5. Dreaming design

Add `ScheduleService.FinalizeOverdueMealsAsync(CancellationToken ct)`.

It queries events with `Date < DateOnly.FromDateTime(DateTime.UtcNow)`, non-null recipe ID, and status in `{ Planned, Locked }`. It changes them to `Cooked`, recalculates last-cooked values for distinct recipes, saves when there are changes, and publishes `week_updated` for distinct affected weeks. It does not alter groceries because recipe-to-week membership has not changed.

`FinalizeOverdueMealsProcessor` is a narrow `IWorkflowProcessor` named `FinalizeOverdueMeals`; it delegates to the service and permits exceptions to escape to the existing workflow worker/retry machinery.

In `dreaming.yaml`, `finalize-overdue-meals` is an independent maintenance task and `report` depends on it along with current prerequisite tasks. `reschedule` continues to follow report. Change the default cron in both YAML and `DreamingWorkflowSeeder` to `0 6 * * *` while retaining configuration override behavior.

## 6. PWA state and UX

`resolveOccupiedSlot` changes only its `next_week` branch. It calls generated defer with the `PlannerSlot.date` and recipe ID, and returns the typed response. Its tomorrow and drop branches are unchanged.

Planner recovery and Home recovery consume the result message with `useUiStore.getState().addToast(message)`. Each refreshes the state it already owns; neither constructs a destination route nor invokes client-side slot search. Failure leaves existing error handling in place and must not display a success toast.

No new UI component, prompt, accessibility surface, or test ID is required; the existing toast and recovery controls remain the interaction surface.

## 7. Failure and recovery behavior

| Condition | Required outcome |
|---|---|
| Exact source absent or recipe differs | `404`; no schedule change or toast. |
| Source awaits consensus | `409`; no schedule change or toast. |
| Immediately following week full | Continue server search; return first later free date. |
| Persistence/allocation race failure | Fail request; do not send success response; caller shows existing failure behavior. |
| Dreaming has no eligible events | No database change and no schedule publication. |
| Dreaming processor throws | Worker owns normal retry/backoff; report waits because it depends on completion. |

## 8. Verification strategy

Service/integration tests use deterministic dates and schema-valid GUID fixtures. Cover R1-R6 through event persistence, grocery-recompute and publisher mocks. Workflow tests verify processor resolution, YAML dependency ordering, default/override cron, and retry behavior. PWA tests mock generated defer, assert exact payload and returned toast, and prove unmodified move/Plan-for-Later paths remain intact.

Required commands after implementation:

```text
task gen:client
task test:api -- <focused schedule and workflow selectors>
<focused PWA unit-test command for planner, HomeCommandCenter, and slot assignment>
task typecheck
task agent:reconcile
```

Each result is recorded as passed, failed, blocked, not-run, or not-applicable. No database migration check applies.

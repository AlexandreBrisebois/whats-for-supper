# Design

## Context and Existing Ownership

Scope and reported behavior are in [proposal.md](proposal.md). Source inspection, rather than a live reproduction, establishes this path:

1. Planner's `handleRecoveryAction` calls `resolveOccupiedSlot(slot, action, true)` for next-week recovery.
2. `pwa/src/lib/planner/slotAssignment.ts` submits exact source date and recipe ID through Kiota with the captured reference Monday, but discards `slot.weekOffset` in the defer branch.
3. `ScheduleController.DeferRecipe` forwards to `ScheduleService.DeferRecipeAsync`. The service starts `FindFirstAvailableDateAsync` at reference Monday + 7 days. Its existing source Monday calculation does not influence the search.
4. The service persists the move, recomputes affected groceries, publishes affected snapshots and returns date/offset/message. Planner awaits this before replacement assignment.

The existing `meal-planning` baseline explicitly documents the calendar-current behavior. This delta intentionally changes Planner recovery and extends the defer contract; it does not silently reinterpret the baseline. Search/Browse already use source-offset-plus-one movement but that route stops at Sunday, so substituting it would lose defer spillover and exact-date identification.

## Decisions and Tradeoffs

Add optional integer query parameter `targetWeekOffset` to `POST /api/schedule/defer`, default one, relative to the same `referenceWeekStartDate` as existing relative operations. Extend the controller/service interface and pass this destination into the existing server-owned free-date search. Planner's defer helper passes `slot.weekOffset + 1` together with the captured reference, source date and recipe ID. Other callers retain their existing branch and default behavior.

An additive offset preserves existing defer callers without adding another search implementation. Changing all deferrals to derive their destination from sourceDate would change legacy caller policy. Replacing the calendar reference with the source week's Monday would change response-offset interpretation and misuse the shared calendar anchor. Neither alternative is needed.

Retain supported integer-offset/calendar validation conventions; invalid binding or an unrepresentable destination must reject before mutation. Update affected operation documentation and response description in OpenAPI before code, regenerate Kiota and update method-sensitive mocks in the same slice. Do not hand-edit generated code.

The feedback prefix currently uses destination offset > 1. Compare the destination week against the requested search-start week instead, so ordinary placement in offset two does not falsely say next week is full. Keep returned offsets relative to the original reference Monday.

## First Observable Slice

Start with captured reference October 12, source October 21 in offset one and a chosen replacement. Through Change → Quick Replace → Save for Next Week, the browser must send target offset two, move the old recipe to October 26 when free, then assign the replacement to October 21. Read both weeks to verify these results and that offset one's earlier empty dates remain empty.

Exercise helper and Planner sequencing tests, the real HTTP/controller/service/persistence boundary, then the stateful mock and Playwright flow. API integration acceptance must use the repository's relational test configuration and inspect subsequent schedule reads; EF in-memory service coverage and mocked browser requests alone cannot establish relational persistence behavior. The implementation may add a focused API integration fixture if no existing defer fixture spans this seam.

## State, Concurrency and Recovery

Retain the captured slot and reference through all dependent requests, including rollover. Keep existing duplicate-submit suppression, remembered completed deferral, replacement retry and refresh/error handling. On defer rejection, do not start replacement. After successful defer followed by failed replacement, retry replacement without deferring the old meal again. No new atomicity, collision reservation, idempotency or rollback guarantee is introduced.

## Persistence and Side Effects

Keep exact-date/recipe source lookup, AwaitingConsensus conflict, skipped-source preservation, cooked-date recalculation, vote retention, destination-plan handling, grocery recomputation and publication ordering. Search still treats any calendar entry as occupied and spills beyond a full destination week. Only the search-start input and associated feedback comparison change. Save and follow-up failures retain existing limitations; this change does not repair concurrent destination claims or partial-success reporting.

## Compatibility, Rollout and Reversal

No database migration. Omitted target offset continues to mean one, including callers omitting the calendar reference. Deploy API support before or with the PWA; an old API may ignore the new query parameter and retain the defect, so browser-only deployment is insufficient. Reverting code restores the former behavior for future actions; already moved meals are not automatically rescheduled.

## User Experience

Retain existing action labels, loading state, focus and recovery controls. Success feedback names the actual destination. A full destination week continues into later weeks with accurate feedback. No added user decision or new navigation is required.

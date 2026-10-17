# Meal rescheduling Specification

## Purpose

Let household members rearrange or remove existing dated meal content through dragging, movement, deferral and shared date deletion, preserving each operation’s existing completion and recovery boundaries.

## Evidence and qualifications (non-normative)

These requirements were relocated unchanged from the combined meal-planning specification. Applicable [historical qualifications](../meal-planning/spec.md#evidence-and-qualifications-non-normative) and the [durable meal-planning evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/meal-planning.md) transfer with them, including BSL/U/A identifiers, partial-success limits and deferred runtime qualification. Relocation establishes no new API/browser/database/model guarantee.

## Related owners (non-normative)

Cross-capability requirement references resolve to the following authoritative owners:

- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Keep relative operations anchored to their intended calendar week](../deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)
- [Read the household schedule through the protected GET operation](../meal-planning/spec.md#requirement-read-the-household-schedule-through-the-protected-get-operation)
- [Submit chosen-recipe assignment through the protected operation](../meal-assignment/spec.md#requirement-submit-chosen-recipe-assignment-through-the-protected-operation)
- [Persist recipe-free skipped plans without changing week status](../non-cooking-plans/spec.md#requirement-persist-recipe-free-skipped-plans-without-changing-week-status)


## Incoming Tomorrow reconciliation (non-normative)

The accepted Tomorrow change from upstream commit `8357a8bd` (PR #242, merged at `e4a48c85`) is incorporated under the current owners. Its normative blocks are copied exactly from upstream. This supersedes the original split snapshot only for the changed/added Tomorrow requirements; all other original blocks and evidence records remain intact. See the [upstream change design](../../changes/archive/2026-10-16-tomorrow-preserve-meals/design.md) and [recorded acceptance evidence](../../changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md). This reconciliation did not rerun application/runtime qualification.

- [Gate every Tomorrow recovery caller on committed movement](../meal-assignment/spec.md#requirement-gate-every-tomorrow-recovery-caller-on-committed-movement)
- [Consume the committed Tomorrow result before continuing Home recovery](../tonight-meal-decisions/spec.md#requirement-consume-the-committed-tomorrow-result-before-continuing-home-recovery)

## Requirements

### Requirement: Delete the recipe-free entry before clear follow-up work

For an existing recipe-free entry, clear SHALL delete the selected date's calendar entry, await grocery recomputation for its containing week, read that schedule, attempt week_updated and then fill_the_gap_invalidated with connection exclusion. Recomputation SHALL retain existing week status or create a missing Draft plan. A missing entry SHALL complete without those follow-ups. Completed deletion SHALL return 204 without a body.

#### Scenario: Entry exists
- **WHEN** recipe-free clear and all its awaited work complete
- **THEN** deletion precedes recomputation, schedule retrieval, week publication and fill-the-gap invalidation, then the API returns 204

#### Scenario: Entry is already absent
- **WHEN** clear finds no entry at its date
- **THEN** it returns 204 without invoking those follow-ups

#### Scenario: Later clear work fails
- **WHEN** a follow-up throws after the entry was deleted
- **THEN** clear does not return successful completion through that invocation, without establishing restoration of the entry

#### Scenario: Clear creates a missing weekly plan
- **WHEN** the entry is deleted with no containing weekly plan and recomputation persistence succeeds
- **THEN** the follow-up creates a Draft weekly plan for that Monday

#### Scenario: Clear retains existing week status
- **WHEN** the entry is deleted from a week with an existing weekly plan and recomputation persistence succeeds
- **THEN** that plan retains its Draft, VotingOpen or Locked status

### Requirement: Preview a drag as a swap of dated Planner content

During a supported recipe-card drag, Planner SHALL exchange source and destination content locally while retaining each date/day label. Intermediate drag updates SHALL submit no move request. A drop at a changed position with a recipe ID SHALL submit one movement request with the pre-drag source index and final destination index; an unchanged drop SHALL submit none.

#### Scenario: Drag crosses multiple days
- **WHEN** a recipe card crosses intermediate positions and is dropped at another date
- **THEN** local swap feedback precedes one request for the original source and final destination

#### Scenario: Return to the source
- **WHEN** a drag ends at its original position
- **THEN** no movement request is submitted

#### Scenario: Movement rejects
- **WHEN** the committed drag request rejects
- **THEN** Planner attempts restoration of the captured pre-drag schedule without establishing server rollback

### Requirement: Submit dated-source movement through the protected operation

POST /api/schedule/move SHALL accept weekOffset, recipeId and toIndex, with optional fromIndex, intent and targetWeekOffset. Its source and target week dates SHALL use the accepted deployment-calendar-relative week interpretation. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Explicit drag source
- **WHEN** Planner commits a recipe drag
- **THEN** the request supplies source week, recipe ID, fromIndex and toIndex without an explicit cross-week target

#### Scenario: Protected movement lacks credentials
- **WHEN** movement lacks accepted household credentials
- **THEN** shared API authentication rejects it independently of page access

### Requirement: Prefer an explicit movement source with legacy fallback

Movement SHALL first inspect the supplied source date when fromIndex exists. If no entry is found there, or fromIndex is absent, it SHALL fall back to a stored entry matching recipeId. If the selected entry has a different recipe ID or no entry is found, movement SHALL return without relocating an entry.

#### Scenario: Repeated recipe has an explicit source
- **WHEN** the same recipe appears on multiple dates and the supplied source date contains it
- **THEN** movement selects that date rather than another occurrence

#### Scenario: Legacy source lookup
- **WHEN** fromIndex is omitted or its resolved date has no entry
- **THEN** lookup falls back to a stored matching recipe without guaranteeing which duplicate is selected

#### Scenario: Selected source differs
- **WHEN** the explicit source contains another recipe
- **THEN** movement does not relocate that selected entry

### Requirement: Swap stored content within a week

For ordinary same-week swap movement with a found source and successful persistence, an occupied destination SHALL exchange recipe ID, saved vote count, day status and non-cooking kind/label with the source. With no destination entry, the source SHALL move to that date. Weekly plan status SHALL remain distinct from the moved day status.

#### Scenario: Destination is occupied
- **WHEN** a recipe swaps onto another stored date
- **THEN** the two dates exchange their recipe/status/non-cooking content and saved vote counts

#### Scenario: Destination is empty
- **WHEN** the selected destination has no entry
- **THEN** the source entry moves to that date with its content retained

### Requirement: Push toward a later available date within the search window

Same-offset push SHALL seek an empty date from toIndex through index thirteen relative to that week's Monday. When found, it SHALL shift intervening stored entries one day forward and place the source at the requested destination. With no empty date in that window it SHALL fall back to swap. This SHALL NOT establish relational collision safety for every shift.

#### Scenario: Later date is empty
- **WHEN** an ordinary source pushes to index one, which is occupied, and index two is empty
- **THEN** the occupied destination shifts to index two and the source is placed at index one after successful persistence

#### Scenario: Search window is full
- **WHEN** no empty date exists from the requested destination through index thirteen
- **THEN** the operation takes the swap path rather than continuing an unbounded push

### Requirement: Place cross-week movement in the first available target-week date

For legacy swap and push intents only: With a different targetWeekOffset and an ordinary target index zero through six, movement SHALL search that target week from toIndex through Sunday for a date with no entry. A found destination SHALL receive the source and have a weekly plan ensured as Draft only if absent. If no destination exists, the source SHALL remain in place through this path.

#### Scenario: Target Monday is occupied
- **WHEN** cross-week movement starts at Monday and Tuesday is the first date without an entry
- **THEN** successful persistence moves the source to Tuesday without shifting Monday

#### Scenario: Target week has no free date
- **WHEN** every target date from the requested index through Sunday is occupied
- **THEN** this path leaves the source unchanged without extending its search into another week

### Requirement: Preserve a skipped source when moving its recipe forward

When a recipe-backed Skipped source is pushed into an available destination or moved cross-week into an available date, movement SHALL preserve a recipe-free source and create a separate Planned destination carrying the recipe and saved vote count. The source SHALL remain Skipped; this rule SHALL NOT apply to ordinary swap fallback.

#### Scenario: Push a skipped source
- **WHEN** a skipped recipe is pushed forward with an available destination and persistence succeeds
- **THEN** its source remains recipe-free Skipped and the destination contains the Planned recipe

#### Scenario: Move a skipped source cross-week
- **WHEN** cross-week placement succeeds for a skipped recipe
- **THEN** the original date remains recipe-free Skipped while a new Planned recipe entry is saved in the target week

### Requirement: Distinguish movement follow-ups from movement confirmation

For legacy swap and push intents only: Same-week saved movement SHALL attempt a source-week snapshot without grocery recomputation. Successful cross-week persistence SHALL await source then destination grocery recomputation before source-week publication. Completed move requests SHALL return 200 with data.message Recipe moved, including supported no-op returns. Publication receipt SHALL remain household-live-updates-owned.

#### Scenario: Same-week movement completes
- **WHEN** same-week movement saves and its schedule read and publication return
- **THEN** the success response follows source-week publication without requesting grocery recomputation through this path

#### Scenario: Cross-week movement completes
- **WHEN** cross-week persistence and both recomputations complete
- **THEN** source-week snapshot publication is attempted before success without a destination-week snapshot through this movement path

#### Scenario: Full target returns completion
- **WHEN** cross-week destination search finds no free date and the subsequent source read/publication complete
- **THEN** the response still says Recipe moved and does not confirm relocation

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Plan later action SHALL close its pivot and submit movement with explicit source index, target offset selected offset plus one, target index zero and push intent. On request completion it SHALL initialize the selected week and, for a week-zero source dated deployment-local today, sync Today. Failure SHALL be logged without a dedicated Plan later error toast.

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** movement targets offset two starting at Monday rather than deployment-current next week

#### Scenario: Movement request resolves or rejects
- **WHEN** the Plan later request resolves, including a supported no-op, or rejects
- **THEN** resolution proceeds to initialization while rejection is logged without success confirmation of relocation

### Requirement: Defer the exact dated recipe through a protected operation

POST /api/schedule/defer SHALL identify the source by sourceDate and recipeId. No matching entry SHALL return 404; an AwaitingConsensus source SHALL return 409 before deferral. Access SHALL follow household-identity's Authenticate protected API requests independently requirement. Other supported day states SHALL not acquire a Locked-week prohibition through this action.

#### Scenario: Source does not match
- **WHEN** an authorized defer request has no entry matching both source date and recipe ID
- **THEN** it returns 404 without moving another occurrence of the recipe

#### Scenario: Source awaits consensus
- **WHEN** the exact source is AwaitingConsensus
- **THEN** it returns 409 without deferring that entry

#### Scenario: Household credentials are absent
- **WHEN** defer lacks accepted household credentials
- **THEN** the shared API authentication gate rejects the request

### Requirement: Find a defer destination from deployment-current next week

Deferral SHALL accept optional integer targetWeekOffset relative to the captured reference Monday, defaulting to one. Search SHALL start on that week's Monday and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date. It SHALL ensure a Draft plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free
- **WHEN** defer omits targetWeekOffset with no stored entry on reference-next Monday
- **THEN** that date is chosen regardless of the source's relative week offset, retaining deployment-current next week when reference Monday is also omitted

#### Scenario: Next week is full
- **WHEN** all seven dates of the requested destination week are occupied
- **THEN** search continues into the following week until a date without an entry is found

#### Scenario: Explicit future destination
- **WHEN** reference Monday is October 12, targetWeekOffset is two, October 26 is occupied and October 27 has no entry
- **THEN** defer selects October 27 without moving or replacing October 26's entry or using an earlier free date

#### Scenario: Non-cooking entry occupies a date
- **WHEN** the requested destination Monday has a stored recipe-free non-cooking entry and Tuesday has no entry
- **THEN** defer preserves Monday and selects Tuesday

### Requirement: Return deferred content to Planned state

Successful deferral of a non-Skipped source SHALL move that entry to the selected date, set it Planned and retain its saved vote count. For a recipe-backed Skipped source it SHALL instead leave a recipe-free Skipped entry at the source and create a separate Planned destination with the recipe and saved vote count. A Cooked source SHALL invoke last-cooked recalculation.

#### Scenario: Locked source is deferred
- **WHEN** a Locked recipe source defers successfully
- **THEN** the moved entry is Planned at the selected destination with its saved vote count retained

#### Scenario: Skipped source is deferred
- **WHEN** a recipe-backed Skipped source defers successfully
- **THEN** its original date remains recipe-free Skipped and the new destination contains the Planned recipe and saved vote count

#### Scenario: Cooked source is deferred
- **WHEN** a Cooked entry is moved back to Planned through defer
- **THEN** the persistence path recalculates that recipe's last-cooked value from remaining Cooked calendar entries

### Requirement: Complete defer after affected-week follow-ups

After defer persistence completes, the operation SHALL await grocery recomputation for each distinct source/destination Monday, then attempt a snapshot for each affected week with request exclusion and optional move sequence. Only after these steps return SHALL it return 200 data containing scheduledDate, scheduledWeekOffset and message. Live delivery SHALL remain household-live-updates-owned.

#### Scenario: Both affected weeks complete
- **WHEN** save, recomputation and publication calls all return
- **THEN** the completed response identifies the chosen destination date and its deployment-calendar-relative week offset

#### Scenario: Later work rejects
- **WHEN** a recomputation or publication throws after persistence
- **THEN** the successful defer response is not reached without establishing reversal of the moved entry

### Requirement: Remove a recipe-backed Planner assignment optimistically

Planner's recipe-backed pivot SHALL offer Remove recipe. Activation SHALL close the pivot, clear the indexed displayed recipe/non-cooking content to status zero, clear pending state and mark the date user-cleared while dispatching date deletion. It SHALL restore captured local schedule and grocery items on rejection without dedicated removal failure feedback or a server rollback guarantee.

#### Scenario: Removal is pending
- **WHEN** a person removes the recipe from a dated Planner pivot
- **THEN** the day becomes locally unplanned before DELETE completion and the accepted date-delete lifecycle is invoked

#### Scenario: Deletion rejects
- **WHEN** the asynchronous deletion rejects
- **THEN** captured local schedule and grocery items are restored without a removal toast through this handler

### Requirement: Apply the shared date-delete lifecycle to recipe-backed entries

Recipe-backed removal SHALL use the same protected date-only DELETE and persistence-before-follow-up lifecycle as the accepted Delete the recipe-free entry before clear follow-up work requirement. It SHALL remove the selected calendar entry rather than delete the recipe. It SHALL add no expected-recipe, day-status or week-status precondition.

#### Scenario: Recipe-backed date exists
- **WHEN** the selected date contains a recipe-backed entry and deletion persistence succeeds
- **THEN** that entry is removed, while the recipe remains available and the accepted recompute/publication sequence follows

#### Scenario: No calendar entry exists
- **WHEN** the date is already empty
- **THEN** deletion returns 204 without invoking the existing-entry follow-up sequence

### Requirement: Activate Planner dragging according to the effective hold preference

The Planner recipe drag handle SHALL start dragging immediately for an eligible primary-button pointer when hold-to-move is disabled. When enabled it SHALL wait for an uninterrupted 250 millisecond hold before starting, show grabbed feedback on activation, and request a brief vibration when the browser supplies that facility. Secondary-button and explicitly non-primary pointers SHALL not start a hold.

#### Scenario: Immediate mode
- **WHEN** hold-to-move is disabled and an eligible pointer presses the recipe drag handle
- **THEN** dragging starts without waiting for the hold duration

#### Scenario: Hold reaches activation
- **WHEN** hold-to-move is enabled and an eligible pointer remains pending for 250 milliseconds without cancellation
- **THEN** dragging starts once and the handle shows grabbed feedback, with a vibration request when supported

#### Scenario: Ineligible pointer
- **WHEN** a secondary-button or explicitly non-primary pointer presses the handle
- **THEN** that press does not start dragging or a pending hold

### Requirement: Cancel pending Planner holds before drag activation

A pending Planner hold SHALL cancel when its pointer moves more than eight pixels from the press position, its pointer ends or cancels, another pointer begins, the window loses focus, or a pre-activation touch movement occurs on the handle. A cancelled hold SHALL not later activate from its retired timer. Removing the handle or changing its effective activation mode SHALL also retire pending activation.

#### Scenario: Scroll movement before activation
- **WHEN** a pending pointer moves more than eight pixels or the handle receives touch movement before activation
- **THEN** the pending hold is cancelled without preventing that pre-activation touch movement through the handle

#### Scenario: Release or interruption
- **WHEN** a pending hold receives its pointer end or cancellation, another pointer begins, or the window loses focus
- **THEN** waiting beyond the hold duration does not start dragging from that hold

#### Scenario: Handle or mode changes
- **WHEN** the handle unmounts or its effective hold-to-move mode changes while a hold is pending
- **THEN** the previous pending activation is retired

### Requirement: Bound Planner grabbed feedback to the active pointer interaction

After held activation, the handle SHALL prevent cancelable touch movement received on the handle while active. Ending or cancelling the tracked pointer or losing window focus SHALL clear grabbed feedback. This activation behavior SHALL not itself confirm a persisted calendar move; the existing Planner drag-preview and drop requirements govern that handoff.

#### Scenario: Touch movement after activation
- **WHEN** an activated held drag receives cancelable touch movement on its handle
- **THEN** the handle prevents the default for that event

#### Scenario: Activated pointer ends
- **WHEN** the tracked pointer ends after held activation
- **THEN** grabbed feedback clears without this feedback change confirming server persistence

### Requirement: Report deferral relative to the requested destination

Successful deferral SHALL report the actual scheduled date and its offset relative to the captured reference Monday. Full-next-week feedback SHALL appear only when the destination lies after the requested search-start week, rather than whenever its offset exceeds one.

#### Scenario: Future destination has room
- **WHEN** deferral starts at offset two and finds a free date in offset two
- **THEN** feedback identifies that date without claiming next week is full

#### Scenario: Future destination spills over
- **WHEN** deferral starts at offset two and the first free date is in offset three
- **THEN** feedback identifies the actual date and indicates that the requested next week was full

### Requirement: Preserve the Tomorrow supper chain across weeks

Tomorrow SHALL move the exact source supper to the next deployment-calendar date. Each contiguous occupied supper date from that destination SHALL move one day forward until the first empty supper slot, across as many weeks as required. No two-week cap, swap fallback or silent no-op success SHALL apply. Other meal slots SHALL remain unchanged.

#### Scenario: Sunday and two following weeks are occupied
- **WHEN** Sunday contains A and every supper date in the next two weeks is occupied, with the following Monday empty
- **THEN** A moves to the first Monday, each displaced entry moves exactly one day and the last entry reaches the third Monday without loss

#### Scenario: First gap ends the chain
- **WHEN** Tomorrow encounters occupied Monday and Tuesday, empty Wednesday and occupied Thursday
- **THEN** Monday and Tuesday move one day forward and Thursday remains unchanged

### Requirement: Preserve movable Tomorrow entry content

Displaced Planned, Locked and Skipped entries SHALL retain identity, recipe association, status, saved votes, candidate identities, meal slot and non-cooking details while their dates advance. Existing weekly plan status SHALL remain unchanged; a missing affected plan SHALL be created as Draft. Recipe occurrences SHALL be conserved even when the same recipe occurs more than once.

#### Scenario: Mixed future entries
- **WHEN** the chain contains a Locked recipe, a recipe-free Order In entry with a label and a recipe-backed Skipped entry
- **THEN** all three move one day with their distinct saved content retained

#### Scenario: Repeated recipe
- **WHEN** two different supper entries contain the same recipe
- **THEN** both occurrences survive at their respective next dates

### Requirement: Reject unsafe Tomorrow movement before mutation

Tomorrow SHALL require an explicit source index and matching recipe at supper slot zero. Missing or changed sources, Cooked entries in the source or displaced chain, and AwaitingConsensus entries SHALL reject without calendar, weekly plan or grocery mutation. Invalid dates, indices or a destination other than the source's next day SHALL reject before work. A rejected operation SHALL NOT report Recipe moved.

#### Scenario: Cooked entry blocks the chain
- **WHEN** any entry that would move is Cooked
- **THEN** the entire push rejects with conflict and every original entry and adjunct remains unchanged

#### Scenario: Stale source cannot select another occurrence
- **WHEN** the source date no longer contains the requested recipe but another date does
- **THEN** Tomorrow rejects with conflict without moving the other occurrence

#### Scenario: Pending consensus or invalid destination
- **WHEN** a chain entry awaits consensus or the supplied target is not the next calendar day
- **THEN** consensus rejects with conflict and invalid targeting rejects as bad input, both without mutation

### Requirement: Persist Tomorrow as one calendar change

All date shifts and any requested Order In source disposition SHALL commit together or leave persisted calendar content unchanged. Concurrent Tomorrow submissions SHALL NOT move one source occurrence twice or overwrite another entry. The response SHALL distinguish rejected movement from committed movement whose follow-up refresh is incomplete. Unknown transport outcomes SHALL NOT authorize blind repetition.

#### Scenario: Persistence fails during a shift
- **WHEN** persistence fails after some date updates have been attempted
- **THEN** no partial chain or source disposition is persisted

#### Scenario: Duplicate requests overlap
- **WHEN** two requests concurrently target the same source occurrence
- **THEN** at most one moves that occurrence and the other cannot repeat the push from a different source

### Requirement: Preserve non-cooking source disposition with Tomorrow

An explicit Order In source disposition SHALL leave a recipe-free Skipped Order In source and place its original recipe at tomorrow as Planned, retaining saved votes. Moving a legacy recipe-backed Skipped source SHALL likewise retain its non-cooking source details and transfer its recipe as Planned. Displaced Skipped entries SHALL instead move intact. Rejection SHALL leave the source unchanged.

#### Scenario: Order In and Tomorrow succeeds
- **WHEN** a planned source requests Order In with Tomorrow and the chain can move
- **THEN** the source becomes recipe-free Skipped Order In in the same commit as the chain, with one Planned occurrence of its original recipe tomorrow

#### Scenario: Order In and Tomorrow is blocked
- **WHEN** Order In with Tomorrow encounters a Cooked displaced entry
- **THEN** the original source remains unchanged and no Order In disposition is saved

### Requirement: Refresh every week touched by Tomorrow

After a Tomorrow commit, the system SHALL recompute groceries and attempt authoritative week snapshots and suggestion invalidation for every changed week using the captured deployment-calendar reference. Unrelated weeks and grocery check state SHALL be preserved. Follow-up failure SHALL report committed movement with incomplete refresh rather than an uncommitted rejection; live delivery remains household-live-updates-owned.

#### Scenario: Three or more affected weeks
- **WHEN** a successful push changes three or more weeks
- **THEN** all changed weeks have recomputed groceries and publication attempts, including the final spill week

#### Scenario: Publication or recomputation fails after commit
- **WHEN** follow-up work fails after calendar persistence
- **THEN** the result identifies the committed move and incomplete refresh, and a read reveals the conserved chain without repeating the push

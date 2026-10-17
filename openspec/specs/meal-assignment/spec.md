# Meal assignment Specification

## Purpose

Let household members choose recipes for dated planner slots, assign them, and resolve occupied targets through caller-specific recovery without conflating suggestions with persisted assignments.

## Evidence and qualifications (non-normative)

These requirements were relocated unchanged from the combined meal-planning specification. Applicable [historical qualifications](../meal-planning/spec.md#evidence-and-qualifications-non-normative) and the [durable meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) transfer with them, including BSL/U/A identifiers, partial-success limits and deferred runtime qualification. Relocation establishes no new API/browser/database/model guarantee.

## Related owners (non-normative)

Cross-capability requirement references resolve to the following authoritative owners:

- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Keep relative operations anchored to their intended calendar week](../deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)
- [Return seven dates from the deployment calendar week](../meal-planning/spec.md#requirement-return-seven-dates-from-the-deployment-calendar-week)
- [Compose voting suggestions separately from persisted assignments](../meal-planning/spec.md#requirement-compose-voting-suggestions-separately-from-persisted-assignments)
- [Submit dated-source movement through the protected operation](../meal-rescheduling/spec.md#requirement-submit-dated-source-movement-through-the-protected-operation)
- [Defer the exact dated recipe through a protected operation](../meal-rescheduling/spec.md#requirement-defer-the-exact-dated-recipe-through-a-protected-operation)
- [Delete the recipe-free entry before clear follow-up work](../meal-rescheduling/spec.md#requirement-delete-the-recipe-free-entry-before-clear-follow-up-work)


## Incoming Tomorrow reconciliation (non-normative)

The accepted Tomorrow change from upstream commit `8357a8bd` (PR #242, merged at `e4a48c85`) is incorporated under the current owners. Its normative blocks are copied exactly from upstream. This supersedes the original split snapshot only for the changed/added Tomorrow requirements; all other original blocks and evidence records remain intact. See the [upstream change design](../../changes/archive/2026-10-16-tomorrow-preserve-meals/design.md) and [recorded acceptance evidence](../../changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md). This reconciliation did not rerun application/runtime qualification.

- [Preserve the Tomorrow supper chain across weeks](../meal-rescheduling/spec.md#requirement-preserve-the-tomorrow-supper-chain-across-weeks)
- [Reject unsafe Tomorrow movement before mutation](../meal-rescheduling/spec.md#requirement-reject-unsafe-tomorrow-movement-before-mutation)
- [Persist Tomorrow as one calendar change](../meal-rescheduling/spec.md#requirement-persist-tomorrow-as-one-calendar-change)
- [Refresh every week touched by Tomorrow](../meal-rescheduling/spec.md#requirement-refresh-every-week-touched-by-tomorrow)

## Requirements

### Requirement: Carry an empty planner day into recipe selection

For an ordinary displayed day with no recipe ID and status other than three, the planner SHALL offer Quick Find and Search library from its planning pivot. Both paths SHALL carry that day's array index and the selected week offset. Search navigation SHALL use addToDay and weekOffset query parameters.

#### Scenario: Choose Quick Find for an empty day
- **WHEN** a person opens an ordinary empty day's pivot and chooses Quick Find
- **THEN** Quick Find opens with that day index and selected week offset

#### Scenario: Search from the pivot
- **WHEN** a person chooses Search library for day index two in week one
- **THEN** navigation targets /recipes?addToDay=2&weekOffset=1

### Requirement: Select a returned Quick Find recipe for the target day

Quick Find SHALL offer Select for an available recipe card and pass that recipe to the planner's selection handler. Select SHALL be disabled during suggestion loading, with no current recipe or on the terminal Search Library card. A targeted Search Library link SHALL retain the day index and week offset.

#### Scenario: Select an available card
- **WHEN** a person activates Select on a returned recipe card for the empty target
- **THEN** the planner receives that card's recipe identity, name and image reference for assignment

#### Scenario: Continue into targeted Search
- **WHEN** targeted Quick Find displays its terminal Search Library card
- **THEN** Select is disabled and its library link includes addToDay and weekOffset

### Requirement: Present the targeted recipe-detail planning action

Search with addToDay and weekOffset SHALL retain that target while opening recipe detail under recipe-library requirements. It SHALL offer Plan for the resolved day label using the loaded detail recipe. Assignment SHALL parse the two query values as base-ten integers and pass them as day index and week offset.

#### Scenario: Open detail in planning context
- **WHEN** a recipe detail is opened from Search targeting a specific planner day
- **THEN** detail offers the planning action for that target rather than requiring selection of another day

#### Scenario: Use the loaded recipe
- **WHEN** a person activates that planning action with a loaded recipe
- **THEN** the chosen recipe and parsed target are passed into assignment

### Requirement: Read the explicit Search target before assignment

The targeted Search path SHALL request the target week's schedule and inspect the indexed day's normalized recipe before posting. A usable ordinary empty target SHALL proceed to assignment; a target with a normalized recipe SHALL enter the occupied-slot recovery boundary instead. This read SHALL NOT establish an atomic empty-slot precondition.

#### Scenario: Ordinary empty target is returned
- **WHEN** the target read returns a dated ordinary day without a normalized recipe
- **THEN** Search proceeds to post the chosen recipe to that explicit week and index

#### Scenario: Target now has a recipe
- **WHEN** the target read returns a normalized recipe
- **THEN** the initial selection enters recovery rather than posting the new assignment directly

### Requirement: Submit chosen-recipe assignment through the protected operation

Chosen-recipe assignment SHALL send JSON weekOffset, dayIndex and recipeId to POST /api/schedule/assign. Names and image references SHALL remain browser display inputs. Access SHALL follow household-identity's Authenticate protected API requests independently requirement; the assignment action SHALL add no member-existence lookup.

#### Scenario: Submit the selected identity
- **WHEN** an authorized browser assigns recipe R to index two of week one
- **THEN** it posts weekOffset one, dayIndex two and recipeId R without name or image fields

#### Scenario: Household access is absent
- **WHEN** the POST has no accepted household credential
- **THEN** the shared API authentication gate rejects it independently of page access or member selection

### Requirement: Resolve assignment dates from the server week

Assignment SHALL resolve the requested week's Monday using the same deployment-calendar-relative week interpretation as Return seven dates from the deployment calendar week, then add dayIndex days. The posted target SHALL use relative week/index values rather than a client-supplied date.

#### Scenario: Assign Monday of the current week
- **WHEN** an accepted assignment uses weekOffset zero and dayIndex zero
- **THEN** its target date is Monday of the deployment-local current week

#### Scenario: Assign within another supported week
- **WHEN** an accepted assignment uses a supported relative week and an ordinary index from zero through six
- **THEN** its target date is that week's Monday plus the index in days

### Requirement: Ensure a weekly plan for assignment

Before creating the empty-date calendar entry, assignment SHALL ensure the requested week's weekly plan exists. A missing plan SHALL be created as Draft; an existing plan SHALL retain its week status through assignment. Planned day status SHALL remain distinct from Draft, VotingOpen and Locked week status.

#### Scenario: No weekly plan exists
- **WHEN** assignment reaches a week with no weekly plan and plan persistence succeeds
- **THEN** a Draft weekly plan exists for that Monday before calendar assignment is saved

#### Scenario: Existing week status is retained
- **WHEN** an ordinary empty date is assigned in a week with an existing Draft, VotingOpen or Locked plan
- **THEN** assignment leaves that week status unchanged

### Requirement: Persist a planned recipe entry for an empty date

When no calendar entry exists for the resolved date and assignment persistence succeeds, assignment SHALL create a new calendar entry with a generated identity, that date, the chosen recipe ID, default meal slot zero and day status Planned zero.

#### Scenario: Empty date receives the chosen recipe
- **WHEN** the resolved date has no calendar entry and the save succeeds
- **THEN** a new Planned entry associates the chosen recipe with that date

#### Scenario: Default supper slot
- **WHEN** an empty-date assignment creates an entry without a supplied meal slot
- **THEN** the entry uses meal slot zero

### Requirement: Invoke assignment follow-up work in order

After the calendar save succeeds, assignment SHALL await the target week's grocery recomputation, retrieve its schedule, attempt week_updated publication and then attempt fill_the_gap_invalidated publication for that offset, passing the request's connection exclusion identity to those two publications. Delivery and browser application SHALL remain governed by household-live-updates.

#### Scenario: Follow-up work completes
- **WHEN** empty-date persistence and all follow-up work complete without throwing
- **THEN** recomputation precedes schedule retrieval, which precedes week publication and then fill-the-gap invalidation

#### Scenario: Follow-up rejects
- **WHEN** an awaited follow-up step throws after calendar persistence
- **THEN** assignment does not reach its successful response through that invocation

### Requirement: Return the assignment success envelope

When empty-date assignment and its awaited follow-up work complete, the API SHALL return 200 with data.message equal to Recipe assigned and data.displacedRecipe null. The selected browser callers SHALL await completion without requiring either response field to continue.

#### Scenario: Empty-date operation completes
- **WHEN** the protected empty-date assignment completes successfully
- **THEN** the response contains data.message and null data.displacedRecipe

#### Scenario: Browser completion does not depend on the message
- **WHEN** the selected browser caller's assignment request resolves
- **THEN** it continues its local follow-up without inspecting the response message or displacement data

### Requirement: Show the chosen recipe optimistically in Planner

Planner's empty-day selection SHALL immediately display the chosen recipe ID, name and image reference on the indexed day, set day status zero and clear non-cooking metadata before awaiting the POST. Other displayed days SHALL retain their content at this optimistic step.

#### Scenario: Assignment is pending
- **WHEN** the person selects a Quick Find recipe for an ordinary empty displayed day
- **THEN** that day shows the chosen recipe while assignment is pending

#### Scenario: Other days are displayed
- **WHEN** the optimistic indexed-day update is applied
- **THEN** the other day entries retain their prior content

### Requirement: Read assignment adjuncts after the Planner post

After its POST resolves, Planner's assignment path SHALL request a schedule read using the then-loaded week offset. Usable data SHALL update grocery items, week status and synchronization time without replacing the optimistic days through this follow-up. An unusable resolved read SHALL leave those adjuncts unchanged.

#### Scenario: Follow-up data is usable
- **WHEN** the Planner follow-up returns usable schedule data
- **THEN** grocery items use the supplied list or an empty list, week status uses the returned value or zero, and synchronization time advances

#### Scenario: Follow-up resolves without usable data
- **WHEN** that read resolves without usable schedule data
- **THEN** assignment returns without updating those adjuncts through this read

### Requirement: Finish or recover the Planner Quick Find selection

After Planner assignment and its follow-up read resolve, the planner SHALL close Quick Find and clear selection/pivot handoff state. If either rejects, it SHALL restore the captured pre-assignment local schedule, request week initialization, then show an error toast while leaving the Quick Find selection available unless dismissed separately. Local restoration SHALL NOT imply server rollback.

#### Scenario: Quick Find selection completes
- **WHEN** assignment and its follow-up read resolve for the empty target
- **THEN** Quick Find closes and selected-day and pending pivot handoff state clear

#### Scenario: Assignment path rejects
- **WHEN** the POST or Planner follow-up read rejects without separate dismissal
- **THEN** local restoration is attempted, week initialization is requested, and Quick Find remains available with error feedback inviting another attempt

### Requirement: Show pending targeted detail submission and allow another attempt

During the awaited recipe-detail planning action, the detail sheet SHALL disable its primary planning action. When the callback settles it SHALL release that pending state. A targeted Search assignment failure SHALL retain the loaded detail and clear the page's assignment state so the person can activate the action again.

#### Scenario: Detail planning action is pending
- **WHEN** the targeted detail callback has not settled
- **THEN** its primary planning action is disabled

#### Scenario: Targeted assignment fails
- **WHEN** the targeted Search read or assignment rejects while detail remains open
- **THEN** detail remains available and the planning action becomes available for another attempt

### Requirement: Return targeted Search assignment to Planner

After its explicit-target assignment POST resolves, Search SHALL request navigation to /planner with success=1, dayIndex and weekOffset for that target. Planner SHALL use a truthy success query and supplied dayIndex to request scrolling to that card and display a temporary success ring. Reading the returned week SHALL follow the promoted initialization requirements; the ring SHALL NOT establish persistence or freshness.

#### Scenario: Search assignment resolves
- **WHEN** explicit-target Search assignment resolves for index two in week one
- **THEN** navigation targets /planner?success=1&dayIndex=2&weekOffset=1

#### Scenario: Planner receives success feedback parameters
- **WHEN** Planner receives a truthy success value and a dayIndex
- **THEN** it requests smooth centered scrolling to the matching card if present and clears its highlight after approximately three seconds

### Requirement: Advance Quick Find suggestions without changing the plan

Quick Find SHALL use Skip to advance from a returned recipe to the next card, then offer Start Over on its terminal library card. Advancing SHALL reset the flipped view without submitting assignment, move, defer, removal or validation. With no returned recipes it SHALL disable advancement and show No more picks.

#### Scenario: Skip a suggestion
- **WHEN** a person activates Skip with a returned recipe displayed
- **THEN** the next card is displayed without changing the scheduled assignment

#### Scenario: Restart or exhaust the deck
- **WHEN** the terminal card is displayed with recipes available, or no recipes were returned
- **THEN** Start Over returns to the first card in the former case and advancement is disabled in the latter

### Requirement: Enter recovery before replacing an occupied Planner day

When a selected Quick Find recipe targets a displayed day with a recipe ID and date, Planner SHALL close Quick Find and retain the old slot and new recipe for recovery. Recovery SHALL offer Move to Tomorrow, Save for Next Week and Just Drop Tonight, plus Back and Close. Dismissal before action SHALL clear the pending choice without submitting replacement.

#### Scenario: Occupied Quick Find target
- **WHEN** a person selects a replacement for a displayed dated recipe-backed day
- **THEN** recovery opens without first posting that replacement

#### Scenario: Dismiss the recovery choice
- **WHEN** Back or Close is activated before an action starts
- **THEN** pending recovery clears without submitting a replacement through that dismissal

### Requirement: Resolve the previous Planner meal before replacement

Planner recovery SHALL await the selected prior-meal operation before assigning the chosen replacement. Tomorrow SHALL request Tomorrow movement to the next day, using next-week Monday from Sunday, and require committed movement before replacement. Save for Next Week SHALL submit exact source date, recipe ID and captured source offset plus one to defer, retaining the captured reference Monday. Drop SHALL request date deletion. These separate requests SHALL NOT imply an atomic replacement.

#### Scenario: Move to tomorrow
- **WHEN** recovery chooses Tomorrow for a day from Monday through Saturday
- **THEN** a same-week Tomorrow operation with explicit source index commits before replacement assignment starts

#### Scenario: Sunday or next-week choice
- **WHEN** recovery chooses Tomorrow on Sunday or Save for Next Week on any day
- **THEN** it respectively requests next-offset Monday movement or explicit-date defer starting at captured source offset plus one before replacement

#### Scenario: Quick Replace while planning next week
- **WHEN** the captured reference Monday is October 12, 2026, the occupied source is October 21 at offset one, and Quick Replace recovery chooses Save for Next Week
- **THEN** the prior recipe is deferred starting October 26 at offset two, followed by assignment of the selected replacement to October 21
- **AND** an earlier free slot in October 19–25 is not selected for the prior recipe

#### Scenario: Current-week recovery
- **WHEN** Quick Replace recovery chooses Save for Next Week for a source in captured offset zero
- **THEN** the prior recipe's destination search begins at offset one

#### Scenario: Captured recovery survives calendar rollover
- **WHEN** recovery captures reference Monday October 12 and source October 21 at offset one, but requests complete after deployment Monday October 19 begins
- **THEN** deferral still starts October 26 and replacement still targets October 21

#### Scenario: Drop prior assignment
- **WHEN** recovery chooses Drop
- **THEN** it awaits deletion for the captured date before assigning the replacement

### Requirement: Retain completed Planner recovery work across replacement failure

Planner SHALL suppress additional recovery submissions while its handler is pending. Once prior-meal resolution returns, it SHALL remember that completion while recovery remains open. Rejection SHALL request week initialization and show distinct move-failed or replacement-failed feedback. Retrying after remembered resolution SHALL attempt replacement without repeating the prior-meal operation.

#### Scenario: Repeated activation while pending
- **WHEN** the recovery action is activated again before its handler settles
- **THEN** no second recovery submission starts through that mounted handler

#### Scenario: Prior-meal operation fails
- **WHEN** prior-meal resolution rejects before completion is remembered
- **THEN** replacement is not submitted, recovery remains available and refresh plus move-failed feedback are requested

#### Scenario: Replacement fails after prior resolution
- **WHEN** the replacement assignment rejects after prior-meal resolution returned
- **THEN** recovery remains available with refresh and replacement-failed feedback, and retry omits the remembered prior operation

### Requirement: Complete Planner recovery after awaited assignment

After replacement assignment and its store follow-up resolve, Planner SHALL clear recovery and pivot selection, then request selected-week initialization. For a captured week-zero slot whose date is deployment-local today, it SHALL also invoke Today's assignment path. These follow-ups SHALL NOT establish a single request or combined-store transaction.

#### Scenario: Replacement is still pending
- **WHEN** the store assignment has not settled
- **THEN** the recovery-success initialization has not started

#### Scenario: Replacement resolves
- **WHEN** replacement and its store follow-up resolve
- **THEN** recovery closes and week initialization is requested after local selection state clears

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await the explicit Tomorrow operation, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, while Planner uses deferral starting at its captured offset plus one

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Replace a stored assignment at the resolved date

When requireEmpty is omitted or false, for a supported occupied-date assignment whose persistence succeeds, the selected stored entry SHALL retain its identity/date, receive the chosen recipe ID, become Planned and clear non-cooking metadata. Existing week status SHALL remain unchanged. The accepted protected assignment and deployment-calendar-relative date requirements SHALL apply; no expected-recipe precondition is implied.

#### Scenario: Replace an ordinary recipe
- **WHEN** assignment saves against an occupied non-Sunday date
- **THEN** that stored entry contains the chosen recipe in Planned state without separately relocating the old recipe through assignment

#### Scenario: Replace skipped content
- **WHEN** assignment saves against a skipped entry
- **THEN** the selected entry becomes Planned with the chosen recipe and no non-cooking kind or label

### Requirement: Report Sunday carry-forward after replacement follow-ups

When requireEmpty is omitted or false and assigning Sunday displaces a stored recipe, assignment SHALL ensure the following week's plan and place that prior recipe on its Monday as Planned. With no Monday entry it SHALL create one. The response SHALL report prior recipe identity/name and destination offset/index under data.displacedRecipe only after all awaited follow-ups complete. Destination collision policy remains qualified outside this draft.

#### Scenario: Following Monday is absent
- **WHEN** Sunday replacement persists with a prior recipe and no next-Monday entry
- **THEN** that prior recipe is added to next Monday and the completed response identifies the destination as next offset and index zero

#### Scenario: Additional follow-up fails
- **WHEN** destination recomputation or publication throws after source persistence and source follow-ups
- **THEN** successful assignment response is not reached without establishing rollback of either saved date

### Requirement: Present Quick Find reads and failed-read retention

Opening Quick Find or changing its week offset SHALL request suggestions for that offset. Initial loading SHALL show Curating your stack and disable selection/advancement. A rejected suggestion read SHALL be logged and end loading without clearing an existing deck or showing dedicated Retry feedback. With no retained recipes the modal SHALL show No recipes found.

#### Scenario: Initial request is pending
- **WHEN** Quick Find opens before its first suggestion request settles
- **THEN** loading feedback appears and selection/advancement are disabled

#### Scenario: Suggestion request rejects
- **WHEN** the current suggestion request rejects
- **THEN** loading ends with any existing deck retained, or the no-recipes view if no deck exists

### Requirement: Reconcile Quick Find after an eligible invalidation signal

After initial fetching completes, Quick Find SHALL refetch when its week's nonzero invalidation version exceeds the last handled version. Only its latest outstanding fetch SHALL update the deck or finish loading. Replacement data SHALL clamp the current index to the new terminal-card boundary. Signal delivery SHALL remain household-live-updates-owned.

#### Scenario: Another week is invalidated
- **WHEN** only another week's invalidation version advances
- **THEN** the open modal does not refetch for that signal

#### Scenario: Newer fetch finishes before an older one
- **WHEN** a newer invalidation fetch applies before an older request resolves
- **THEN** the older result does not replace that applied deck

#### Scenario: Refreshed deck shrinks
- **WHEN** replacement suggestions have fewer recipe cards than the current index
- **THEN** the displayed index is clamped to the new terminal card

### Requirement: Inspect and dismiss the Quick Find deck

A nonterminal recipe card SHALL toggle between name/image/time and description/ingredient views on activation. Quick Find SHALL display one progress indicator per returned recipe plus its terminal card. Close or backdrop activation SHALL dismiss the modal without selecting a recipe through that dismissal. Closing SHALL retire outstanding fetch results for that mount.

#### Scenario: Inspect recipe details
- **WHEN** a person activates a returned recipe card
- **THEN** its description/ingredients view toggles without submitting assignment

#### Scenario: Close before selection
- **WHEN** a person closes Quick Find with a suggestion request still outstanding
- **THEN** the modal dismisses without assignment and that mount's late fetch result is retired

### Requirement: Find first-open placement after deployment-local today

Search and Browse Plan for Later SHALL start scanning after the deployment-local current weekday, advancing to offset one/index zero on Sunday. They SHALL inspect returned weeks in order for a day at or after the starting index with status other than Skipped and no normalized recipe. The default scan SHALL stop after 520 relative weeks and return no target if none is found.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** Plan for Later starts on deployment-local Sunday
- **THEN** scanning begins at offset one, index zero rather than offset-zero Monday

#### Scenario: Scan finds no target
- **WHEN** all 520 inspected relative weeks contain no eligible returned date
- **THEN** the helper returns no target and the caller does not submit assignment through that result

### Requirement: Assign first-open placement through the shared assignment operation

After first-open scanning returns a target, Search and Browse SHALL assign the chosen recipe through the accepted assignment operation and navigate to that planner offset/index with success=1 after the request resolves. The separate read SHALL NOT reserve an empty date. Missing schedule data SHALL allow scanning to continue; request rejection SHALL interrupt the scan.

#### Scenario: First-open assignment resolves
- **WHEN** a target is returned and the assignment request resolves
- **THEN** navigation identifies that returned offset/index with planner success feedback parameters

#### Scenario: Week read is absent or rejects
- **WHEN** a scanned week has no usable days or its request rejects
- **THEN** absent data advances scanning while rejection stops that invocation without reserving a target

### Requirement: Gate every Tomorrow recovery caller on committed movement

Planner, Search and Browse Tomorrow recovery SHALL require a committed movement result before assigning a retained replacement. Rejection SHALL retain recovery context and display feedback without replacement. Pending actions SHALL suppress duplicate submission; unknown outcomes SHALL require rereading before retry. Known committed moves SHALL NOT repeat during refresh recovery.

#### Scenario: Shared recovery receives a rejected or unknown movement result
- **WHEN** Planner, Search or Browse receives a conflict or cannot establish whether Tomorrow committed
- **THEN** it retains the pending choice, does not assign replacement and requires reconciliation before another move

### Requirement: Guard recovery assignment against occupied supper slots

POST /api/schedule/assign SHALL accept optional boolean requireEmpty, default false. When true, it SHALL require an explicit valid reference Monday and dayIndex zero through six, and atomically assign only if no calendar entry exists at the resolved date's supper slot zero. Any existing supper entry SHALL return 409 without mutation or displacement. An invalid guarded target SHALL return 400 before mutation. Access SHALL retain the protected assignment gate.

#### Scenario: Guarded recovery saves to the captured empty date
- **WHEN** an authorized guarded assignment uses reference October 5, offset zero, index six and no supper entry exists on October 11
- **THEN** the chosen recipe is saved Planned to supper on October 11 and the existing success envelope has null displacedRecipe

#### Scenario: Another member occupied Tonight
- **WHEN** requireEmpty is true and a supper entry exists for another recipe, the chosen recipe, non-cooking content or a completed meal
- **THEN** the response is 409 and calendar entries, weekly plans, groceries and publication state are unchanged by that rejected invocation

#### Scenario: Sunday conflict cannot carry forward
- **WHEN** a guarded Sunday assignment finds an existing supper entry and following Monday is occupied
- **THEN** it returns 409 without changing either date or carrying any recipe forward

#### Scenario: Competing guarded saves
- **WHEN** two guarded assignments race to save different recipes into the same empty supper slot
- **THEN** at most one commits, the other returns 409, and only one supper entry exists without displacement

#### Scenario: Invalid captured target
- **WHEN** a guarded request omits its reference, uses a malformed or non-Monday reference, or has dayIndex outside zero through six
- **THEN** it returns 400 without changing any calendar entry or weekly plan

#### Scenario: Another meal slot exists
- **WHEN** only a non-supper entry exists on the target date and guarded supper assignment succeeds
- **THEN** that other entry is unchanged and the new supper entry uses meal slot zero

#### Scenario: Legacy caller
- **WHEN** requireEmpty is omitted or false
- **THEN** the existing assignment replacement, Sunday carry-forward, response and failure behavior remain unchanged

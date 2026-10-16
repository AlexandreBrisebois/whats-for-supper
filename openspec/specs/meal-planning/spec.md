# Meal planning Specification

## Purpose

Let household members read and navigate planner weeks, understand displayed schedule content and distinguish successful reads from retained or suggested content. This initial baseline slice covers existing week reading without defining planning mutations or suggestion policy.

## Evidence and qualifications (non-normative)

Promoted under A84 from the reviewed `baseline-meal-planning-week-reading-navigation` delta. BSL-meal-planning-001–006 in the [durable plan](../../../docs/openspec-baseline-plan.md) records complete requirement/scenario mappings, source identities, inspected assertions and promotion evidence. Runtime/API/browser/network/database/model qualification remains deferred under A34.

U102–U109 preserve initialization/request-ordering gaps, callable sync versus actual refresh wiring, separate snapshot queries and meal-slot projection limits, contract/offset discrepancies, silent failed reads, mixed UTC/local date handling, substituted assertion limits and independent REST/live writers. U95–U101, including conditional snapshot application and grocery representation limitations, remain intact. No immediate freshness, atomic multi-request loading, latest-request-wins, timezone equivalence, complete convergence or guaranteed recovery is established.

Household-identity owns access/member context, household-live-updates owns connection and snapshot reconciliation, recipe-library owns library visibility and background-processing owns lifecycle state. Suggestion generation/ranking and planner mutations remain outside this slice. A69, feature-enabled PDF/U70–U74, U01/U75–U101 and all historical qualifications remain intact. Promotion is documentation only; the source change remains active.

Assignment promotion A86 (2026-10-16) adds the reviewed `baseline-meal-planning-empty-day-recipe-assignment` requirements below. BSL-meal-planning-007–013 and U110–U115 in the [meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) retain complete mappings, source identities and inspected assertion limits. The original Purpose and week-reading requirements remain unchanged; this additional slice covers chosen-recipe assignment to an ordinary empty day.

Occupied-target overwrite/races, incomplete semantic validation and response-contract precision, separately persisted work followed by fallible side effects, overlapping browser requests and the second Today assignment remain qualified. No atomic empty-slot precondition, eligibility enforcement, idempotency, exact rollback, one-request guarantee, persistence inference from UI feedback or guaranteed convergence is established. Runtime qualification remains not-run under A34. This documentation promotion leaves the change active and does not authorize archival, application work or another slice.

Non-cooking promotion NC-A02 (2026-10-16) adds the reviewed `baseline-meal-planning-non-cooking-day-plans` 19-requirement/44-scenario delta below. BSL-meal-planning-014–021 in the [meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) preserves complete mappings, source identities and inspected assertion limits. The original Purpose and all prior 30 requirements/70 scenarios remain unchanged.

U116–U122 retain pending-entry reachability limits, mounted-sheet versus request/navigation guards, EF/install/compatibility constraint differences, date/meal-slot and relational concurrency limits, persistence before fallible follow-up work, date-only clear compatibility, independent Today reconciliation and substituted assertion/contract precision limits. Preserve U95–U115 and all earlier qualifications. No universal constraint parity/enforcement, atomic reservation, idempotency, exact rollback, safe retry, persistence inference from feedback, immediate Today freshness or guaranteed convergence is established. Runtime qualification remains not-run under A34. This promotion is documentation only; the source change remains active without archival or application implementation.

Remaining-scope promotion MP-P01 (2026-10-16) adds the five reviewed MP-G01 deltas: occupied-recipe-replacement (11/25), recipe-movement (9/21), deferral-removal (8/19), week-day-transitions (11/24) and overdue-api-boundaries (5/11), each prefixed baseline-meal-planning in the active change inventory. Their 44 requirements/100 scenarios are appended verbatim; main meal-planning now contains 93 requirements/214 scenarios. BSL-meal-planning-022–037 and the final exact mappings in the [meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) retain source identities, inspected assertions and ownership dispositions. The original Purpose, prior 49/114 blocks and earlier evidence paragraphs remain unchanged.

MP-U01–MP-U12 remain non-normative limitations: separate requests and persistence before fallible follow-ups; caller-specific recovery and unsafe-retry boundaries; Sunday destination collisions and stale vote fields; first-by-date/global recipe fallback and relational/concurrency limits; move no-op success and incomplete cross-week follow-ups; distinct browser/server availability/date semantics; cooked-history and metadata differences; lock state regression/global vote-clearing qualifications; disputed status-one vocabulary; navigation/optimistic races; overdue scheduling/publication limits; and substituted/contract-only evidence. Preserve A34, U95–U122 and all earlier qualifications. Acceptance/promoting the supported documentation does not settle these disputed policies, establish runtime behavior or authorize repairs. Discovery/voting eligibility, groceries, cooking history, Tonight and live delivery remain owner capabilities. All five source changes remain active; no archival or application implementation occurs.

## Requirements

### Requirement: Initialize week reading from shell and planner entry

The mounted app shell SHALL request current-week initialization when the loaded week offset is zero. Planner entry SHALL request initialization for its selected week, and SHALL request it again when that selection or the success query value changes. These requests SHALL NOT imply a single shared initialization transaction.

#### Scenario: Shell has the initial offset
- **WHEN** the app shell mounts while the loaded offset is zero
- **THEN** it requests initialization for offset zero

#### Scenario: Shell sees another selected week
- **WHEN** the app shell mounts while the loaded offset is nonzero
- **THEN** it does not request offset-zero initialization from its initializer

#### Scenario: Planner selection or success changes
- **WHEN** the planner mounts or its selected offset or success query value changes
- **THEN** it requests initialization for the selected offset

### Requirement: Select the planner week from the URL

The planner SHALL interpret an absent weekOffset query as zero and a present value using base-ten integer-prefix parsing. A finite parsed value different from the selection SHALL select that offset. A nonfinite result SHALL leave the selection unchanged.

#### Scenario: Offset is absent
- **WHEN** the planner reads a URL with no weekOffset
- **THEN** it selects zero if another offset was selected

#### Scenario: Integer prefix is present
- **WHEN** the planner reads weekOffset=-2 or weekOffset=1suffix
- **THEN** it selects -2 or 1 respectively if different from the current selection

#### Scenario: Offset is not parseable
- **WHEN** the planner reads weekOffset=abc
- **THEN** the invalid result leaves its selected offset unchanged

### Requirement: Navigate relative weeks and return to this week

The planner SHALL offer Previous week and Next week controls that request the selected offset minus or plus one through URL replacement. It SHALL offer Back to this week for nonzero offsets. URL replacement SHALL preserve other query parameters, omit weekOffset for zero and include it otherwise.

#### Scenario: Navigate forward or backward
- **WHEN** a person activates Next week or Previous week
- **THEN** the planner requests URL replacement with the selected offset incremented or decremented by one

#### Scenario: Return to zero
- **WHEN** a person activates Back to this week from a nonzero offset
- **THEN** the planner requests its URL without weekOffset while preserving other query parameters

### Requirement: Read the household schedule through the protected GET operation

GET /api/schedule SHALL apply household-identity API authentication and accept an optional integer weekOffset defaulting to zero. This schedule action SHALL NOT add an endpoint-specific member-existence check. Successful reads SHALL return 200 with the schedule under data.

#### Scenario: Default week read
- **WHEN** an authorized GET /api/schedule omits weekOffset and retrieval succeeds
- **THEN** 200 data contains the offset-zero schedule

#### Scenario: Explicit week read
- **WHEN** an authorized GET supplies a representable offset and retrieval succeeds
- **THEN** 200 data identifies that requested offset

#### Scenario: No household access
- **WHEN** GET /api/schedule has no accepted household credential
- **THEN** the shared API authentication gate rejects it independently of planner page access

### Requirement: Return seven dates from the server UTC week

A successful schedule read SHALL return seven entries in Monday-through-Sunday order for the Monday containing the server UTC current date plus the requested number of weeks. Entries SHALL use Mon through Sun and yyyy-MM-dd dates. Missing calendar entries SHALL still produce dated empty days with planned status zero.

#### Scenario: Read a supported relative week
- **WHEN** schedule retrieval succeeds at offset -1, 0 or 1
- **THEN** its seven dates span that relative Monday through Sunday inclusive

#### Scenario: No calendar entry exists
- **WHEN** the selected week has a date with no stored calendar entry
- **THEN** the response includes that date with no recipe and day status zero

### Requirement: Project stored recipe and non-cooking read content

A schedule day SHALL expose its selected stored calendar entry status and available related recipe facts. A recipe-free skipped entry SHALL expose non-cooking kind and label, defaulting absent kind to order_in. Recipe-backed skipped entries SHALL retain their recipe representation without a non-cooking plan.

#### Scenario: Related recipe is available
- **WHEN** the selected calendar entry has a loaded related recipe
- **THEN** the day returns its ID, name, hero reference, saved vote count, ingredient strings, description and total time

#### Scenario: Recipe-free skipped entry
- **WHEN** the selected entry has status three and no recipe ID
- **THEN** the day returns its non-cooking kind or order_in fallback and stored label

#### Scenario: Legacy skipped recipe entry
- **WHEN** the selected status-three entry still has a recipe association
- **THEN** its loaded recipe remains in the response and nonCooking is null

### Requirement: Read week status and stored adjuncts without creating a plan

The schedule SHALL report the selected weekly plan status as zero Draft, one VotingOpen or two Locked and locked as true only for Locked. With no plan it SHALL report Draft and unlocked. Available stored grocery state and items SHALL be returned as adjuncts without a read-time recomputation or plan creation.

#### Scenario: Weekly plan exists
- **WHEN** a supported stored weekly-plan status is read successfully
- **THEN** the response reports that status and its derived locked flag with available stored adjuncts

#### Scenario: Weekly plan is absent
- **WHEN** the selected week has no stored weekly plan and retrieval succeeds
- **THEN** the response reports status zero, locked false and null grocery adjuncts without creating a plan

### Requirement: Use enveloped schedule data for browser initialization

The browser schedule reader SHALL request the selected weekOffset and accept data only when its weekOffset is defined. Initialization SHALL use returned days, status defaulting to zero and supplied grocery items or an empty list. A missing days collection SHALL produce an empty displayed schedule.

#### Scenario: Usable response arrives
- **WHEN** initialization receives usable enveloped schedule data for its still-selected request
- **THEN** it builds displayed days from that response and updates week status and synchronization time

#### Scenario: Envelope or offset is absent
- **WHEN** the generated read resolves without data carrying a defined weekOffset
- **THEN** the browser reader yields no usable schedule

#### Scenario: Days are absent
- **WHEN** otherwise usable initialization data has no days collection
- **THEN** initialization builds no day cards

### Requirement: Compose voting suggestions separately from persisted assignments

Initialization SHALL request suggestions for the same requested offset only when returned week status is VotingOpen. Persisted recipe content SHALL take precedence; skipped days SHALL not receive suggestions. An ordinary day without a recipe SHALL display a matching day-index suggestion as pending when one is available. This composition SHALL NOT persist an assignment.

#### Scenario: Draft or locked read
- **WHEN** initialization receives Draft or Locked status
- **THEN** it builds days without requesting suggestions for that initialization

#### Scenario: Voting read
- **WHEN** initialization receives VotingOpen and the requested week remains selected
- **THEN** it requests suggestions for that offset and marks eligible composed suggestions pending

#### Scenario: Suggestions are unavailable
- **WHEN** suggestion retrieval throws or supplies no usable data
- **THEN** initialization can complete from schedule data without adding those suggestions

### Requirement: Discard initialization results for a different selected offset

Initialization SHALL check that its requested offset remains selected after schedule retrieval and again after any suggestion retrieval. When it differs at either check, that invocation SHALL return without applying its successful read content. This offset comparison SHALL NOT establish ordering between requests for the same offset.

#### Scenario: Navigate before schedule completes
- **WHEN** initialization for zero completes successfully after the loaded selection changed to one
- **THEN** its result does not replace the loaded week-one days

#### Scenario: Navigate while suggestions load
- **WHEN** the loaded offset changes while an initialization suggestion request is pending
- **THEN** that invocation does not apply its combined read content

### Requirement: Show pending initialization without clearing loaded days

Initialization SHALL mark loading while retaining previously loaded content. The planner SHALL show Curating your week loading feedback when loading and no days exist. With existing days it SHALL continue rendering content while the read is pending.

#### Scenario: First read is pending
- **WHEN** loading is true and the displayed schedule is empty
- **THEN** the planner shows its loading indicator and Curating your week feedback

#### Scenario: Another read is pending
- **WHEN** loading is true with existing displayed days
- **THEN** the planner keeps its content rather than replacing it with the initial loading indicator

### Requirement: Retain content after missing or failed initialization reads

When initialization receives no usable schedule or catches a read failure, it SHALL end loading without clearing existing days, status or synchronization time. This path SHALL display no dedicated read-failure or Retry control. An empty retained schedule SHALL render no day cards and retain the Loading date-heading fallback.

#### Scenario: No usable response
- **WHEN** initialization receives no usable schedule while its requested offset remains selected
- **THEN** it ends loading and retains the previously loaded content

#### Scenario: Read rejects
- **WHEN** an initialization read throws
- **THEN** its catch ends loading without clearing the existing schedule or showing dedicated read-error feedback

#### Scenario: No content has ever loaded
- **WHEN** the read has ended without usable content and the schedule remains empty
- **THEN** no day cards render and the date heading still shows Loading...

### Requirement: Render the selected label and loaded date range

The planner SHALL label offset zero This week, offset one Next week and other offsets with its Week label and offset. With at least seven loaded days it SHALL format the first and seventh dates using UTC month/day values; otherwise it SHALL show Loading... for that heading. Selected offset labels SHALL remain distinct from loaded-date content.

#### Scenario: Standard offset labels
- **WHEN** the selected offset is zero, one or another finite offset
- **THEN** the label is This week, Next week or the corresponding Week label

#### Scenario: Loaded range
- **WHEN** at least seven days are displayed
- **THEN** the heading formats their first and seventh dates, repeating month only when the UTC months differ

#### Scenario: Selection changes before content
- **WHEN** a new offset is selected while old days remain
- **THEN** the selected label can change while the heading and cards still reflect retained dates

### Requirement: Render day content and planned count from displayed state

The planner SHALL render displayed days in their supplied order. Status-three days SHALL use non-cooking presentation before recipe presentation. Other days with recipe IDs SHALL display recipe names; ordinary days without them SHALL offer Plan supper. The planned count SHALL count displayed recipes with IDs, including pending suggestions.

#### Scenario: Empty persisted week
- **WHEN** a successful read returns seven ordinary empty dates and no suggestions apply
- **THEN** the planner renders seven Plan supper day cards

#### Scenario: Recipe and non-cooking presentation
- **WHEN** a day has status three or an ordinary day has a recipe ID
- **THEN** status three selects non-cooking presentation; an ordinary recipe displays its name

#### Scenario: Pending recipe contributes to count
- **WHEN** a displayed suggestion has a recipe ID and pending marker
- **THEN** it contributes to the displayed planned count without proving a persisted assignment

### Requirement: Display read week status without implying a transition

The planner SHALL derive voting-open and locked display state from the loaded numeric week status. VotingOpen SHALL show the voting signal, Nudge family and Close Voting. Draft or Locked SHALL offer Ask the Family when the loaded week is not past. A loaded seven-day week SHALL be considered past when its Sunday date precedes the browser-local current date.

#### Scenario: Voting status is loaded
- **WHEN** the displayed week status is one
- **THEN** the planner shows its voting signal and voting controls without a separate voting-status badge

#### Scenario: Draft or locked non-past week
- **WHEN** the loaded status is zero or two and its week is not past
- **THEN** the planner offers Ask the Family

#### Scenario: Past week
- **WHEN** seven loaded dates have Sunday before the browser-local current date and status is zero or two
- **THEN** the planner omits Ask the Family

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

Assignment SHALL resolve the requested week's Monday using the same server UTC-relative week interpretation as Return seven dates from the server UTC week, then add dayIndex days. The posted target SHALL use relative week/index values rather than a client-supplied date.

#### Scenario: Assign Monday of the current week
- **WHEN** an accepted assignment uses weekOffset zero and dayIndex zero
- **THEN** its target date is Monday of the server UTC current week

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

### Requirement: Offer recipe-free Other plans from a dated planner pivot

For a displayed dated day without a recipe ID in a selected offset of zero or greater, Planner SHALL offer Other plans, or Edit supper plan for status three, from its pivot in Draft, VotingOpen and Locked weeks. It SHALL retain that displayed date and selected offset when opening the sheet. Recipe-backed skipped entries SHALL NOT receive this recipe-free edit action.

#### Scenario: Ordinary empty date
- **WHEN** a person opens an empty dated day's pivot in a nonnegative selected week
- **THEN** Other plans opens the supper-plan sheet for that date and offset without assigning a recipe

#### Scenario: Edit recipe-free skipped date
- **WHEN** a person opens a recipe-free status-three day's pivot in a nonnegative selected week
- **THEN** it offers Edit supper plan and Remove supper plan

#### Scenario: Past offset or legacy recipe-backed skip
- **WHEN** the selected offset is negative or the skipped day has a persisted recipe ID without a pending marker
- **THEN** the pivot omits the recipe-free Other plans edit action

### Requirement: Initialize a date-specific supper-plan draft

A newly mounted sheet SHALL show its selected date, initialize kind and message from the captured plan, and default an absent kind to mystery and an absent message to empty. It SHALL present Mystery night, Order In, Eating out and We made plans in that order. A new date/offset target SHALL initialize a separate draft.

#### Scenario: New plan
- **WHEN** a sheet opens without an existing plan
- **THEN** Mystery night is selected first and no message input is displayed

#### Scenario: Existing plan
- **WHEN** a sheet mounts with an existing kind and customLabel
- **THEN** it selects that kind and initializes the message to that label

### Requirement: Retain the message while switching non-cooking choices

The sheet SHALL show Tell the family the plan for order_in, eating_out and custom, and hide it for mystery. Switching choices SHALL retain the local message and clear choice-level error feedback. Saving mystery SHALL send a null label even when a hidden message draft exists.

#### Scenario: Return to a typed message
- **WHEN** a person types a custom message, selects Mystery night and returns to We made plans in the same sheet
- **THEN** the typed message remains available

#### Scenario: Save the mystery choice
- **WHEN** Mystery night is saved after typing another choice's message
- **THEN** the submitted plan uses kind mystery and customLabel null

### Requirement: Validate and normalize non-cooking message submission

Before save, the sheet SHALL trim the message, require a nonblank custom message and reject non-mystery messages longer than 80 Unicode code points after trimming. Optional blank order_in/eating_out notes SHALL submit null. Invalid input SHALL focus the input and show Enter a message with 1–80 characters. Clear SHALL bypass message validation.

#### Scenario: Blank custom message
- **WHEN** We made plans is saved with only whitespace
- **THEN** validation feedback appears and no save callback is invoked

#### Scenario: Optional note and length limit
- **WHEN** an order_in or eating_out message contains surrounding spaces and at most 80 code points after trimming
- **THEN** submission sends its trimmed content or null if blank

#### Scenario: Message exceeds the limit
- **WHEN** a non-mystery message exceeds 80 code points after trimming
- **THEN** submission is rejected locally with validation feedback

### Requirement: Dismiss an unsubmitted supper-plan draft

While idle, Close, backdrop activation and Escape SHALL dismiss the sheet without saving or clearing. Closing SHALL discard its unsubmitted draft on unmount. The sheet SHALL focus Close on entry, focus the message when custom is selected, cycle Tab at its enabled-control boundaries and restore focus to the previous connected element or a button on the target date.

#### Scenario: Cancel editing
- **WHEN** a person edits a plan and activates Close before submission
- **THEN** the sheet closes without invoking save or clear and the saved plan remains unchanged by that dismissal

#### Scenario: Keyboard dismissal
- **WHEN** the idle sheet receives Escape
- **THEN** it requests dismissal without submission

### Requirement: Guard the sheet's pending submission

From accepted save or clear submission until its callback settles, the sheet SHALL disable Close, choices, input, Save and any clear control, show Saving… and mark the dialog busy. It SHALL ignore another submission through that mounted sheet and suppress its backdrop/Escape dismissal while busy.

#### Scenario: Save remains pending
- **WHEN** a save callback has not settled
- **THEN** controls are disabled, Saving… is shown and another activation does not invoke another sheet submission

#### Scenario: Clear remains pending
- **WHEN** an existing plan's clear callback has not settled
- **THEN** the same busy and dismissal guards apply until it settles

### Requirement: Submit non-cooking plans by explicit date through protected operations

Save SHALL send JSON status three and nonCooking kind/customLabel to POST /api/schedule/day/{date}/validate without a recipeId. Clear SHALL use DELETE /api/schedule/day/{date}/remove for the captured date. Access SHALL follow household-identity's Authenticate protected API requests independently requirement; these actions SHALL add no member-existence lookup.

#### Scenario: Save a chosen date
- **WHEN** an authorized sheet saves a valid plan for its captured date
- **THEN** the request path identifies that date and the body carries status three and the plan, without week/index conversion

#### Scenario: Missing household access
- **WHEN** either operation lacks accepted household credentials
- **THEN** the shared API authentication gate rejects it independently of page access

### Requirement: Reject invalid explicit non-cooking plans at the server

For an explicit nonCooking plan, the server SHALL require status three and kind order_in, eating_out, mystery or custom. It SHALL trim labels, require a nonblank custom label, limit non-mystery trimmed labels to 80 Unicode scalar values and require a null or absent mystery label. Invalid plan content SHALL return 400 with unwrapped status and message before calendar mutation.

#### Scenario: Invalid plan content
- **WHEN** a supplied plan has an unsupported kind, wrong status, blank custom label, non-null mystery label or overlength trimmed non-mystery label
- **THEN** the operation rejects it with 400 status/message before saving a calendar change

#### Scenario: Blank optional server note
- **WHEN** a valid order_in or eating_out plan contains only whitespace in customLabel
- **THEN** its normalized label is null

### Requirement: Reject a non-cooking save against an occupied stored date

An explicit non-cooking save SHALL inspect the stored entry selected for its date before changing it. If that entry has a recipe ID or a status other than Skipped, it SHALL reject the save with 409 and unwrapped status/message. This check SHALL NOT define a reservation or a guarantee about every overlapping request.

#### Scenario: Recipe acquired after sheet entry
- **WHEN** the server finds a recipe ID on the selected entry when save reaches its read
- **THEN** it returns conflict without converting that recipe entry to a recipe-free plan

#### Scenario: Other recipe-free status already stored
- **WHEN** the selected stored entry has no recipe but is not Skipped
- **THEN** an explicit non-cooking save returns conflict

### Requirement: Persist recipe-free skipped plans without changing week status

With no stored entry for the date, a successful non-cooking save SHALL create a generated-identity calendar entry with that date, no recipe, default meal slot zero, Skipped status and normalized plan metadata. With an existing recipe-free Skipped entry it SHALL update its kind/label. This save SHALL neither create a weekly plan nor change an existing week's status.

#### Scenario: Create without a weekly plan
- **WHEN** valid non-cooking persistence succeeds for an empty date with no weekly plan
- **THEN** the skipped calendar entry is saved without creating a weekly plan

#### Scenario: Edit in an existing week
- **WHEN** a recipe-free Skipped entry is edited in a Draft, VotingOpen or Locked week and persistence succeeds
- **THEN** the entry retains its identity/date and the week's status remains unchanged

### Requirement: Publish a saved recipe-free slot before returning success

After non-cooking persistence and any relational transaction commit succeed, save SHALL attempt slot_updated publication with the date, null recipe, status three and projected plan, passing the request's connection exclusion identity. This path SHALL perform no grocery recomputation, week snapshot publication or fill-the-gap invalidation. Delivery SHALL follow household-live-updates.

#### Scenario: Slot follow-up completes
- **WHEN** persistence and slot publication complete without throwing
- **THEN** save proceeds to its successful response

#### Scenario: Publication throws after commit
- **WHEN** the slot-publication attempt throws after the calendar commit
- **THEN** that invocation does not return successful save completion, without implying reversal of the committed entry

### Requirement: Return non-cooking save completion without cooked confirmation

A completed non-cooking save SHALL return 200 with data.message Cooking status updated and data.mealMarkedCooked false. The sheet's Planner caller SHALL await completion without inspecting either field before requesting its schedule reread.

#### Scenario: Save completes
- **WHEN** the non-cooking save and its awaited slot publication complete
- **THEN** the response reports the message and false cooked confirmation under data

#### Scenario: Caller consumes completion
- **WHEN** the save promise resolves
- **THEN** Planner continues to its reread without requiring message or mealMarkedCooked values

### Requirement: Reread the captured week after non-cooking save

After save resolves, Planner SHALL request the captured target week's schedule and offer usable data to snapshot reconciliation only while that offset remains loaded. It SHALL close the sheet only if its active target date still matches and the selected offset still equals the captured offset. Existing snapshot guards SHALL remain governed by household-live-updates.

#### Scenario: Same target completes
- **WHEN** save and reread resolve with the target date still active and its offset still selected
- **THEN** eligible returned data is offered to snapshot reconciliation and the sheet closes

#### Scenario: Loaded offset changed
- **WHEN** the captured week's reread resolves after another offset became loaded
- **THEN** that result is not offered to the newly loaded week's snapshot reconciliation by this callback

### Requirement: Retain editable non-cooking failure feedback

A rejected sheet callback SHALL retain kind/message, release pending controls and show an alert: This day’s plan changed. Review it before trying again. for response status 409, otherwise Could not save this plan. Try again. Before propagating a save-request failure, Planner SHALL attempt a captured-week reread and conditionally offer usable data to snapshot reconciliation.

#### Scenario: Conflict returns
- **WHEN** save rejects with responseStatusCode 409 while the sheet remains mounted
- **THEN** the captured-week refresh is attempted, the draft remains editable and the conflict alert invites review

#### Scenario: Save or later read rejects
- **WHEN** a save or its successful-POST follow-up read rejects without a 409 status while the sheet remains mounted
- **THEN** generic failure feedback appears with the draft retained and controls available for another attempt

### Requirement: Clear an existing recipe-free plan from its sheet

An existing recipe-free plan's sheet SHALL offer Remove supper plan. Activation SHALL await deletion for the captured date, then reread its captured week and conditionally offer usable data to snapshot reconciliation. Closure SHALL use the same active-date/selected-offset checks as save. Clear failure SHALL retain editable sheet state through its callback error handling.

#### Scenario: Sheet clear resolves
- **WHEN** deletion and reread resolve for the still-active target
- **THEN** eligible data is offered for reconciliation and the sheet closes without invoking plan save

#### Scenario: Sheet clear rejects
- **WHEN** deletion or the following reread rejects while the sheet remains mounted
- **THEN** it releases pending controls and shows failure feedback without discarding the draft

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

### Requirement: Offer direct pivot clearing for a recipe-free plan

The recipe-free skipped-day pivot SHALL offer Remove supper plan with Leave this day unplanned. Activation SHALL close that pivot, optimistically clear the indexed day's recipe/nonCooking/pending state to status zero, and dispatch date deletion. Rejection SHALL attempt restoration of the captured local schedule and grocery items without implying server rollback.

#### Scenario: Clear through the pivot
- **WHEN** a person removes an existing recipe-free skipped plan directly from the pivot
- **THEN** the local date becomes unplanned while date deletion proceeds without the sheet's busy state

#### Scenario: Pivot deletion rejects
- **WHEN** that delete promise rejects
- **THEN** the captured local schedule and grocery items are restored by the local catch without sheet failure feedback

### Requirement: Display the saved non-cooking choice and note

For recipe-free skipped content under the promoted day-rendering rules, Planner SHALL use the custom label as title for custom, localized Mystery night, Eating out or Order In for presets, and the optional note beneath order_in/eating_out headings. Mystery night SHALL show We’ll figure out supper that day. Each choice SHALL use its corresponding non-cooking icon.

#### Scenario: Preset with a note
- **WHEN** a saved order_in or eating_out plan has a nonempty label
- **THEN** its localized preset heading and separate note are displayed

#### Scenario: Mystery or custom saved plan
- **WHEN** a recipe-free skipped mystery or custom plan is displayed
- **THEN** mystery shows its preset and hint, while custom uses its saved label as title

### Requirement: Hand eligible Home plans back to Planner editing

Home SHALL offer its recipe-free skipped non-mystery summary as navigation to /planner?weekOffset=0&planDate=<browser-local-today>. Once not loading in selected week zero, Planner SHALL open the matching recipe-free status-three date's pivot once for that planDate value and select its planner tab. It SHALL NOT directly open the edit sheet from this handoff.

#### Scenario: Home summary activation
- **WHEN** a person activates the eligible Home plan summary
- **THEN** navigation carries week zero and the browser-local current date

#### Scenario: Matching dated plan is loaded
- **WHEN** the handoff date is loaded as recipe-free status three in selected week zero and has not opened for that value
- **THEN** Planner opens Change supper plans, from which Edit supper plan opens the saved draft

#### Scenario: Handoff has no matching date
- **WHEN** loading ends without the handoff date as a recipe-free skipped entry in selected week zero
- **THEN** this handoff does not open the edit pivot

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

Planner recovery SHALL await the selected prior-meal operation before assigning the chosen replacement. Tomorrow SHALL request push to the following day, using next-week Monday from Sunday. Save for Next Week SHALL submit exact source date and recipe ID to defer. Drop SHALL request date deletion. These separate requests SHALL NOT imply an atomic replacement.

#### Scenario: Move to tomorrow
- **WHEN** recovery chooses Tomorrow for a day from Monday through Saturday
- **THEN** a same-week push with explicit source index completes before replacement assignment starts

#### Scenario: Sunday or next-week choice
- **WHEN** recovery chooses Tomorrow on Sunday or Save for Next Week on any day
- **THEN** it respectively requests next-offset Monday movement or explicit-date defer before replacement

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

After replacement assignment and its store follow-up resolve, Planner SHALL clear recovery and pivot selection, then request selected-week initialization. For a captured week-zero slot whose date is browser-local today, it SHALL also invoke Today's assignment path. These follow-ups SHALL NOT establish a single request or combined-store transaction.

#### Scenario: Replacement is still pending
- **WHEN** the store assignment has not settled
- **THEN** the recovery-success initialization has not started

#### Scenario: Replacement resolves
- **WHEN** replacement and its store follow-up resolve
- **THEN** recovery closes and week initialization is requested after local selection state clears

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await Tomorrow push, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, rather than Planner's server-current-week defer operation

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Replace a stored assignment at the resolved date

For a supported occupied-date assignment whose persistence succeeds, the selected stored entry SHALL retain its identity/date, receive the chosen recipe ID, become Planned and clear non-cooking metadata. Existing week status SHALL remain unchanged. The accepted protected assignment and UTC-relative date requirements SHALL apply; no expected-recipe precondition is implied.

#### Scenario: Replace an ordinary recipe
- **WHEN** assignment saves against an occupied non-Sunday date
- **THEN** that stored entry contains the chosen recipe in Planned state without separately relocating the old recipe through assignment

#### Scenario: Replace skipped content
- **WHEN** assignment saves against a skipped entry
- **THEN** the selected entry becomes Planned with the chosen recipe and no non-cooking kind or label

### Requirement: Report Sunday carry-forward after replacement follow-ups

When assigning Sunday displaces a stored recipe, assignment SHALL ensure the following week's plan and place that prior recipe on its Monday as Planned. With no Monday entry it SHALL create one. The response SHALL report prior recipe identity/name and destination offset/index under data.displacedRecipe only after all awaited follow-ups complete. Destination collision policy remains qualified outside this draft.

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

POST /api/schedule/move SHALL accept weekOffset, recipeId and toIndex, with optional fromIndex, intent and targetWeekOffset. Its source and target week dates SHALL use the accepted server UTC-relative week interpretation. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

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

With a different targetWeekOffset and an ordinary target index zero through six, movement SHALL search that target week from toIndex through Sunday for a date with no entry. A found destination SHALL receive the source and have a weekly plan ensured as Draft only if absent. If no destination exists, the source SHALL remain in place through this path.

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

Same-week saved movement SHALL attempt a source-week snapshot without grocery recomputation. Successful cross-week persistence SHALL await source then destination grocery recomputation before source-week publication. Completed move requests SHALL return 200 with data.message Recipe moved, including supported no-op returns. Publication receipt SHALL remain household-live-updates-owned.

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

Planner's recipe-backed Plan later action SHALL close its pivot and submit movement with explicit source index, target offset selected offset plus one, target index zero and push intent. On request completion it SHALL initialize the selected week and, for a week-zero source dated browser-local today, sync Today. Failure SHALL be logged without a dedicated Plan later error toast.

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** movement targets offset two starting at Monday rather than server-current next week

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

### Requirement: Find a defer destination from server-current next week

Deferral SHALL begin its destination search on Monday after the server UTC current week and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date for this search. It SHALL ensure a Draft plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free
- **WHEN** defer runs with no stored entry on server-current next Monday
- **THEN** that date is chosen regardless of the source's relative week offset

#### Scenario: Next week is full
- **WHEN** all seven dates of server-current next week are occupied
- **THEN** search continues into the following week until a date without an entry is found

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
- **THEN** the completed response identifies the chosen destination date and its server-relative week offset

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

### Requirement: Find first-open placement after browser-local today

Search and Browse Plan for Later SHALL start scanning after the browser-local current weekday, advancing to offset one/index zero on Sunday. They SHALL inspect returned weeks in order for a day at or after the starting index with status other than Skipped and no normalized recipe. The default scan SHALL stop after 520 relative weeks and return no target if none is found.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** Plan for Later starts on browser-local Sunday
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

### Requirement: Open or reopen a protected planner week for voting

POST /api/schedule/voting/open SHALL accept optional weekOffset defaulting to zero and resolve its Monday by the accepted server UTC week rule. It SHALL create a missing plan as VotingOpen or set an existing plan VotingOpen without changing its calendar entries. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Missing weekly plan
- **WHEN** an authorized open request persists for a week with no plan
- **THEN** a VotingOpen plan is created for that Monday without assigning recipes

#### Scenario: Reopen a locked week
- **WHEN** an authorized open request persists for a Locked week
- **THEN** the week becomes VotingOpen while stored day states remain unchanged through this operation

### Requirement: Reconcile Planner after opening voting

Planner SHALL optimistically show VotingOpen before awaiting the open operation. After it resolves, Planner SHALL read schedule and smart defaults for its then-loaded offset and rebuild displayed days when schedule data is usable. Rejection SHALL restore the captured local week status and schedule and log failure through the page handler.

#### Scenario: Open completes
- **WHEN** open and its subsequent reads resolve with usable schedule data
- **THEN** displayed days are rebuilt using the accepted persisted-content and pending-suggestion composition rules

#### Scenario: Open or its follow-up rejects
- **WHEN** the open operation or a rejecting follow-up throws
- **THEN** captured local status and days are restored without implying reversal of server voting state

### Requirement: Promote displayed pending suggestions before closing voting

Planner Close Voting SHALL capture its loaded week and displayed pending recipe slots whose status is not Skipped, optimistically show Locked, and await assignment requests for those slots before posting lock. Confirmed recipes and Skipped slots SHALL not be newly assigned by this promotion step. These separate requests SHALL NOT constitute an atomic close.

#### Scenario: One pending and one confirmed recipe
- **WHEN** Close Voting runs with one ordinary pending recipe and one confirmed recipe
- **THEN** only the pending recipe is submitted for assignment before lock

#### Scenario: Some assignments fail
- **WHEN** an assignment rejects while other promotion requests may have succeeded
- **THEN** lock is not started through that invocation and local week status is restored without rolling back successful assignments

### Requirement: Finish the Planner close-voting presentation

After lock returns, Planner SHALL clear displayed pending markers only while the captured offset remains loaded and show its temporary voting-complete feedback. On rejection it SHALL restore captured week status and log failure without a dedicated close-voting retry panel. It SHALL not require a schedule reread for this success presentation.

#### Scenario: Lock completes in the same loaded week
- **WHEN** promotion and lock resolve with the captured offset still loaded
- **THEN** displayed pending markers clear and temporary success feedback appears

#### Scenario: Lock rejects after promotion
- **WHEN** lock rejects after assignment requests have returned
- **THEN** local week status is restored while completed server assignments are not compensated by this handler

### Requirement: Persist a protected week lock independently of browser promotion

POST /api/schedule/lock SHALL accept optional weekOffset defaulting to zero, resolve its Monday by the accepted server UTC week rule and create a missing weekly plan or set an existing plan Locked. It SHALL not generate assignments for unpersisted suggestions. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Direct API lock with no entries
- **WHEN** an authorized direct lock request persists for an empty week
- **THEN** a Locked weekly plan is saved without creating suggested calendar entries

#### Scenario: Lock without household access
- **WHEN** a lock request has no accepted household credential
- **THEN** shared API authentication rejects it before the action's planning work

### Requirement: Lock persisted ordinary assignments while preserving recipe-free skips

On successful week locking, ordinary Planned entries in the selected Monday-through-Sunday range SHALL become day Locked while recipe-free Skipped entries SHALL remain Skipped. Available current Like counts SHALL be copied to matching recipe-backed entries before vote clearing. Lock SHALL not record cooking completion or change recipe last-cooked values through this action.

#### Scenario: Planned recipe and non-cooking date
- **WHEN** locking succeeds with a Planned recipe and a recipe-free skipped plan
- **THEN** the recipe entry becomes Locked and the skipped plan retains its status and metadata

#### Scenario: Lock is not cooking
- **WHEN** a recipe is locked with no earlier last-cooked value
- **THEN** lock does not set its last-cooked value

### Requirement: Attempt voting-state publication after persistence

Opening voting and locking SHALL save their week changes before reading and attempting a week snapshot with the request connection exclusion. Lock SHALL invoke clearing of stored recipe votes as a planning consequence of closure, without defining discovery vote eligibility or meaning. Successful operations SHALL return 200 data.message Voting opened or Schedule locked respectively after publication returns.

#### Scenario: Lock completes
- **WHEN** lock persistence and its subsequent read/publication return
- **THEN** closure has cleared stored recipe votes and the response reports Schedule locked

#### Scenario: Publication rejects after save
- **WHEN** week snapshot publication throws after open or lock persistence
- **THEN** the successful response is not reached without establishing reversal of saved week or vote changes

### Requirement: Validate recipe-specific cooking without completing another assignment

POST /api/schedule/day/{date}/validate with status two and recipeId SHALL look up that available recipe and return 404 if absent. If the dated assignment does not match, it SHALL leave that assignment unchanged, attempt fill-the-gap invalidation after recording the recipe's cooking value, and return data.mealMarkedCooked false on completion. Matching assignment completion SHALL return true.

#### Scenario: Supper recipe matches
- **WHEN** recipe-specific Cooked validation matches the dated assignment and persistence/publication complete
- **THEN** that assignment becomes Cooked and the response reports mealMarkedCooked true

#### Scenario: Another recipe or no assignment
- **WHEN** the specified available recipe differs from the dated assignment or that assignment is absent
- **THEN** the dated assignment is not completed and successful response reports mealMarkedCooked false

#### Scenario: Recipe is unavailable
- **WHEN** recipe-specific Cooked validation cannot find the requested available recipe
- **THEN** the API returns 404 rather than completing another assignment

### Requirement: Retain status-only day-validation compatibility

Without nonCooking or recipeId, supported legacy validation SHALL identify the first entry for the explicit date. Status two SHALL mark an existing entry Cooked; status three SHALL mark it Skipped while retaining a recipe association. With no entry, status three SHALL create a recipe-free Skipped entry. These actions SHALL not transition the weekly plan.

#### Scenario: Legacy recipe-backed skip
- **WHEN** a status-only three request persists against a recipe-backed date
- **THEN** the entry remains recipe-backed with Skipped status rather than deleting its recipe assignment

#### Scenario: Legacy empty-date skip
- **WHEN** status-only three is submitted for a date without an entry
- **THEN** successful persistence creates a recipe-free Skipped entry using the accepted non-cooking read fallback

#### Scenario: Legacy Cooked date exists
- **WHEN** status-only two is submitted for an existing recipe-backed entry
- **THEN** successful persistence marks that entry Cooked without changing its weekly plan status

### Requirement: Publish supported changed-day validation after saving

After supported existing-entry validation saves, the operation SHALL attempt slot publication with date, represented recipe or null, status and applicable non-cooking data, then return 200 data.message Cooking status updated and mealMarkedCooked true only for status two. It SHALL not recompute groceries or publish a week snapshot through this path. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Recipe-backed validation completes
- **WHEN** status two or three saves against an existing recipe-backed entry and publication returns
- **THEN** the response reports its cooked flag after slot publication without grocery recomputation through this path

#### Scenario: Slot publication rejects
- **WHEN** slot publication throws after the validation save
- **THEN** successful completion is not reached without establishing server rollback

### Requirement: Share the generated voting destination from Planner

Nudge family SHALL open a link dialog, request a voting link for the current origin and use an empty result's /discovery fallback. Copy SHALL remain disabled without a link, then write it to the clipboard and show temporary copied feedback on success. Share SHALL be offered when native sharing is available. Close/backdrop SHALL dismiss the dialog without changing the plan.

#### Scenario: Link generation resolves
- **WHEN** a still-open nudge dialog receives its generated link or an empty result
- **THEN** it displays that link or the current-origin discovery fallback without appending the selected planner offset

#### Scenario: Copy or share
- **WHEN** a person activates an available Copy or Share action
- **THEN** the displayed URL is passed to the corresponding browser API; successful Copy shows temporary feedback

### Requirement: Finalize only overdue planned or locked recipe assignments

When overdue finalization is invoked, it SHALL select recipe-backed calendar entries dated strictly before the server UTC current date with day status Planned or Locked. It SHALL set those entries Cooked. Today's entries, recipe-free dates, Skipped entries and AwaitingConsensus entries SHALL not enter this selection. Weekly plan status SHALL remain unchanged through finalization.

#### Scenario: Past planned recipe exists
- **WHEN** finalization runs with a recipe-backed Planned entry dated before server UTC today
- **THEN** successful persistence marks that entry Cooked

#### Scenario: Date or state is outside the selection
- **WHEN** an entry is dated today or later, lacks a recipe, or is Skipped or AwaitingConsensus
- **THEN** this invocation does not select it for overdue completion

### Requirement: Recalculate cooking consequence before overdue publication

Overdue finalization SHALL save its changed day statuses and recalculate each affected recipe's last-cooked value from the latest Cooked calendar date before committing its persistence work. The derived non-null value SHALL use that date at midnight UTC. This planning consequence SHALL not define the separate cooking-history journey or prove actual cooking occurred.

#### Scenario: Newly completed date is latest
- **WHEN** a finalized date becomes the recipe's latest Cooked calendar date
- **THEN** the derived last-cooked value is that date at midnight UTC after successful persistence

#### Scenario: Later cooked date already exists
- **WHEN** another Cooked calendar entry for that recipe has a later date
- **THEN** recalculation uses the latest Cooked date rather than finalization's current invocation time

### Requirement: Attempt affected-week snapshots after overdue persistence

After overdue persistence completes, finalization SHALL read and attempt a snapshot for each distinct affected Monday using its server-relative offset and no request exclusion identity. It SHALL not recompute groceries through this path. With no matching overdue entries it SHALL return without saves or publications through this invocation. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Multiple overdue entries share a week
- **WHEN** successful finalization changes multiple entries in one week
- **THEN** that week's snapshot is attempted once after persistence, without a request exclusion identity

#### Scenario: Nothing remains overdue
- **WHEN** no entries match the overdue selection
- **THEN** the invocation returns without performing finalization saves or snapshot publication

#### Scenario: Publication fails after completion save
- **WHEN** an affected-week read or publication throws after persistence
- **THEN** the invocation fails without establishing reversal of saved Cooked states or publication of remaining weeks

### Requirement: Expose direct fill-the-gap reads without assigning recipes

Protected GET /api/schedule/fill-the-gap SHALL accept optional weekOffset defaulting to zero and return successful suggestion reads under data as a recipe list. The read SHALL not create calendar assignments or transition weekly plans. Suggestion selection, ranking, eligibility and recipe vote meanings SHALL remain discovery-owned.

#### Scenario: Direct suggestion read completes
- **WHEN** an authorized fill-the-gap read completes for a supported offset
- **THEN** 200 data contains its returned recipe list without persisting any returned recipe onto a planner date

#### Scenario: No suggestions are returned
- **WHEN** selection returns no recipes
- **THEN** the successful response contains an empty list rather than creating a fallback assignment

### Requirement: Expose direct smart-default reads without locking a plan

Protected GET /api/schedule/{weekOffset}/smart-defaults SHALL return successful data identifying the requested offset, family size, consensus threshold, preselected recipe/day metadata, open slots and consensus recipe count. Reading these suggestions SHALL not persist assignments or change week/day status, including when a returned suggestion carries isLocked. Discovery SHALL retain threshold and ranking policy ownership.

#### Scenario: Suggestions are represented as locked
- **WHEN** a successful smart-default read includes a suggestion with isLocked true
- **THEN** that metadata remains a suggestion and does not by itself persist a Locked calendar entry or weekly plan

#### Scenario: Direct read has no preselected recipe
- **WHEN** a successful smart-default read has no preselected recipes
- **THEN** the response still carries its offset and available open-slot/context fields without creating assignments

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

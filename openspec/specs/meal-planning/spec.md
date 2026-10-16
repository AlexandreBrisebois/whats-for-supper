# Meal planning Specification

## Purpose

Let household members read and navigate planner weeks, understand displayed schedule content and distinguish successful reads from retained or suggested content. This initial baseline slice covers existing week reading without defining planning mutations or suggestion policy.

## Evidence and qualifications (non-normative)

Promoted under A84 from the reviewed `baseline-meal-planning-week-reading-navigation` delta. BSL-meal-planning-001–006 in the [durable plan](../../../docs/openspec-baseline-plan.md) records complete requirement/scenario mappings, source identities, inspected assertions and promotion evidence. Runtime/API/browser/network/database/model qualification remains deferred under A34.

U102–U109 preserve initialization/request-ordering gaps, callable sync versus actual refresh wiring, separate snapshot queries and meal-slot projection limits, contract/offset discrepancies, silent failed reads, mixed UTC/local date handling, substituted assertion limits and independent REST/live writers. U95–U101, including conditional snapshot application and grocery representation limitations, remain intact. No immediate freshness, atomic multi-request loading, latest-request-wins, timezone equivalence, complete convergence or guaranteed recovery is established.

Household-identity owns access/member context, household-live-updates owns connection and snapshot reconciliation, recipe-library owns library visibility and background-processing owns lifecycle state. Suggestion generation/ranking and planner mutations remain outside this slice. A69, feature-enabled PDF/U70–U74, U01/U75–U101 and all historical qualifications remain intact. Promotion is documentation only; the source change remains active.

Assignment promotion A86 (2026-10-16) adds the reviewed `baseline-meal-planning-empty-day-recipe-assignment` requirements below. BSL-meal-planning-007–013 and U110–U115 in the [meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) retain complete mappings, source identities and inspected assertion limits. The original Purpose and week-reading requirements remain unchanged; this additional slice covers chosen-recipe assignment to an ordinary empty day.

Occupied-target overwrite/races, incomplete semantic validation and response-contract precision, separately persisted work followed by fallible side effects, overlapping browser requests and the second Today assignment remain qualified. No atomic empty-slot precondition, eligibility enforcement, idempotency, exact rollback, one-request guarantee, persistence inference from UI feedback or guaranteed convergence is established. Runtime qualification remains not-run under A34. This documentation promotion leaves the change active and does not authorize archival, application work or another slice.

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

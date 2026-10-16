# Meal planning assignment delta

## ADDED Requirements

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

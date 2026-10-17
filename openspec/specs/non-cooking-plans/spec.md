# Non cooking plans Specification

## Purpose

Let household members create, edit and clear recipe-free supper plans, with dated drafts, message validation, pending controls, conflict feedback and a handoff from Home to Planner.

## Evidence and qualifications (non-normative)

These requirements were relocated unchanged from the combined meal-planning specification. Applicable [historical qualifications](../meal-planning/spec.md#evidence-and-qualifications-non-normative) and the [durable meal-planning evidence record](../../../docs/openspec-baseline/meal-planning.md) transfer with them, including BSL/U/A identifiers, partial-success limits and deferred runtime qualification. Relocation establishes no new API/browser/database/model guarantee.

## Related owners (non-normative)

Cross-capability requirement references resolve to the following authoritative owners:

- [Delete the recipe-free entry before clear follow-up work](../meal-rescheduling/spec.md#requirement-delete-the-recipe-free-entry-before-clear-follow-up-work)
- [Project stored recipe and non-cooking read content](../meal-planning/spec.md#requirement-project-stored-recipe-and-non-cooking-read-content)
- [Render day content and planned count from displayed state](../meal-planning/spec.md#requirement-render-day-content-and-planned-count-from-displayed-state)
- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Keep relative operations anchored to their intended calendar week](../deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)


## Requirements

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

Home SHALL offer its recipe-free skipped non-mystery summary as navigation to /planner?weekOffset=0&planDate=<deployment-local-today>. Once not loading in selected week zero, Planner SHALL open the matching recipe-free status-three date's pivot once for that planDate value and select its planner tab. It SHALL NOT directly open the edit sheet from this handoff.

#### Scenario: Home summary activation
- **WHEN** a person activates the eligible Home plan summary
- **THEN** navigation carries week zero and the deployment-local current date

#### Scenario: Matching dated plan is loaded
- **WHEN** the handoff date is loaded as recipe-free status three in selected week zero and has not opened for that value
- **THEN** Planner opens Change supper plans, from which Edit supper plan opens the saved draft

#### Scenario: Handoff has no matching date
- **WHEN** loading ends without the handoff date as a recipe-free skipped entry in selected week zero
- **THEN** this handoff does not open the edit pivot

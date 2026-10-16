# Spec Delta

## Purpose

Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.

## ADDED Requirements

### Requirement: Order in from an empty Tonight choice

Activating Order In with no current Tonight recipe SHALL immediately set local Skipped status, preserve existing non-cooking metadata or supply Order In, and offer the same date as recipe-free Skipped to the loaded week. It SHALL dispatch status-only three validation for browser-local today. Persistence and read fallback SHALL follow meal-planning’s Retain status-only day-validation compatibility requirement.

#### Scenario: Empty night
- **WHEN** a person activates Order In with no current Tonight recipe
- **THEN** local Tonight and the offered week slot show Skipped while date validation runs in the background

#### Scenario: Validation rejects
- **WHEN** the background status-only validation rejects
- **THEN** failure is logged without automatic local rollback through that handler

### Requirement: Choose a backup before resolving the planned Tonight recipe

Recovery from a displayed planned recipe SHALL first offer Order In or Pick Something Else. Order In SHALL open the prior-recipe disposition step without submitting validation yet. Pick Something Else SHALL open Quick Find; choosing a replacement SHALL retain that choice for the disposition step without assigning it yet.

#### Scenario: Order In selected
- **WHEN** a person chooses Order In in planned-recipe recovery
- **THEN** the disposition step opens without yet marking Tonight skipped

#### Scenario: Replacement selected
- **WHEN** a person chooses a Quick Find replacement after Pick Something Else
- **THEN** Quick Find closes and the disposition step retains the replacement without posting it

### Requirement: Cancel Home recovery before mutation

Home recovery SHALL offer Close and backdrop dismissal, with Back from the disposition step to backup choice. Dismissal or Back before a disposition action SHALL not submit validation, move, defer, delete or replacement through that dismissal. Closing Quick Find before selection SHALL cancel that pending choice.

#### Scenario: Abort order-in recovery
- **WHEN** a person closes the disposition step before acting
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice
- **WHEN** a person activates Back before disposition starts
- **THEN** the initial Order In / Pick Something Else choice returns without a mutation

### Requirement: Mark Order In before planned-recipe disposition

When an Order In recovery disposition starts with a current recipe identity, Home SHALL first offer recipe-free Skipped state locally for browser-local today and await status-only three validation. It SHALL perform the selected move or defer only after that request resolves. Order In Drop SHALL use that validation without date deletion.

#### Scenario: Move after validation
- **WHEN** Order In recovery chooses Tomorrow and validation remains pending
- **THEN** the move has not started through that invocation

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Order In recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Request tomorrow for the current Tonight recipe

Home Tomorrow recovery SHALL submit push movement for the current Tonight recipe, week zero and the Monday-based source index of browser-local today. Monday through Saturday SHALL target the following index in week zero; Sunday SHALL target index zero in week one. Destination and skipped-source semantics SHALL follow the accepted meal-planning movement requirements.

#### Scenario: Weekday request
- **WHEN** Tomorrow disposition starts on Thursday with a current recipe identity
- **THEN** the move uses source index three and target index four in week zero

#### Scenario: Sunday request
- **WHEN** Tomorrow disposition starts on Sunday with a current recipe identity
- **THEN** the move uses source index six and target index zero in week one

### Requirement: Defer Tonight through the explicit-date operation

Home Save for Next Week SHALL submit browser-local today as sourceDate and the current Tonight recipe ID to the shared defer operation, without substituting a client-selected destination. A returned message SHALL be shown as a toast. Destination choice, conflicts and persisted consequences SHALL remain meal-planning-owned.

#### Scenario: Defer returns a destination message
- **WHEN** Save for Next Week resolves with a message
- **THEN** Home shows that returned message without posting a separate movement request

#### Scenario: Source is missing or awaiting consensus
- **WHEN** the shared defer operation rejects a missing exact source or an awaiting-consensus source
- **THEN** Home does not proceed to replacement through that rejected invocation

### Requirement: Resolve the old Tonight meal before starting replacement

In Pick Something Else recovery, Tomorrow or Save for Next Week SHALL await movement or defer before offering the retained new recipe to Tonight’s background assignment. Drop SHALL await date deletion, offer Tonight an empty ordinary state, then offer that replacement. These separate requests SHALL NOT establish an atomic replacement or confirmed assignment.

#### Scenario: Move original then choose replacement
- **WHEN** Pick Something Else recovery chooses Tomorrow and movement resolves
- **THEN** movement identifies the current original recipe before the retained replacement is offered to Tonight assignment

#### Scenario: Drop original then choose replacement
- **WHEN** Pick Something Else recovery chooses Drop and date deletion resolves
- **THEN** Tonight is offered empty ordinary state and then the retained replacement

### Requirement: Finish Home recovery with its caller-specific follow-ups

After successful disposition and any replacement dispatch, Home SHALL close recovery and await week-zero initialization. Order In SHALL then offer recipe-free Skipped state to the loaded week again. Home SHALL request Tonight synchronization; Tomorrow and Drop SHALL navigate to Planner, while Save for Next Week SHALL remain on Home. Background replacement dispatch SHALL not wait for server assignment confirmation.

#### Scenario: Tomorrow or Drop completes
- **WHEN** disposition and awaited week initialization return for Tomorrow or Drop
- **THEN** recovery is closed, Tonight sync is requested and Planner navigation follows

#### Scenario: Defer completes
- **WHEN** defer and awaited week initialization return for Save for Next Week
- **THEN** recovery is closed and Tonight sync is requested without navigation

### Requirement: Stop a rejected Home recovery invocation at its failing await

An awaited recovery rejection SHALL be logged and stop subsequent steps in that invocation. If disposition rejects before replacement dispatch, Home SHALL not dispatch the replacement through that invocation. Previously completed local or server work SHALL NOT be described as rolled back; automatic compensation and safe retry are not established.

#### Scenario: Validation rejects first
- **WHEN** Order In validation rejects before Tomorrow movement
- **THEN** that invocation does not submit its move

#### Scenario: Disposition rejects
- **WHEN** Pick Something Else movement, defer or deletion rejects before replacement
- **THEN** that invocation does not dispatch the retained replacement

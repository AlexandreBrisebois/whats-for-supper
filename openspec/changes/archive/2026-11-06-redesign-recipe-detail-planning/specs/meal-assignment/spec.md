## ADDED Requirements

### Requirement: Offer an explicit change of planning day

Recipe selection SHALL show the proposed destination with a Change day action. The chooser SHALL retain the recipe and display dated current plans so empty, recipe-backed and non-cooking days are distinguishable. Opening, changing or cancelling the chooser SHALL NOT mutate the schedule. Cancellation SHALL restore the previous destination; choosing another day SHALL update it before saving.

#### Scenario: Choose another date without searching again
- **WHEN** a person changes a suggested Thursday to Saturday
- **THEN** the same recipe is retained, Saturday becomes the visible destination and no assignment occurs until the dated primary action is activated

#### Scenario: Non-cooking date is chosen explicitly
- **WHEN** a person chooses a date with Take Out, Eating Out or another saved non-cooking plan
- **THEN** the flow explains that plan and asks before removing it and saving the recipe
- **AND** declining retains both the existing plan and selected recipe

### Requirement: Preserve completed replacement stages across callers

Home, Planner and recipe-selection recovery SHALL retain the captured original, date/reference, replacement and acknowledged disposition while recovery remains mounted. Pending work SHALL suppress duplicate submissions. A replacement-save failure SHALL NOT repeat completed movement or removal. Unknown disposition or save outcomes SHALL require authoritative reconciliation before dependent writes.

#### Scenario: Original moved but replacement rejected
- **WHEN** the original is confirmed moved and guarded replacement receives a known no-write rejection
- **THEN** the selected replacement remains and retry attempts only the safe unfinished assignment stage

#### Scenario: Reply is lost after saving
- **WHEN** replacement persistence may have succeeded but the reply is lost
- **THEN** the flow checks the captured date, recognises an already-saved replacement and does not move or assign it again

#### Scenario: Outcome cannot be checked
- **WHEN** an authoritative reconciliation read fails
- **THEN** the UI says the result is unconfirmed and offers Retry check or Review plan without enabling blind replay

#### Scenario: Leave partially completed recovery
- **WHEN** a person closes recovery after original disposition but before confirmed replacement
- **THEN** it explains completed changes and the unsaved or unknown replacement before allowing departure

### Requirement: Confirm completed planning without inventing work

Recipe-detail completion SHALL identify the new recipe and dated Planner destination. Replacement SHALL also state the original's confirmed removal or actual moved date, including Next Week spillover. Confirmation SHALL require no further acceptance, rating or planning task. Saved-but-unrefreshed feedback SHALL distinguish confirmed persistence from unavailable view refresh.

#### Scenario: Replacement and deferred original complete
- **WHEN** Curry is saved to Wednesday and Lasagna was deferred past a full next week to the following Monday
- **THEN** Planner confirms Curry's Wednesday date and Lasagna's actual Monday date and explains the full-week spillover

### Requirement: Avoid reassigning an identical dated meal

If the selected recipe already occupies the target supper, detail SHALL show Already planned for that date and offer View plan or Change day without another assignment. A Cooked or AwaitingConsensus target SHALL require review in Planner rather than reset completion or consensus through this new recipe-detail flow.

#### Scenario: Same recipe or completed target
- **WHEN** the target already has the chosen recipe, or is Cooked or AwaitingConsensus
- **THEN** the flow preserves its persisted state and offers the applicable View plan, Review plan or Change day action without mutation

## MODIFIED Requirements

### Requirement: Present the targeted recipe-detail planning action

Search with valid addToDay, weekOffset and captured reference SHALL retain that dated target while detail opens. Its primary action SHALL name the destination and use the loaded recipe without asking for the day again. Invalid or incomplete target context SHALL show correction feedback rather than silently assign Tonight. Changing the day SHALL be explicit and preserve the chosen recipe.

#### Scenario: Open detail in planning context
- **WHEN** a recipe detail is opened from Search targeting a specific planner day
- **THEN** detail offers the planning action for that target rather than requiring selection of another day

#### Scenario: Use the loaded recipe
- **WHEN** a person activates that planning action with a loaded recipe
- **THEN** the chosen recipe and parsed target are passed into assignment

### Requirement: Read the explicit Search target before assignment

Before assignment, recipe selection SHALL read the captured target and classify its recipe, status and non-cooking plan. An ordinary empty supper SHALL use guarded assignment. A different recipe SHALL enter replacement recovery; a non-cooking plan SHALL require explicit replacement confirmation. A failed or unusable read SHALL block submission. The read SHALL NOT reserve the slot.

#### Scenario: Ordinary empty target is returned
- **WHEN** the target read returns a dated ordinary day without a normalized recipe
- **THEN** Search posts the chosen recipe to that explicit week and index with requireEmpty true and its captured reference

#### Scenario: Target now has a recipe
- **WHEN** the target read returns a different movable recipe rather than a Cooked or AwaitingConsensus target
- **THEN** the initial selection enters recovery rather than posting the new assignment directly

### Requirement: Show pending targeted detail submission and allow another attempt

During detail planning, pending state SHALL suppress duplicate submission and expose saving feedback. Failure SHALL retain the selected recipe and date with visible recovery. A confirmed rejection SHALL permit a safe retry; an uncertain write SHALL require an authoritative check before another write. Settling a callback alone SHALL NOT establish success or permission to repeat it.

#### Scenario: Detail planning action is pending
- **WHEN** the targeted detail callback has not settled
- **THEN** its primary planning action is disabled

#### Scenario: Targeted assignment fails
- **WHEN** the targeted Search read or assignment rejects while detail remains open
- **THEN** detail remains available with visible failure feedback; a confirmed no-write rejection permits another attempt, while an uncertain write requires checking first

### Requirement: Return targeted Search assignment to Planner

After confirmed recipe-detail assignment, Search SHALL navigate to the captured Planner week/day with its reference Monday. Planner SHALL read that week, bring the day into view and explicitly confirm the recipe and date. A success query or temporary ring alone SHALL NOT establish persistence. A refresh failure after confirmed save SHALL report saved-but-not-refreshed without repeating assignment.

#### Scenario: Search assignment resolves
- **WHEN** explicit-target Search assignment resolves for index two in week one
- **THEN** navigation targets Planner index two in week one with the captured reference and explicit recipe/date confirmation after authoritative reading

#### Scenario: Planner receives success feedback parameters
- **WHEN** Planner receives a truthy success value and a dayIndex
- **THEN** it reads the captured week and brings the matching card into view with reduced-motion support; any temporary highlight supplements explicit confirmed-result text

### Requirement: Enter recovery before replacing an occupied Planner day

Selecting a replacement for a dated recipe-backed Planner day SHALL retain the original slot and chosen recipe before posting. Recovery SHALL name the original and source date and offer its following day, Next Week or removal from that day, plus Back and Close. Before mutation, dismissal SHALL preserve the original and allow return to the selected replacement without submitting assignment.

#### Scenario: Occupied Quick Find target
- **WHEN** a person selects a replacement for a displayed dated recipe-backed day
- **THEN** recovery opens without first posting that replacement

#### Scenario: Dismiss the recovery choice
- **WHEN** Back or Close is activated before an action starts
- **THEN** no mutation is submitted, the original remains and the selected replacement can be resumed

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL retain the original slot and selected replacement through recovery. They SHALL await committed Tomorrow movement, exact-source deferral beginning the source's following week, or confirmed removal before guarded assignment. Confirmed completion SHALL open the captured Planner target and explain both outcomes. Unknown disposition SHALL block replacement until reconciled.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses exact-source deferral beginning at the captured source offset plus one, consistently with Planner, including spill into a later week when necessary

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the recipe-selection caller clears completed recovery and opens its captured Planner day with confirmation of the new recipe and the original meal's disposition

### Requirement: Find first-open placement after deployment-local today

Without an explicit day, recipe detail SHALL suggest deployment-local Tonight if ordinary and empty, otherwise the first ordinary empty future supper in calendar order. Non-cooking, Cooked, AwaitingConsensus and recipe-backed days SHALL be skipped. The date SHALL be shown before saving. Scanning SHALL stop after 520 relative weeks; missing or failed schedule data SHALL block recommendation rather than imply emptiness.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** an untargeted recipe opens on deployment-local Sunday and Tonight is occupied
- **THEN** scanning begins at offset one, index zero rather than offset-zero Monday

#### Scenario: Tonight is genuinely empty
- **WHEN** an untargeted recipe opens and authoritative Tonight has no persisted supper entry
- **THEN** Tonight is the visible suggested date and no write occurs until the dated action is activated

#### Scenario: Scan finds no target
- **WHEN** all 520 inspected relative weeks contain no eligible returned date
- **THEN** no target is offered, no assignment is submitted and a visible Choose day alternative is available

### Requirement: Assign first-open placement through the shared assignment operation

Activating the visible suggested-day action SHALL submit the chosen recipe for that captured date through guarded assignment. A recommendation SHALL NOT reserve the slot or mutate the plan. Conflict SHALL retain recipe/date and explain the changed plan, offering another day or explicit replacement without silently choosing a new destination. Confirmed completion SHALL return to that Planner date.

#### Scenario: First-open assignment resolves
- **WHEN** a shown target is chosen and its guarded assignment is confirmed
- **THEN** navigation identifies that returned offset/index with planner success feedback parameters

#### Scenario: Week read is absent or rejects
- **WHEN** a scanned week has no usable days or its request rejects
- **THEN** both cases block automatic recommendation and show retry without reserving or assigning any target

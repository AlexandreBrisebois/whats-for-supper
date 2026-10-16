# Tonight meal decisions Specification

## Purpose

Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.

## Evidence and qualifications (non-normative)

Accepted and promoted as documentation under TM-P01 (2026-10-16), user “promote”,
from the reviewed home-states, goto-choices and changed-plan-recovery deltas,
each prefixed `baseline-tonight-meal-decisions-`. The 27 requirements and 57
scenarios below preserve those deltas verbatim. The [capability evidence record](../../../docs/openspec-baseline/tonight-meal-decisions.md)
retains BSL-tonight-meal-decisions-001–012, exact mappings, source/test identities,
assertion substitutions, shared ownership and all excluded topics.

TM-U01–TM-U10 remain non-normative qualifications: mixed local/server date targeting;
independent SSR/REST/live writers and optimistic guards; unreachable pending-active
GOTO responses; unchanged saved GOTO pending labels; separate acquisition and list
registration; full-list replacement races and missing-list contract discrepancy;
partial recovery success and unconfirmed background replacement; missing Home
submission/retry guards and current-identity races; retained recipe association on
Order In Drop and cooked-view identity limits; and incomplete fill-the-gap
eligibility evidence. Promotion does not settle desired fixes or promote excluded
assertions into requirements.

Household identity, recipe readiness/acquisition, calendar mutations, suggestion
policy, background lifecycle, live delivery and cooking remain with their accepted
owners as referenced below and in the evidence record. Behavior is
implementation-supported under A10; existing test execution and runtime/API/browser/
database/device/network/model qualification remain not-run under A34. All three
source changes remain active. No archival or application implementation occurs.

## Requirements

### Requirement: Seed Home only for the matching deployment date

Home SHALL use returned schedule content to seed Tonight only when its supplied authoritative deployment date matches deployment-local today. A different supplied date SHALL leave seeding to client reconciliation. Page reading SHALL consume meal-planning’s protected schedule read and date projection requirements.

#### Scenario: Matching date
- **WHEN** Home receives an authoritative deployment date equal to deployment-local today
- **THEN** the returned recipe, status and non-cooking context are offered for Tonight initialization

#### Scenario: Different date
- **WHEN** the supplied authoritative deployment date differs from deployment-local today
- **THEN** that initialization does not seed another date’s plan

### Requirement: Reconcile Tonight on Home entry

Home SHALL request a current-week schedule read on mount and show Aligning your day while Tonight synchronization is loading. If returned dates exclude deployment-local today, it SHALL try the adjacent relative week in that date’s direction. Failed reads SHALL end loading and retain prior Tonight content without dedicated Retry feedback.

#### Scenario: Local date outside returned week
- **WHEN** deployment-local today precedes the first returned date
- **THEN** Tonight requests the preceding relative week before selecting its date

#### Scenario: Read failure
- **WHEN** Tonight synchronization rejects
- **THEN** loading ends with prior content retained and the error logged

### Requirement: Retain recent Tonight assignment during ordinary synchronization

For an ordinary day read, Tonight SHALL retain an assignment made less than twenty seconds ago when the returned recipe differs. A matching recipe SHALL refresh its details. A returned Cooked status SHALL update status; a returned Skipped day SHALL apply its returned recipe and non-cooking content. Live updates SHALL remain governed by household-live-updates.

#### Scenario: Ordinary stale read
- **WHEN** an ordinary read differs from an assignment made less than twenty seconds ago
- **THEN** the recent recipe remains displayed

#### Scenario: Matching details
- **WHEN** an ordinary read returns the recently selected recipe identity
- **THEN** its returned details can populate Tonight

#### Scenario: Saved skipped plan
- **WHEN** synchronization returns today as Skipped
- **THEN** Tonight applies its returned recipe and non-cooking context

### Requirement: Present the active planned Tonight recipe

While Tonight is neither Cooked nor Skipped and its recipe has an ID and name, Home SHALL display that recipe’s menu card with available description, image, ingredients and formatted time. The card SHALL offer cooking entry and changed-plan recovery. Cooking itself SHALL remain cooking-owned.

#### Scenario: Planned recipe
- **WHEN** Tonight holds a named recipe with identity and ordinary status
- **THEN** its menu card offers Cook’s Mode and recovery

#### Scenario: Open cooking
- **WHEN** a person activates cooking entry for that displayed recipe
- **THEN** the cooking view opens with that recipe identity

### Requirement: Present and dismiss Tonight cooked feedback

When Tonight status is Cooked, Home SHALL show its cooked-success card until dismissed within the mounted Home view. Dismissal SHALL show compact Cooked tonight feedback; activating that feedback with a current recipe identity SHALL reopen cooking. This presentation SHALL NOT itself submit cooking completion.

#### Scenario: Cooked status
- **WHEN** Tonight becomes Cooked before the success card has been dismissed
- **THEN** Home displays cooked-success feedback without the planned menu card

#### Scenario: Dismiss cooked feedback
- **WHEN** a person dismisses the success card and a current recipe identity is available
- **THEN** compact cooked feedback offers cooking entry

### Requirement: Offer choices for an empty or Mystery night

With no current recipe and no Cooked status, Home SHALL offer supper choices for an ordinary unfinished night or a saved Mystery night. Opening Quick Find SHALL not itself clear the Mystery plan. Saved recipe-free non-Mystery plans SHALL use meal-planning’s Hand eligible Home plans back to Planner editing requirement.

#### Scenario: Ordinary empty night
- **WHEN** Tonight is ordinary and empty
- **THEN** Home offers Quick Find and Order In alongside the available GOTO choice or setup link

#### Scenario: Mystery night
- **WHEN** Tonight is recipe-free Skipped with Mystery kind and a person opens Quick Find
- **THEN** recipe choices open without submitting a plan-clear operation

### Requirement: Select or cancel Home Quick Find

Home Quick Find SHALL target week zero and the deployment-local Monday-based weekday. Its deck, loading, exhaustion, inspection, dismissal and invalidation SHALL follow the accepted meal-planning Quick Find requirements. Ordinary selection SHALL close the modal and offer that recipe for Tonight assignment; dismissal SHALL not submit selection.

#### Scenario: Select from empty Tonight
- **WHEN** a person selects an available recipe through Home Quick Find without replacement intent
- **THEN** Quick Find closes and Tonight assignment receives its identity, name and image

#### Scenario: Dismiss before selection
- **WHEN** a person closes Home Quick Find before choosing a recipe
- **THEN** Tonight receives no assignment through that dismissal

#### Scenario: Continue to Search
- **WHEN** the targeted terminal library card is displayed
- **THEN** its Search link carries addToDay and weekOffset zero under the shared Quick Find requirement

### Requirement: Display Tonight assignment before server confirmation

Tonight choice SHALL immediately display the chosen recipe, clear non-cooking metadata and use ordinary status while dispatching the shared chosen-recipe assignment for week zero and the deployment-local weekday in the background. Rejection SHALL be logged without automatic local rollback or dedicated assignment-error feedback. Display SHALL NOT establish persisted assignment.

#### Scenario: Assignment pending
- **WHEN** a person chooses a Tonight recipe and its assignment request remains pending
- **THEN** the chosen recipe is already displayed with non-cooking context cleared

#### Scenario: Assignment rejects
- **WHEN** the background Tonight assignment rejects
- **THEN** the error is logged without this handler restoring the prior choice

### Requirement: Hydrate only the still-selected Tonight recipe

After Tonight selection, a recipe-detail read SHALL request description, ingredients and time for display. Returned details SHALL apply only if the selected identity still matches. An unavailable or failed detail read SHALL leave the optimistic display available without dedicated hydration-error feedback.

#### Scenario: Selection changes during detail read
- **WHEN** recipe A’s details arrive after Tonight has switched to recipe B
- **THEN** A’s returned details do not replace B’s display

#### Scenario: Detail read fails
- **WHEN** the eager recipe-detail request rejects
- **THEN** the optimistic Tonight display remains and the failure is logged

### Requirement: Offer Home voting and library handoffs

Home SHALL read next-week schedule status on mount. A returned VotingOpen week with days SHALL offer a voting nudge counting recipe-bearing days; Vote SHALL navigate to Discovery and Dismiss SHALL hide the nudge in the mounted view. Read failure SHALL show no nudge through that read. Home SHALL also offer Capture a Recipe and Browse Library links.

#### Scenario: Next week open for voting
- **WHEN** the next-week read returns VotingOpen with days
- **THEN** the nudge displays its recipe-bearing-day count and offers Discovery navigation

#### Scenario: Read fails or nudge dismissed
- **WHEN** the next-week read rejects or the person dismisses a shown nudge
- **THEN** that nudge is absent without changing the plan

### Requirement: Choose a random ready GOTO for Home

Active GOTO retrieval SHALL select a random configured recipe that exists, is not deleted and has persisted readiness. A successful result SHALL contain that configured item with ready status and use its image URL or the standard recipe hero URL when absent. Readiness SHALL follow recipe-library’s Represent persisted recipe attribution and readiness requirement.

#### Scenario: Ready and pending configured
- **WHEN** the configured list includes a ready recipe and a pending recipe
- **THEN** GET /api/goto/active returns the eligible ready recipe under data with ready status

#### Scenario: No eligible recipe
- **WHEN** no configured recipe exists with nondeleted ready state
- **THEN** active retrieval returns 404 without offering a pending recipe

### Requirement: Handle unavailable active GOTO without blocking Tonight choices

Home SHALL load an active GOTO on mount. An active-read error, including the no-ready 404, SHALL leave no active GOTO. When supper choices are displayed without a GOTO, Home SHALL offer its Add a GOTO link to Profile, Quick Find and Order In. A ready active choice SHALL offer Make This Tonight through the existing Tonight assignment behavior.

#### Scenario: No ready result
- **WHEN** active retrieval returns 404 while Tonight offers supper choices
- **THEN** Home still offers Quick Find, Order In and Profile setup without a GOTO confirmation action

#### Scenario: Confirm ready choice
- **WHEN** a person activates Make This Tonight for the ready active recipe
- **THEN** Tonight assignment receives that configured recipe identity

### Requirement: Read and replace the household GOTO list

Protected GET /api/goto SHALL return the stored household list under data; PUT /api/goto SHALL replace that list with the submitted items and return it under data after saving. The browser SHALL update its stored list only after PUT resolves. Access SHALL follow household-identity’s Authenticate protected API requests independently requirement.

#### Scenario: Replace and reread
- **WHEN** an authorized submitted list saves and is subsequently read
- **THEN** the read represents the saved items and descriptions

#### Scenario: Replacement rejects
- **WHEN** the browser list PUT rejects
- **THEN** that save does not apply its submitted list to browser settings

### Requirement: Offer GOTO setup and list removal

Family GOTO settings SHALL load the list, display ready items by description and pending items with pending feedback. Add a GOTO SHALL offer Search the Library, Describe a Dish and Take a Photo. Search SHALL open Recipes; description and photo SHALL open capture with GOTO intent and the selected mode. Closing the add sheet SHALL not create a recipe.

#### Scenario: Choose library
- **WHEN** a person chooses Search the Library in the add sheet
- **THEN** Recipes opens without launching Quick Find

#### Scenario: Choose acquisition
- **WHEN** a person chooses Describe a Dish or Take a Photo
- **THEN** capture opens with intent=goto and mode=describe or mode=photo respectively

#### Scenario: Dismiss setup
- **WHEN** a person closes the add sheet before choosing an acquisition path
- **THEN** the sheet closes without creating a recipe

### Requirement: Remove a configured GOTO without deleting its recipe

Settings removal SHALL submit the list with matching recipe identities filtered out, marking the selected removal pending until the request settles. Rejection SHALL log the error and release pending presentation without this action deleting the recipe or reporting successful removal.

#### Scenario: Removal succeeds
- **WHEN** the replacement list excluding the selected recipe saves
- **THEN** the selected GOTO disappears from the loaded list while its recipe is retained

#### Scenario: Removal rejects
- **WHEN** the list replacement rejects
- **THEN** pending removal ends and the prior browser list remains

### Requirement: Register acquired recipes as pending GOTO choices

After GOTO-intent capture returns a recipe identity, the client SHALL append a pending GOTO item through a separate list replacement. Description capture SHALL use the entered name, photo capture Your captured recipe and URL capture Recipe from link. Recipe acquisition, background acceptance and readiness SHALL remain recipe-capture and background-processing owned.

#### Scenario: Description or photo returns identity
- **WHEN** GOTO-intent description or photo capture returns a recipe identity and list save resolves
- **THEN** the saved list includes that pending identity with its corresponding description

#### Scenario: URL returns identity
- **WHEN** URL capture is submitted with GOTO intent and returns a recipe identity
- **THEN** a separate list replacement appends that identity with Recipe from link and pending status

### Requirement: Keep GOTO capture success available for explicit departure

After GOTO capture and list registration resolve, the capture success view SHALL remain available without automatic Home navigation and offer Back to Settings. This waiting view SHALL NOT establish that synthesis or recipe readiness has completed.

#### Scenario: Registration succeeds
- **WHEN** GOTO description submission and its list replacement resolve
- **THEN** the success screen offers the GOTO preparation state without automatic navigation

#### Scenario: Return explicitly
- **WHEN** a person activates Back to Settings in that GOTO success view
- **THEN** navigation targets Profile Settings

### Requirement: Toggle the loaded recipe in the GOTO list

Recipe detail SHALL offer a pressed GOTO action when the loaded recipe is in the configured list and an add action otherwise. Activation SHALL remove the matching item or append its identity, name, image and represented readiness, then save the replacement list. Pending save SHALL disable that action; completion SHALL show success or failure feedback.

#### Scenario: Add loaded recipe
- **WHEN** a person activates Set as GOTO for an absent loaded recipe and saving resolves
- **THEN** the list contains its identity and the action reports successful addition

#### Scenario: Remove or fail
- **WHEN** a person toggles an existing GOTO or its save rejects
- **THEN** successful saving reports removal; rejection reports Could not update GOTO and releases the pending action

### Requirement: Order in from an empty Tonight choice

Activating Order In with no current Tonight recipe SHALL immediately set local Skipped status, preserve existing non-cooking metadata or supply Order In, and offer the same date as recipe-free Skipped to the loaded week. It SHALL dispatch status-only three validation for deployment-local today. Persistence and read fallback SHALL follow meal-planning’s Retain status-only day-validation compatibility requirement.

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

When an Order In recovery disposition starts with a current recipe identity, Home SHALL first offer recipe-free Skipped state locally for deployment-local today and await status-only three validation. It SHALL perform the selected move or defer only after that request resolves. Order In Drop SHALL use that validation without date deletion.

#### Scenario: Move after validation
- **WHEN** Order In recovery chooses Tomorrow and validation remains pending
- **THEN** the move has not started through that invocation

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Order In recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Request tomorrow for the current Tonight recipe

Home Tomorrow recovery SHALL submit push movement for the current Tonight recipe, week zero and the Monday-based source index of deployment-local today. Monday through Saturday SHALL target the following index in week zero; Sunday SHALL target index zero in week one. Destination and skipped-source semantics SHALL follow the accepted meal-planning movement requirements.

#### Scenario: Weekday request
- **WHEN** Tomorrow disposition starts on Thursday with a current recipe identity
- **THEN** the move uses source index three and target index four in week zero

#### Scenario: Sunday request
- **WHEN** Tomorrow disposition starts on Sunday with a current recipe identity
- **THEN** the move uses source index six and target index zero in week one

### Requirement: Defer Tonight through the explicit-date operation

Home Save for Next Week SHALL submit deployment-local today as sourceDate and the current Tonight recipe ID to the shared defer operation, without substituting a client-selected destination. A returned message SHALL be shown as a toast. Destination choice, conflicts and persisted consequences SHALL remain meal-planning-owned.

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

### Requirement: Share authoritative Today context across Home rendering and actions

SSR and mounted Home SHALL consume meal-planning's authoritative calendar context. Today assignment, Quick Find, Order In and recovery SHALL use that context's date, weekday and captured reference Monday. A started recovery SHALL retain its date across awaits; a new action SHALL follow Refresh expired Today context before a new action. Browser timezone SHALL NOT select the supper slot.

#### Scenario: SSR and browser have different local dates
- **WHEN** Toronto deployment context identifies October 11 while the SSR host and Tokyo browser identify October 12 locally
- **THEN** both Home renderings identify October 11 as Tonight and a new selection targets that date

#### Scenario: Recovery crosses midnight
- **WHEN** recovery begins on deployment October 11 and an awaited disposition finishes on October 12
- **THEN** its subsequent replacement retains the captured October 11 target and reference Monday

#### Scenario: Returning after the deployment day changed
- **WHEN** Home resumes after its authoritative context expires
- **THEN** it refreshes Today before another date-dependent action and does not display yesterday's recipe as the newly resolved Tonight

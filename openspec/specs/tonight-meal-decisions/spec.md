# Tonight meal decisions Specification

## Purpose

Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.

## Planning dependencies (non-normative)

References in preserved requirements to the former combined meal-planning owner resolve through the current capability links below. The referenced behavior and each existing requirement body remain unchanged.

- [Read the household schedule through the protected GET operation](../meal-planning/spec.md#requirement-read-the-household-schedule-through-the-protected-get-operation)
- [Hand eligible Home plans back to Planner editing](../non-cooking-plans/spec.md#requirement-hand-eligible-home-plans-back-to-planner-editing)
- [Present Quick Find reads and failed-read retention](../meal-assignment/spec.md#requirement-present-quick-find-reads-and-failed-read-retention)
- [Retain status-only day-validation compatibility](../planning-lifecycle/spec.md#requirement-retain-status-only-day-validation-compatibility)
- [Submit dated-source movement through the protected operation](../meal-rescheduling/spec.md#requirement-submit-dated-source-movement-through-the-protected-operation)
- [Defer the exact dated recipe through a protected operation](../meal-rescheduling/spec.md#requirement-defer-the-exact-dated-recipe-through-a-protected-operation)
- [Expose one authoritative calendar context with schedule reads](../deployment-calendar/spec.md#requirement-expose-one-authoritative-calendar-context-with-schedule-reads)
- [Refresh expired Today context before a new action](../deployment-calendar/spec.md#requirement-refresh-expired-today-context-before-a-new-action)

## Evidence and qualifications (non-normative)

Accepted and promoted as documentation under TM-P01 (2026-10-16), user “promote”,
from the reviewed home-states, goto-choices and changed-plan-recovery deltas,
each prefixed `baseline-tonight-meal-decisions-`. The 27 requirements and 57
scenarios below preserve those deltas verbatim. The [capability evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/tonight-meal-decisions.md)
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

## Incoming Tomorrow reconciliation (non-normative)

The accepted Tomorrow change from upstream commit `8357a8bd` (PR #242, merged at `e4a48c85`) is incorporated under the current owners. Its normative blocks are copied exactly from upstream. This supersedes the original split snapshot only for the changed/added Tomorrow requirements; all other original blocks and evidence records remain intact. See the [upstream change design](../../changes/archive/2026-10-16-tomorrow-preserve-meals/design.md) and [recorded acceptance evidence](../../changes/archive/2026-10-16-tomorrow-preserve-meals/tasks.md). This reconciliation did not rerun application/runtime qualification.

- [Preserve the Tomorrow supper chain across weeks](../meal-rescheduling/spec.md#requirement-preserve-the-tomorrow-supper-chain-across-weeks)
- [Preserve non-cooking source disposition with Tomorrow](../meal-rescheduling/spec.md#requirement-preserve-non-cooking-source-disposition-with-tomorrow)
- [Persist Tomorrow as one calendar change](../meal-rescheduling/spec.md#requirement-persist-tomorrow-as-one-calendar-change)
- [Refresh every week touched by Tomorrow](../meal-rescheduling/spec.md#requirement-refresh-every-week-touched-by-tomorrow)

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

Home SHALL offer the active open household voting round regardless of target or Planner week. Collecting SHALL offer "Vote Now" to Discovery; converged SHALL show "Menu's In", "Your matches are ready to review and save." and "See your matches" to that round's meal plan, exactly in English with equivalent French intent. The invitation SHALL remain without dismissal while open. Copy SHALL NOT assume next week or claim recipe counts from days. Capture and Browse Library SHALL remain available.

#### Scenario: This week open while next week is closed
- **WHEN** Home receives a confirmed collecting round for this week and next week is not open
- **THEN** Home offers Vote Now leading to Discovery for the active round without requiring a reload

#### Scenario: Next week open for voting
- **WHEN** the confirmed collecting round targets next week
- **THEN** Home offers Vote Now without requiring recipe-bearing scheduled days or claiming their count represents voting candidates

#### Scenario: Later week differs from Planner selection
- **WHEN** the confirmed open round targets a later week while Planner has another week selected
- **THEN** Home presents that active round's collecting or converged action independently of Planner selection

#### Scenario: Open round converges
- **WHEN** a collecting round becomes confirmed converged while Home is mounted
- **THEN** Home replaces Vote Now with the exact English headline "Menu's In", supporting copy "Your matches are ready to review and save." and button "See your matches"
- **AND** voting remains open until an explicit existing close action

#### Scenario: French matched-state copy
- **WHEN** Home presents the converged invitation in French
- **THEN** its localized headline, supporting sentence and action convey that matches are ready to review and save, without claiming saved meals or closed voting
- **AND** this Home copy does not change Discovery copy

#### Scenario: Closed or unowned round
- **WHEN** confirmed household state has no active open round, including after closing voting
- **THEN** Home removes the voting invitation while retaining Capture a Recipe and Browse Library links

#### Scenario: Invitation cannot be dismissed
- **WHEN** an open round remains active through Home interaction, leaving Home or returning to Home
- **THEN** its invitation remains available without a dismiss control or suppression inherited from another round

#### Scenario: Read fails or nudge dismissed
- **WHEN** a voting-status read fails or a person seeks the former nudge dismissal while voting is open
- **THEN** failure follows Present trustworthy Home voting status and recovery, and the open-round invitation has no dismiss control
- **AND** neither circumstance changes the plan or closes voting

#### Scenario: Live open and reopen
- **WHEN** voting opens or a closed week is reopened as a new round while Home is mounted
- **THEN** Home presents the new round's authoritative phase without retaining the prior round's completion state

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

Before disposition starts, Close, backdrop dismissal and Back SHALL cancel without submitting a mutation; closing Quick Find before selection SHALL cancel its choice. While a mutation is pending, dismissal and Back SHALL be disabled. After partial completion, dismissal SHALL explain that completed work remains and offer explicit abandonment of the unsaved choice. Back SHALL NOT restart a completed disposition.

#### Scenario: Abort order-in recovery
- **WHEN** a person closes the disposition step before acting
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice
- **WHEN** a person activates Back before disposition starts
- **THEN** the initial Order In / Pick Something Else choice returns without a mutation

#### Scenario: Leave after partial completion
- **WHEN** disposition succeeded, replacement is unsaved and the person closes recovery
- **THEN** Home requires confirmation to abandon the pending replacement and explains that the original meal's completed disposition is retained

### Requirement: Mark Order In before planned-recipe disposition

For Order In plus Tomorrow, Home SHALL include the source disposition in the Tomorrow operation without prior validation or optimistic source mutation. For Save for Next Week or Drop, Home SHALL retain prior local Skipped presentation and awaited status-only validation; defer follows validation and Drop sends no deletion.

#### Scenario: Move after validation
- **WHEN** Order In recovery chooses Save for Next Week and validation remains pending
- **THEN** deferral has not started through that invocation

#### Scenario: Move with source disposition
- **WHEN** Order In recovery chooses Tomorrow and movement remains pending
- **THEN** one Tomorrow request carries Order In disposition while the displayed and persisted source remain unchanged until commit

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Order In recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Request tomorrow for the current Tonight recipe

Home Tomorrow recovery SHALL submit the explicit Tomorrow operation for the current Tonight recipe, week zero and the Monday-based source index of deployment-local today. Monday through Saturday SHALL target the following index in week zero; Sunday SHALL target index zero in week one. Destination, source disposition and rejection SHALL follow meal-planning Tomorrow requirements.

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

In Pick Something Else recovery, Home SHALL await confirmed Tomorrow movement, successful defer or successful date deletion before saving the retained replacement. Drop SHALL present the confirmed empty slot before saving. Replacement SHALL target the captured source date using meal-assignment's guarded empty-supper operation. The two stages SHALL remain separate operations without implied rollback.

#### Scenario: Move original then choose replacement
- **WHEN** Pick Something Else recovery chooses Tomorrow and movement confirms commit
- **THEN** the original is resolved before the retained replacement save starts against the captured source date

#### Scenario: Drop original then choose replacement
- **WHEN** Pick Something Else recovery chooses Drop and date deletion succeeds
- **THEN** Tonight presents the empty source slot and starts the guarded replacement save

#### Scenario: Save after deferral
- **WHEN** the original meal's defer succeeds
- **THEN** replacement saves to the original source date rather than the deferred destination

### Requirement: Finish Home recovery with its caller-specific follow-ups

Pick Something Else recovery SHALL close and perform success navigation only after replacement persistence is confirmed. Home SHALL refresh the captured week and Tonight; refresh failure after confirmed save SHALL show refresh feedback without repeating either mutation. Tomorrow and Drop SHALL navigate to the captured Planner target; defer SHALL remain on Home. Order In SHALL retain its existing disposition and recipe-free Skipped follow-ups.

#### Scenario: Tomorrow or Drop completes
- **WHEN** disposition and replacement save are confirmed for Tomorrow or Drop
- **THEN** recovery closes, affected views refresh and navigation targets the captured Planner week

#### Scenario: Defer completes
- **WHEN** defer and replacement save are confirmed for Save for Next Week
- **THEN** recovery closes and affected views refresh without navigation

#### Scenario: Replacement remains pending
- **WHEN** disposition succeeded but replacement persistence is not yet confirmed
- **THEN** recovery remains open with saving feedback and no success navigation

#### Scenario: Refresh fails after save
- **WHEN** replacement is confirmed saved but a subsequent view refresh fails
- **THEN** Home identifies a refresh failure and offers refresh without replaying disposition or assignment

### Requirement: Stop a rejected Home recovery invocation at its failing await

Home SHALL stop subsequent recovery steps after a rejected await and show the failed stage. Disposition rejection SHALL withhold replacement. Completed work SHALL NOT be represented as rolled back. An uncertain mutation outcome SHALL block replay until authoritative reconciliation; Tomorrow's committed-result rules SHALL remain authoritative. Replacement failure SHALL follow the retained-stage recovery requirements.

#### Scenario: Validation rejects first
- **WHEN** Order In validation rejects before Save for Next Week disposition
- **THEN** that invocation does not submit its defer

#### Scenario: Disposition rejects
- **WHEN** Pick Something Else movement, defer or deletion rejects before replacement
- **THEN** that invocation does not dispatch the retained replacement

#### Scenario: Disposition response is lost
- **WHEN** defer or deletion fails without an established outcome
- **THEN** Home shows uncertain disposition, retains the original and replacement choices, and does not replay disposition or start replacement merely because a read fails or shows an empty source

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

### Requirement: Consume the committed Tomorrow result before continuing Home recovery

Home SHALL continue replacement or successful recovery only when Tomorrow confirms committed movement. While pending it SHALL suppress duplicate submission. A rejected move SHALL retain the original and pending choice with visible conflict feedback. A committed move with incomplete follow-ups SHALL trigger rereads and refresh feedback without resubmitting movement. Unknown outcomes SHALL withhold replacement until reconciled.

#### Scenario: Cooked destination rejects Order In movement
- **WHEN** Order In plus Tomorrow is rejected because a Cooked entry would move
- **THEN** Home retains the original source and recovery choice, shows the conflict and submits neither validation nor replacement

#### Scenario: Move commits but refresh is incomplete
- **WHEN** Tomorrow returns a committed result with incomplete follow-ups
- **THEN** Home rereads affected state and identifies refresh failure without sending the move again

#### Scenario: Transport fails without a known result
- **WHEN** the response is lost and Home cannot establish whether Tomorrow committed
- **THEN** Home withholds replacement and blocks repeat movement until authoritative reads reconcile the source and destination

### Requirement: Retain acknowledged stages of Tonight replacement recovery

Home SHALL retain the original recipe identity, captured source date/reference Monday, chosen replacement and disposition outcome for the mounted recovery session. A failed replacement SHALL retain that choice and offer retry of assignment only. Pending actions SHALL suppress duplicate submissions; late responses from an abandoned session SHALL NOT change a newer session or its displayed date.

#### Scenario: Save rejects after a confirmed move
- **WHEN** Tomorrow commits and replacement is rejected before persistence
- **THEN** recovery identifies that the original moved but replacement was not saved, retains the choice and offers Retry save without another move

#### Scenario: Retry after defer or Drop
- **WHEN** defer or deletion succeeded and replacement failed
- **THEN** retry submits only guarded assignment to the captured source slot, without another defer or delete

#### Scenario: Repeated activation
- **WHEN** a disposition or replacement request is pending and the person activates recovery again
- **THEN** no second mutation is submitted by that recovery session

#### Scenario: Retry crosses deployment midnight
- **WHEN** recovery captured Sunday October 11 with reference Monday October 5 and retry starts after Monday October 12 begins
- **THEN** replacement still targets October 11, and the current Monday's Tonight state is not replaced by that response

#### Scenario: New recovery replaces an abandoned session
- **WHEN** an abandoned session's delayed read resolves after a new recovery starts
- **THEN** it does not clear the new choice, show success for it or navigate on its behalf

### Requirement: Reconcile uncertain replacement persistence before retry

An ambiguous replacement error SHALL trigger an authoritative read of the captured slot and retain the pending choice. The chosen recipe in Planned state SHALL confirm the desired saved outcome without another POST. A different recipe, non-cooking content or completed state SHALL block retry and show a changed-plan conflict. An ordinary empty slot SHALL permit explicit guarded Retry save. An unusable read SHALL leave the outcome unknown and retry blocked.

#### Scenario: Reply lost after persistence
- **WHEN** assignment commits but its reply or post-save follow-up fails and reread shows the chosen recipe Planned in the captured supper slot
- **THEN** recovery treats the desired replacement as saved and does not post it again

#### Scenario: Reply lost before persistence
- **WHEN** the assignment outcome is unknown and a successful reread shows the captured supper slot ordinary and empty
- **THEN** Home retains the choice and offers an explicit guarded Retry save without replaying disposition

#### Scenario: Another household action occupies the source
- **WHEN** reread shows different recipe or non-cooking content, or the guarded save returns conflict
- **THEN** Home preserves that persisted content and offers review of the changed plan rather than an overwrite or another move

#### Scenario: Reread fails
- **WHEN** the captured slot cannot be authoritatively read
- **THEN** Home shows an unknown outcome with Retry check and does not enable Retry save

### Requirement: Distinguish pending Tonight choice from saved Tonight

A recovery choice SHALL NOT be presented as a confirmed saved meal until assignment succeeds or authoritative reread confirms the desired outcome. Failure SHALL display persisted slot content alongside the retained unsaved choice. Feedback SHALL distinguish moving, saving, save failure, changed plan and uncertain outcome; retry controls SHALL identify whether they check or save.

#### Scenario: Optimistic choice fails to save
- **WHEN** the original was moved and the replacement save rejects before persistence
- **THEN** the source slot is shown as empty with the retained replacement marked unsaved rather than as a saved Tonight meal

#### Scenario: Failed check can be retried
- **WHEN** the outcome is unknown after a failed read
- **THEN** accessible feedback offers Retry check without describing the replacement as saved or offering another disposition

### Requirement: Preserve supplied Tonight total duration

The planned Tonight recipe card SHALL display a supplied ISO 8601 total duration with hours and minutes preserved, using the existing localized Ready In wrapper. This total duration SHALL NOT be interpreted as preparation-only time. Existing missing-time behavior and other recipe surfaces SHALL remain unchanged.

#### Scenario: Hour and minute durations
- **WHEN** a planned named recipe supplies PT6H, PT1H30M, PT45M or PT360M as total duration
- **THEN** Home displays respectively 6H, 1H 30 MINS, 45 MINS or 6H within its existing Ready In wrapper

#### Scenario: English and French wrappers
- **WHEN** that recipe is shown with English or French selected
- **THEN** Home uses respectively READY IN or PRÊT EN without changing the duration's units

#### Scenario: No supplied duration
- **WHEN** the planned recipe's duration is missing or empty
- **THEN** Home retains its existing missing-duration presentation

### Requirement: Present trustworthy Home voting status and recovery

Home SHALL distinguish confirmed status from checking and failed reads. It SHALL retain usable last-confirmed navigation during background rechecks and after failure, showing checking or unavailable/last-confirmed feedback and Retry after failure. Without a valid accepted round identity and destination it SHALL withhold the action. Accepted newer state SHALL replace or remove the action; rejected updates SHALL NOT confirm new state.

#### Scenario: Initial hydration
- **WHEN** Home has no confirmed voting snapshot and the initial status read is pending
- **THEN** it shows a compact checking status without Vote Now, See your matches or a claim that voting is closed
- **AND** Tonight and other Home navigation remain usable

#### Scenario: Read fails or status is stale
- **WHEN** a background recheck is pending for a last-confirmed open round with usable identity and destination
- **THEN** Home keeps its read-only navigation action usable with checking feedback without claiming the round was newly confirmed
- **AND** activating the action leaves destination reconciliation to Discovery or Planner without a handoff mutation

#### Scenario: Failed read with a usable last-confirmed round
- **WHEN** a refresh fails while a usable last-confirmed open round is retained and no accepted newer state supersedes it
- **THEN** Home retains its navigation action with unavailable status identifying it as last confirmed, and offers Retry
- **AND** failure does not newly confirm that round, hide the invitation or mutate the plan

#### Scenario: Failed read without a usable destination
- **WHEN** initial status fails or no retained accepted round provides a valid identity and destination
- **THEN** Home shows unavailable status with Retry and withholds round navigation instead of guessing its week

#### Scenario: Unusable authoritative response
- **WHEN** the current authoritative read completes with a projection rejected by the existing session validation owner and no newer accepted update has superseded that read
- **THEN** its status becomes unavailable rather than remaining indefinitely loading, and Home offers Retry
- **AND** any retained usable last-confirmed navigation follows the failed-read policy without adopting the rejected projection

#### Scenario: Rejected live projection
- **WHEN** existing validation rejects a malformed live projection
- **THEN** it does not replace accepted round data or establish newly confirmed state
- **AND** Home follows the retained accepted state; this rejection alone does not promise an unavailable transition or Retry, and existing reconnect/resume reconciliation remains available

#### Scenario: Retry reconciles a closed round
- **WHEN** Retry succeeds after an unavailable open-round snapshot and confirms no open round
- **THEN** Home removes the invitation and unavailable feedback

#### Scenario: Reconnect or mobile resume
- **WHEN** the existing household live connection reconnects, or the app resumes through visible or pageshow events after a missed open, close or convergence update
- **THEN** Home follows the reconciled current round and phase without requiring reload

#### Scenario: Delayed or different-host update
- **WHEN** an older update arrives after a newer round state, or an update from an unconfirmed server incarnation arrives
- **THEN** Home does not regress to the older state or treat the different host's update as confirmed before authoritative reconciliation

### Requirement: Navigate Home matches to the absolute round week without mutation

Activating See your matches SHALL open the displayed confirmed round's absolute target week in Planner's meal-plan tab. Navigation SHALL preserve suggestions as suggestions awaiting explicit saving and voting closure; it SHALL NOT assign meals or close voting. A missing usable round identity or week SHALL withhold the action and provide status recovery rather than navigate to a guessed week.

#### Scenario: Previously selected grocery tab and different week
- **WHEN** a person activates See your matches while Planner previously showed groceries for another week
- **THEN** Planner opens the converged round's meal-plan tab and absolute week with existing suggestions and saved meals retaining their distinct states
- **AND** the handoff submits no assignment or voting-close mutation

#### Scenario: Date rolls over before activation
- **WHEN** the deployment week changes between showing the converged invitation and activating See your matches
- **THEN** navigation still opens the displayed round's absolute week rather than interpreting its old relative offset against the new date

#### Scenario: Round closes or changes around activation
- **WHEN** an authoritative close or replacement round is accepted before activation
- **THEN** Home removes or updates the action to match the accepted round
- **AND** a close accepted after navigation leaves the captured week as the destination while existing Planner reconciliation presents its current state, without a handoff mutation

#### Scenario: Missing navigation identity
- **WHEN** no retained accepted open-round snapshot provides a usable round identity and absolute target week
- **THEN** Home withholds its action instead of routing to the selected or next week
- **AND** a failed or rejected current authoritative read presents unavailable status and Retry; an ignored live frame alone does not manufacture a failure signal

# Cooking Specification

## Purpose

Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.

## Planning dependencies (non-normative)

References in preserved requirements to the former combined meal-planning owner resolve through the current capability links below. The referenced behavior and each existing requirement body remain unchanged.

- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Refresh expired Today context before a new action](../deployment-calendar/spec.md#requirement-refresh-expired-today-context-before-a-new-action)
- [Validate recipe-specific cooking without completing another assignment](../planning-lifecycle/spec.md#requirement-validate-recipe-specific-cooking-without-completing-another-assignment)

## Requirements

### Requirement: Enter cooking with the displayed recipe identity

From a loaded recipe detail outside Edit, View steps SHALL open cooking for that recipe. Home cooking entry SHALL open the current recipe when it has an identity. Opening cooking SHALL not itself record completion.

#### Scenario: Open from detail
- **WHEN** a person activates View steps on a loaded non-editing detail
- **THEN** cooking opens with that displayed recipe identity, name and image

#### Scenario: Open from Home
- **WHEN** Home cooking is requested with an identified current recipe
- **THEN** cooking opens for that current recipe without a completion submission

### Requirement: Load recipe content for the cooking view

On cooking entry the view SHALL display loading feedback while requesting detail for the entry recipe. On a successful detail read it SHALL use the returned ingredients and supported instructions for preparation and reading.

#### Scenario: Detail request pending
- **WHEN** cooking detail has not finished loading
- **THEN** the cooking loading surface is displayed

#### Scenario: Recipe detail available
- **WHEN** the detail request succeeds with ingredients and parseable instructions
- **THEN** the preparation checklist and subsequent steps use that returned content

### Requirement: Prepare ingredients before starting an unbookmarked recipe

Without a client-held recipe position, cooking SHALL begin at Check & Prep. Each ingredient control SHALL toggle its checked indication and the view SHALL show a ready count. Starting cooking SHALL enter the first recipe step without requiring every ingredient to be checked.

#### Scenario: Toggle an ingredient
- **WHEN** a person activates an unchecked ingredient control and then activates it again
- **THEN** its checked indication changes to true then false and the ready count follows

#### Scenario: Start without all checks
- **WHEN** a person activates Let’s Cook from preparation with unchecked ingredients
- **THEN** the first recipe instruction is displayed

### Requirement: Retain preparation checks within the mounted cooking view

Ingredient checks SHALL remain local to the mounted cooking view. Returning to preparation in that view SHALL retain those checks. A newly mounted cooking view SHALL start with an empty ingredient check map.

#### Scenario: Return during the same view
- **WHEN** a person checks an ingredient and returns to preparation without unmounting cooking
- **THEN** the ingredient remains checked

#### Scenario: Open a new view
- **WHEN** cooking is unmounted and a new cooking view is mounted
- **THEN** its preparation checklist starts unchecked

### Requirement: Open recipe detail from the cooking hero

Activating the cooking hero SHALL open detail for the cooking entry recipe without a target planning day. Dismissing that detail SHALL return to the mounted cooking view. Choosing similar recipes from that detail SHALL close cooking and request recipe search for that identity.

#### Scenario: Inspect the viewed recipe
- **WHEN** a person activates the cooking hero
- **THEN** detail opens for the cooking recipe identity without a planner-day action

#### Scenario: Dismiss detail
- **WHEN** the nested detail is closed
- **THEN** the underlying mounted cooking view is available again

#### Scenario: Find similar from nested detail
- **WHEN** the nested detail requests similar recipes
- **THEN** detail and cooking close and navigation requests recipes with that recipe as the similarity target

### Requirement: Close cooking without submitting a new completion

The cooking close control SHALL dismiss cooking through its caller. Closing before any completion request SHALL not submit cooking completion.

#### Scenario: Leave before completion
- **WHEN** a person closes cooking before requesting Cooked
- **THEN** the caller dismisses cooking without submitting completion

### Requirement: Read supported legacy and flat structured instructions

Cooking SHALL read a string-array recipe as ordered nonblank trimmed instructions with sequential step labels. For a flat object array it SHALL use nonblank trimmed text, falling back to name, omit empty entries and use a supplied name or sequential step label as the heading.

#### Scenario: Legacy strings
- **WHEN** supported string-array content contains a blank entry between two instructions
- **THEN** only the two nonblank instructions are presented in order with consecutive step labels

#### Scenario: Flat objects
- **WHEN** supported flat instructions contain a named text step and a nameless text step
- **THEN** both are presented in order with the supplied heading and a sequential heading respectively

#### Scenario: Name supplies instruction
- **WHEN** a supported flat step has a nonblank name but no nonblank text
- **THEN** the trimmed name supplies its instruction

### Requirement: Read supported section instructions in source order

For supported section arrays, cooking SHALL flatten nonblank child text or name in section order with consecutive step numbering. Non-generic section names SHALL supply reading context; generic preparation/instruction section names SHALL not prefix focused instruction text.

#### Scenario: Named sections
- **WHEN** a supported recipe has two named sections with nonblank children
- **THEN** children appear in section order and retain contextual section names

#### Scenario: Generic preparation
- **WHEN** a section is named Preparation or Préparation
- **THEN** focused instructions omit that generic section prefix

### Requirement: Offer a remembered cooking presentation

Cooking SHALL offer a compact, named View chooser with Step by step and All steps choices in preparation and both reading presentations. The selected member's explicit cookingViewMode SHALL select the presentation; an absent member or absent preference SHALL default to All steps. The chooser SHALL expose its current choice and expanded state, use at least a 44 px target, stop hero navigation and restore focus when dismissed.

#### Scenario: No explicit preference
- **WHEN** cooking opens for a member without a saved cookingViewMode
- **THEN** All steps is selected without consulting a feature flag

#### Scenario: Saved focused preference
- **WHEN** cooking opens for a member whose cookingViewMode is step-by-step
- **THEN** Step by step is selected

### Requirement: Remember cooking presentation for the selected member

Changing presentation SHALL update immediately and persist only for the currently selected loaded member. The chooser SHALL identify the member whose confirmed choice is remembered. A failed save SHALL retain the session presentation and cooking work, report that it was not remembered for that member and offer Retry. A missing profile SHALL permit a session-only choice without saving to a previous or guessed member.

#### Scenario: Change presentation
- **WHEN** a loaded member chooses the other view and persistence succeeds
- **THEN** the mounted recipe changes presentation without losing cooking work and the choice is remembered for that member

#### Scenario: Save fails
- **WHEN** a view change cannot be saved
- **THEN** the session keeps the chosen presentation and cooking work, reports that it was not remembered and offers Retry

### Requirement: Preserve cooking work while changing presentation

Changing presentation SHALL retain ingredient checks, preparation context, recipe content, current bookmark and completion state. Focused to all-steps SHALL align the current step; all-steps to focused SHALL use the reading bookmark. An all-steps round trip SHALL restore its prior exact offset when the step has not changed, otherwise it SHALL align the new current step.

#### Scenario: Switch from focused reading
- **WHEN** the cook changes from Step by step to All steps on a later step
- **THEN** that step is aligned in the list and ingredient checks remain unchanged

### Requirement: Guard cooking work during view changes

Presentation changes SHALL be disabled while an instruction editor or cooking completion is pending. Changing view SHALL never discard an edit, restart cooking, reload recipe content or submit Cooked.

#### Scenario: Editing blocks change
- **WHEN** an instruction editor is active
- **THEN** the chooser explains that the edit must be saved or cancelled and no presentation change occurs

### Requirement: Navigate one focused instruction at a time

With Step by step selected, cooking SHALL display one active instruction and its heading. Next SHALL advance until the last step, where Cooked becomes the completion action. Back SHALL return to the preceding position, including preparation; it SHALL be disabled at preparation. Scrolling SHALL not change focused position.

#### Scenario: Read focused steps
- **WHEN** a person starts a two-step recipe with Step by step selected and activates Next
- **THEN** the second instruction is displayed and the action becomes Cooked

#### Scenario: Back to preparation
- **WHEN** a person activates Back from the first focused instruction
- **THEN** preparation is shown and Back is disabled

#### Scenario: Scroll focused content
- **WHEN** a person scrolls focused instructions
- **THEN** the held step position is unchanged

### Requirement: Read all instructions in All steps view

With All steps selected, starting from preparation SHALL display every parsed step in one ordered reading list with a Cooked action. The list SHALL show meaningful supplied headings, suppress generic Step-number or instruction-identical headings, and show section context when it changes.

#### Scenario: Read the full recipe
- **WHEN** a person starts a recipe with All steps selected
- **THEN** all parsed instructions appear together and Cooked is available

#### Scenario: Avoid redundant headings
- **WHEN** a step heading is Step 1 or equals its instruction
- **THEN** the list omits that redundant heading while preserving the instruction

### Requirement: Preserve instruction text when presenting paragraphs

Single-page reading SHALL retain instruction content and split paragraphs at explicit blank lines, keeping ordinary sentence punctuation, measurements and single line breaks together. Presentation SHALL not rewrite the editable instruction value.

#### Scenario: Measurements remain together
- **WHEN** an instruction includes decimal quantities and multiple sentences without blank lines
- **THEN** they remain together in one paragraph

#### Scenario: Explicit paragraphs
- **WHEN** an instruction contains a blank line between two text groups
- **THEN** the groups appear as separate paragraphs and editing receives the original instruction text

### Requirement: Hold recipe reading position within client memory

Cooking SHALL keep its current step by recipe identity in client memory. A newly mounted cooking view in the same client store SHALL use that held position. All steps scrolling SHALL update the reading bookmark without remounting its rows, replacing an active editor or submitting completion.

#### Scenario: Reopen the same recipe
- **WHEN** a recipe has a held second-step bookmark and cooking mounts again using the same client store
- **THEN** its reading position is the second step

#### Scenario: Scroll during editing
- **WHEN** single-page reading moves to another visible step while an editor is open
- **THEN** the bookmark follows reading and the same editor and draft remain, without cooking completion

### Requirement: Return to ingredients and resume single-page reading

Single-page reading SHALL offer Ingredients when no step is being edited. Returning to ingredients SHALL retain the mounted checklist, recipe bookmark and reading offset. Resume steps SHALL restore that offset and bookmark instead of restarting the recipe.

#### Scenario: Consult ingredients mid-recipe
- **WHEN** a person returns to Ingredients from a later reading position
- **THEN** preparation opens with checks and bookmark retained

#### Scenario: Resume the list
- **WHEN** a person activates Resume steps from that preparation view
- **THEN** the reading list returns at its saved offset and bookmark

#### Scenario: Editor is active
- **WHEN** a single-page step editor is active
- **THEN** Ingredients is disabled until editing ends

### Requirement: Expose cooking reading and control semantics

Cooking SHALL expose the current position and step count through a progressbar and indicator, ingredient checked indications, a named close button, and a named Mark recipe as cooked action. Single-page instructions SHALL use an ordered list with named per-step edit controls.

#### Scenario: Reading position is exposed
- **WHEN** the single-page reading bookmark changes to step two
- **THEN** the indicator and progressbar expose position two

#### Scenario: Find step controls
- **WHEN** single-page instructions are displayed
- **THEN** the ordered list and named per-step edit controls are available

### Requirement: Edit a supported cooking instruction explicitly

From a focused instruction or single-page row, cooking SHALL offer editing of that step’s source instruction without adding section context to the editable value. Save SHALL submit the instruction array for the viewed recipe with the targeted string or object field replaced, retaining other entries and section structure.

#### Scenario: Edit a legacy instruction
- **WHEN** a person edits the second supported string instruction and activates Save
- **THEN** the viewed recipe update contains the changed second string and the other instruction entries

#### Scenario: Edit a section child
- **WHEN** a person saves a child instruction in a supported section
- **THEN** the corresponding child text or name is replaced while the section and its other children remain

#### Scenario: Edit section content
- **WHEN** a section supplies a non-generic display prefix
- **THEN** the editor contains the source instruction without that added prefix

### Requirement: Apply a successful step edit locally

After a changed step update resolves successfully, cooking SHALL apply the submitted instruction array to its local recipe, reparse supported steps, close the editor and announce Step saved. Saving an unchanged supported instruction SHALL close the editor without sending an update.

#### Scenario: Save a changed step
- **WHEN** the instruction update request resolves successfully
- **THEN** the edited instruction appears locally, the editor closes and a polite Step saved announcement is supplied

#### Scenario: Save unchanged text
- **WHEN** the editor value equals the supported step’s original editable instruction
- **THEN** the editor closes without an update request

### Requirement: Cancel an unsubmitted cooking edit

Cancel SHALL discard the open instruction edit without updating the recipe. For single-page rows, cancellation SHALL request focus return to that row’s edit control.

#### Scenario: Cancel a draft
- **WHEN** a person changes instruction text and activates Cancel before saving
- **THEN** the original displayed instruction remains and no recipe update is submitted

#### Scenario: Return focus to row
- **WHEN** a single-page instruction edit is cancelled and its edit control remains mounted
- **THEN** focus is requested on that row’s edit control

### Requirement: Retain single-page edit failure and retry controls

Single-page Save and Cancel SHALL be disabled during an edit save. A rejected save SHALL retain the editor and draft, display an alert with Try again, and end pending feedback so another attempt is available. Other row editors SHALL be disabled while an editor is open.

#### Scenario: Save pending
- **WHEN** a single-page changed instruction save is still pending
- **THEN** Save and Cancel are disabled and another row editor cannot be opened

#### Scenario: Save rejects
- **WHEN** a single-page instruction update rejects
- **THEN** the draft stays open with an error alert and Try again can resubmit it

### Requirement: Hand cooking content issues to the quality form

When the loaded recipe permits content reporting and no step editor is open, preparation SHALL offer Report issue with ingredients and reading SHALL offer Report issue with steps. These controls SHALL open the shared quality form with the corresponding context and loaded issue, without opening recipe detail.

#### Scenario: Report ingredients
- **WHEN** an eligible recipe is in preparation and a person requests ingredient reporting
- **THEN** the quality form opens with ingredients context while the cooking view remains mounted

#### Scenario: Report steps
- **WHEN** an eligible recipe is being read and a person requests step reporting
- **THEN** the quality form opens with steps context and the loaded issue

#### Scenario: Reporting unavailable
- **WHEN** the loaded recipe does not permit content reporting
- **THEN** cooking does not offer its contextual report control

### Requirement: Return from quality reporting to the mounted cooking context

Dismissing the cooking report form SHALL retain the mounted ingredient checks and reading bookmark. After a successful report submission or resolution, cooking SHALL apply the returned local recipe and close the form. A submission that reports a re-import launch failure SHALL leave the form open through its existing quality error handling.

#### Scenario: Dismiss a report draft
- **WHEN** a person closes the quality form during cooking
- **THEN** the cooking checks and reading bookmark remain

#### Scenario: Report or resolve succeeds
- **WHEN** the cooking report or resolution request returns successfully without a launch failure
- **THEN** the returned recipe is applied locally and the quality form closes

#### Scenario: Launch fails after report save
- **WHEN** report submission returns its recipe with re-import launch failure
- **THEN** cooking applies that recipe but leaves the quality form open for its saved-report/launch-failure feedback

### Requirement: Acknowledge cooking report background launch locally

When cooking receives reimportStarted from a successful quality submission, it SHALL show Reimporting in background as status feedback. This acknowledgement SHALL not claim that replacement recipe content is ready.

#### Scenario: Background launch acknowledged
- **WHEN** successful cooking report submission reports that re-import started
- **THEN** the form closes and Reimporting in background status appears without a readiness claim

### Requirement: Submit completion for the viewed recipe and current local date

Cooked SHALL request recording the cooking entry recipe identity with status two for the deployment-local current date from meal-planning’s authoritative calendar context at submission time. Focused cooking SHALL offer this action at its last instruction; single-page cooking SHALL offer it from the reading list. The request SHALL not substitute tonight’s recipe or a planner target date.

#### Scenario: Cook another recipe
- **WHEN** a person finishes viewing a recipe different from the current supper
- **THEN** the submitted recipe identity is the viewed recipe with status two

#### Scenario: Finish from either reading mode
- **WHEN** Cooked is activated at the focused final step or in single-page reading
- **THEN** completion targets the deployment-local current date from meal-planning’s authoritative calendar context at that submission

#### Scenario: Browser and deployment dates differ
- **WHEN** Cooked is activated at 2026-10-12T01:30:00Z in a Tokyo browser for a Toronto deployment
- **THEN** completion submits the viewed recipe with status two for October 11, even if the response arrives on October 12

#### Scenario: Current date cannot be refreshed
- **WHEN** completion needs fresh deployment context and the refresh fails
- **THEN** no validation is submitted and the existing failed-completion retry presentation remains available

### Requirement: Wait for cooking completion before success feedback

During a pending completion request, cooking SHALL disable its forward/completion action and suppress another completion submission from that mounted view. After the request resolves, cooking SHALL show its celebration, then invoke the optional cooked callback and close callback after the scheduled celebration delay without requesting route navigation.

#### Scenario: Request pending
- **WHEN** a completion request has started but has not resolved
- **THEN** the completion action is disabled and no celebration or success callback occurs

#### Scenario: Repeated activation during request
- **WHEN** completion is activated again while this view already has an in-flight completion
- **THEN** this view does not submit a second completion request

#### Scenario: Completion resolves
- **WHEN** the completion request resolves successfully and the view remains mounted through the delay
- **THEN** celebration appears, then the optional cooked callback and close callback are invoked without route navigation

### Requirement: Keep failed cooking completion open for retry

When the completion request rejects, cooking SHALL retain its mounted view and position, show an alert that completion could not be saved, re-enable the completion action and permit another attempt. A subsequent attempt SHALL clear the previous completion error before awaiting its result.

#### Scenario: Completion rejects
- **WHEN** recording cooking rejects
- **THEN** cooking remains open with its position and error alert and does not invoke success callbacks

#### Scenario: Retry completion
- **WHEN** a person activates Cooked after a rejected completion
- **THEN** another completion request starts and the previous error clears

### Requirement: Confirm local supper completion only for a matching confirmed result

After completion resolves, the local Today view SHALL become Cooked and clear its non-cooking metadata only when the response confirms mealMarkedCooked and its then-current recipe identity equals the submitted recipe. A false or absent confirmation SHALL leave local Today unchanged through this completion response path.

#### Scenario: Matching supper confirmed
- **WHEN** the server reports mealMarkedCooked true and the current local recipe matches the submitted recipe
- **THEN** local Today becomes Cooked and its non-cooking metadata clears

#### Scenario: Different or unconfirmed supper
- **WHEN** the server reports false or omits confirmation, or the then-current local recipe differs
- **THEN** this response path leaves local Today unchanged even though the cooking request resolved

### Requirement: Keep cooking feedback separate from calendar matching

A resolved recipe-specific completion SHALL allow cooking success feedback even when mealMarkedCooked is false. Calendar matching and unavailable-recipe rejection SHALL follow meal planning’s “Validate recipe-specific cooking without completing another assignment”; live-update receipt SHALL remain separate from this local success.

#### Scenario: Unscheduled recipe recorded
- **WHEN** recipe-specific completion resolves with mealMarkedCooked false
- **THEN** cooking succeeds locally without claiming that tonight’s assignment was completed

#### Scenario: Recipe unavailable
- **WHEN** the meal-planning validation operation rejects the viewed recipe as unavailable
- **THEN** the cooking completion request follows the failed-completion feedback path rather than confirming success

### Requirement: Explain unavailable cooking instructions honestly
Cooking SHALL distinguish a failed detail read from a successful read with no usable instructions and SHALL NOT substitute invented recipe steps. Both states SHALL offer Retry and retain Close, the presentation choices and hero detail access. Mark recipe as cooked SHALL remain available through existing completion pending and failure recovery.

#### Scenario: Detail read rejects
- **WHEN** the current cooking detail read rejects
- **THEN** cooking shows a read failure and Retry without invented instructions, retaining completion and detail access

#### Scenario: Stored instructions are absent or unusable
- **WHEN** the current detail read succeeds without usable instructions
- **THEN** cooking explains that steps are unavailable and retains Retry, completion and detail access

### Requirement: Report unavailable cooking steps through existing quality recovery
For a loaded recipe eligible for content reporting with no usable instructions, cooking SHALL offer Report steps using the shared quality form with steps context. Existing server-owned submission and reimport policy SHALL apply. Cooking SHALL apply returned instructions and acknowledge a started reimport as background work, without claiming readiness. Retry SHALL reread current content explicitly.

#### Scenario: Flag missing steps and start reimport
- **WHEN** an eligible recipe has no usable steps and a report submission starts reimport
- **THEN** the shared form submits the report, cooking applies its returned recipe and acknowledges background work while Retry remains available

#### Scenario: Read recovered instructions
- **WHEN** Retry subsequently returns usable instructions
- **THEN** cooking presents those instructions using the selected reading mode

#### Scenario: Departed recipe response
- **WHEN** the cooking identity changes before its old detail read settles
- **THEN** the old response does not replace current content or failure feedback

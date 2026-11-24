# Recipe editing Specification

## Purpose

Let household members edit existing recipe content, ratings, notes and discoverability, preserving the supported partial-update, persistence, search-invalidation and file-projection boundaries.

## Relocation provenance (non-normative)

These requirements were relocated unchanged from their original capability owners. All applicable BSL/U/A qualifications, partial-success boundaries and deferred runtime/API/browser/database/model evidence transfer with them. Relocation establishes no new behavioral guarantee.

- [recipe-library evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-library.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

- [Return persisted recipe detail for an available record](../recipe-library/spec.md#requirement-return-persisted-recipe-detail-for-an-available-record)
- [Represent persisted recipe attribution and readiness](../recipe-library/spec.md#requirement-represent-persisted-recipe-attribution-and-readiness)
- [Publish lexical content before optional embedding work](../search-indexing/spec.md#requirement-publish-lexical-content-before-optional-embedding-work)

## Requirements

### Requirement: Open initialized recipe-detail field drafts

For successfully loaded library detail, the Settings menu SHALL offer Edit. Edit SHALL open drafts for name, description, ingredient strings, cuisine and meal types, initialized from the currently loaded detail. Absent description, ingredients and cuisine SHALL initialize as empty text, an empty list and empty text respectively.

#### Scenario: Edit loaded detail

- **WHEN** a person opens Settings and activates Edit on successfully loaded library detail
- **THEN** the sheet offers initialized name, description, ingredient and cuisine fields, meal-type choices, Save changes and Cancel

#### Scenario: Initialize meal-type choices

- **WHEN** the person opens Edit
- **THEN** nonempty loaded meal types supply the draft choices
- **AND** if none are loaded, a trimmed category matching an offered choice supplies one choice, otherwise Supper supplies the draft default
- **AND** the offered choices are Breakfast, Brunch, Snack, Lunch, Supper, Sides, Dessert, Appetizer and Beverage

### Requirement: Edit ingredient rows in the detail draft

In detail edit mode, the editor SHALL present mobile-friendly ingredient rows with inline add/remove controls, standardized unit dropdown selects (preserving any unrecognized legacy saved unit option until changed), and consistent readable section labels, affecting only the local draft before submission.

#### Scenario: Change and add ingredients

- **WHEN** a person changes an ingredient row (including selecting a standard unit in structured ingredient edit mode) and activates Add ingredient
- **THEN** the draft contains the changed row and an additional empty row (with its unit dropdown defaulted to empty in structured ingredient mode)

#### Scenario: Edit ingredient and package capacity units from standardized dropdowns

- **WHEN** a person edits a structured ingredient row or expands `Shopping and scaling` and enables Package details
- **THEN** both the ingredient unit control and package capacity unit control render as `<select>` dropdowns containing standard culinary units (`tsp`, `tbsp`, `cup`, `ml`, `cl`, `dl`, `l`, `mg`, `g`, `kg`, `piece`, `clove`, `pinch`, `slice`, `can`, `jar`, `pkg`, `bunch`, `head`, `sprig`, `stalk`, `leaf`) plus a blank/none option

#### Scenario: Preserve non-standard legacy unit until user changes it

- **WHEN** a saved recipe loads into edit mode with a non-standard unit string such as `dash` or `Gousses`
- **THEN** the unit `<select>` includes and retains that saved value as a temporary selectable option until the person chooses a standard unit or saves

#### Scenario: Mobile compact layout for structured ingredients and steps

- **WHEN** edit mode renders on a narrow phone screen
- **THEN** each structured ingredient card places `[Amount] [Unit] [Remove]` cleanly on one row above the full-width description input, while section headers and footer save controls omit cramped micro-uppercase captions and keep 48 CSS px touch targets

#### Scenario: Remove an ingredient

- **WHEN** a person removes a draft ingredient row
- **THEN** that row is removed while the other rows retain their relative order

### Requirement: Restrict local detail Save eligibility

The editor SHALL disable Save changes when the trimmed draft name is empty or no meal types are selected. Description, cuisine and ingredients SHALL be allowed to be empty in the local draft.

#### Scenario: Name is blank

- **WHEN** the draft name is empty or whitespace-only
- **THEN** Save changes is disabled

#### Scenario: No meal type is selected

- **WHEN** the person deselects all draft meal types
- **THEN** Save changes is disabled until at least one is selected and the name is nonblank

### Requirement: Submit normalized detail fields for the loaded recipe

Activating enabled Save changes SHALL request PATCH `/api/recipes/{id}` for the loaded recipe's ID with all five draft fields. Name, description and ingredient strings SHALL be trimmed; empty ingredient strings SHALL be removed in order. Cuisine SHALL be trimmed and represented as null when blank. Selected meal types SHALL be submitted as an array.

#### Scenario: Submit edited fields

- **WHEN** enabled Save changes is activated for loaded recipe R
- **THEN** PATCH targets R with normalized name, description, ingredients, cuisineType and mealTypes rather than a different recipe or only the changed field

#### Scenario: Submit blank optional drafts

- **WHEN** Save changes is activated with blank description, blank cuisine and only blank ingredient rows, with a valid name and meal selection
- **THEN** the submission contains description as an empty string, cuisineType as null and ingredients as an empty array

### Requirement: Apply supplied non-null recipe-detail update fields

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store supplied non-null name, description, ingredient strings, cuisine and meal types and update the recipe timestamp, retaining its ID. Omitted or null values for these fields SHALL leave their stored values unchanged. Supplied empty strings or arrays SHALL replace those values.

#### Scenario: Store supplied detail fields

- **WHEN** an authorized PATCH supplies non-null detail fields for an existing recipe and the update succeeds
- **THEN** those values are stored for that ID and its update timestamp is assigned

#### Scenario: Preserve omitted or null values

- **WHEN** an authorized PATCH omits a detail field or supplies null and the update succeeds
- **THEN** that stored field is unchanged, including an existing cuisine receiving null

#### Scenario: Replace with empty values

- **WHEN** an authorized PATCH supplies an empty description, an empty cuisine string, empty ingredients or empty meal types and succeeds
- **THEN** each supplied empty value replaces its stored value
- **AND** supplying empty meal types sets category to Supper without adding Supper to the stored meal-type array

### Requirement: Show pending detail-save feedback

While the detail Save request is pending, the sheet SHALL show Saving on the Save control and disable Save and Cancel. This SHALL NOT imply that draft fields or sheet dismissal are disabled.

#### Scenario: Save is pending

- **WHEN** a detail-field Save has started and its request has not completed
- **THEN** Save displays Saving and both Save and Cancel are disabled

### Requirement: Discard unsubmitted recipe-detail drafts with Cancel

Before Save submission, Cancel SHALL leave editing, discard the draft in favor of the currently loaded detail and issue no detail-field PATCH. Reopening Edit SHALL initialize again from that loaded detail.

#### Scenario: Cancel before submission

- **WHEN** a person changes detail-field drafts and activates Cancel before submitting
- **THEN** the sheet returns to its loaded detail without requesting a detail-field update

#### Scenario: Reopen after Cancel

- **WHEN** the person reopens Edit after cancelling unsubmitted changes
- **THEN** the drafts reflect the currently loaded detail and its draft defaults rather than the discarded changes

### Requirement: Display the submitted snapshot after successful detail Save

When the detail-field update request resolves successfully while the sheet remains mounted, the sheet SHALL leave editing and use the normalized snapshot captured at submission for its displayed detail state. This completion SHALL NOT require applying the PATCH response or performing another detail GET.

#### Scenario: Save resolves successfully

- **WHEN** a submitted detail-field update resolves successfully while the sheet remains mounted
- **THEN** the sheet displays the submitted name, description, ingredient strings, cuisine and meal types through its existing detail presentation and exits editing

### Requirement: Retain editing and offer another attempt after detail Save failure

When the detail-field update request rejects while the sheet remains open, the editor SHALL remain open with its current drafts and display “Could not save changes. Try again.” Saving SHALL end and Save and Cancel SHALL become available subject to local Save eligibility. Starting another Save SHALL clear the prior error. Failure feedback SHALL NOT assert that stored data is unchanged.

#### Scenario: Save rejects

- **WHEN** a detail-field Save request rejects while the editor remains open
- **THEN** the current drafts remain editable, the failure message appears and Saving ends with Cancel and any locally eligible Save available

#### Scenario: Retry after failure

- **WHEN** a person activates an enabled Save after a detail-field Save failure
- **THEN** the prior error clears and the current normalized drafts are submitted in another PATCH for the loaded recipe ID

### Requirement: Initialize recipe-detail ratings and notes controls

The sheet SHALL offer Notes and Dislike=1, Like=2 and Love=3 ratings after successful detail loading. Notes SHALL use returned text (empty for absence) unless a retained unsaved draft or newer edit/acknowledgement takes precedence. Ratings SHALL use the returned value, defaulting to 0 (Unknown, no selection). Each rating choice SHALL expose its label and pressed state.

#### Scenario: Load existing notes and rating

- **WHEN** library detail without a retained unsaved draft loads with notes “Family favorite” and rating 2
- **THEN** Notes contains “Family favorite”, Like is pressed, and Dislike and Love are not pressed

#### Scenario: Load absent notes and rating

- **WHEN** detail without a retained unsaved draft loads without notes or rating values
- **THEN** Notes is empty and none of the three rating choices is pressed

#### Scenario: Offer the three rating meanings

- **WHEN** successfully loaded library detail displays its rating control
- **THEN** it offers Dislike, Like and Love mapped to 1, 2 and 3 respectively, with no separate Unknown button

### Requirement: Select or clear the loaded recipe rating

Activating a rating choice SHALL immediately select its value locally and request PATCH `/api/recipes/{id}` with that rating for the loaded recipe ID. Activating the currently selected choice SHALL clear the selection locally and submit rating 0. The rating action SHALL omit notes and unrelated recipe fields from its payload.

#### Scenario: Select a different rating

- **WHEN** a person activates Love while Like is selected for loaded recipe R
- **THEN** Love becomes pressed immediately and PATCH targets R with rating 3

#### Scenario: Clear the current rating

- **WHEN** a person activates the currently selected Dislike choice
- **THEN** no choice remains pressed and PATCH submits rating 0 for that recipe

#### Scenario: Select from Unknown

- **WHEN** a person activates Like while no choice is selected
- **THEN** Like becomes pressed and PATCH submits rating 2 without notes or unrelated recipe fields

### Requirement: Submit changed recipe notes after the editing delay

Editing Notes SHALL immediately display the entered text. When it differs from the last acknowledged notes, treating absent notes as empty text, the sheet SHALL schedule submission after 800 ms. A further notes edit before dispatch SHALL replace the pending submission with the latest differing text. Submission SHALL PATCH the loaded recipe ID with exact notes text, without trimming, and omit rating and unrelated recipe fields.

#### Scenario: Submit exact notes text

- **WHEN** Notes changes to “ More sauce ”, differs from the loaded notes, and remains unchanged until its 800 ms timer fires
- **THEN** PATCH submits notes “ More sauce ” for the loaded recipe without rating or unrelated recipe fields

#### Scenario: Clear initially nonempty notes

- **WHEN** a person clears nonempty loaded notes and the empty input remains until its submission timer fires
- **THEN** PATCH submits notes as an empty string rather than null

#### Scenario: Replace a pending notes edit

- **WHEN** a person changes Notes to one differing value and then another before the first timer fires, with the final text still differing from the loaded notes
- **THEN** the first pending submission is cancelled and the final text is submitted after its own 800 ms delay if no further change intervenes

### Requirement: Persist supplied recipe ratings and exact notes

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null rating in the supported 0–3 range and supplied non-null notes on that recipe. Notes SHALL retain their exact text, including whitespace and empty strings. These SHALL be recipe-level facts rather than member-specific ratings or notes; existing library fact/read ownership applies.

#### Scenario: Store a rating or clear it to Unknown

- **WHEN** a successful authorized PATCH supplies rating 3 or rating 0 for an existing recipe
- **THEN** the recipe stores Love or Unknown respectively without creating a member-specific rating

#### Scenario: Store notes without trimming

- **WHEN** a successful authorized PATCH supplies notes “ More sauce ”
- **THEN** the recipe stores that exact notes text

#### Scenario: Durably clear notes with empty text

- **WHEN** a successful authorized PATCH supplies an empty notes string for a recipe with nonempty notes
- **THEN** its stored notes become an empty string, available through existing persisted-detail reading

### Requirement: Preserve omitted recipe content during ratings and notes updates

Omitted or null rating and notes values SHALL leave those stored facts unchanged. A successful rating-only or notes-only PATCH SHALL retain other recipe content, attribution, readiness and deletion state, subject to existing update timestamp and directly connected side effects. This extends existing partial-update ownership without changing its other field rules.

#### Scenario: Preserve null and omitted facts

- **WHEN** a successful authorized PATCH omits rating or notes, or supplies either as null
- **THEN** each omitted or null fact retains its stored value

#### Scenario: Preserve unrelated recipe content

- **WHEN** a successful authorized PATCH changes only rating or only notes
- **THEN** the other fact and unrelated recipe content, attribution, readiness and deletion state remain unchanged

### Requirement: Retain local ratings and notes display on successful completion

When a rating or notes PATCH resolves successfully while the sheet remains mounted with no intervening edits, the sheet SHALL retain the locally selected rating and entered notes. Completion SHALL NOT require applying the PATCH response or requesting another detail GET, and SHALL leave the sheet open.

#### Scenario: Complete an update with the sheet open

- **WHEN** a rating or notes PATCH resolves successfully while the sheet remains mounted with no intervening edits
- **THEN** the sheet remains open with its local rating and notes, without response reconciliation or a completion GET

### Requirement: Initialize the loaded-detail discoverability control

After successful library detail loading in viewing mode, the sheet SHALL offer a discoverability button initialized from the returned flag, using false for null or absence. In English it SHALL show “Ask the Family” and “Shows in Discovery voting”, with on/off visual state and an action label to turn the current state off or on.

#### Scenario: Load discoverability enabled

- **WHEN** library detail loads with isDiscoverable true
- **THEN** the button shows its on state and has the English action label “Turn off Discovery for this recipe”

#### Scenario: Load discoverability disabled

- **WHEN** library detail loads with isDiscoverable false
- **THEN** the button shows its off state and has the English action label “Turn on Discovery for this recipe”

#### Scenario: Load an absent discoverability value

- **WHEN** library detail loads with isDiscoverable absent or null
- **THEN** the button initializes off with the turn-on action and the same Ask the Family title and Discovery-voting subtitle in English

### Requirement: Submit the inverse discoverability state for the loaded recipe

Activating an enabled detail discoverability button SHALL immediately display the inverse of its current local state and request PATCH `/api/recipes/{id}` for the loaded recipe ID with isDiscoverable set to that inverse boolean. The action SHALL omit unrelated recipe fields.

#### Scenario: Turn discoverability on

- **WHEN** a person activates the enabled off button for loaded recipe R
- **THEN** the detail control immediately displays on and requests PATCH for R with isDiscoverable true and no unrelated recipe fields

#### Scenario: Turn discoverability off

- **WHEN** a person activates the enabled on button for loaded recipe R
- **THEN** the detail control immediately displays off and requests PATCH for R with isDiscoverable false and no unrelated recipe fields

#### Scenario: Record human control

- **WHEN** an explicit human discoverability action succeeds
- **THEN** false records durable Human-off; true clears that intent and cooked suppression, without bypassing current-plan visibility or suitability

### Requirement: Persist the supplied recipe discoverability fact

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL validate supper suitability before enabling and store a supplied non-null isDiscoverable boolean on that recipe, available through existing detail reading. Omitted or null values SHALL preserve the flag. A discoverability-only update SHALL retain unrelated recipe content, attribution, readiness and deletion state, subject to the existing timestamp and connected side effects.

#### Scenario: Store enabled discoverability

- **WHEN** a successful authorized PATCH supplies isDiscoverable true for an existing recipe
- **THEN** that recipe's stored flag is true and existing detail reading represents it as true, independently of member votes or consensus

#### Scenario: Store disabled discoverability

- **WHEN** a successful authorized PATCH supplies isDiscoverable false for an existing recipe
- **THEN** that recipe's stored flag is false and existing detail reading represents it as false

#### Scenario: Preserve an omitted or null discoverability flag

- **WHEN** a successful authorized PATCH omits isDiscoverable or supplies null
- **THEN** its stored discoverability flag remains unchanged

#### Scenario: Retain unrelated facts during a discoverability update

- **WHEN** a successful authorized PATCH supplies only isDiscoverable
- **THEN** name, description, ingredients, instructions, cuisine, meal types, rating, notes, attribution, readiness and deletion state retain their stored values

#### Scenario: Record human control

- **WHEN** an explicit human discoverability action succeeds
- **THEN** false records durable Human-off; true clears that intent and cooked suppression, without bypassing current-plan visibility or suitability

#### Scenario: Reject unsuitable enable

- **WHEN** an explicit human PATCH requests true for an unsuitable recipe
- **THEN** the request fails without partial mutation

#### Scenario: Preserve omitted intent

- **WHEN** isDiscoverable is omitted or null
- **THEN** existing Human-off intent and provenance also remain unchanged

### Requirement: Disable the detail discoverability button while pending

While its discoverability update request is pending, the detail button SHALL be disabled and visibly subdued with a waiting cursor. This pending state SHALL prevent another activation through that disabled button.

#### Scenario: Request remains pending

- **WHEN** a discoverability update has started and has not completed while the sheet remains mounted
- **THEN** the button displays the optimistic state, is disabled and shows its subdued waiting presentation

### Requirement: Retain the local discoverability display after success

When a discoverability PATCH resolves successfully while the sheet remains mounted with no intervening state changes, the sheet SHALL retain the submitted local discoverability display, end the pending state and remain open. Completion SHALL NOT require applying the PATCH response or another detail GET.

#### Scenario: Complete with the sheet open

- **WHEN** the discoverability request resolves successfully with the sheet still mounted and no intervening state changes
- **THEN** the submitted local state remains displayed, the button becomes enabled and the sheet stays open without a completion GET or response reconciliation

### Requirement: Restore local discoverability after rejection and allow another activation

When a discoverability PATCH rejects while the same detail remains mounted with no intervening state changes, the sheet SHALL restore the local state from before that activation and re-enable the button. A later activation SHALL submit a fresh inverse-state update for the loaded recipe. Local restoration SHALL NOT imply rollback of stored data.

#### Scenario: Request rejects

- **WHEN** a discoverability request rejects while the same detail remains mounted with no intervening state changes
- **THEN** the pre-activation state and action label return and the button becomes enabled

#### Scenario: Activate again after rejection

- **WHEN** a person activates the re-enabled discoverability button after local restoration
- **THEN** another PATCH requests the inverse of that restored state for the loaded recipe ID

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a non-null instruction array SHALL replace the recipeInstructions member in persisted raw metadata and the recipe-info representation. Other raw metadata members SHALL be retained. Omitted/null instructions SHALL leave that member unchanged.

#### Scenario: Replace an instruction array

- **WHEN** an authorized PATCH supplies three instruction strings with first value Updated Step 1 and persistence completes
- **THEN** stored metadata and recipe-info instructions contain that three-element array with the first supplied value

#### Scenario: Retain unrelated instruction metadata

- **WHEN** a successful instruction PATCH updates valid object metadata containing other members
- **THEN** only its recipeInstructions member is replaced and the other raw members remain

#### Scenario: Preserve absent instruction updates

- **WHEN** a successful authorized PATCH omits instructions or supplies null
- **THEN** the existing recipeInstructions member remains unchanged

### Requirement: Mark search-derived recipe state pending with supported updates

When an authorized recipe PATCH supplies a non-null supported fact, the successful database save SHALL persist its recipe update and pending search/embedding states together. Existing derived state SHALL have its embedding fingerprint cleared; absent derived state SHALL be initialized pending. This SHALL NOT establish completed indexing.

#### Scenario: Invalidate existing derived recipe state

- **WHEN** an existing recipe with search-derived state receives a supported non-null PATCH and database save succeeds
- **THEN** the changed recipe is saved with search and embedding states pending and cleared embedding fingerprint

#### Scenario: Initialize absent derived recipe state

- **WHEN** a supported non-null PATCH succeeds for a recipe without search-derived state
- **THEN** pending derived state is created in the same database save as the recipe update

### Requirement: Attempt one index dispatch after saving a supported recipe update

After saving a PATCH with a supplied non-null supported fact, the service SHALL attempt one index-recipe-search dispatch containing recipe ID and source fingerprint. A dispatch exception SHALL be logged without undoing the saved recipe or preventing the subsequent recipe-info write. Worker execution SHALL remain owned by background-processing.

#### Scenario: Dispatch once for a multifield update

- **WHEN** a supported multifield PATCH has saved its recipe and pending derived state
- **THEN** one index-recipe-search request carries the recipe ID and source fingerprint before recipe-info completion

#### Scenario: Continue after index dispatch rejection

- **WHEN** index dispatch throws after a supported PATCH database save
- **THEN** the saved recipe remains and recipe-info writing is still attempted

### Requirement: Write the supported recipe-info projection after the database save

After a successful PATCH database save, the service SHALL write recipe-info with supplied non-null name, description, notes, rating and instruction values, retaining omitted values and creating info when absent. This projection SHALL NOT promise that ingredients, cuisine, meal types or discoverability are mirrored into that file.

#### Scenario: Persist supplied info projection fields

- **WHEN** a PATCH supplies supported info fields and subsequent file completion succeeds
- **THEN** recipe-info reflects the supplied name, description, notes, rating or instructions, retaining other info values

#### Scenario: Touch an update without supplied supported facts

- **WHEN** an authorized PATCH for an existing recipe supplies no non-null supported facts and completes
- **THEN** the recipe update timestamp is assigned and info writing occurs without requesting a search-index dispatch

### Requirement: Acknowledge only the latest saved notes

The sheet SHALL show Saved only after the latest exact draft is acknowledged by PATCH. Pending or failed writes SHALL NOT show Saved. Success for older text SHALL NOT replace a newer draft. Writes for one recipe SHALL preserve edit order.

#### Scenario: Restore the original text

- **WHEN** loaded A is edited to B, B is submitted, then the person restores A
- **THEN** A is subsequently submitted and successful rereading returns A

#### Scenario: Late read after a save

- **WHEN** a detail read started before a draft was edited or acknowledged and returns an older notes value
- **THEN** that read does not replace the newer draft or acknowledged text

#### Scenario: Edit during a pending save

- **WHEN** B is pending and the draft changes to C
- **THEN** the draft stays C, B success does not show Saved for C, and C is submitted after B completes

### Requirement: Preserve notes drafts across detail departure and failure

Closing or switching detail SHALL flush pending notes without blocking navigation. Unsaved drafts SHALL remain associated with their recipe within the current browser tab. A failed save SHALL expose a retryable error and retain the exact draft on reopening. This does not promise recovery after browser termination or cross-device conflict resolution.

#### Scenario: Close before debounce

- **WHEN** the person edits notes and closes before 800 ms
- **THEN** that exact draft is submitted for its original recipe

#### Scenario: Switch recipes

- **WHEN** a save for recipe A completes after detail switches to recipe B
- **THEN** B retains its own notes and save feedback, and A's draft is not applied to B

#### Scenario: Failed save and retry

- **WHEN** a notes request fails and the person reopens that recipe
- **THEN** the draft is retained with failure feedback and Retry save resubmits it; successful acknowledgement clears failure

### Requirement: Place the servings edit label to the left of its input

In recipe-detail edit mode, the visible servings label SHALL appear to the left of a right-aligned joined minus/value/plus stepper group on the same row, vertically centered. The numeric field inside the stepper SHALL remain programmatically associated with the label and directly editable at viewport widths of 320 CSS px and above without horizontal scrolling.

#### Scenario: Open the English servings editor

- **WHEN** a person opens Edit on loaded recipe detail in English
- **THEN** the visible label is “Servings” and appears to the left of the joined `-`, numeric input, and `+` stepper group on the same row
- **AND** the numeric input's accessible name is “Servings” and decrement/increment buttons have accessible labels

#### Scenario: Step servings up and down on a phone

- **WHEN** a person activates `+` or `-` on the servings stepper (starting from empty or a positive integer)
- **THEN** the numeric servings draft increments (from empty to `1`, or by `+1`) or decrements down to `1` without allowing values below `1` via `-`

#### Scenario: Open the French servings editor

- **WHEN** a person opens Edit on loaded recipe detail in French
- **THEN** the visible label is “Portions” and appears to the left of the joined stepper on the same row
- **AND** the numeric input's accessible name is “Portions”

#### Scenario: Use the editor on a narrow screen

- **WHEN** a person opens Edit in either supported language at a viewport width of 320 CSS pixels
- **THEN** the label remains to the left of the right-aligned stepper group on the same row
- **AND** both remain visible and the numeric input remains focusable and directly editable alongside `-` and `+` without overlap, clipping or horizontal scrolling caused by the row

### Requirement: Keep servings validation below the horizontal field row

When the servings draft is invalid, its existing localized validation message SHALL appear below the label-and-stepper row and remain programmatically associated with the numeric input. Showing or clearing the message SHALL preserve the label's position to the left of the stepper on the same row.

#### Scenario: Display and clear invalid servings feedback

- **WHEN** a person enters “0” in the servings input while editing loaded recipe detail
- **THEN** the input exposes its invalid state and existing localized validation message below the row
- **AND** Save changes is disabled and the label remains left of the stepper
- **WHEN** the person replaces “0” with “4”
- **THEN** the servings validation message and invalid state clear while the horizontal label-and-stepper arrangement remains

### Requirement: Initialize section header and step content drafts in detail edit mode

When a person opens Edit on loaded recipe detail, the editor SHALL initialize editable instruction sections with each section's header and its ordered step contents from the loaded recipe. Unheaded recipes SHALL initialize with an empty header.

#### Scenario: Open edit on a sectioned canonical recipe

- **WHEN** a person opens Edit on a recipe whose `instructionSections` include a named section "Sauce" with two steps
- **THEN** the editor displays an editable section header initialized to "Sauce" and two editable step content fields initialized to those step texts

#### Scenario: Open edit on an unheaded or empty-instruction recipe

- **WHEN** a person opens Edit on a recipe with unheaded steps or no instructions
- **THEN** any existing steps appear with an empty section header field, and a recipe with no instructions allows adding a step or section

### Requirement: Edit step headers and step content in the detail draft

In detail edit mode, a person SHALL be able to edit each section's header text, edit each step's content, add or remove steps within a section, and add or remove sections without submitting until Save changes is activated.

#### Scenario: Rename a section header and edit step content

- **WHEN** a person changes a section header from "Prep" to "Marinade" and edits a step's text in that section
- **THEN** the draft reflects "Marinade" and the updated step text while leaving the saved recipe unchanged until Save changes is activated

#### Scenario: Clear a section header

- **WHEN** a person clears a section header to empty or whitespace-only text
- **THEN** the draft retains the section's steps as unheaded rather than deleting the steps

#### Scenario: Add and remove steps and sections

- **WHEN** a person adds a new section, adds a step to a section, or removes a step or section from the draft
- **THEN** the draft updates immediately in order, preserving the remaining sections and steps

### Requirement: Submit edited step headers and step content on detail Save

Activating enabled Save changes SHALL submit the draft's instruction sections (for structured recipes) or instruction entries (for legacy recipes) with trimmed section headers (represented as null when blank) and step content, and Cancel SHALL discard unsubmitted instruction edits.

#### Scenario: Save edited section headers and steps

- **WHEN** a person edits a section header and step content and activates Save changes
- **THEN** `PATCH /api/recipes/{id}` submits the updated sections and steps, and on success the sheet exits edit mode and displays the updated headers and steps

#### Scenario: Cancel discards instruction header and step edits

- **WHEN** a person edits a section header or step content and activates Cancel
- **THEN** the sheet exits edit mode without issuing a PATCH and displays the previously loaded headers and steps

### Requirement: Synchronize edited recipe portions and content to Schema.org Recipe on disk

Saving edited servings, structured ingredient lines, or instruction sections in recipe detail SHALL synchronize `{id}/recipe.json` on disk as a valid top-level `https://schema.org/Recipe` JSON document reflecting the updated `recipeYield`, rendered `recipeIngredient` lines, and `recipeInstructions` sections and steps without creating `.publications` staging directories.

#### Scenario: Editing servings and ingredients updates Schema.org Recipe file

- **WHEN** a person updates servings to 6 and edits an ingredient line or instruction step via `PATCH /api/recipes/{id}`
- **THEN** the database persists the structured portion revision and `{id}/recipe.json` is atomically updated as a top-level `https://schema.org/Recipe` document with `recipeYield` `"6 portions"`, the updated `recipeIngredient` array, and the updated `HowToSection` / `HowToStep` instructions

### Requirement: Preserve and reconcile instruction header drafts across reload and conflicts

Unsaved section header and step content edits SHALL persist in the local editor draft for the current recipe and participate in automatic conflict reconciliation when the saved recipe changes concurrently.

#### Scenario: Reconcile concurrent instruction changes

- **WHEN** a person has unsaved local edits to a section header or step content and the underlying recipe revision changes before Save
- **THEN** automatic conflict reconciliation compares the full instruction structure including section headers, defaults to the local draft with the latest saved revision applied to untouched fields, and allows toggling between the local draft and current saved instructions directly before activating `Save changes`

### Requirement: Auto-reconcile recipe edit conflicts with smart defaults

When recipe detail editing encounters a conflict or recovered draft, it SHALL automatically fetch the current saved recipe, auto-merge untouched fields with saved data, default conflicting fields to the user's active draft with Era 3 toggle pills directly above Save changes and Cancel, and style inline edit alerts with Family Cookbook tokens.

#### Scenario: Automatic baseline check replaces intermediate reconciliation gates

- **WHEN** a recovered draft loads or a detail Save returns a concurrent version conflict
- **THEN** the editor automatically fetches the current saved recipe, merges untouched fields, defaults conflicting fields to the user's draft inside Era 3 `bg-white border-chrome-line` conflict cards with `aria-pressed` pill toggles, and lets `Save changes` commit against the updated revision directly without requiring `Check saved recipe`, `Reconcile draft`, `Apply reviewed draft`, or a raw `Original recovered draft` dump (except when ingredient schema versions changed)

#### Scenario: Failed automatic saved-recipe check exposes single Retry button

- **WHEN** the automatic read of the saved recipe fails during edit recovery or conflict
- **THEN** the editor retains the user's draft in an Era 3 Hearth alert card and exposes one `>= 48 CSS px` `<Button>` (`Retry`) until the read succeeds

#### Scenario: Inline detail alerts and recovery triggers follow Family Cookbook rules

- **WHEN** portion preview, dated ingredient projection, structured ingredient validation, or family notes saving encounters an error
- **THEN** the error renders with Hearth alert styling and accessible `>= 48 × 48 CSS px` `<Button>` retry actions with `outline-ink-body` focus rings

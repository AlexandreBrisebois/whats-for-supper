# Recipe library Specification

## Purpose

Let people using the household app browse reusable recipes that are ready and not deleted. This first baseline slice covers the connected library list and its supported loading, empty and initial-failure outcomes.

## Requirements

### Requirement: Open the household library and offer list presentation

Home SHALL offer “Browse your library” linking to `/browse-all-stack`. The library overlay SHALL offer a “Show recipe list” control that selects its list presentation. Access and member context SHALL follow the existing household-identity requirements.

#### Scenario: Open from Home
- **WHEN** a person with the existing household access and member context activates Home's Browse Library control
- **THEN** the application opens the library overlay at `/browse-all-stack`

#### Scenario: Select list presentation
- **WHEN** a person in card presentation activates “Show recipe list” and the preceding summary request succeeds
- **THEN** the overlay selects list presentation and requests its first page

### Requirement: Return only eligible household library recipes

For authorized ordinary-household GET `/api/recipes`, the API SHALL include only records whose stored readiness is true and deletion timestamp is absent. With `discoverableOnly=true` it SHALL additionally require the discoverable flag; false or absent SHALL impose no discoverable restriction. Eligibility SHALL NOT be restricted to the selected member's recipe attribution.

#### Scenario: Ready active recipes are eligible in All mode
- **WHEN** an authorized All-mode list request succeeds with ready non-deleted recipes having different attribution and discoverable flags
- **THEN** those records are eligible for the requested page regardless of attribution or discoverable flag

#### Scenario: Not-ready records are excluded
- **WHEN** a recipe's stored readiness is false and an authorized list request succeeds
- **THEN** that recipe is absent from returned items and the filtered total

#### Scenario: Deleted records are excluded
- **WHEN** a ready recipe has a deletion timestamp and an authorized list request succeeds
- **THEN** that recipe is absent from returned items and the filtered total

#### Scenario: Discovery mode narrows eligible records
- **WHEN** an authorized list request succeeds with `discoverableOnly=true`
- **THEN** only ready non-deleted records also marked discoverable are eligible for its page and total

### Requirement: Return an explore-ordered library page

Successful authorized GET `/api/recipes` with `order=explore` SHALL order eligible records with never-cooked first, then oldest cooked date, then newest creation time. It SHALL return the requested offset page in `recipes`, with `updatedAt` and `pagination` containing page, limit and filtered total, outside a `data` envelope. Page SHALL be at least 1 and limit SHALL be clamped to 1–100.

#### Scenario: Explore ordering
- **WHEN** an authorized lowercase-explore request succeeds for eligible recipes with differing cooked dates or creation times
- **THEN** never-cooked records precede cooked records, older cooked dates precede newer ones, and creation time descending orders records with the same cooked-date position

#### Scenario: Page response and count
- **WHEN** an authorized explore request with page 2 and limit 12 succeeds
- **THEN** `recipes` contains up to 12 eligible records after the first 12 in explore order
- **AND** the unwrapped response includes `updatedAt` and pagination page 2, limit 12 and the eligible filtered total

#### Scenario: Page bounds are normalized
- **WHEN** an authorized explore request supplies page below 1 or limit outside 1–100 and succeeds
- **THEN** the response uses page at least 1 and limit clamped to 1–100

### Requirement: Request list pages for the selected library filter

In list presentation the library SHALL request GET `/api/recipes` with `order=explore`, limit 12 and the current All/Discovery filter. All SHALL send `discoverableOnly=false` and Discovery SHALL send true. After successful summary retrieval, entry into list presentation or changing All/Discovery SHALL request page 1.

#### Scenario: Load the All list
- **WHEN** list presentation loads with the initial All filter and its preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=false`

#### Scenario: Change to Discovery
- **WHEN** a person changes All to Discovery in list presentation and the preceding summary request succeeds
- **THEN** it requests page 1 with explore ordering, limit 12 and `discoverableOnly=true`

### Requirement: Display successfully returned library items

After a successful first-page load in list presentation, the library SHALL replace its loaded items with the returned records and display them as named recipe buttons with a hero-image reference and formatted total time. Activating a recipe button SHALL request that recipe's detail sheet.

#### Scenario: Display a returned page
- **WHEN** a first-page list load succeeds with nonempty returned records
- **THEN** the list displays the returned recipes by name with image references and formatted time
- **AND** activating a displayed recipe requests its detail sheet

### Requirement: Request and append additional library list pages

When list scrolling reaches within 600 pixels of the bottom and more pages are indicated with no initial load or page request pending, the library SHALL request the next page using the current filter and list page size. A successful append SHALL retain loaded items and add returned records with previously unseen nonempty IDs in response order.

#### Scenario: Scroll requests the next page
- **WHEN** list scrolling reaches the loading threshold with more pages indicated and no load pending
- **THEN** the library requests the next page with explore ordering, limit 12 and the current discoverable filter

#### Scenario: Append overlapping results
- **WHEN** a subsequent page succeeds containing an already loaded ID and previously unseen nonempty IDs
- **THEN** loaded items remain and the new IDs are appended in response order without appending the repeated ID

### Requirement: Show pending library-load feedback

While an initial library load or a first-page reload for presentation/filter changes is pending, the library SHALL show a loading indicator and “Loading your library…” feedback in place of list cards.

#### Scenario: First-page load is pending
- **WHEN** the summary or first-page recipe request for the current library load is pending
- **THEN** loading feedback is displayed and list cards are suppressed

### Requirement: Show an empty All-mode library result

When an All-mode library load succeeds with an empty returned item array, the library SHALL display “Your Library is Empty” and an “Add New Recipe” link to `/capture`. This result SHALL describe the visible library collection without asserting absence of pending or deleted database records.

#### Scenario: No All-mode items are returned
- **WHEN** an All-mode list load succeeds with no returned recipes
- **THEN** the library displays its empty-library feedback and Add New Recipe link
- **AND** following the link requests `/capture`

### Requirement: Offer retry after initial library-load failure

If the summary or first-page recipe request fails, the library SHALL display “Failed to load recipes.” and a Retry control. Retry SHALL request the current filter's first-page load again, including summary retrieval, with loading feedback. A successful retry SHALL replace the displayed result with its returned items or applicable All-mode empty feedback.

#### Scenario: Initial load fails
- **WHEN** the initial summary or first-page recipe request fails
- **THEN** the library shows failure feedback and Retry in place of the list result

#### Scenario: Retry succeeds
- **WHEN** a person activates Retry and the repeated summary and first-page requests succeed
- **THEN** the library shows loading feedback while pending and then displays the returned first page or applicable All-mode empty feedback

### Requirement: Retrieve the selected library recipe for detail reading

When the library requests a detail sheet for a loaded recipe, the application SHALL request GET `/api/recipes/{id}` using that recipe's ID. Access and member context SHALL follow existing household-identity requirements.

#### Scenario: Request detail by the activated recipe ID
- **WHEN** the loaded library requests a detail sheet for recipe ID R
- **THEN** the application requests GET `/api/recipes/R` rather than using only the list record as detail content

### Requirement: Return persisted recipe detail for an available record

When an authorized ordinary-household GET `/api/recipes/{id}` successfully retrieves an available record, the API SHALL return 200 with `recipe` and `updatedAt` outside a `data` envelope. The recipe SHALL carry its persisted ID, name, description, total time, cuisine and meal types, and ingredients represented as strings.

#### Scenario: Return the retrieved record
- **WHEN** an authorized detail request retrieves an available record and its response succeeds
- **THEN** the unwrapped response contains `updatedAt` and that record's `recipe` with the persisted fields and string ingredient representation

### Requirement: Display returned recipe text and image reference

After successful detail retrieval, the sheet SHALL display the returned name and nonempty description. It SHALL omit an empty description and use the returned image reference, with a local placeholder reference when that reference is empty.

#### Scenario: Show returned name and description
- **WHEN** detail retrieval succeeds with a name and nonempty description
- **THEN** the sheet displays that name and description

#### Scenario: Omit absent description
- **WHEN** detail retrieval succeeds with a null or empty description
- **THEN** the sheet omits the description paragraph

#### Scenario: Select the detail image reference
- **WHEN** detail retrieval succeeds
- **THEN** the sheet uses the returned image reference or `/placeholder-recipe.jpg` if it is empty
- **AND** this reference selection does not establish image delivery

### Requirement: Display available recipe metadata in detail

The detail sheet SHALL display nonempty cuisine and returned nonempty meal-type values as badges. It SHALL omit absent cuisine and meal types without adding a default meal type for reading. It SHALL show a Ready In time label using formatted returned total time, with an empty time value when none is available.

#### Scenario: Show cuisine and meal types
- **WHEN** detail retrieval succeeds with cuisine Italian and meal types Supper and Lunch
- **THEN** the sheet displays Italian, Supper and Lunch badges

#### Scenario: Omit absent metadata badges
- **WHEN** detail retrieval succeeds without cuisine or meal-type values
- **THEN** those badges are absent without a synthesized Supper badge

#### Scenario: Format available time
- **WHEN** detail retrieval succeeds with total time `PT30M`, or with no total time
- **THEN** the Ready In label uses `30 MINS` for `PT30M` and an empty time value for absent time

### Requirement: Display returned ingredient strings in detail

The detail sheet SHALL show an Ingredients section listing returned ingredient strings in their returned order. With no ingredient strings, the section SHALL contain no ingredient rows.

#### Scenario: Read returned ingredients
- **WHEN** detail retrieval succeeds with ingredient strings Pasta followed by Sauce
- **THEN** the Ingredients section lists Pasta followed by Sauce

#### Scenario: No ingredients are returned
- **WHEN** detail retrieval succeeds with no ingredient strings
- **THEN** the Ingredients heading remains with no ingredient rows

### Requirement: Show pending recipe-detail feedback

While a newly opened sheet's detail request is pending, the sheet SHALL display loading feedback in place of recipe content and retain its Close controls.

#### Scenario: Detail retrieval is pending
- **WHEN** a newly opened library detail sheet is awaiting its detail response
- **THEN** loading feedback is visible instead of recipe content and Close remains available

### Requirement: Dismiss recipe detail back to the loaded library

Activating the detail sheet's Close control or surrounding backdrop SHALL dismiss the sheet while retaining the loaded library presentation. Closing while retrieval is pending SHALL dismiss the sheet without waiting for that retrieval to finish.

#### Scenario: Close loaded detail
- **WHEN** a person closes successfully loaded detail through Close or its backdrop
- **THEN** the sheet disappears and the loaded library remains

#### Scenario: Close pending detail
- **WHEN** a person closes a newly opened sheet before its detail request finishes
- **THEN** the sheet disappears without waiting for the request

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

The editor SHALL allow changing individual ingredient strings, adding an empty row and removing a row. These actions SHALL affect the draft before submission.

#### Scenario: Change and add ingredients
- **WHEN** a person changes an ingredient row and activates Add ingredient
- **THEN** the draft contains the changed row and an additional empty row

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

After successful library detail loading, the sheet SHALL offer a Notes textarea and rating choices Dislike=1, Like=2 and Love=3. Notes SHALL initialize from returned notes, using empty text for null or absence. Rating SHALL initialize from the returned value, using 0 for absence; 0 means Unknown with no rating choice selected. Each choice SHALL expose its label and pressed state.

#### Scenario: Load existing notes and rating
- **WHEN** library detail loads with notes “Family favorite” and rating 2
- **THEN** Notes contains “Family favorite”, Like is pressed, and Dislike and Love are not pressed

#### Scenario: Load absent notes and rating
- **WHEN** detail loads without notes or rating values
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

Editing Notes SHALL immediately display the entered text. When it differs from the loaded recipe's notes, treating absent notes as empty text, the sheet SHALL schedule submission after 800 ms. A further notes edit before dispatch SHALL replace the pending submission with the latest differing text. Submission SHALL PATCH the loaded recipe ID with exact notes text, without trimming, and omit rating and unrelated recipe fields.

#### Scenario: Submit exact notes text
- **WHEN** Notes changes to “  More sauce  ”, differs from the loaded notes, and remains unchanged with the sheet mounted until its 800 ms timer fires
- **THEN** PATCH submits notes “  More sauce  ” for the loaded recipe without rating or unrelated recipe fields

#### Scenario: Clear initially nonempty notes
- **WHEN** a person clears nonempty loaded notes and the empty input remains until its submission timer fires
- **THEN** PATCH submits notes as an empty string rather than null

#### Scenario: Replace a pending notes edit
- **WHEN** a person changes Notes to one differing value and then another before the first timer fires, with the final text still differing from the loaded notes
- **THEN** the first pending submission is cancelled and the final text is submitted after its own 800 ms delay if the sheet remains mounted and no further change intervenes

### Requirement: Persist supplied recipe ratings and exact notes

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null rating in the supported 0–3 range and supplied non-null notes on that recipe. Notes SHALL retain their exact text, including whitespace and empty strings. These SHALL be recipe-level facts rather than member-specific ratings or notes; existing library fact/read ownership applies.

#### Scenario: Store a rating or clear it to Unknown
- **WHEN** a successful authorized PATCH supplies rating 3 or rating 0 for an existing recipe
- **THEN** the recipe stores Love or Unknown respectively without creating a member-specific rating

#### Scenario: Store notes without trimming
- **WHEN** a successful authorized PATCH supplies notes “  More sauce  ”
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

### Requirement: Persist the supplied recipe discoverability fact

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store a supplied non-null isDiscoverable boolean on that recipe, available through existing detail reading. Omitted or null values SHALL preserve the flag. A discoverability-only update SHALL retain unrelated recipe content, attribution, readiness and deletion state, subject to the existing timestamp and connected side effects.

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

### Requirement: Offer View Original control for eligible loaded library recipes

After successful library detail loading in viewing mode, the sheet SHALL offer a “View Original” control when the recipe has at least one original image or has sourceType “url”. When editing, or when the recipe has zero images and a non-URL source type, the control SHALL NOT be displayed. In English the control SHALL display the text “View Original”; it SHALL show an external-link icon when sourceType is “url” and an images icon when sourceType is not “url”.

#### Scenario: Offer URL original control
- **WHEN** a recipe with sourceType “url” and imageCount 0 is loaded in viewing mode
- **THEN** the sheet displays the View Original button with an external-link icon and the label “View Original”

#### Scenario: Offer photo original control
- **WHEN** a recipe with imageCount 2 and sourceType “photos” is loaded in viewing mode
- **THEN** the sheet displays the View Original button with an images icon and the label “View Original”

#### Scenario: Hide control while editing
- **WHEN** a recipe eligible for View Original enters detail edit mode
- **THEN** the View Original control is suppressed from the header area

#### Scenario: Hide control for recipes without original source or images
- **WHEN** a recipe with sourceType “synthesized” and imageCount 0 is loaded in viewing mode
- **THEN** the View Original control is not displayed

### Requirement: Open external source URL in a new browser context

Activating the View Original control for a loaded recipe with sourceType “url” and a present source URL SHALL open that source URL in a new browser browsing context with noopener and noreferrer features. This action SHALL leave the recipe detail sheet open and mounted without navigating away from the current application page.

#### Scenario: Open external URL in a new context
- **WHEN** a person activates View Original for a loaded recipe with sourceType “url” and a non-empty source URL
- **THEN** the application opens that source URL in a new browsing context with noopener and noreferrer while keeping the detail sheet open

### Requirement: Present original photos in the photo viewer overlay

For an eligible loaded recipe with at least one original and a non-URL source type or absent source URL, View Original SHALL open the photo viewer. A valid finishedDishIndex SHALL lead the sequence; otherwise ascending original indices SHALL be used. The viewer SHALL start at sequence position zero, show the English View Original header and a position/total counter.

#### Scenario: Open photo viewer with finished dish first
- **WHEN** a person activates View Original for a recipe with imageCount 3 and valid finishedDishIndex 1
- **THEN** the photo viewer opens displaying photo index 1 first and counter “1 / 3”

#### Scenario: Open photo viewer with sequential ordering
- **WHEN** a person activates View Original for a recipe with imageCount 2 and finishedDishIndex -1
- **THEN** the photo viewer opens displaying photo index 0 first and counter “1 / 2”

#### Scenario: Open photo viewer as fallback for absent source URL
- **WHEN** a person activates View Original for a recipe with sourceType “url”, absent source URL and at least one original image
- **THEN** the application opens the photo viewer instead of attempting external navigation

### Requirement: Navigate between original photos with wrapping

For a multi-photo sequence, previous/next controls and ArrowLeft/ArrowRight SHALL wrap and reset zoom scale to 1. Pager dots SHALL select their sequence position directly. The zoom-reset rule SHALL apply to previous/next navigation, not to pager-dot selection.

#### Scenario: Advance to next photo with wrapping
- **WHEN** a person activates Next or presses ArrowRight while viewing the last photo of a multi-photo recipe
- **THEN** the viewer advances to the first photo in the resolved sequence and resets scale to 1

#### Scenario: Return to previous photo with wrapping
- **WHEN** a person activates Prev or presses ArrowLeft while viewing the first photo of a multi-photo recipe
- **THEN** the viewer displays the last photo in the resolved sequence and resets scale to 1

#### Scenario: Select photo via pager indicator
- **WHEN** a person activates a specific pager dot indicator
- **THEN** the viewer navigates directly to the corresponding photo in the resolved sequence

### Requirement: Support photo zooming and panning

The photo viewer SHALL support zooming and panning the displayed photo. Activating the zoom control or tapping the photo at fit-to-screen scale SHALL zoom to 2.5 scale, enable dragging within bounded constraints, and display “Fit to Screen”. Activating Fit to Screen or tapping a zoomed photo SHALL return scale to 1, disable dragging, and center the photo. The viewer SHALL clamp two-finger pinch touch gestures between scale 1 and 5.

#### Scenario: Toggle zoom with control or image activation
- **WHEN** a person activates the zoom button or taps the displayed photo while at fit-to-screen scale
- **THEN** the photo zooms to 2.5 scale, dragging becomes enabled within bounded constraints, and the zoom control displays Fit to Screen

#### Scenario: Reset zoom to fit to screen
- **WHEN** a person activates Fit to Screen or taps a zoomed photo
- **THEN** the photo returns to scale 1, dragging is disabled, and the photo centers with no offset

### Requirement: Dismiss photo viewer and retain detail state

Activating the close control or pressing the Escape key while the original photo viewer is displayed SHALL dismiss and unmount the photo viewer overlay. Dismissal SHALL retain the recipe detail sheet in its loaded viewing state without mutating recipe data, triggering a detail refetch, or notifying the library. Reopening the photo viewer after dismissal SHALL mount the viewer fresh with the initial photo in resolved order and default fit-to-screen zoom.

#### Scenario: Dismiss viewer via close button
- **WHEN** a person activates the close button in the viewer header
- **THEN** the photo viewer unmounts and the recipe detail sheet remains open in its loaded viewing state

#### Scenario: Dismiss viewer via Escape key
- **WHEN** a person presses the Escape key while the photo viewer is open
- **THEN** the photo viewer unmounts and the recipe detail sheet remains open

#### Scenario: Reopen photo viewer after dismissal
- **WHEN** a person activates View Original after dismissing the viewer
- **THEN** the photo viewer mounts fresh with the initial photo in resolved order and default fit-to-screen zoom

### Requirement: Serve raw original photo image binary

For authorized or anonymous GET `/api/recipes/{recipeId}/original/{photoIndex}`, when the recipe and requested photo index exist in the recipe asset store, the API SHALL return HTTP 200 with the matching image content type and raw image binary stream. When the recipe ID or photo index does not exist, the API SHALL return HTTP 404.

#### Scenario: Serve raw original photo binary
- **WHEN** an authorized or anonymous GET request specifies a valid recipe ID and existing photo index
- **THEN** the API returns HTTP 200 with the matching image content type and raw image binary stream

#### Scenario: Return not found for nonexistent photo
- **WHEN** a GET request specifies an invalid recipe ID or nonexistent photo index
- **THEN** the API returns HTTP 404

### Requirement: Offer Move to Bin control for loaded library recipe detail

In library detail viewing mode, the sheet SHALL offer an action gear menu containing a “Move to Bin” control. While loading or when editing recipe fields, the gear menu SHALL NOT be displayed. Activating the Move to Bin control SHALL initiate deletion immediately without presenting a secondary confirmation prompt.

#### Scenario: Access Move to Bin from the detail gear menu
- **WHEN** a person opens the action gear menu for a loaded recipe in detail viewing mode
- **THEN** the menu displays a “Move to Bin” action with a trash icon

#### Scenario: Trigger Move to Bin immediately without confirmation
- **WHEN** a person clicks the “Move to Bin” action in the gear menu
- **THEN** the application initiates soft-deletion without displaying a confirmation prompt

### Requirement: Soft-delete the loaded recipe when not assigned to active planner slots

When deleting a recipe that is not assigned to any active or future planner slots, the system SHALL record the current UTC timestamp as deleted_at and record the acting household member as deleted_by. The system SHALL remove any corresponding search document from storage and return HTTP 200 with the soft-deleted recipe details.

#### Scenario: Soft-delete unassigned recipe successfully
- **WHEN** a client sends a delete request for a recipe with no calendar events scheduled for today or later
- **THEN** the system sets deleted_at to the current timestamp, removes the recipe search document, and returns HTTP 200 with deletedAt populated

#### Scenario: Record actor and timestamp on soft-deleted recipe
- **WHEN** a household member deletes an unassigned recipe
- **THEN** the system stores the member's identifier in deleted_by alongside the deleted_at timestamp

### Requirement: Reject soft-delete when recipe is assigned to active planner slots

When deleting a recipe that is scheduled for the current date or a future date in the meal planner, the system SHALL reject the deletion request with HTTP 409 Conflict and error code RECIPE_ASSIGNED_TO_PLANNER. The response SHALL include the list of assigned dates. The recipe's deleted_at timestamp SHALL remain null.

#### Scenario: Reject deletion of scheduled recipe with Conflict
- **WHEN** a client requests deletion of a recipe assigned to a planner event on or after the current date
- **THEN** the system rejects the request with HTTP 409 Conflict, returning errorCode RECIPE_ASSIGNED_TO_PLANNER and the assigned date list

#### Scenario: Retain recipe availability on deletion rejection
- **WHEN** recipe deletion is rejected due to active planner assignment
- **THEN** the recipe remains stored without a deleted_at timestamp and remains available in the active library

### Requirement: Synchronize library view and dismiss detail after deletion

After successful soft-deletion, the detail sheet SHALL invoke an optional deletion callback and close. On `/recipes`, the supplied callback SHALL start a new Search query. Removal from returned results SHALL depend on a successful subsequent read. If deletion rejects, the sheet SHALL remain open without invoking success callbacks.

#### Scenario: Dismiss detail sheet and refresh library on deletion success
- **WHEN** recipe soft-deletion succeeds from detail opened by `/recipes`
- **THEN** the detail sheet closes and the caller starts its Search refresh without navigating; a successful refreshed response excludes the deleted recipe

#### Scenario: Retain detail sheet and library state on deletion failure
- **WHEN** recipe soft-deletion request fails or is rejected
- **THEN** the detail sheet remains open, the recipe card remains visible in the library, and the failure is logged without displaying a user toast

### Requirement: Exclude soft-deleted recipes from standard library listings and search

The system SHALL exclude recipes with a non-null deleted_at timestamp from standard paged library listings and search results. Direct requests to read the detail of a soft-deleted recipe SHALL return HTTP 404 NotFound.

#### Scenario: Exclude soft-deleted recipe from standard paged library reads
- **WHEN** a client requests paged library recipes via GET /api/recipes
- **THEN** recipes with deleted_at populated are omitted from the returned list

#### Scenario: Exclude soft-deleted recipe from recipe search results
- **WHEN** a client executes a recipe search query
- **THEN** soft-deleted recipes matching the search text are omitted from search results

#### Scenario: Return NotFound for soft-deleted recipe detail lookup
- **WHEN** a client requests detail for a soft-deleted recipe via GET /api/recipes/{id}
- **THEN** the system returns HTTP 404 NotFound

### Requirement: Open Recycle Bin sheet from library browse header

The library browse view SHALL provide a Recycle Bin trigger control in its header area. Activating the control SHALL present the Recycle Bin bottom sheet overlay displaying the title “Recycle Bin” and a close button. Dismissing the sheet SHALL hide the overlay and return to the library browse view.

#### Scenario: Present Recycle Bin sheet from browse header trigger
- **WHEN** a person clicks the Recycle Bin button in the browse view header
- **THEN** the Recycle Bin bottom sheet opens displaying the title “Recycle Bin” and close button

#### Scenario: Dismiss Recycle Bin sheet back to browse view
- **WHEN** a person clicks the close button or sheet backdrop
- **THEN** the Recycle Bin sheet closes and the underlying browse view is displayed

### Requirement: List soft-deleted recipes in Recycle Bin

Opening the Recycle Bin SHALL fetch all soft-deleted recipes ordered by deletion timestamp descending. The sheet SHALL display loading feedback while the request is in flight. If no deleted recipes exist, it SHALL display an empty message. When deleted recipes exist, each item SHALL display its recipe name, localized deletion date, a Restore button, and a Delete button.

#### Scenario: Show loading indicator while retrieving trash items
- **WHEN** the Recycle Bin sheet mounts and requests deleted recipes
- **THEN** the sheet displays a loading indicator until the request completes

#### Scenario: Display empty bin message when no recipes are deleted
- **WHEN** the Recycle Bin request returns an empty list of deleted recipes
- **THEN** the sheet displays “Your Recycle Bin is empty.”

#### Scenario: Render soft-deleted recipes with name, date, and actions
- **WHEN** the Recycle Bin contains soft-deleted recipes
- **THEN** the sheet renders each item with its recipe name, formatted deletion date, Restore button, and Delete button

### Requirement: Restore soft-deleted recipe to active library

A successful restore SHALL clear deletion timestamp and actor, assign an update timestamp, and return HTTP 200. The service SHALL attempt search-index dispatch after saving; dispatch failure SHALL be logged without reversing restoration. Successful UI completion SHALL remove the trash item. Later library inclusion SHALL still require stored readiness; search visibility depends on its own read/index path.

#### Scenario: Restore soft-deleted recipe to active status
- **WHEN** a person activates Restore for an item in the Recycle Bin
- **THEN** the system clears deleted_at and deleted_by, assigns updated_at and returns HTTP 200; a later successful standard list includes the recipe only when its stored readiness is true

#### Scenario: Trigger search index re-indexing upon recipe restore
- **WHEN** restoration has saved and the search-index dispatch is attempted
- **THEN** the service requests index-recipe-search for the restored ID; a dispatch exception is logged and does not reverse the saved restoration or by itself reject the restore response

#### Scenario: Remove restored recipe from trash list view
- **WHEN** the restore request completes successfully
- **THEN** the restored recipe is immediately removed from the Recycle Bin list

### Requirement: Present elevated PIN dialog for permanent purge

Activating the Delete action for a recipe in the Recycle Bin SHALL open an elevated PIN dialog presenting a permanent deletion warning, a password-masked PIN input, a Cancel button, and a Delete Forever button. The Delete Forever button SHALL remain disabled while the PIN input is empty. Canceling SHALL dismiss the dialog without sending a purge request.

#### Scenario: Open PIN confirmation dialog for selected trash recipe
- **WHEN** a person clicks the Delete button for an item in the Recycle Bin
- **THEN** the elevated PIN dialog appears with title “Permanently Delete Recipe”, warning text, PIN input, Cancel, and Delete Forever buttons

#### Scenario: Dismiss PIN dialog on cancel without sending request
- **WHEN** a person clicks Cancel in the elevated PIN dialog
- **THEN** the dialog closes, no purge request is sent, and the item remains in the Recycle Bin

### Requirement: Permanently purge soft-deleted recipe with valid elevated PIN

On a successful purge with valid elevated PIN for a soft-deleted recipe, the system SHALL remove its filesystem directory, related search documents, votes, calendar events and recipe row, and return HTTP 200. Selected Pending indexing workflow instances SHALL be marked Failed in that save. This success path SHALL NOT imply running-worker cancellation or atomic file/database rollback.

#### Scenario: Purge recipe, filesystem assets, and dependencies with valid PIN
- **WHEN** a purge request is submitted with a PIN matching ELEVATED_ACTIONS_PIN for a soft-deleted recipe
- **THEN** the system removes the recipe directory from disk, deletes search documents, votes, and calendar events, removes the recipe row, and returns HTTP 200 with purged true

#### Scenario: Cancel pending index workflows during purge
- **WHEN** a recipe with pending search index workflow instances is permanently purged
- **THEN** the pending workflow instances are transitioned to failed status

#### Scenario: Remove purged recipe from trash list and close PIN dialog
- **WHEN** the permanent purge request succeeds
- **THEN** the PIN dialog closes and the purged recipe is removed from the Recycle Bin list

### Requirement: Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe

The system SHALL reject a purge request with HTTP 503 PIN_NOT_CONFIGURED if no elevated PIN is configured, with HTTP 403 FORBIDDEN if the provided PIN header is missing or incorrect, and with HTTP 409 NOT_IN_TRASH if the recipe is not soft-deleted. On rejection, the client SHALL keep the PIN dialog open, display an error message, and retain the item in the Recycle Bin.

#### Scenario: Reject purge with 403 on missing or incorrect PIN
- **WHEN** a purge request is sent without X-Elevated-Pin or with a non-matching PIN value
- **THEN** the system rejects the request with HTTP 403 FORBIDDEN and message “Missing or incorrect elevated PIN.”

#### Scenario: Reject purge with 503 when elevated PIN is unconfigured
- **WHEN** a purge request is sent while ELEVATED_ACTIONS_PIN is not configured on the server
- **THEN** the system rejects the request with HTTP 503 and errorCode PIN_NOT_CONFIGURED

#### Scenario: Reject purge with 409 when recipe is not in trash
- **WHEN** a purge request is sent for a recipe whose deleted_at is null
- **THEN** the system rejects the request with HTTP 409 Conflict and errorCode NOT_IN_TRASH

#### Scenario: Display error feedback and retain dialog on purge rejection
- **WHEN** the purge request fails with an error status
- **THEN** the PIN dialog remains open, displays an error message, and the recipe remains in the Recycle Bin

### Requirement: Return eligible library summary counts

Successful authorized GET `/api/recipes/library-summary` SHALL count only recipes with stored readiness true and no deletion timestamp. It SHALL return their total without restricting discoverability or member attribution. Household access SHALL follow household-identity's `Authenticate protected API requests independently` requirement.

#### Scenario: Count ready active recipes across library flags
- **WHEN** an authorized summary request succeeds for ready active recipes with differing discoverability and attribution
- **THEN** all those recipes contribute to the total regardless of those flags

#### Scenario: Exclude not-ready recipes from summary counts
- **WHEN** an authorized summary request succeeds with stored not-ready recipes present
- **THEN** those recipes contribute to none of the summary counts

#### Scenario: Exclude deleted recipes from summary counts
- **WHEN** an authorized summary request succeeds with deleted recipes present
- **THEN** those recipes contribute to none of the summary counts

### Requirement: Report never-cooked and persisted rating counts

Within the eligible summary collection, the API SHALL count absent last-cooked dates as `neverCooked`. It SHALL report `ratings.love`, `like`, `dislike` and `unrated` for stored ratings Love=3, Like=2, Dislike=1 and Unknown=0 respectively. These are recipe-level facts, independent of member votes.

#### Scenario: Count absent cooked dates
- **WHEN** a successful summary includes two eligible recipes without a last-cooked date and one with a date
- **THEN** `neverCooked` is 2

#### Scenario: Count the four supported ratings
- **WHEN** a successful summary includes one eligible recipe at each supported rating
- **THEN** total is 4 and love, like, dislike and unrated are each 1

### Requirement: Represent successful library summaries including empty collections

A successful summary SHALL return HTTP 200 with integer `total`, `neverCooked` and nested `ratings` counts inside one `data` object. The ratings object SHALL contain `love`, `like`, `dislike` and `unrated`. With no eligible recipes all six counts SHALL be zero.

#### Scenario: Read the summary response shape
- **WHEN** an authorized summary request succeeds
- **THEN** the response has one `data` envelope containing total, neverCooked and the four nested rating counts

#### Scenario: No eligible recipes contribute
- **WHEN** an authorized summary request succeeds with no eligible recipes
- **THEN** it returns the same HTTP 200 shape with total, neverCooked and all four rating counts zero

### Requirement: Retrieve summary before the Browse first page

For initial Browse loading and first-page reloads caused by All/Discovery or presentation changes, the application SHALL await summary retrieval before requesting the recipe page. Missing summary data or total SHALL supply zero as the All-library total. Existing `Show pending library-load feedback` and `Offer retry after initial library-load failure` requirements govern pending, failure and Retry outcomes.

#### Scenario: Summary completes before page retrieval
- **WHEN** a Browse first-page load starts
- **THEN** it requests the summary and waits for it to resolve before requesting page 1

#### Scenario: Summary total is absent
- **WHEN** the summary request resolves without data or total and the first page subsequently succeeds
- **THEN** the All-library total supplied by that summary is zero

#### Scenario: Filter or presentation starts another first-page load
- **WHEN** changing All/Discovery or presentation starts a first-page reload
- **THEN** summary retrieval precedes the new page-1 request under the current selection

### Requirement: Select the initial Browse total by collection mode

After a relevant first-page response succeeds, All mode SHALL use the preceding summary total, including its zero default. Discovery mode SHALL use the page's nonnegative filtered pagination total, defaulting missing pagination or total to zero. Existing `Return an explore-ordered library page` owns the page total; summary and page reads do not establish an atomic snapshot.

#### Scenario: All uses summary rather than page total
- **WHEN** a relevant All first-page response succeeds with summary total 45 and page total 10
- **THEN** the Browse collection total is 45

#### Scenario: Discovery uses filtered page total
- **WHEN** a relevant Discovery first-page response succeeds with summary total 45 and filtered page total 10
- **THEN** the Browse collection total is 10

#### Scenario: Discovery pagination total is absent
- **WHEN** a relevant Discovery first-page response succeeds without pagination or its total
- **THEN** the Browse collection total is zero even if the summary total is positive

### Requirement: Initialize Browse pagination from the selected count

On a relevant successful first-page load, Browse SHALL replace loaded recipes with returned items, treating absent items as an empty array, reset the current item index to zero, and set the current page to 1. It SHALL indicate more pages exactly when the selected collection total exceeds that presentation's requested page size. This initial indication SHALL NOT guarantee fresh, stable or complete subsequent traversal.

#### Scenario: Initial page state uses the selected total
- **WHEN** a relevant first-page load succeeds
- **THEN** returned items replace the loaded collection, the item index is zero and current page is 1
- **AND** more-pages indication is true exactly when the selected total exceeds the requested page size

#### Scenario: Page items are absent
- **WHEN** a relevant first-page response succeeds without recipe items
- **THEN** the loaded collection becomes empty without deriving the selected total from its item count

### Requirement: Offer and load library stack presentation

The library SHALL use stack presentation when the selected member has no saved list preference or current override. Selecting Show recipe stack SHALL select stack presentation. After the shared summary succeeds, stack first-page loads SHALL request explore order, limit 20 and the active All/Discovery filter.

#### Scenario: Load the default stack
- **WHEN** a member without a saved list preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order explore, limit 20 and discoverableOnly false

#### Scenario: Switch from list to stack
- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with limit 20 and the selected collection filter

### Requirement: Present the current stack card and visual depth

With nonempty successfully loaded stack results, Browse SHALL render up to four consecutive loaded cards beginning at the current index, with the first designated front. Cards SHALL display returned name, description, hero reference and formatted time; deeper cards SHALL have reduced scale, opacity and vertical offset.

#### Scenario: Render a window of loaded cards
- **WHEN** stack results are available at a valid current index with no stack loader replacing cards
- **THEN** up to four loaded records beginning at that index are rendered with one front card

#### Scenario: Read stack card content
- **WHEN** a returned card is displayed
- **THEN** its name, description, hero reference and formatted time are presented

### Requirement: Navigate loaded stack cards with directional swipes

On the front card, a right drag exceeding 35 pixels or rightward velocity exceeding 280 pixels/second SHALL request previous navigation after departure animation; corresponding negative thresholds SHALL request next navigation. Below both thresholds SHALL return the card without navigation. Back cards SHALL ignore navigation and tap callbacks.

#### Scenario: Navigate next or previous
- **WHEN** the front card completes a directional drag beyond the displacement or velocity threshold
- **THEN** leftward intent requests next and rightward intent requests previous

#### Scenario: Release a short drag
- **WHEN** a front card releases with displacement and velocity below the directional thresholds
- **THEN** the card returns without invoking either navigation callback

#### Scenario: Ignore back-card activation
- **WHEN** a non-front card receives a tap or drag-end handler invocation
- **THEN** it does not invoke detail or navigation callbacks

### Requirement: Open front-card detail only for a tap

Tapping the front card without a tracked drag SHALL open that recipe detail. A horizontal drag exceeding 5 pixels SHALL suppress the tap. Closing detail SHALL retain the loaded card position under the existing detail dismissal requirement.

#### Scenario: Tap the front card
- **WHEN** the front card is tapped without a tracked drag
- **THEN** detail opens for that card ID

#### Scenario: Suppress a drag-induced tap
- **WHEN** the front card has tracked horizontal displacement greater than 5 pixels before its tap handler runs
- **THEN** that handler does not open detail

### Requirement: Wrap stack navigation within available results

Next navigation from the final loaded card SHALL return to the first loaded card unless more pages are indicated and prefetch is pending. Previous navigation from index zero SHALL use the last loaded card when the active total is already loaded; otherwise it SHALL request the calculated final page using limit 20 and the active filter and land on its last returned card.

#### Scenario: Loop forward after the last loaded card
- **WHEN** next is requested at the final loaded card with no pending prefetch for more pages
- **THEN** the first loaded card becomes current

#### Scenario: Wait at a pending page boundary
- **WHEN** next is requested on the final loaded card while more pages are indicated and prefetch is pending
- **THEN** navigation waits at that boundary

#### Scenario: Wrap backward to loaded end
- **WHEN** previous is requested at the first card with the active total already loaded and no more pages
- **THEN** the final loaded card becomes current

#### Scenario: Retrieve the final page for backward wrapping
- **WHEN** previous is requested at the first card with a positive active count and the end not loaded
- **THEN** the calculated final-page request uses explore order, limit 20 and the active filter, and its last returned card becomes current

### Requirement: Bound empty-page probing during backward wrapping

If a calculated wrap page is empty, Browse SHALL probe decreasing page numbers, stopping at a nonempty result, page 1 or three total requests. A nonempty response SHALL supply the landing card. This probing SHALL NOT establish complete or stable traversal.

#### Scenario: Find an earlier nonempty wrap page
- **WHEN** the calculated final page is empty and the preceding page returns cards
- **THEN** Browse requests the preceding page and lands on its final returned card

### Requirement: Prefetch additional stack pages near the loaded end

In stack presentation with more pages indicated, no initial load or prefetch pending and no end-state/cooldown suppression, five or fewer remaining loaded cards SHALL trigger the next explore page using limit 20 and the current filter. Successful append SHALL reuse the existing nonempty-ID deduplication rule.

#### Scenario: Prefetch within five remaining cards
- **WHEN** stack browsing reaches at most five remaining loaded cards with more pages and no suppressing condition
- **THEN** the next page is requested and a successful relevant response appends unseen IDs in order

### Requirement: Display the loaded stack position against selected total

The action bar SHALL display current loaded index plus one and the selected collection total in position / total form. This SHALL represent loaded position and the existing count selection, without promising a stable absolute position across wrap/pagination changes.

#### Scenario: Display stack depth
- **WHEN** the current loaded index is 2 and selected total is 24
- **THEN** the indicator reads 3 / 24

### Requirement: Toggle front-card discoverability with pending feedback

The action bar SHALL initialize from the current recipe discoverability, defaulting absent values false. Activation SHALL optimistically show the inverse, disable the toggle while pending and PATCH that recipe flag. Success SHALL update the loaded matching record; rejection SHALL clear optimism and restore the record-backed display. Existing persisted discoverability ownership applies.

#### Scenario: Submit the inverse front-card flag
- **WHEN** the enabled front-card toggle is activated
- **THEN** it displays the inverse flag, disables while pending and submits that flag for the current ID

#### Scenario: Complete a successful stack toggle
- **WHEN** the PATCH resolves successfully without intervening record changes
- **THEN** the matching loaded record retains the submitted flag and pending feedback clears

#### Scenario: Recover from rejected stack toggle
- **WHEN** the PATCH rejects while the same recipe remains current
- **THEN** pending feedback clears and the control displays its record-backed flag again

### Requirement: Leave the Browse overlay through its navigation controls

Close SHALL request browser back navigation. Search SHALL request `/recipes?focus=search`. Unmounting Browse SHALL reset its stack store.

#### Scenario: Close or search from Browse
- **WHEN** a person activates Close or Search in the library overlay
- **THEN** Close requests back navigation or Search requests the focused Search route respectively

#### Scenario: Reset departed Browse state
- **WHEN** the Browse page unmounts
- **THEN** loaded recipes, index, total and pagination return to the initial stack-store state

### Requirement: Show directional stack cues and request supported haptics

The front card SHALL show BACK and NEXT drag cues for previous and next navigation. When horizontal displacement exceeds 60 pixels and haptics are armed, the card SHALL request a 10 ms vibration if the browser exposes vibration support, rearming below 50 pixels. This SHALL NOT guarantee physical haptic delivery.

#### Scenario: Display directional navigation cues
- **WHEN** the front stack card is rendered for dragging
- **THEN** it provides BACK for rightward previous navigation and NEXT for leftward next navigation

#### Scenario: Attempt an armed supported vibration
- **WHEN** displacement exceeds 60 pixels with haptics armed and navigator vibration available
- **THEN** the card requests a 10 ms vibration once until displacement falls below 50 pixels and rearms it

### Requirement: Return newest-created library pages by default

Authorized GET `/api/recipes` without order SHALL sort eligible records by creation time descending. Existing list eligibility, filter count, normalized pagination and unwrapped response ownership SHALL apply; equal creation times SHALL NOT imply a stable tie order.

#### Scenario: Read without an order parameter
- **WHEN** an authorized list request omits order and succeeds with distinct creation timestamps
- **THEN** newer-created eligible records precede older-created records on the requested offset page

### Requirement: Constrain library lookups by supplied predicates

List lookup SHALL apply each supplied ID, nonblank name and nonblank URL conjunctively to the already eligible collection. ID SHALL match exactly. Name and URL SHALL compare exact lowercased values after trimming the requested filter. Null/whitespace name or URL SHALL add no predicate. This SHALL NOT canonicalize URLs or perform substring matching.

#### Scenario: Lookup an exact recipe ID
- **WHEN** an authorized list request supplies an eligible recipe ID and succeeds
- **THEN** only that ID can match before pagination

#### Scenario: Lookup a trimmed case-insensitive exact name
- **WHEN** an authorized list request supplies a nonblank name with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored name match

#### Scenario: Lookup a trimmed case-insensitive exact URL
- **WHEN** an authorized list request supplies a nonblank URL with different case and surrounding whitespace
- **THEN** only eligible records with an equal lowercased stored source URL match

#### Scenario: Combine lookup predicates
- **WHEN** ID, name and URL are supplied together and the successful list query evaluates them
- **THEN** a record must satisfy all supplied predicates and existing ready/nondeleted/discoverable eligibility

#### Scenario: Ignore blank text filters
- **WHEN** a successful authorized list request supplies null or whitespace-only name or URL
- **THEN** that text filter does not narrow the eligible collection

### Requirement: Reject unsupported library order parameters

GET `/api/recipes` with a non-null order other than a case-insensitive spelling of explore SHALL return HTTP 400 with an error identifying explore as allowed. This rejection rule SHALL NOT guarantee that mixed-case accepted spellings receive explore sorting.

#### Scenario: Reject an unsupported order
- **WHEN** an authorized request sends order invalid
- **THEN** the API returns HTTP 400 with an error mentioning explore rather than a recipe page

### Requirement: Read stored array instructions through recipe detail

For an available recipe, successful detail reading SHALL expose an array-valued recipeInstructions member parsed from persisted raw metadata. Missing, blank, malformed metadata or an absent member SHALL expose null. Existing detail response ownership SHALL apply.

#### Scenario: Read a stored instruction array
- **WHEN** available recipe metadata contains recipeInstructions as an array and detail reading succeeds
- **THEN** the returned recipe exposes that array without applying sharing-export section transformation

#### Scenario: Read without usable instruction metadata
- **WHEN** available recipe metadata is blank, malformed or lacks recipeInstructions and detail reading succeeds
- **THEN** recipeInstructions is null

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a non-null instruction array SHALL replace the recipeInstructions member in persisted raw metadata and the recipe-info representation. Other raw metadata members SHALL be retained. Omitted/null instructions SHALL leave that member unchanged. This SHALL NOT add an inline detail instruction editor.

#### Scenario: Replace an instruction array
- **WHEN** an authorized PATCH supplies three instruction strings with first value Updated Step 1 and persistence completes
- **THEN** stored metadata and recipe-info instructions contain that three-element array with the first supplied value

#### Scenario: Retain unrelated instruction metadata
- **WHEN** a successful instruction PATCH updates valid object metadata containing other members
- **THEN** only its recipeInstructions member is replaced and the other raw members remain

#### Scenario: Preserve absent instruction updates
- **WHEN** a successful authorized PATCH omits instructions or supplies null
- **THEN** the existing recipeInstructions member remains unchanged

### Requirement: Represent persisted recipe attribution and readiness

Successful recipe DTO mapping SHALL carry the stored addedBy value, including null, creation timestamp, stored readiness, deletion timestamp, image count and finished-dish index. Readiness SHALL be read as a stored flag, not inferred from title, images or synthesis status. Existing list eligibility SHALL still govern which records appear.

#### Scenario: Read stored attribution and creation time
- **WHEN** a successful eligible list or available detail read maps a recipe
- **THEN** addedBy and createdAt reflect stored values, allowing null attribution

#### Scenario: Read stored readiness and image facts
- **WHEN** an available recipe is mapped to a response
- **THEN** isReady, imageCount and finishedDishIndex reflect stored flags/count/index and images enumerates zero-based indices up to count minus one

### Requirement: Derive represented source provenance and reimport availability

Recipe DTO mapping SHALL select sourceType url for a nonempty stored source URL, otherwise photos for positive image count, otherwise synthesized. canReimport SHALL be true exactly when a stored source URL is nonempty or image count is positive. This represented availability SHALL NOT guarantee successful acquisition or the presence of an executed synthesis workflow.

#### Scenario: Prefer source URL provenance
- **WHEN** a mapped recipe has a nonempty source URL and any supported image count
- **THEN** sourceType is url and canReimport is true

#### Scenario: Represent photo provenance
- **WHEN** a mapped recipe has no nonempty source URL and positive image count
- **THEN** sourceType is photos and canReimport is true

#### Scenario: Represent absent original sources
- **WHEN** a mapped recipe has no nonempty source URL and zero originals
- **THEN** sourceType is synthesized and canReimport is false

### Requirement: Represent the persisted vegetarian value without dietary inference

The persisted vegetarian field SHALL permit true, false or null. DTO mapping SHALL preserve explicit boolean values and represent a null stored value as false. This fallback SHALL describe the API representation only and SHALL NOT establish dietary accuracy, completed classification or semantic equivalence of unknown and confirmed false.

#### Scenario: Read an explicit vegetarian boolean
- **WHEN** a successful DTO read maps a stored true or false vegetarian value
- **THEN** the API represents the same boolean

#### Scenario: Read a legacy nullable vegetarian value
- **WHEN** a successful DTO read maps a recipe whose stored vegetarian value is null
- **THEN** the API represents isVegetarian false without changing the stored nullable value by this read

### Requirement: Serve an existing hero asset independently of recipe DTO reads

Anonymous or authenticated GET `/api/recipes/{id}/hero` SHALL return the asset-store stream and its content type when present, with Cache-Control public, max-age=31536000, immutable. A missing hero asset SHALL return HTTP 404. Availability SHALL be determined by the asset store rather than recipe readiness or import completion.

#### Scenario: Retrieve an existing hero stream
- **WHEN** the requested hero exists in the configured asset store
- **THEN** GET returns HTTP 200 with raw binary, the store-provided media type and the immutable public cache header

#### Scenario: Request an absent hero asset
- **WHEN** the requested hero is absent from the configured asset store
- **THEN** GET returns HTTP 404 instead of a hero stream

### Requirement: Append one original photo to an existing recipe

For an authorized multipart POST `/api/recipes/{id}/originals`, successful append SHALL save the supplied file as the next original index from stored recipe-info count, advance that count and the recipe database image count, then request hero regeneration. After those steps succeed, the API SHALL return HTTP 201 with the new original asset Location.

#### Scenario: Append an original and request regeneration
- **WHEN** an existing recipe and recipe-info both have count2 and a single file append completes
- **THEN** the file is saved at index2, both counts advance to3, regeneration is requested and the API returns HTTP 201 with a Location for original/2

#### Scenario: Reject an append for a missing recipe
- **WHEN** an authorized upload targets an absent recipe ID
- **THEN** the API returns HTTP 404 before this service writes an original or triggers regeneration

### Requirement: Dispatch original-photo append from detail Edit

Loaded detail Edit SHALL offer a camera/file input action. Selecting its first file SHALL immediately send the original-photo upload, show Uploading photo feedback, then show regeneration-start feedback on success or upload-failure feedback on rejection. The input SHALL reset after completion. This dispatched action SHALL be separate from unsubmitted detail drafts.

#### Scenario: Upload a selected detail photo
- **WHEN** a person in loaded detail Edit activates the camera action and selects a file
- **THEN** the client posts that file to the loaded ID and shows Uploading photo followed by Regenerating hero image on success

#### Scenario: Finish a failed detail photo upload
- **WHEN** the detail photo upload rejects
- **THEN** the client shows Failed to upload photo and clears the input value for another selection

### Requirement: Accept an explicit hero-regeneration request after dispatch

Authorized POST `/api/recipes/{id}/hero/regenerate` SHALL request recipe-hero-regeneration for that ID and return HTTP 202 after dispatch resolves. This SHALL acknowledge dispatch, not completed generation or available changed image content. Shared background-processing lifecycle requirements SHALL govern subsequent workflow state.

#### Scenario: Accept hero regeneration dispatch
- **WHEN** the explicit request dispatch resolves successfully for the supplied ID
- **THEN** the API returns HTTP 202 after requesting recipe-hero-regeneration with that ID

### Requirement: Show immediate regeneration-request feedback in detail Edit

Loaded detail Edit SHALL offer explicit regeneration. Activation SHALL send the request for the loaded ID, display Regenerating hero image after request success, and display Failed to start regeneration after rejection. This feedback SHALL NOT assert changed asset delivery.

#### Scenario: Request regeneration from Edit
- **WHEN** a person activates the regeneration action in loaded detail Edit and the request succeeds
- **THEN** the loaded ID is requested and Regenerating hero image feedback appears

#### Scenario: Report regeneration request rejection
- **WHEN** the regeneration request rejects
- **THEN** detail shows Failed to start regeneration

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

### Requirement: Read the persisted recipe readiness status

Authorized GET `/api/recipes/{id}/status` for an available stored recipe SHALL report ready exactly when stored IsReady is true, otherwise pending. It SHALL return HTTP 200 with one data object carrying stored id, name, imageCount and isSynthesized alongside that status. This SHALL NOT infer workflow progress or completion from image count or synthesis flags.

#### Scenario: Read a pending stored recipe
- **WHEN** an available recipe has stored readiness false and its status read succeeds
- **THEN** the response data reports pending with its stored ID, name, imageCount and isSynthesized

#### Scenario: Read a ready recipe without originals
- **WHEN** an available recipe has stored readiness true and zero originals
- **THEN** the status read reports ready without requiring positive image count

#### Scenario: Read stored status fields independently
- **WHEN** an available record has stored name, image count and synthesis flag values
- **THEN** a successful status read returns those stored fields without recalculating readiness from them

### Requirement: Reject status reads without an available recipe

When the status provider cannot find the requested recipe, GET `/api/recipes/{id}/status` SHALL return HTTP 404 instead of pending or ready.

#### Scenario: Read status for an absent ID
- **WHEN** an authorized status request targets an absent recipe ID
- **THEN** the API returns HTTP 404

### Requirement: Disable the restoring trash item during its request

After Restore starts for a trash item, that item's Restore control SHALL remain disabled until the request settles. The control SHALL be enabled again after rejection if its item remains displayed. Existing successful restore removal SHALL apply; this local control SHALL NOT imply serialization of all recipe mutations.

#### Scenario: Wait for an item restore
- **WHEN** a displayed trash item has an outstanding Restore request
- **THEN** that item Restore control is disabled while other item state is retained

#### Scenario: Reenable a failed restore control
- **WHEN** the Restore request rejects while its trash item remains mounted
- **THEN** the item remains displayed and its Restore control becomes enabled again

### Requirement: Display pending permanent-purge submission feedback

While a PIN purge submission is pending and its dialog remains displayed, the submit control SHALL be disabled and show Deleting…. The PIN input and Cancel SHALL remain available. This feedback SHALL NOT imply that cancellation retracts a dispatched request or that programmatic form submission is guarded.

#### Scenario: Display a pending purge request
- **WHEN** the PIN form has dispatched purge and its dialog is still open
- **THEN** the submit control displays Deleting… and is disabled while PIN editing and Cancel remain available

### Requirement: Classify stored vegetarian facts from ingredient evidence

Operator classification SHALL use nonblank ingredient strings or object name fields without requiring a recipe title. A missing recipe SHALL return not-found; absent usable ingredients SHALL return unknown-no-ingredients. An explicit boolean response SHALL update the persisted vegetarian fact and update time when saving succeeds.

#### Scenario: No usable ingredients
- **WHEN** the recipe has empty, malformed or unsupported ingredient content
- **THEN** classification returns unknown-no-ingredients without changing its stored vegetarian fact

#### Scenario: Explicit classification
- **WHEN** the classifier returns an explicit boolean from usable ingredient evidence
- **THEN** that boolean and the operation's update time are saved

#### Scenario: Recipe missing
- **WHEN** the requested recipe is not found
- **THEN** classification returns not-found without calling the classifier

### Requirement: Preserve confirmed facts when classification is ambiguous

A classification response without an explicit boolean SHALL return unknown-insufficient-ingredients without overwriting the stored fact. Malformed response JSON SHALL propagate failure without persisting a replacement fact. Plain JSON and supported Markdown-fenced JSON SHALL be accepted; these behaviors SHALL NOT establish dietary accuracy.

#### Scenario: Ambiguous response
- **WHEN** a valid response supplies null vegetarian classification
- **THEN** the existing fact is preserved and the outcome is unknown-insufficient-ingredients

#### Scenario: Malformed response
- **WHEN** response JSON cannot be parsed
- **THEN** the existing fact is preserved and the parsing exception propagates

#### Scenario: Fenced response
- **WHEN** the response encloses an explicit boolean JSON object in a supported Markdown code fence
- **THEN** the explicit classification is accepted

### Requirement: Queue bounded vegetarian classification batches

Operator backfill SHALL select up to 25 undeleted recipes ordered by identity after an optional cursor. It SHALL select unknown facts by default and include known facts when force is true. It SHALL request one classifier workflow per selected recipe and request a successor with the final identity and force setting when the batch is full.

#### Scenario: Default backfill
- **WHEN** known and unknown undeleted recipes are available without force
- **THEN** only unknown recipes are selected for classification requests

#### Scenario: Forced backfill
- **WHEN** force is true
- **THEN** known recipes are eligible for classification requests

#### Scenario: Full batch
- **WHEN** a batch selects 25 recipes and all its launch requests succeed
- **THEN** it requests a successor after the final identity without waiting for those classifiers to finish

### Requirement: Distinguish classification launch counts from current facts

Classification status SHALL count undeleted recipes as total, classified, unknown, vegetarian and nonvegetarian. Backfill results SHALL add queued count and a next cursor for a full batch. Queued SHALL describe launch requests completed by that coordinator, not classification completion or correctness.

#### Scenario: Read current status
- **WHEN** four undeleted recipes contain one true, one false and two unknown facts
- **THEN** status reports total four, classified two, unknown two, vegetarian one and nonvegetarian one

#### Scenario: Queued children remain pending
- **WHEN** backfill has launched child work that has not completed
- **THEN** queued count does not imply those recipes' stored facts changed

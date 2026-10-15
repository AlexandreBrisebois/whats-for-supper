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

Activating View Original for a loaded recipe with sourceType other than “url”, or with an absent source URL, SHALL open the photo viewer overlay. The viewer SHALL order original photos with the finished dish photo first when finishedDishIndex is valid, and ascending index order otherwise. It SHALL display initial photo index 0, header text “View Original” in English and the photo counter indicating current photo position out of total image count.

#### Scenario: Open photo viewer with finished dish first
- **WHEN** a person activates View Original for a recipe with imageCount 3 and valid finishedDishIndex 1
- **THEN** the photo viewer opens displaying photo index 1 first and counter “1 / 3”

#### Scenario: Open photo viewer with sequential ordering
- **WHEN** a person activates View Original for a recipe with imageCount 2 and finishedDishIndex -1
- **THEN** the photo viewer opens displaying photo index 0 first and counter “1 / 2”

#### Scenario: Open photo viewer as fallback for absent source URL
- **WHEN** a person activates View Original for a recipe with sourceType “url” and an absent or null source URL
- **THEN** the application opens the photo viewer instead of attempting external navigation

### Requirement: Navigate between original photos with wrapping

In the multi-photo viewer, the application SHALL support navigating between photos via previous and next controls, keyboard ArrowLeft and ArrowRight keys, and pager dot indicators. Activating next SHALL advance to the next photo, wrapping from last back to first; activating previous SHALL return to the preceding photo, wrapping from first to last. Navigation between photos SHALL reset zoom scale to 1 if previously zoomed. Activating a pager dot SHALL navigate directly to that photo.

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

Upon successful soft-deletion of a recipe, the client SHALL invoke the deletion callback, dismiss the recipe detail sheet, and refresh the active library query so the deleted recipe card disappears from view without navigating away. If deletion fails, the detail sheet SHALL remain open and the recipe card SHALL remain visible in the library.

#### Scenario: Dismiss detail sheet and refresh library on deletion success
- **WHEN** recipe soft-deletion succeeds from the detail sheet
- **THEN** the detail sheet closes, the library query refreshes, the recipe card is removed from view, and the page URL remains unchanged

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

Activating Restore for a soft-deleted recipe SHALL send a restore request, clear its deleted_at and deleted_by fields, update its updated_at timestamp, and trigger search index re-indexing. Upon successful restoration, the client SHALL remove the recipe from the Recycle Bin list, and the recipe SHALL re-appear in standard library listings and search.

#### Scenario: Restore soft-deleted recipe to active status
- **WHEN** a person activates Restore for an item in the Recycle Bin
- **THEN** the system clears deleted_at and deleted_by, sets updated_at, returns HTTP 200, and re-includes the recipe in active library reads

#### Scenario: Trigger search index re-indexing upon recipe restore
- **WHEN** a soft-deleted recipe is successfully restored
- **THEN** the system triggers the index-recipe-search background workflow for the restored recipe

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

Submitting the elevated PIN dialog with a valid PIN matching the server's configured elevated actions PIN SHALL permanently delete the soft-deleted recipe. The system SHALL cancel pending indexing workflows, delete the recipe's filesystem directory assets, remove related search documents, votes, and calendar events, delete the recipe record from the database, and return HTTP 200.

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

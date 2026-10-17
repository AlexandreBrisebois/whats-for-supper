# Recipe media Specification

## Purpose

Let household members view original recipe sources and photos, obtain recipe image assets, append original photos and request hero regeneration while distinguishing dispatch from completed asset delivery.

## Relocation provenance (non-normative)

These requirements were relocated unchanged from their original capability owners. All applicable BSL/U/A qualifications, partial-success boundaries and deferred runtime/API/browser/database/model evidence transfer with them. Relocation establishes no new behavioral guarantee.

- [recipe-library evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-library.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

- [Return persisted recipe detail for an available record](../recipe-library/spec.md#requirement-return-persisted-recipe-detail-for-an-available-record)
- [Derive represented source provenance and reimport availability](../recipe-library/spec.md#requirement-derive-represented-source-provenance-and-reimport-availability)
- [Persist initial workflow and task identities before returning](../background-processing/spec.md#requirement-persist-initial-workflow-and-task-identities-before-returning)

## Requirements

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

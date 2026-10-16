# Recipe-library View Original delta

## ADDED Requirements

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

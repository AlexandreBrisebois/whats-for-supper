# Recipe sharing Specification

## Purpose

Exchange portable recipes between households via privacy-scrubbed export bundles (native share or file download fallback) and bundle import intake, schema validation, preview presentation, duplicate detection advisory warning, cancellation, and acceptance into the recipe library as a ready recipe.

## Requirements

### Requirement: Offer Share action on eligible ready recipes in loaded detail

The loaded recipe detail sheet SHALL offer a visible Share control (`recipe-share-btn`) when the recipe is ready, possesses a hero image URL that is not a placeholder, and is not in editing mode. The control SHALL NOT be offered when the recipe lacks a ready status, has a placeholder or missing hero image, or is currently being edited.

#### Scenario: Ready recipe with hero image displays Share control
- **WHEN** a person opens the detail sheet for a ready recipe with a valid, non-placeholder hero image while not in editing mode
- **THEN** the detail sheet displays the Share control in its header action area

#### Scenario: Not-ready recipe hides Share control
- **WHEN** a person opens the detail sheet for a recipe whose stored readiness is false
- **THEN** the Share control is absent from the detail sheet

#### Scenario: Placeholder hero image hides Share control
- **WHEN** a person opens the detail sheet for a recipe whose hero image URL contains placeholder text or is empty
- **THEN** the Share control is absent from the detail sheet

#### Scenario: Detail sheet in editing mode hides Share control
- **WHEN** a person enters editing mode within the recipe detail sheet
- **THEN** the Share control is absent from the detail sheet header

### Requirement: Generate privacy-scrubbed portable export bundle

Authorized GET `/api/recipes/{id}/share` with household access and member context SHALL return a version 1.0 portable bundle with source `wfs-share`. The bundle SHALL preserve core recipe content, structured instructions, and original images (capped at five). The bundle SHALL scrub personal ratings and notes by setting them to null, and SHALL omit internal entity identifiers and member attribution.

#### Scenario: Scrub personal notes and rating
- **WHEN** an authorized export request succeeds for a recipe containing household notes and a rating
- **THEN** the returned bundle sets both `notes` and `rating` to null in the exported recipe payload

#### Scenario: Preserve structured instructions and original images up to five
- **WHEN** an authorized export request succeeds for a recipe with structured instructions and multiple original images
- **THEN** the bundle preserves the HowToSections and steps, and includes up to five original images with MIME types and base64 payloads

#### Scenario: Wrap flat instruction strings in a default section
- **WHEN** an authorized export request succeeds for a recipe whose raw metadata stores flat instruction strings
- **THEN** the bundle wraps the steps inside a default section named Instructions

#### Scenario: Reject export when recipe lacks hero image
- **WHEN** an authorized export request is made for a recipe without a hero image in storage
- **THEN** the API returns 400 Bad Request indicating the recipe must have a hero image before it can be shared

#### Scenario: Reject export when member context header is missing
- **WHEN** a request is made to GET `/api/recipes/{id}/share` without member context
- **THEN** the API returns 400 Bad Request requiring member context

#### Scenario: Reject export when recipe is not found
- **WHEN** an authorized export request is made for a recipe identifier that does not exist
- **THEN** the API returns 404 Not Found

### Requirement: Deliver export bundle via native sharing with download fallback

Activating the Share control SHALL display a persistent loading notice and request the export bundle. If native file sharing is available and permitted, the client SHALL deliver the bundle via native share. If the user cancels native sharing, the action SHALL return cleanly without error feedback or download. If native sharing is unsupported or fails with a non-cancellation error, the client SHALL trigger a file download fallback.

#### Scenario: Native share dispatch when supported
- **WHEN** a person activates Share on a device supporting native file sharing with permission granted
- **THEN** the application requests the export bundle, displays a preparation toast, and presents the native sharing interface with the bundle file

#### Scenario: Cancellation of native share suppresses error and file download
- **WHEN** a person cancels or aborts the native share interface
- **THEN** the loading toast is removed, no error banner is displayed, and no file download is initiated

#### Scenario: Fallback to browser file download when native share is unavailable or fails
- **WHEN** native sharing is unsupported or throws a non-cancellation error
- **THEN** the application triggers a browser file download of the plain-text bundle file named with the slugified recipe name

#### Scenario: Present inline error feedback when bundle request fails
- **WHEN** the export bundle request fails with a network or server error
- **THEN** the loading toast is removed, the Share control is re-enabled, and the detail sheet displays an inline share error message

### Requirement: Offer recipe bundle intake on capture entry

The recipe capture view (`/capture`) SHALL offer an "Import recipe file" action (`import-recipe-file-btn`) among its intake options. Activating the control SHALL open a file picker accepting plain text files (`.txt,text/plain`) containing a serialized recipe bundle.

#### Scenario: Import recipe file action available on capture view
- **WHEN** a person visits the recipe capture view (`/capture`)
- **THEN** the secondary action list displays the "Import recipe file" button alongside other capture options

#### Scenario: File picker accepts text plain files
- **WHEN** a person inspects or activates the import recipe file input
- **THEN** the input accepts plain text files with `.txt` extensions and `text/plain` MIME types

### Requirement: Parse and validate imported bundle file payload

Selecting a bundle file SHALL read and parse its JSON content. If the file cannot be parsed as JSON, intake SHALL fail with unreadable file feedback. If the payload is missing required schema fields, contains an invalid source, or has malformed instruction structures or image payloads, intake SHALL fail with invalid bundle feedback.

#### Scenario: Successfully parse valid bundle payload
- **WHEN** a person selects a valid JSON recipe bundle file conforming to the required schema
- **THEN** the client parses the file and transitions to the bundle review state

#### Scenario: Reject unreadable non-JSON file
- **WHEN** a person selects a file whose content cannot be parsed as JSON
- **THEN** the capture view displays an error message indicating the recipe file could not be read and does not enter review

#### Scenario: Reject bundle with malformed schema or invalid image payloads
- **WHEN** a person selects a JSON file missing required recipe fields, having an unsupported bundle source, or containing invalid image payloads
- **THEN** the capture view displays an error message indicating the recipe file is not valid and clears any parsed bundle state

### Requirement: Present bundle review card and cancellation

Upon successful client parsing, the capture view SHALL display a bundle review card (`bundle-preview-card`). The card SHALL present the recipe name, source attribution, synthesis badge, original image count, structured instructions, hero image, and restored notes and ratings if present in the bundle. The view SHALL offer a Cancel action (`reject-bundle-btn`) that discards the bundle and returns to capture without persistence.

#### Scenario: Present preview card with bundle metadata and structured content
- **WHEN** a valid bundle is parsed
- **THEN** the review card displays the recipe name, source URL, source name, synthesis badge, instruction sections and steps, and hero image

#### Scenario: Render restored notes and star rating when present in bundle
- **WHEN** a parsed bundle contains non-empty notes and a numeric rating
- **THEN** the review card displays the notes block and the corresponding star rating count

#### Scenario: Cancel bundle preview and return to default capture view
- **WHEN** a person activates the Cancel button (`reject-bundle-btn`) on the bundle review screen
- **THEN** the parsed bundle is discarded, duplicate warnings are cleared, and the view returns to the default capture interface without creating a recipe

### Requirement: Display advisory warning for existing library duplicates

During bundle preview preparation, the client SHALL query the library for existing recipes matching the bundle's recorded source recipe ID or name. If a match is found, the view SHALL display an advisory warning banner (`duplicate-recipe-warning`) indicating the recipe already exists, with a control to view the existing recipe. The warning SHALL NOT prevent the user from proceeding with import acceptance.

#### Scenario: Display duplicate warning when recorded recipe ID matches existing recipe
- **WHEN** the bundle's recorded recipe ID matches an existing non-deleted recipe in the household library
- **THEN** the review screen displays an advisory warning banner stating the recipe already exists in the library

#### Scenario: Display duplicate warning when recipe name matches existing recipe
- **WHEN** the bundle lacks a matching recipe ID but its recipe name matches an existing library recipe
- **THEN** the review screen displays the advisory duplicate warning banner

#### Scenario: View existing recipe opens recipe detail overlay
- **WHEN** a person activates "View existing recipe" from the duplicate warning banner
- **THEN** the application opens the recipe detail sheet for the existing matching recipe

#### Scenario: Duplicate warning permits import acceptance
- **WHEN** the duplicate warning banner is visible and the person activates "Import recipe"
- **THEN** the client proceeds with submitting the bundle to the import endpoint without blocking

### Requirement: Accept and persist imported recipe bundle into library

Activating "Import recipe" (`accept-bundle-btn`) SHALL submit the bundle to POST `/api/recipes/import-bundle`. The API SHALL validate bundle version 1.0, source `wfs-share`, non-empty required content, max 5 original images, and base64 payloads. The API SHALL assign a new identifier upon collision, persist the entity with stored readiness true and importing member attribution, save hero and original images, and return 201 Created.

#### Scenario: Accept valid bundle and persist ready recipe with importing member attribution
- **WHEN** an authorized import request with a valid bundle payload succeeds
- **THEN** the API persists a new ready recipe entity attributed to the requesting family member, saves hero and original images, and returns 201 Created with the created recipe DTO

#### Scenario: Reassign recipe identifier when bundle identifier collides with existing entity
- **WHEN** the bundle's recipe identifier already exists in the database
- **THEN** the API generates a new unique identifier for the imported recipe and persists it without overwriting the existing entity

#### Scenario: Restore optional notes and rating into newly persisted entity
- **WHEN** a valid bundle contains notes and a rating
- **THEN** the newly created recipe entity persists those notes and rating values in the database and metadata store

#### Scenario: Reject bundle with unsupported version
- **WHEN** an import request supplies a version string other than 1.0
- **THEN** the API returns 400 Bad Request indicating the bundle version is unsupported

#### Scenario: Reject bundle with malformed payload or invalid image base64
- **WHEN** an import request supplies empty ingredients, empty instructions, more than five original images, or non-base64 image strings
- **THEN** the API returns 400 Bad Request with an error message describing the violation

### Requirement: Present import success screen and navigate home

Upon successful import acceptance, the capture view SHALL transition to a success screen (`bundle-import-success`). The screen SHALL display the imported recipe name and readiness confirmation, and offer a "Done" action (`bundle-import-done-btn`). Activating "Done" SHALL navigate to Home (`/`). If the import API request fails, the view SHALL display inline error feedback and retain the preview card.

#### Scenario: Present success screen upon import acceptance
- **WHEN** the bundle import API returns a successful 201 response
- **THEN** the capture view displays the success screen with the imported recipe name and confirmation message

#### Scenario: Done action navigates to Home
- **WHEN** a person activates the Done button on the import success screen
- **THEN** the application navigates to Home (`/`)

#### Scenario: Present inline error feedback upon import API failure
- **WHEN** the bundle import API request fails
- **THEN** the view displays an inline import error banner and keeps the review card active for retry or cancellation

### Requirement: Disable Share while a share operation is pending

After Share activation, the loaded detail sheet SHALL disable its Share control until bundle preparation and delivery settle. Repeated activation of that disabled control SHALL NOT initiate another export request. Once the operation settles, the control SHALL be enabled again if the loaded recipe remains eligible.

#### Scenario: Repeat activation during bundle preparation
- **WHEN** Share has been activated and the bundle request remains pending
- **THEN** the Share control is disabled and activating it again does not request another bundle

#### Scenario: Delivery completion releases the Share control
- **WHEN** the pending share delivery completes and the loaded recipe remains eligible
- **THEN** the preparation notice is dismissed and the Share control is enabled again

### Requirement: Show pending import acceptance on the review action

While a bundle acceptance request is pending and its review remains displayed, the capture view SHALL disable the Import recipe action and show a loading indicator in that action. Repeated activation of the disabled action SHALL NOT submit another import request.

#### Scenario: Import acceptance is pending in review
- **WHEN** a person activates Import recipe and the acceptance request remains pending with the review still displayed
- **THEN** the action displays a loading indicator, is disabled, and repeated activation does not submit another acceptance request

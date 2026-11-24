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

Authorized GET `/api/recipes/{id}/share` with household access and member context SHALL return a version 1.0 portable bundle with source `wfs-share`. The bundle SHALL preserve core recipe content, the saved positive `servings` basis (or null when unset), structured `HowToSection` / `HowToStep` instructions, and original images (capped at five). The bundle SHALL scrub personal ratings and notes by setting them to null, and SHALL omit internal entity identifiers and member attribution.

#### Scenario: Scrub personal notes and rating

- **WHEN** an authorized export request succeeds for a recipe containing household notes and a rating
- **THEN** the returned bundle sets both `notes` and `rating` to null in the exported recipe payload

#### Scenario: Preserve saved servings basis on export

- **WHEN** an authorized export request succeeds for a recipe with saved `servings` of 4
- **THEN** the returned bundle sets `recipe.servings` to 4 so receiving households retain its portion basis

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

The recipe capture view (`/capture`) SHALL offer a file import action (`import-recipe-file-btn`) advertising `.txt` shared recipe files (paired with PDF outside demo mode and Family GOTO, and labeled for `.txt` shared recipes in demo mode) without referencing `.recipe` extensions in user-facing copy. Activating the control SHALL open a file picker accepting plain text files (`.txt,text/plain`) containing a serialized recipe bundle.

#### Scenario: Import recipe file action available on capture view

- **WHEN** a person visits the recipe capture view (`/capture`)
- **THEN** the secondary action list displays the file import option naming `.txt` without mentioning `.recipe`

#### Scenario: File picker accepts text plain files

- **WHEN** a person inspects or activates the import recipe file input
- **THEN** the input accepts plain text files with `.txt` extensions and `text/plain` MIME types (plus `.pdf,application/pdf` when PDF intake is eligible)

### Requirement: Parse and validate imported bundle file payload

Selecting a bundle file SHALL read and parse its JSON content. If the file cannot be parsed as JSON, intake SHALL fail with unreadable file feedback. If the payload is missing required schema fields, contains an invalid source, or has malformed instruction structures or image payloads, intake SHALL fail with localized invalid recipe file feedback that does not reference `.recipe` files.

#### Scenario: Successfully parse valid bundle payload

- **WHEN** a person selects a valid JSON recipe bundle `.txt` file conforming to the required schema
- **THEN** the client parses the file and transitions to the bundle review state

#### Scenario: Reject unreadable non-JSON file

- **WHEN** a person selects a file whose content cannot be parsed as JSON
- **THEN** the capture view displays an error message indicating the recipe file could not be read and does not enter review

#### Scenario: Reject bundle with malformed schema or invalid image payloads

- **WHEN** a person selects a JSON file missing required recipe fields, having an unsupported bundle source, or containing invalid image payloads
- **THEN** the capture view displays an error message indicating the recipe file is not valid (without naming `.recipe`) and clears any parsed bundle state

### Requirement: Present bundle review card and cancellation

Upon parsing, capture SHALL show a hero-led `bundle-preview-card` with hero image, title, filename, original count, and a collapsed `>= 48 CSS px` `Preview steps` / `Hide preview` disclosure for ingredients and Garden-styled steps, omitting `Original`/`Synthesized` badges. Below the card (and any duplicate advisory), it SHALL show editable rating and notes, a single primary `Import recipe` CTA, and the top-right `48 × 48 CSS px` Cancel (`×`) without a bottom Cancel button.

#### Scenario: Present preview card with bundle metadata and structured content

- **WHEN** a valid bundle is parsed
- **THEN** `bundle-preview-card` displays the hero image, recipe name, filename and original photo count, and a collapsed `Preview steps` disclosure (`aria-expanded="false"`) without rendering an `Original` or `Synthesized` badge
- **AND** activating `Preview steps` updates the control to `Hide preview` (`aria-expanded="true"`) and reveals the bundle's ingredients and instruction sections styled with Garden (`text-garden-ink`) section headings and numbered sage step badges (`bg-sage-50 border-garden-line`)

#### Scenario: Render restored notes and star rating when present in bundle

- **WHEN** a person reviews a privacy-scrubbed shared `.txt` bundle (or a bundle carrying prefilled rating and notes)
- **THEN** editable shared appreciation rating controls (`Dislike` / `Like` / `Love`, replacing read-only star icons) and an optional notes textarea initialize from any bundle-supplied values (or unrated/empty when scrubbed) so the importing member can set or adjust them before activating `Import recipe`

#### Scenario: Cancel bundle preview and return to default capture view

- **WHEN** a person activates the top-right Cancel (`×`) control on the bundle review screen
- **THEN** the parsed bundle and importer metadata draft are discarded, duplicate warnings are cleared, and navigation returns to `/home` without creating a recipe

### Requirement: Display advisory warning for existing library duplicates

During bundle preview preparation, the client SHALL query the library for existing recipes matching the bundle's recorded source recipe ID or name. If a match is found, the view SHALL display an advisory warning banner (`duplicate-recipe-warning`) directly below `bundle-preview-card` and above the importer's Rating and Notes controls, with a control to view the existing recipe without blocking import acceptance.

#### Scenario: Display duplicate warning when recorded recipe ID matches existing recipe

- **WHEN** the bundle's recorded recipe ID matches an existing non-deleted recipe in the household library
- **THEN** `duplicate-recipe-warning` renders directly below `bundle-preview-card` and above the Rating and Notes inputs

#### Scenario: Display duplicate warning when recipe name matches existing recipe

- **WHEN** the bundle lacks a matching recipe ID but its recipe name matches an existing library recipe
- **THEN** `duplicate-recipe-warning` renders directly below `bundle-preview-card` and above the Rating and Notes inputs

#### Scenario: View existing recipe opens recipe detail overlay

- **WHEN** a person activates `View existing recipe` from the duplicate warning banner
- **THEN** the application opens the recipe detail sheet for the existing matching recipe

#### Scenario: Duplicate warning permits import acceptance

- **WHEN** the duplicate warning banner is visible and the person activates `Import recipe`
- **THEN** the client proceeds with submitting the bundle to the import endpoint without blocking

### Requirement: Accept and persist imported recipe bundle into library

Activating "Import recipe" (`accept-bundle-btn`) SHALL submit the bundle with optional importer rating and trimmed notes to POST `/api/recipes/import-bundle`. The API SHALL validate version `1.0`, source `wfs-share`, required content, positive `servings`, max 5 originals, and base64 payloads, reassign colliding IDs, persist `https://schema.org/Recipe` JSON to `{id}/recipe.json`, derive structured portions, flag suspected duplicates under `recipe-quality`, and return `201 Created`.

#### Scenario: Accept valid bundle and persist ready recipe with importing member attribution

- **WHEN** an authorized import request with a valid bundle payload and optional importer rating and notes succeeds
- **THEN** the API persists a new ready recipe entity attributed to the requesting family member with those rating and notes values, writes top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json` without `.publications` staging, saves hero and original images, records a `duplicate` import report if an active library recipe matches, and returns `201 Created` with the created recipe DTO

#### Scenario: Derive scalable portion facts when importing a bundle with servings and quantified ingredients

- **WHEN** an authorized import request supplies `servings: 4` and quantified ingredient lines such as `"200 g pasta"` and `"Salt"`
- **THEN** the persisted recipe stores `servings = 4` (`recipeYield: "4 portions"` in `{id}/recipe.json`), derives structured rational portion amounts for quantified lines while retaining `"Salt"` as unquantified text, and scales immediately in recipe previews and weekly groceries

#### Scenario: Reassign recipe identifier when bundle identifier collides with existing entity

- **WHEN** the bundle's recipe identifier already exists in the database
- **THEN** the API generates a new unique identifier for the imported recipe, persists it without overwriting the existing entity, and flags the new recipe with a `duplicate` import report when the existing entity is ready and non-deleted

#### Scenario: Restore optional notes and rating into newly persisted entity

- **WHEN** a valid bundle request supplies notes and a rating (either entered by the importer or preserved in the bundle)
- **THEN** the newly created recipe entity persists those notes and rating values in the database and metadata store

#### Scenario: Reject bundle with unsupported version

- **WHEN** an import request supplies a version string other than `1.0`
- **THEN** the API returns `400 Bad Request` indicating the bundle version is unsupported

#### Scenario: Reject bundle with malformed payload or invalid image base64

- **WHEN** an import request supplies empty ingredients, empty instructions, non-positive servings, more than five original images, or non-base64 image strings
- **THEN** the API returns `400 Bad Request` with an error message describing the violation

### Requirement: Navigate directly to Home and notify upon bundle import acceptance

When `POST /api/recipes/import-bundle` succeeds (`201 Created`), the client SHALL clear the staged bundle draft, push a completion toast notification (displaying `Possible duplicate · Tap to review` when the returned recipe carries a `duplicate` import issue), and navigate directly to `/home` without displaying an intermediate `Done` confirmation screen. If the import request fails, the client SHALL display an inline Hearth error alert and retain the review card and importer metadata.

#### Scenario: Accepted bundle import navigates directly to Home with completion toast

- **WHEN** the bundle import API returns `201 Created` with the imported recipe DTO
- **THEN** the client clears the staged bundle draft, queues a completion toast for the imported recipe (with duplicate-review copy when `importIssue.reasons` contains `duplicate`), and navigates directly to `/home`

#### Scenario: Present inline error feedback upon import API failure

- **WHEN** the bundle import API request fails
- **THEN** the view displays an inline Hearth error alert (`role="alert"`) and retains the preview card, selected rating, and entered notes for retry or cancellation

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

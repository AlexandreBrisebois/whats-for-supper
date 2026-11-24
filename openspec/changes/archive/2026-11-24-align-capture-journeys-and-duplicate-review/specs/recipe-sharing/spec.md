# Spec Delta

## ADDED Requirements

### Requirement: Navigate directly to Home and notify upon bundle import acceptance

When `POST /api/recipes/import-bundle` succeeds (`201 Created`), the client SHALL clear the staged bundle draft, push a completion toast notification (displaying `Possible duplicate · Tap to review` when the returned recipe carries a `duplicate` import issue), and navigate directly to `/home` without displaying an intermediate `Done` confirmation screen. If the import request fails, the client SHALL display an inline Hearth error alert and retain the review card and importer metadata.

#### Scenario: Accepted bundle import navigates directly to Home with completion toast

- **WHEN** the bundle import API returns `201 Created` with the imported recipe DTO
- **THEN** the client clears the staged bundle draft, queues a completion toast for the imported recipe (with duplicate-review copy when `importIssue.reasons` contains `duplicate`), and navigates directly to `/home`

#### Scenario: Present inline error feedback upon import API failure

- **WHEN** the bundle import API request fails
- **THEN** the view displays an inline Hearth error alert (`role="alert"`) and retains the preview card, selected rating, and entered notes for retry or cancellation

## MODIFIED Requirements

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

Upon successful client parsing, the capture view SHALL display a hero-led bundle review card (`bundle-preview-card`) presenting the generous hero image banner (when supplied), recipe name, filename and original photo count metadata, and a `>= 48 CSS px` inline disclosure (`Preview steps` / `Hide preview` with `aria-expanded`) that is collapsed by default and expands inline to show ingredients plus structured instruction sections styled with Garden (`text-garden-ink`) section headings and sage numbered step badges (`bg-sage-50 border-garden-line`). The card SHALL omit `Original` or `Synthesized` badges. Below the card (and below any duplicate advisory), the screen SHALL render editable importer appreciation rating (`Dislike` / `Like` / `Love`) and optional preparation notes (initialized from bundle values when present, or unrated/empty for privacy-scrubbed shares), a single primary `Import recipe` CTA, and the top-right `48 × 48 CSS px` Cancel (`×`) control without a secondary bottom Cancel button.

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

Activating `Import recipe` (`accept-bundle-btn`) SHALL submit the bundle (carrying the importing member's selected appreciation rating and trimmed nonblank notes, or null when unrated/blank) to `POST /api/recipes/import-bundle`. The API SHALL validate bundle version `1.0`, source `wfs-share`, non-empty required content, max 5 original images, and base64 payloads, assign a new identifier upon collision, persist the entity with stored readiness true and importing member attribution, save hero and original images, evaluate suspected library duplicates under `recipe-quality` rules (creating a `Reported` `duplicate` import report when an active ready recipe matches), and return `201 Created` with the created recipe DTO (including `importIssue` when flagged).

#### Scenario: Accept valid bundle and persist ready recipe with importing member attribution

- **WHEN** an authorized import request with a valid bundle payload and optional importer rating and notes succeeds
- **THEN** the API persists a new ready recipe entity attributed to the requesting family member with those rating and notes values, saves hero and original images, records a `duplicate` import report if an active library recipe matches, and returns `201 Created` with the created recipe DTO

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

- **WHEN** an import request supplies empty ingredients, empty instructions, more than five original images, or non-base64 image strings
- **THEN** the API returns `400 Bad Request` with an error message describing the violation

## REMOVED Requirements

### Requirement: Present import success screen and navigate home

**Reason**: Retires the intermediate `bundle-import-success` Done gate so shared `.txt` imports follow the same immediate Save-and-Return-Home behavior as all other capture paths.
**Migration**: Use `Navigate directly to Home and notify upon bundle import acceptance`.

# Spec Delta

## MODIFIED Requirements

### Requirement: Generate privacy-scrubbed portable export bundle

Authorized GET /api/recipes/{id}/share with household access and member context SHALL return portable version 1.0 with source wfs-share. It SHALL preserve core text, structured instructions and up to five original images, deriving ingredient strings from current canonical text. Ratings/notes SHALL be null; internal entity IDs and attribution SHALL be omitted. This text-only share SHALL NOT claim full-fidelity quantity, basis or evidence preservation.

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

#### Scenario: Export current canonical text without private repair state
- **WHEN** a canonical recipe with accepted corrections and retained private source or human-protection evidence is shared
- **THEN** version 1.0 contains the saved canonical ingredient strings in order without private repair state or local ingredient identities
- **AND** the portable share is not represented as a version-2 backup or a full-fidelity quantity transfer

### Requirement: Accept and persist imported recipe bundle into library

Import recipe SHALL POST the bundle to /api/recipes/import-bundle. The API SHALL validate version 1.0, source wfs-share, required content, at most five originals and base64 payloads; assign a new recipe ID on collision; persist readiness and importing member attribution; save media and return 201. Ingredient strings SHALL initialize canonical lines with new local identities, without inventing missing structured quantity or serving-basis evidence.

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

#### Scenario: Import text without structured quantities
- **WHEN** a valid version-1.0 share contains ingredient strings but no trustworthy structured quantity or basis facts
- **THEN** import preserves their exact text and order using new local line identities and represents missing facts as unknown
- **AND** it does not parse text into asserted amounts, inherit exporting-household human protection or claim verified source evidence

#### Scenario: Legitimate unquantified imported content
- **WHEN** imported text includes an ingredient without a numeric amount
- **THEN** that missing number alone does not flag the recipe for correction or prevent its existing ready import behavior

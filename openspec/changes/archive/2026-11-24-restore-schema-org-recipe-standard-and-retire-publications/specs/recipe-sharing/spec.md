# Spec Delta

## MODIFIED Requirements

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

### Requirement: Accept and persist imported recipe bundle into library

Activating "Import recipe" (`accept-bundle-btn`) SHALL submit the bundle to POST `/api/recipes/import-bundle`. The API SHALL validate bundle version 1.0, source `wfs-share`, non-empty required content, positive `servings` when supplied, max 5 original images, and base64 payloads. The API SHALL assign a new identifier upon collision, persist top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json` without `.publications` staging, derive structured portion-scaling lines and `servings` in the database with stored readiness true and importing member attribution, save hero and original images, and return 201 Created.

#### Scenario: Accept valid bundle and persist ready recipe with importing member attribution

- **WHEN** an authorized import request with a valid bundle payload succeeds
- **THEN** the API persists a new ready recipe entity attributed to the requesting family member, writes top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json`, saves hero and original images, and returns 201 Created with the created recipe DTO

#### Scenario: Derive scalable portion facts when importing a bundle with servings and quantified ingredients

- **WHEN** an authorized import request supplies `servings: 4` and quantified ingredient lines such as `"200 g pasta"` and `"Salt"`
- **THEN** the persisted recipe stores `servings = 4` (`recipeYield: "4 portions"` in `{id}/recipe.json`), derives structured rational portion amounts for quantified lines while retaining `"Salt"` as unquantified text, and scales immediately in recipe previews and weekly groceries

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

- **WHEN** an import request supplies empty ingredients, empty instructions, non-positive servings, more than five original images, or non-base64 image strings
- **THEN** the API returns 400 Bad Request with an error message describing the violation

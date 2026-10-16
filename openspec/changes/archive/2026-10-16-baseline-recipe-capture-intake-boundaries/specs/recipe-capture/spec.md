# Recipe capture intake delta

## MODIFIED Requirements

### Requirement: Select recipe photos from camera or device gallery
The capture screen at `/capture` SHALL provide camera capture and gallery photo selection controls. When camera capture is triggered, the client SHALL request rear environment camera input. When gallery selection is triggered, the client SHALL allow selecting multiple image files.

#### Scenario: Open device camera from capture controls
- **WHEN** a person activates the camera capture control
- **THEN** the client activates image input configured to request the environment camera

#### Scenario: Pick multiple photos from device gallery
- **WHEN** a person activates the gallery photo selection control
- **THEN** the client activates image input configured for multiple file selection

#### Scenario: Drag and drop image files onto capture area
- **WHEN** a person drags and drops image files onto the capture area
- **THEN** the dropped image files are added to the staged photo list

### Requirement: Validate and submit recipe link for acquisition

When Save Recipe is activated with a non-empty link, the client SHALL submit POST `/api/recipes/capture-url` with the trimmed URL, optional notes, and rating. Under the household-identity access and member-binding rules, the API SHALL reject absent bindable member context and return 202 Accepted with the persisted recipe ID after successful initial persistence. Acceptance SHALL NOT certify workflow delivery.

#### Scenario: Submit valid recipe link
- **WHEN** a person activates Save Recipe with a valid URL, optional notes, and selected rating
- **THEN** the client sends POST `/api/recipes/capture-url` with the payload and member header
- **AND** the API creates an initial recipe record, requests acquisition workflow dispatch, and returns 202 Accepted with the recipe ID

#### Scenario: Save disabled when URL is empty
- **WHEN** the link input is empty or contains only whitespace
- **THEN** the Save Recipe button is disabled

#### Scenario: Missing member context rejects submission
- **WHEN** POST `/api/recipes/capture-url` is received without bindable household member context
- **THEN** the API rejects the request with 400 Bad Request

#### Scenario: Invalid URL request metadata
- **WHEN** URL intake omits its required URL, fails URL format validation, or supplies a rating outside 0–3
- **THEN** request validation rejects it before recipe creation

### Requirement: Initial recipe creation and workflow dispatch

Upon accepting a URL capture request, the API SHALL persist an initial recipe entity in the library database and disk store with default placeholder name, provided notes, rating, source URL, and database readiness set to false, then request the background URL import workflow. A caught dispatch failure SHALL leave the persisted recipe pending and still return its intake identity.

#### Scenario: Initial recipe stored with pending readiness
- **WHEN** the API accepts POST `/api/recipes/capture-url`
- **THEN** it creates a database recipe and initial recipe info file with database `IsReady = false`, `ImageCount = 0`, and `IsDiscoverable = false`
- **AND** it requests the background `url-import` workflow with the recipe ID and URL

#### Scenario: Dispatch fails after initial persistence
- **WHEN** the recipe is persisted but its background dispatch throws
- **THEN** the intake identity is still returned and the stored recipe remains pending
- **AND** acceptance alone does not establish an executing workflow

### Requirement: Background web acquisition and recipe extraction

When acquisition executes, the system SHALL attempt to fetch source HTML and obtain recipe context. After successful context processing, it SHALL retain the source URL and acquired HTML. A supplied hero URL SHALL be attempted without making hero download success a prerequisite. Recipe extraction SHALL persist normalized content only after semantic validation succeeds.

#### Scenario: Fetch webpage content and hero image
- **WHEN** the acquisition task executes for a recipe URL
- **THEN** after successful context processing it retains the source URL and HTML, uses a host-based title fallback if no title is returned, and attempts download only when a hero URL is supplied

#### Scenario: Scraping forbidden fallback
- **WHEN** fetching the source URL returns HTTP 403 Forbidden
- **THEN** the acquisition logs a warning and context processing proceeds with empty HTML and uses the URL host as a title fallback when no title is returned

#### Scenario: AI-assisted extraction and semantic validation
- **WHEN** recipe extraction runs against source HTML
- **THEN** it validates candidate structured content for a name, ingredients and usable instruction steps before normalizing and persisting it
- **AND** an invalid final candidate fails extraction rather than certifying successful capture

### Requirement: Stage and validate uploaded recipe photos
The client SHALL stage selected photos for review and enforce image constraints before upload. The client SHALL permit between 1 and 20 images, permit each image up to 20 MiB (20,971,520 bytes), and restrict image MIME types to JPEG, PNG, or WebP.

#### Scenario: Valid images added to staging list
- **WHEN** a person selects valid JPEG, PNG, or WebP images each at or below 20,971,520 bytes
- **THEN** the client stages the images, renders previews, and displays the total photo count

#### Scenario: Unsupported file type rejected
- **WHEN** a person attempts to add an image with an unsupported file format
- **THEN** the client rejects the file and displays an error message indicating supported types are JPEG, PNG, or WebP

#### Scenario: Image exceeding size limit rejected
- **WHEN** a person attempts to add an image exceeding 20,971,520 bytes
- **THEN** the client rejects the file and displays an error message indicating the file exceeds the 20 MB limit

#### Scenario: Photo count limit enforced
- **WHEN** adding photos causes the total staged count to exceed 20 images
- **THEN** the client retains the existing images and displays an error message indicating a maximum of 20 photos

### Requirement: Designate finished dish photo with automatic index management
The client SHALL allow designating at most one staged photo as the finished dish photo and clearing that selection by activating it again. The first staged photo SHALL be automatically designated as the finished dish photo. Removing a photo SHALL update the designation using the remaining staged photos.

#### Scenario: Initial photo automatically designated as finished dish
- **WHEN** the first photo is added to an empty staging list
- **THEN** the client automatically designates that photo as the main dish photo at index 0

#### Scenario: Change finished dish photo designation
- **WHEN** a person selects a different photo from the staged list
- **THEN** the client marks the selected photo as the finished dish photo and clears the previous designation

#### Scenario: Remove designated dish photo defaults to first remaining photo
- **WHEN** a person removes the photo that was currently designated as the finished dish while other staged photos remain
- **THEN** the client removes the photo and defaults the finished dish designation to the first remaining photo at index 0

#### Scenario: Remove photo preceding designated dish photo adjusts index
- **WHEN** a person removes a photo located before the currently designated dish photo
- **THEN** the client removes the photo and decrements the designated dish photo index to maintain the selection

#### Scenario: Clear a dish photo selection
- **WHEN** a person activates the currently selected finished-dish photo again
- **THEN** no staged photo remains designated and photo submission represents that choice as index -1

### Requirement: Validate and submit multipart photo capture
When Save Recipe is activated with staged photos, the client SHALL submit POST `/api/recipes` as multipart form data including the image files, rating, finished dish index, and optional notes. Under household-identity access and member-binding rules, the API SHALL reject absent bindable member context. Successful initial persistence SHALL return 202 Accepted with the persisted recipe ID without certifying workflow delivery.

#### Scenario: Submit valid multipart photo upload
- **WHEN** a person activates Save Recipe with at least one staged image, valid rating, and finished dish index
- **THEN** the client sends POST `/api/recipes` with multipart form data and member header
- **AND** the API creates initial recipe records, requests background import dispatch, and returns 202 Accepted with the recipe ID

#### Scenario: Save disabled without staged photos
- **WHEN** no photos are currently staged in the capture view
- **THEN** the Save Recipe button is not displayed

#### Scenario: Missing member context rejects submission
- **WHEN** POST `/api/recipes` is received without bindable household member context
- **THEN** the API rejects the request with 400 Bad Request

### Requirement: Initial recipe persistence and photo workflow dispatch
Upon accepting a valid multipart photo upload, the API SHALL save image files to the recipe store, persist initial metadata and recipe entity records with database readiness set to false, and request the `recipe-import` workflow after persistence. A caught dispatch failure SHALL retain the pending recipe and return its intake identity.

#### Scenario: Initial photo recipe persisted with pending readiness
- **WHEN** the API accepts POST `/api/recipes`
- **THEN** it stores original images on disk, writes initial recipe metadata, creates a database recipe with `IsReady = false`, and requests the `recipe-import` workflow with the recipe ID

#### Scenario: Dispatch fails after initial persistence
- **WHEN** the recipe is persisted but its background dispatch throws
- **THEN** the intake identity is still returned and the stored recipe remains pending
- **AND** acceptance alone does not establish an executing workflow

## ADDED Requirements

### Requirement: Reject invalid photo intake before storing a recipe

Photo intake SHALL validate the submitting member exists, one to twenty nonempty JPEG, PNG or WebP files of at most 20,971,520 bytes each, rating 0–3, and finished-dish index -1 or a valid image index before saving images or creating the recipe.

#### Scenario: Invalid photo transport or metadata
- **WHEN** photo intake has no files, an empty file, unsupported MIME type, excessive size or count, rating outside 0–3, or out-of-range finished-dish index
- **THEN** validation rejects intake before saving images or creating a recipe

#### Scenario: No finished dish or appreciation selected
- **WHEN** valid photo intake has rating zero and finished-dish index -1
- **THEN** those values alone do not reject intake
- **AND** the client omits blank notes and submits nonblank notes trimmed

#### Scenario: Removed member submits photo intake
- **WHEN** a bound member ID no longer identifies an existing member
- **THEN** photo intake rejects it before saving images or creating a recipe

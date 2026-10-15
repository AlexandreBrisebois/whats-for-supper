# Spec Delta

## ADDED Requirements

### Requirement: Select recipe photos from camera or device gallery
The capture screen at `/capture` SHALL provide camera capture and gallery photo selection controls. When camera capture is triggered, the client SHALL request rear environment camera input. When gallery selection is triggered, the client SHALL allow selecting multiple image files.

#### Scenario: Open device camera from capture controls
- **WHEN** a person activates the camera capture control
- **THEN** the device opens the camera interface configured for environment capture

#### Scenario: Pick multiple photos from device gallery
- **WHEN** a person activates the gallery photo selection control
- **THEN** the device file picker opens allowing selection of multiple image files

#### Scenario: Drag and drop image files onto capture area
- **WHEN** a person drags and drops image files onto the capture area
- **THEN** the dropped image files are added to the staged photo list

### Requirement: Stage and validate uploaded recipe photos
The client SHALL stage selected photos for review and enforce image constraints before upload. The client SHALL permit between 1 and 20 images, require each image to be under 20 MB, and restrict image MIME types to JPEG, PNG, or WebP.

#### Scenario: Valid images added to staging list
- **WHEN** a person selects valid JPEG, PNG, or WebP images each under 20 MB
- **THEN** the client stages the images, renders previews, and displays the total photo count

#### Scenario: Unsupported file type rejected
- **WHEN** a person attempts to add an image with an unsupported file format
- **THEN** the client rejects the file and displays an error message indicating supported types are JPEG, PNG, or WebP

#### Scenario: Image exceeding size limit rejected
- **WHEN** a person attempts to add an image exceeding 20 MB
- **THEN** the client rejects the file and displays an error message indicating the file exceeds the 20 MB limit

#### Scenario: Photo count limit enforced
- **WHEN** adding photos causes the total staged count to exceed 20 images
- **THEN** the client retains the existing images and displays an error message indicating a maximum of 20 photos

### Requirement: Designate finished dish photo with automatic index management
The client SHALL allow designating one staged photo as the finished dish photo. The first staged photo SHALL be automatically designated as the finished dish photo. Removing a photo SHALL update or preserve the designation within valid bounds.

#### Scenario: Initial photo automatically designated as finished dish
- **WHEN** the first photo is added to an empty staging list
- **THEN** the client automatically designates that photo as the main dish photo at index 0

#### Scenario: Change finished dish photo designation
- **WHEN** a person selects a different photo from the staged list
- **THEN** the client marks the selected photo as the finished dish photo and clears the previous designation

#### Scenario: Remove designated dish photo defaults to first remaining photo
- **WHEN** a person removes the photo that was currently designated as the finished dish
- **THEN** the client removes the photo and defaults the finished dish designation to the first remaining photo at index 0

#### Scenario: Remove photo preceding designated dish photo adjusts index
- **WHEN** a person removes a photo located before the currently designated dish photo
- **THEN** the client removes the photo and decrements the designated dish photo index to maintain the selection

### Requirement: Capture appreciation rating and preparation notes
The staged photo review view SHALL provide an appreciation rating selector (1–3: Not for me, It was OK, Loved it!) and an optional multi-line notes textarea.

#### Scenario: Select appreciation rating
- **WHEN** a person selects a rating option
- **THEN** the client records the chosen appreciation level (1 for Dislike, 2 for Like, or 3 for Love)

#### Scenario: Enter optional preparation notes
- **WHEN** a person enters text into the notes input
- **THEN** the client retains the text as captured recipe notes

### Requirement: Validate and submit multipart photo capture
When Save Recipe is activated with staged photos, the client SHALL submit POST `/api/recipes` as multipart form data including the image files, rating, finished dish index, and optional notes. The API SHALL require an authorized household member context and return 202 Accepted with the queued recipe ID.

#### Scenario: Submit valid multipart photo upload
- **WHEN** a person activates Save Recipe with at least one staged image, valid rating, and finished dish index
- **THEN** the client sends POST `/api/recipes` with multipart form data and member header
- **AND** the API creates initial recipe records, dispatches the background import workflow, and returns 202 Accepted with the recipe ID

#### Scenario: Save disabled without staged photos
- **WHEN** no photos are currently staged in the capture view
- **THEN** the Save Recipe button is not displayed

#### Scenario: Missing member context rejects submission
- **WHEN** POST `/api/recipes` is received without a valid household member context
- **THEN** the API rejects the request with 400 Bad Request

### Requirement: Client-side photo upload progress feedback and submission lock
While photo upload is in progress, the client SHALL lock submission controls to prevent duplicate uploads. If uploading exceeds 800 milliseconds, the client SHALL display a photo upload overlay prompting the user to keep the screen open.

#### Scenario: Submission lock prevents duplicate photo uploads
- **WHEN** photo upload is initiated by activating Save Recipe
- **THEN** the save button is disabled with loading status and subsequent activation attempts are ignored

#### Scenario: Delayed upload overlay appears on long transfers
- **WHEN** photo upload takes longer than 800 milliseconds
- **THEN** the client displays an upload overlay stating that photos are being uploaded and requesting the screen remain open

### Requirement: Initial recipe persistence and photo workflow dispatch
Upon accepting a valid multipart photo upload, the API SHALL save image files to the recipe store, persist initial metadata and recipe entity records with readiness set to false, and asynchronously dispatch the `recipe-import` workflow.

#### Scenario: Initial photo recipe persisted with pending readiness
- **WHEN** the API accepts POST `/api/recipes`
- **THEN** it stores original images on disk, writes initial recipe metadata, creates a database recipe with `IsReady = false`, and queues the `recipe-import` workflow with the recipe ID

### Requirement: Multimodal OCR vision recipe extraction and semantic validation
The background `recipe-import` workflow SHALL execute recipe extraction using multimodal AI vision across all staged recipe images, validate semantic completeness, and persist structured recipe data.

#### Scenario: Extract recipe details from staged photos
- **WHEN** the recipe extraction task executes for a photo-based recipe
- **THEN** the agent submits staged image binaries to the multimodal model, parses structured recipe JSON, verifies required fields (name, ingredients, instructions), and saves normalized recipe content

#### Scenario: Refinement triggered on incomplete initial extraction
- **WHEN** initial vision extraction produces JSON missing required ingredients or instructions
- **THEN** the extractor triggers a refinement prompt to complete missing details before finalizing extraction

### Requirement: Finalize photo recipe readiness and broadcast completion
Upon completing recipe extraction and categorization, the `recipe-import` workflow SHALL finalize the recipe state to ready and discoverable, and publish a real-time `recipe_ready` SSE event to the household.

#### Scenario: Transition photo recipe state to ready
- **WHEN** the recipe ready workflow step executes for an extracted photo recipe
- **THEN** the API updates the recipe in database and storage to `IsReady = true` and `IsDiscoverable = true`
- **AND** it publishes a `recipe_ready` SSE event with the recipe ID, name, and hero image path

### Requirement: Persistent failure banner on workflow failure
If the background import workflow fails all retry attempts, the API SHALL publish a `recipe_failed` SSE event. When received for a pending recipe submitted in the current session, the client SHALL display a persistent recovery banner with a retry action.

#### Scenario: Display persistent failure banner on failed capture
- **WHEN** a `recipe_failed` event is received matching a recipe pending from the active session
- **THEN** the client removes the recipe from pending tracking and renders a persistent failure banner with the recipe name and retry button

#### Scenario: Retry failed capture from banner
- **WHEN** a person activates retry on the failure banner
- **THEN** the client calls the capture failure retry endpoint and dismisses the failure notification upon successful queuing

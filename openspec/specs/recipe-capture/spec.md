# Recipe capture Specification

## Purpose

Capture recipes from external web links into the household library. This capability covers link URL entry, validation, background extraction, and initial library readiness.

## Requirements

### Requirement: Enter and review a recipe link at capture entry

The capture screen at `/capture` SHALL offer a web link entry mode and prefill it when opened with a `url` query parameter or text containing an HTTP/HTTPS URL. The review view SHALL display the link URL, appreciation rating options (1–3), and an optional note input.

#### Scenario: Open capture with shared URL parameter
- **WHEN** a person navigates to `/capture` with `url` set to an HTTP or HTTPS link
- **THEN** the screen opens directly in link review mode displaying the link in the URL input

#### Scenario: Extract URL from shared text parameter
- **WHEN** a person navigates to `/capture` with a `text` parameter containing an embedded HTTP or HTTPS link and no `url` parameter
- **THEN** the screen extracts the link and opens in link review mode with the extracted URL

#### Scenario: Manual entry from capture controls
- **WHEN** a person on `/capture` activates the link secondary action
- **THEN** the screen displays the link review form with an empty URL input and enables manual entry

#### Scenario: Return to capture controls
- **WHEN** a person activates Back from the link review form
- **THEN** the screen returns to the primary capture controls and clears the URL review draft

### Requirement: Advisory duplicate warning for existing recipe link

When a link URL is entered in the review form, the client SHALL check for existing household recipes with a matching source URL. If an existing recipe matches, the client SHALL display an advisory banner identifying the recipe by name without blocking saving.

#### Scenario: Existing recipe matching link URL
- **WHEN** the link review form has a trimmed URL that matches an existing non-deleted household recipe's source URL
- **THEN** the form displays an advisory warning banner showing the existing recipe's name and a button to view that recipe

#### Scenario: Unique link URL
- **WHEN** the link review form has a trimmed URL that matches no existing household recipe's source URL
- **THEN** no duplicate advisory warning banner is displayed

### Requirement: Validate and submit recipe link for acquisition

When Save Recipe is activated with a non-empty link, the client SHALL submit POST `/api/recipes/capture-url` with the trimmed URL, optional notes, and rating. The API SHALL require an authorized household member context and return 202 Accepted with the queued recipe ID.

#### Scenario: Submit valid recipe link
- **WHEN** a person activates Save Recipe with a valid URL, optional notes, and selected rating
- **THEN** the client sends POST `/api/recipes/capture-url` with the payload and member header
- **AND** the API creates an initial recipe record, triggers the acquisition workflow, and returns 202 Accepted with the recipe ID

#### Scenario: Save disabled when URL is empty
- **WHEN** the link input is empty or contains only whitespace
- **THEN** the Save Recipe button is disabled

#### Scenario: Missing member context rejects submission
- **WHEN** POST `/api/recipes/capture-url` is received without a valid household member context
- **THEN** the API rejects the request with 400 Bad Request

### Requirement: Initial recipe creation and workflow dispatch

Upon accepting a URL capture request, the API SHALL persist an initial recipe entity in the library database and disk store with default placeholder name, provided notes, rating, source URL, and readiness set to false, then dispatch the background URL import workflow.

#### Scenario: Initial recipe stored with pending readiness
- **WHEN** the API accepts POST `/api/recipes/capture-url`
- **THEN** it creates a database recipe and initial recipe info file with `IsReady = false`, `ImageCount = 0`, and `IsDiscoverable = false`
- **AND** it triggers the background `url-import` workflow with the recipe ID and URL

### Requirement: Background web acquisition and recipe extraction

The background acquisition workflow SHALL fetch HTML from the source URL, extract recipe context and hero image, execute AI-assisted recipe extraction, and save normalized recipe artifacts.

#### Scenario: Fetch webpage content and hero image
- **WHEN** the acquisition task executes for a recipe URL
- **THEN** it fetches the webpage HTML, extracts title and hero image URL, downloads the hero image, and saves `original/content.html`

#### Scenario: Scraping forbidden fallback
- **WHEN** fetching the source URL returns HTTP 403 Forbidden
- **THEN** the acquisition logs a warning and extraction proceeds with limited metadata using the URL host as a title fallback

#### Scenario: AI-assisted extraction and semantic validation
- **WHEN** recipe extraction runs against source HTML
- **THEN** it produces structured recipe JSON requiring a name, ingredients, and instruction steps, normalizing and persisting the extracted recipe

### Requirement: Finalize recipe readiness and broadcast completion

Upon successful completion of extraction and categorization tasks, the workflow SHALL finalize the recipe state to ready and discoverable, and publish a real-time recipe ready event to the household.

#### Scenario: State transition to ready
- **WHEN** the recipe ready workflow step executes for an extracted recipe
- **THEN** the API updates the recipe in database and storage to `IsReady = true` and `IsDiscoverable = true`
- **AND** it publishes a `recipe_ready` SSE event with the recipe ID, name, and hero image path

### Requirement: Track background capture progress and auto-redirect

Upon successful submission, the client SHALL display a queued progress screen and add the recipe ID to pending tracking. The queued screen SHALL display an auto-redirect countdown to Home unless a ready notification arrives.

#### Scenario: Display queued progress screen
- **WHEN** URL capture submission succeeds with a returned recipe ID
- **THEN** the screen displays "Recipe queued" with subtext explaining that the link is being fetched
- **AND** it begins a 10-second countdown to redirect to `/home`

#### Scenario: Complete countdown redirects to Home
- **WHEN** 10 seconds elapse on the queued screen without user intervention or ready event
- **THEN** the client navigates to `/home`

#### Scenario: Done button manual dismissal
- **WHEN** a person activates the Done button on the queued screen
- **THEN** the client immediately navigates to `/home`

### Requirement: Inline transition to ready status upon completion

If the recipe ready notification is received while the user is still on the capture screen, the client SHALL replace the queued progress screen with an inline ready presentation showing the recipe name, an Add to this week action, and a Done action.

#### Scenario: Ready notification received during active session
- **WHEN** a `recipe_ready` event matching the pending recipe ID is received while on the capture screen
- **THEN** the screen transitions to "{Name} is ready!" with options to add to planner or finish
- **AND** the auto-redirect countdown is cancelled

### Requirement: Display error feedback on capture failure

If link submission fails due to network error, server rejection, or malformed response, the client SHALL display an error message and retain the form state to permit retry.

#### Scenario: API rejection or network error
- **WHEN** POST `/api/recipes/capture-url` fails or returns a non-2xx status
- **THEN** the form displays an inline error message and remains in review mode with the entered URL retained

#### Scenario: Missing recipe ID in response
- **WHEN** POST `/api/recipes/capture-url` returns 202 without a valid recipe ID
- **THEN** the form displays an error message indicating capture failure

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

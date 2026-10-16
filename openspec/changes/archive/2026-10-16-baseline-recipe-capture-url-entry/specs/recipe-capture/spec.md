# Spec Delta

## Purpose

Capture recipes from external web links into the household library. This capability covers link URL entry, validation, background extraction, and initial library readiness.

## ADDED Requirements

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

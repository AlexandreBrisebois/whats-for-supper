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

### Requirement: Enter and cancel a description capture draft

The capture screen SHALL offer Describe a recipe with a required recipe name and optional free-text description. Opening `/capture?mode=describe` SHALL show this form directly. Cancel SHALL return to capture controls and clear the description draft and its local errors.

#### Scenario: Open description from capture controls
- **WHEN** a person activates Describe a recipe on `/capture`
- **THEN** the description form replaces the capture controls with name and optional description inputs

#### Scenario: Open description mode directly
- **WHEN** a person opens `/capture?mode=describe` without GOTO intent
- **THEN** the description form is immediately available

#### Scenario: Cancel a draft
- **WHEN** a person activates Cancel after entering name and description
- **THEN** capture controls return and the name, description, duplicate warning and submission error are cleared

### Requirement: Advise about an existing recipe name during description entry

The description form SHALL look up existing ready library recipes by the trimmed name and display an advisory warning when a match is returned. The warning SHALL offer View existing recipe without blocking synthesis.

#### Scenario: Matching name found
- **WHEN** a lookup returns a ready library recipe matching the entered name without regard to case
- **THEN** the form displays the existing-name warning and View existing recipe action
- **AND** a non-empty name remains eligible for submission

#### Scenario: View matching recipe
- **WHEN** a person activates View existing recipe in the description warning
- **THEN** the matching recipe opens for viewing

### Requirement: Validate and submit a description capture

The client SHALL require a name containing non-whitespace text, trim name and description, and submit the name and optional description to POST `/api/recipes/describe`. If description is blank, the client SHALL send the trimmed name as description. The API SHALL require member context and a name, while permitting omitted description.

#### Scenario: Blank name blocks synthesis
- **WHEN** the name is empty or contains only whitespace
- **THEN** Synthesize Recipe is disabled and no description request is sent through that action

#### Scenario: Submit additional recipe details
- **WHEN** a person submits a non-blank name and description
- **THEN** the client sends both trimmed values and disables the synthesis button while awaiting the response

#### Scenario: Submit only a name
- **WHEN** a person submits a non-blank name with no non-whitespace description
- **THEN** the client sends the trimmed name in both name and description fields

#### Scenario: API accepts omitted description
- **WHEN** a request supplies a name and member context but omits description
- **THEN** description omission alone does not reject initial recipe creation

#### Scenario: Missing required intake values
- **WHEN** a description request omits its name or has no bindable member context
- **THEN** the API rejects the request

### Requirement: Create an initial recipe from description intake

Description intake SHALL create a recipe carrying the supplied name, optional description and submitting member, initially not ready or discoverable and without uploaded photos. A successful intake response SHALL identify that recipe. Background generation SHALL be requested after initial persistence; intake success SHALL NOT certify workflow delivery or readiness.

#### Scenario: Receive the initial recipe identity
- **WHEN** description intake succeeds
- **THEN** the response identifies the newly stored recipe with its supplied name
- **AND** the initial recipe is not ready or discoverable and has no uploaded photos

#### Scenario: Background dispatch fails after creation
- **WHEN** initial description persistence succeeds but background dispatch throws
- **THEN** intake still returns the initial recipe and it remains pending

### Requirement: Generate recipe content from the submitted description

When description synthesis executes, the system SHALL request recipe content from the submitted description and persist the resulting recipe content and synthesized identity. If the response cannot be parsed or has no usable recipe name, synthesis SHALL retain a minimal recipe named from the submitted description with empty ingredients and instructions.

#### Scenario: Persist generated recipe content
- **WHEN** synthesis receives parseable recipe content with a usable name
- **THEN** it persists that content and identifies the recipe as synthesized for subsequent processing

#### Scenario: Unusable synthesis response
- **WHEN** synthesis receives malformed recipe JSON or content with no usable name
- **THEN** it persists a minimal recipe named from the submitted description with empty ingredients and instructions
- **AND** this fallback alone does not establish a complete cookable recipe

### Requirement: Show description synthesis waiting state

After receiving a recipe ID for ordinary description capture, the client SHALL track it as pending and show Synthesizing… with feedback that the recipe is being built. The existing background capture countdown and inline completion behavior SHALL apply to this waiting state.

#### Scenario: Intake returns a recipe ID
- **WHEN** description submission returns an identified recipe
- **THEN** the client displays Synthesizing… and begins the existing ten-second Home countdown with a Done action
- **AND** the recipe is tracked for session completion notifications

#### Scenario: Ready event resolves description waiting state
- **WHEN** a ready notification for that pending recipe reaches the active capture screen
- **THEN** the existing inline ready presentation replaces the waiting state and cancels its countdown

### Requirement: Retain a description draft after submission failure

If description submission fails or returns no recipe ID, the client SHALL display an error, retain the entered name and description, and release the submission button so the person can retry intake.

#### Scenario: Request rejects
- **WHEN** description submission raises a network or server error
- **THEN** the form retains the draft, displays an error and permits another submission

#### Scenario: Response lacks identity
- **WHEN** the submission response has no recipe ID
- **THEN** the form displays No recipe ID returned. and retains the draft for another submission

### Requirement: Gate PDF acquisition by effective member eligibility

PDF acquisition SHALL require household authentication, an established member and effective PDF preview enablement. Off, absent or invalid mode SHALL disable acquisition; opt-in SHALL require that member's enabled preference; on SHALL enable it. The ordinary capture picker SHALL offer PDF only after the selected member's flags resolve enabled without error, and SHALL exclude PDF in Family GOTO.

#### Scenario: Enabled member selects the PDF entry
- **WHEN** the current established member has effective PDF preview enablement outside Family GOTO
- **THEN** Import recipe file includes PDF among its selectable formats

#### Scenario: Disabled or unresolved picker eligibility
- **WHEN** flags are loading, errored, belong to another member or resolve disabled
- **THEN** the picker does not advertise PDF
- **AND** Family GOTO does not advertise PDF regardless of flag enablement

#### Scenario: API rechecks acquisition eligibility
- **WHEN** PDF intake is requested without household authentication, without an established member, or with that member's PDF preview disabled
- **THEN** the API rejects it with 401, 400 or 409 respectively
- **AND** disabled-preview rejection creates no pending recipe or import workflow

### Requirement: Validate PDF file selection before confirmation

The ordinary picker SHALL accept a nonempty file of at most 20 MiB (20,971,520 bytes) only when its filename ends in .pdf and its MIME type is application/pdf, without regard to case. Selection validation SHALL check transport properties without parsing the document.

#### Scenario: Valid transport properties
- **WHEN** an eligible person selects a nonempty .pdf file with application/pdf type within the byte limit
- **THEN** the client opens PDF confirmation even if the document content has not yet been validated

#### Scenario: Invalid file selection
- **WHEN** a PDF candidate has incompatible extension or MIME type, is empty, or exceeds 20,971,520 bytes
- **THEN** the picker displays a file or size error and does not stage it for PDF confirmation

### Requirement: Review PDF identity and optional metadata before saving

PDF confirmation SHALL show the filename and guidance to choose one recipe in up to ten pages and 20 MiB. It SHALL offer the existing appreciation options and optional notes, initially unrated, and require explicit Save Recipe. It SHALL omit finished-dish photo selection and a Cancel action.

#### Scenario: Review selected PDF
- **WHEN** a PDF selection reaches enabled confirmation
- **THEN** the person sees the filename, guidance, appreciation choices and optional notes before any intake submission
- **AND** no finished-dish photo selector or Cancel button is presented

#### Scenario: Save metadata
- **WHEN** a person saves with an appreciation selection and notes
- **THEN** the client submits that rating and trimmed nonblank notes with the file
- **AND** an untouched rating is submitted as zero and blank notes are omitted

### Requirement: Resolve PDF draft eligibility and discard interrupted drafts

A staged PDF SHALL wait for the selected member's flag snapshot before permitting confirmation. Disabled or errored eligibility SHALL show that the file has not been added and offer Choose another way, with Preview features when mode is opt-in. The unsaved PDF draft SHALL be discarded on page departure, hidden visibility, member change, changed capture query or transition to Family GOTO.

#### Scenario: Picker focus refresh is pending
- **WHEN** a file is selected while the same member's flag refresh is loading
- **THEN** the panel shows Loading preview features before resolving to confirmation or unavailable feedback

#### Scenario: Staged selection is disabled
- **WHEN** a staged file's resolved eligibility is disabled or errored
- **THEN** the panel withholds Save and explains that the file has not been added
- **AND** Choose another way clears the selection and returns to capture controls

#### Scenario: Draft interrupted or ownership changes
- **WHEN** the page leaves, becomes hidden, changes member or capture query, or enters Family GOTO
- **THEN** the owned unsaved selection and confirmation metadata are discarded
- **AND** returning does not restore that draft

#### Scenario: Shared entry cannot be claimed
- **WHEN** capture with a selected member outside Family GOTO receives a staged-share token that is expired, unavailable or already consumed
- **THEN** capture asks the person to choose or share the PDF again without creating an import

### Requirement: Submit a single PDF with bounded multipart metadata

Save SHALL submit one PDF to POST /api/recipes/capture-pdf with the submitting member and optional rating and notes. The API SHALL accept exactly one file field named file, integer rating 0–3 (default zero), and notes; blank notes SHALL become absent. Empty files, invalid multipart or metadata SHALL return 400, oversized files 413, and wrong extension, MIME or transport type 415 before creating an import.

#### Scenario: Accepted PDF intake
- **WHEN** an eligible request supplies one valid PDF transport file and allowed metadata
- **THEN** the API responds 202 with data.id identifying the pending recipe

#### Scenario: Invalid multipart or metadata
- **WHEN** intake has missing, extra or wrongly named files, repeated or unknown metadata fields, or a noninteger or out-of-range rating
- **THEN** the API rejects it with 400 and does not create a pending recipe or workflow

#### Scenario: File size and type rejected by API
- **WHEN** intake exceeds the byte limit or supplies an incompatible file extension, MIME or transport type
- **THEN** the API returns 413 for the byte limit or 415 for the type mismatch without creating an import

### Requirement: Lock PDF upload and retain foreground retry feedback

While Save is awaiting PDF intake, the client SHALL prevent repeated submission, disable metadata controls and show Preparing your PDF with interruption guidance. A rejection, network failure or unusable response identity SHALL display an error and release the lock, retaining the foreground selection and metadata unless its lifecycle has discarded them. Unrecognized HTTP failures or a missing or invalid response identity SHALL warn that resubmission can create a duplicate.

#### Scenario: Repeated Save during upload
- **WHEN** Save is activated repeatedly before its intake attempt finishes
- **THEN** only one request is sent and metadata controls remain disabled during that attempt

#### Scenario: Intake rejection permits another attempt
- **WHEN** intake fails while the same foreground draft remains active
- **THEN** the error is displayed and the selected file, rating and notes remain available for another Save

#### Scenario: Response identity cannot be trusted
- **WHEN** a successful HTTP response lacks a usable recipe UUID
- **THEN** the client displays uncertain-upload feedback including the duplicate warning and does not navigate as a confirmed intake

### Requirement: Persist a pending PDF before acknowledging intake

Successful PDF intake SHALL retain the unchanged source bytes and store a pending recipe with the submitting member, rating and trimmed notes, no original pages, and readiness and discoverability false. Background import SHALL be requested after initial persistence. A 202 identity SHALL establish persistence, not successful dispatch, conversion, extraction or readiness.

#### Scenario: Initial PDF is pending
- **WHEN** PDF intake returns 202
- **THEN** unchanged source bytes and the pending recipe are stored with zero original pages and no finished-dish photo designation
- **AND** its member, rating and notes are retained

#### Scenario: Import dispatch throws after persistence
- **WHEN** initial persistence succeeds but the background import request throws
- **THEN** intake still returns the stored identity and the recipe remains pending

### Requirement: Prepare all supported PDF pages for existing recipe extraction

Background PDF preparation SHALL reject corrupt or encrypted documents and documents outside one to ten pages, without truncating them. Successful preparation SHALL expose every page in order to existing multimodal extraction and semantic validation, retain the source PDF, and preserve rating and notes. Preparation alone SHALL leave the recipe pending; a retry SHALL reuse complete already-published pages.

#### Scenario: Prepare a supported document
- **WHEN** preparation successfully renders a valid unencrypted PDF of one to ten pages within supported render limits
- **THEN** all pages become ordered recipe originals for the existing extraction journey
- **AND** source bytes, rating and notes remain retained while readiness is still pending

#### Scenario: Unsupported or unrenderable document
- **WHEN** conversion encounters corrupt, encrypted, over-ten-page or otherwise unrenderable content
- **THEN** that preparation attempt fails without advancing extraction with a truncated document
- **AND** the source remains retained for existing failure recovery

#### Scenario: Retry after complete page preparation
- **WHEN** preparation is retried with all previously published pages still present
- **THEN** it reuses those pages without appending another set or rerendering the document

### Requirement: Return Home after PDF acceptance and reuse completion feedback

After receiving a usable PDF intake identity, the client SHALL add it to session pending tracking. If the submitting draft and member still own the active screen, it SHALL clear the draft and navigate directly to Home. Subsequent matching ready or failed notifications SHALL use existing capture completion and persistent failure feedback. Successful finalization SHALL also record readiness for the retained PDF.

#### Scenario: Intake accepted on the active draft
- **WHEN** intake returns a usable identity while the submitting draft and member remain current
- **THEN** the client tracks that recipe and navigates directly to Home without waiting for conversion

#### Scenario: Response arrives after draft replacement
- **WHEN** an accepted intake response arrives after its draft was replaced or member changed
- **THEN** it does not clear the newer draft or navigate it to Home

#### Scenario: Successful background finalization
- **WHEN** the existing ready step successfully finalizes the imported PDF recipe
- **THEN** the recipe becomes ready and discoverable and its retained-PDF metadata records readiness
- **AND** a matching session ready event uses existing completion feedback

### Requirement: Access PDF originals through rendered pages

A completed PDF recipe SHALL expose its ordered rendered pages through the existing recipe-library View Original controls and original-image endpoint. The retained source PDF SHALL remain separate from those image responses. Disabling new PDF acquisition SHALL NOT remove completed recipe access or gate its original-page viewing.

#### Scenario: View completed PDF originals
- **WHEN** a person opens View Original for a completed PDF recipe with rendered pages
- **THEN** the existing photo viewer displays and navigates its ordered page images
- **AND** those image requests do not download the retained PDF file

#### Scenario: Acquisition subsequently disabled
- **WHEN** PDF preview acquisition is disabled after a PDF recipe completes
- **THEN** ordinary library and rendered-original access remain available

### Requirement: Recover eligible failed PDF imports using retained work

A paused PDF import with a failed task SHALL appear in existing Settings failed captures with Retry and Clear actions. Retry SHALL queue the failed task without rechecking new-acquisition eligibility and SHALL NOT certify successful recovery. Clearing an eligible unfinished conversion failure SHALL remove its failure entry and queue residue cleanup; source removal SHALL occur when cleanup executes while the residue remains eligible.

#### Scenario: Retry failed preparation with preview off
- **WHEN** a PDF import has a paused failed conversion and a person retries it after PDF acquisition is disabled
- **THEN** the failed task is queued against its retained source without another upload or flag gate
- **AND** an invalid source can fail again

#### Scenario: Clear a failed conversion import
- **WHEN** a person confirms Clear for a paused failed PDF conversion with no usable named recipe content
- **THEN** the failure entry is removed and aggregate cleanup is queued
- **AND** executing that cleanup removes the retained PDF and any page residue

#### Scenario: Settings recovery request fails
- **WHEN** Retry or Clear fails in the Settings failure list
- **THEN** the row remains and displays retry error feedback

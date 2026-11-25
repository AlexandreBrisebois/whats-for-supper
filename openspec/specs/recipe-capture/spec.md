# Recipe capture Specification

## Purpose

Capture recipes from photos, web links, descriptions and PDFs into the household library. This capability covers source entry and shared-link review, validation and metadata, intake acceptance, background extraction, initial readiness feedback, duplicate advice and configured processing-language requests.

## Requirements

### Requirement: Enter and review a recipe link at capture entry

The capture screen at `/capture` SHALL offer a web link entry mode and prefill it when opened with a `url` query parameter or text containing an HTTP/HTTPS URL. The review view SHALL display the link URL, appreciation rating options (1–3), an optional note input, and the top-right Cancel (`×`) control without a separate Back button.

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

- **WHEN** a person activates the top-right Cancel (`×`) control from the link review form
- **THEN** the URL review draft is discarded and navigation returns to `/home`

### Requirement: Advisory duplicate warning for existing recipe link

When a link URL is entered in the review form, the client SHALL check for existing household recipes with a matching source URL. If an existing recipe matches, the client SHALL display an advisory banner directly below the link URL input (and above appreciation rating and notes) identifying the recipe by name without blocking saving or shifting the URL input while typing.

#### Scenario: Existing recipe matching link URL

- **WHEN** the link review form has a trimmed URL that matches an existing non-deleted household recipe's source URL
- **THEN** the form displays an advisory warning banner directly below the link URL input showing the existing recipe's name and a button to view that recipe

#### Scenario: Unique link URL

- **WHEN** the link review form has a trimmed URL that matches no existing household recipe's source URL
- **THEN** no duplicate advisory warning banner is displayed

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

### Requirement: Finalize recipe readiness and broadcast completion

When finalization executes for an existing recipe that is not already ready and discoverable, the system SHALL set those database facts, update its timestamp, evaluate suspected library duplicates under `recipe-quality` rules before publishing completion, and then attempt household ready-event publication including whether the finalized recipe is flagged as a suspected duplicate. Ordinary finalization SHALL NOT require writing readiness into a non-PDF metadata file.

#### Scenario: State transition to ready

- **WHEN** the recipe ready step successfully finalizes an existing recipe not already ready and discoverable
- **THEN** it persists database readiness and discoverability, records a `duplicate` import report if an active library recipe matches and no report exists yet, and attempts publication of recipe identity, name, optional hero path, and suspected-duplicate status
- **AND** delivery follows the household-live-updates rules rather than being certified by the database save

#### Scenario: Missing or already finalized recipe

- **WHEN** finalization is invoked for a missing recipe or one already ready and discoverable
- **THEN** it does not publish a new ready event
- **AND** the existing retained-PDF readiness behavior still applies to an already finalized PDF

### Requirement: Return directly to Home after accepted capture intake

When photo, web link, or description capture returns a valid recipe identity (`202` or `201`), the client SHALL add that recipe to active-session pending tracking and navigate directly to `/home` without displaying an intermediate queued countdown or inline ready screen on `/capture`. In Family GOTO capture, the client SHALL persist the pending GOTO entry before navigating to `/home`.

#### Scenario: Accepted photo, link, or description intake navigates immediately to Home

- **WHEN** photo, link, or description submission succeeds and returns a valid recipe ID
- **THEN** the client records the recipe ID in active-session pending tracking and navigates directly to `/home`
- **AND** no ten-second countdown or intermediate Done screen is displayed on `/capture`

#### Scenario: Family GOTO intake records pending GOTO item before returning Home

- **WHEN** photo, link, or description submission succeeds with Family GOTO intent and returns a valid recipe ID
- **THEN** the client saves the pending GOTO item referencing that recipe ID, records pending tracking, and navigates directly to `/home`

### Requirement: Present ambient in-flight capture status on Home

While household captures are preparing, indexing, enriching, or failed, `/home` SHALL show a tappable Capture Activity Bar beneath `QuickCaptureTrigger` (`Plus` icon, `Snap, paste, upload, or describe`, no `+ Add another`), leaving `/capture` untouched. Without failures it SHALL show a progress bar (or Garden `Searchable · Still enriching`); with failures it SHALL show a 2-line Hearth bar without a progress bar, opening the Capture Activity Sheet on tap.

#### Scenario: Pending background capture displays ambient Home ribbon

- **WHEN** a person views `/home` while 1 or N parallel captures are preparing or indexing with no failures
- **THEN** Home renders the Capture Activity Bar directly beneath `QuickCaptureTrigger` with no `+ Add another` button, displaying the single item or parallel summary with a Hearth progress bar (`motion-reduce:animate-none` when `prefers-reduced-motion: reduce` is active)
- **AND** activating the bar opens the Capture Activity Sheet listing each parallel capture individually and making `Searchable` items tappable (`ChevronRight`) to open `/recipes?open=<recipeId>` (or `&reviewDuplicate=1` if suspected duplicate)

#### Scenario: Failure prioritizes compact 2-line Hearth alert on Home

- **WHEN** at least one capture failure exists alongside or without parallel active imports
- **THEN** Home renders a compact 2-line Hearth recovery bar (`bg-white border-hearth-line`, `bg-terracotta-50` alert icon well, `text-hearth-ink` heading, no progress bar) that stays visually lighter than `QuickCaptureTrigger` above `TonightMenuCard`, and tapping it opens the Capture Activity Sheet

#### Scenario: Ribbon disappears once pending captures settle

- **WHEN** no capture workflows remain active, indexing, enriching, enrichment-paused, or failed
- **THEN** the Capture Activity Bar is removed from `/home`

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
- **THEN** the client activates image input configured to request the environment camera

#### Scenario: Pick multiple photos from device gallery

- **WHEN** a person activates the gallery photo selection control
- **THEN** the client activates image input configured for multiple file selection

#### Scenario: Drag and drop image files onto capture area

- **WHEN** a person drags and drops image files onto the capture area
- **THEN** the dropped image files are added to the staged photo list

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

### Requirement: Capture appreciation rating and preparation notes

Capture review screens (photo, URL, PDF, and `.txt` bundle) SHALL present the shared localized appreciation options (`👎 Dislike`, `👍 Like`, `❤️ Love`) and optional multi-line notes with `>= 48 × 48 CSS px` targets, borderless-on-cream unselected choices, a raised white (`shadow-md`) selected surface without corner checkmarks (plus a `1.5px` ink border in High Contrast mode), `aria-pressed`, and visible keyboard focus.

#### Scenario: Select appreciation rating

- **WHEN** a person selects a rating option during photo, URL, PDF, or shared `.txt` capture review
- **THEN** the client records the chosen appreciation level (`1`, `2`, or `3`), or clears it to `0` when activated again
- **AND** the selected option exposes `aria-pressed="true"`, semantic Hearth/Garden/Ink text polarity, a raised white surface without a checkmark icon (with a `1.5px` high-contrast border when High Contrast is active), and a `>= 48 × 48 CSS px` button surface

#### Scenario: Enter optional preparation notes

- **WHEN** a person enters text into the notes input or activates its visible label
- **THEN** the label focuses its associated textarea via `htmlFor`/`id` and displays a clear visible keyboard focus indicator
- **AND** the client retains the text as captured recipe notes

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

### Requirement: Client-side photo upload progress feedback and submission lock

While photo upload is in progress, the client SHALL lock submission controls to prevent duplicate uploads without rendering idle upload-duration hints prior to submission. If uploading exceeds 800 milliseconds, the client SHALL display a photo upload overlay with a Hearth pulsing ring around the photo icon and calm localized copy (`Saving your photos…` and `We’ll take you home as soon as they’re saved.`), without multi-dot progress indicators or em-dashes.

#### Scenario: Submission lock prevents duplicate photo uploads

- **WHEN** photo upload is initiated by activating Save Recipe
- **THEN** the save button is disabled while awaiting intake and subsequent activation attempts are ignored

#### Scenario: Delayed upload overlay appears on long transfers

- **WHEN** photo upload takes longer than 800 milliseconds
- **THEN** the client displays an upload overlay with a Hearth pulsing ring (respecting reduced motion), `Saving your photos…`, and `We’ll take you home as soon as they’re saved.`

### Requirement: Initial recipe persistence and photo workflow dispatch

Upon accepting a valid multipart photo upload, the API SHALL save image files to the recipe store, persist initial metadata and recipe entity records with database readiness set to false, and request the `recipe-import` workflow after persistence. A caught dispatch failure SHALL retain the pending recipe and return its intake identity.

#### Scenario: Initial photo recipe persisted with pending readiness

- **WHEN** the API accepts POST `/api/recipes`
- **THEN** it stores original images on disk, writes initial recipe metadata, creates a database recipe with `IsReady = false`, and requests the `recipe-import` workflow with the recipe ID

#### Scenario: Dispatch fails after initial persistence

- **WHEN** the recipe is persisted but its background dispatch throws
- **THEN** the intake identity is still returned and the stored recipe remains pending
- **AND** acceptance alone does not establish an executing workflow

### Requirement: Multimodal OCR vision recipe extraction and semantic validation

The background `recipe-import` workflow SHALL execute recipe extraction using multimodal AI vision across all staged recipe images, validate semantic completeness, and persist structured recipe data.

#### Scenario: Extract recipe details from staged photos

- **WHEN** the recipe extraction task executes for a photo-based recipe
- **THEN** the agent submits staged image binaries to the multimodal model, parses structured recipe JSON, verifies required fields (name, ingredients, instructions), and saves normalized recipe content

#### Scenario: Refinement triggered on incomplete initial extraction

- **WHEN** initial vision extraction produces JSON missing required ingredients or instructions
- **THEN** the extractor triggers a refinement prompt to complete missing details before finalizing extraction

### Requirement: Finalize photo recipe readiness and broadcast completion

When finalization executes for an existing recipe that is not already ready and discoverable, the system SHALL set those database facts, update its timestamp, evaluate suspected library duplicates under `recipe-quality` rules before publishing completion, and then attempt household ready-event publication including whether the finalized recipe is flagged as a suspected duplicate. Ordinary finalization SHALL NOT require writing readiness into a non-PDF metadata file.

#### Scenario: Transition photo recipe state to ready

- **WHEN** the recipe ready step successfully finalizes an existing recipe not already ready and discoverable
- **THEN** it persists database readiness and discoverability, records a `duplicate` import report if an active library recipe matches and no report exists yet, and attempts publication of recipe identity, name, optional hero path, and suspected-duplicate status
- **AND** delivery follows the household-live-updates rules rather than being certified by the database save

#### Scenario: Missing or already finalized recipe

- **WHEN** finalization is invoked for a missing recipe or one already ready and discoverable
- **THEN** it does not publish a new ready event
- **AND** the existing retained-PDF readiness behavior still applies to an already finalized PDF

### Requirement: Enter and cancel a description capture draft

The capture screen SHALL offer Describe a recipe with a top subtitle disclosing AI drafting, a required recipe name input (with any duplicate advisory directly beneath it), an optional free-text description input, a single primary `Save & build recipe` button, and the universal top-right Cancel (`×`) control without a secondary bottom Cancel button. Opening `/capture?mode=describe` SHALL show this form directly.

#### Scenario: Open description from capture controls

- **WHEN** a person activates Describe a recipe on `/capture`
- **THEN** the description form replaces the capture controls with the AI-drafting subtitle, required recipe name input, optional description input, and primary `Save & build recipe` CTA

#### Scenario: Open description mode directly

- **WHEN** a person opens `/capture?mode=describe` without GOTO intent
- **THEN** the description form is immediately available

#### Scenario: Cancel a draft

- **WHEN** a person activates the top-right Cancel (`×`) control after entering a name or description
- **THEN** the draft is discarded and navigation returns to `/home`

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

When description synthesis executes, the system SHALL request `https://schema.org/Recipe` content from the submitted description, persist the resulting `https://schema.org/Recipe` document to `{id}/recipe.json`, derive structured portion-scaling facts, and mark the recipe as synthesized. If the response cannot be parsed or has no usable recipe name, synthesis SHALL retain a minimal `https://schema.org/Recipe` document named from the submitted description with empty ingredients and instructions.

#### Scenario: Persist generated recipe content

- **WHEN** synthesis receives parseable `https://schema.org/Recipe` content with a usable name
- **THEN** it persists top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json`, derives structured portion lines and step bindings in the database, and identifies the recipe as synthesized for subsequent processing

#### Scenario: Unusable synthesis response

- **WHEN** synthesis receives malformed recipe JSON or content with no usable name
- **THEN** it persists a minimal `https://schema.org/Recipe` document named from the submitted description with empty ingredients and instructions
- **AND** this fallback alone does not establish a complete cookable recipe

### Requirement: Persist extracted and synthesized recipe content as Schema.org Recipe

Background extraction, guided re-import repair, and description synthesis SHALL persist valid recipe content to `{id}/recipe.json` as a top-level `https://schema.org/Recipe` JSON document without `.publications` staging directories, and SHALL derive structured portion lines and bilingual grocery mappings tolerantly from `recipeIngredient` and optional `supply` entries without failing on casing, preposition, unit-alias, preparation-note, or unquantified-line differences.

#### Scenario: Tolerant portion derivation from Schema.org ingredient and supply differences

- **WHEN** photo, PDF, URL extraction, guided repair, or description synthesis returns valid `https://schema.org/Recipe` JSON whose `recipeIngredient` entries differ from `supply` in capitalization, `of`/`de`/`d'` prepositions, EN/FR unit aliases, or trailing preparation notes (such as `"500 g ground beef"` with `supply.name` `"Ground beef"`, `"30 ml of All-Purpose Flour"`, `"2 c. à soupe d'huile"`, or `"1 onion, diced"`)
- **THEN** the system persists top-level `https://schema.org/Recipe` JSON to `{id}/recipe.json` without creating a `.publications` directory and derives structured portion lines with exact rational quantities, units, shopping names, and bilingual grocery food mappings rather than deferring conversion or dropping mappings

#### Scenario: Unquantified ingredients remain readable without failing synthesis or extraction

- **WHEN** `https://schema.org/Recipe` output includes unquantified directions or prose ingredients (such as `"Salt"`, `"Pepper"`, or `"Juice of 1 lemon"`) alongside quantified ingredients
- **THEN** the unquantified lines are persisted with null numeric amounts and original text intact, quantified sibling lines remain scalable, and the workflow task succeeds

#### Scenario: Description synthesis advances through categorization to ready

- **WHEN** `goto-synthesis` completes synthesis, hero generation, sync, ingredient categorization, and recipe categorization for a described recipe
- **THEN** recipe categorization persists category, cuisine, meal types, and vegetarian classification without conflicting with finalization, and the readiness step marks the recipe ready and broadcasts `recipe_ready`

### Requirement: Retain a description draft after submission failure

If description submission fails or returns no recipe ID, the client SHALL display an error, retain the entered name and description, and release the submission button so the person can retry intake.

#### Scenario: Request rejects

- **WHEN** description submission raises a network or server error
- **THEN** the form retains the draft, displays an error and permits another submission

#### Scenario: Response lacks identity

- **WHEN** the submission response has no recipe ID
- **THEN** the form displays No recipe ID returned. and retains the draft for another submission

### Requirement: Offer PDF acquisition to established members

PDF acquisition SHALL require household authentication and an established member. The ordinary capture picker SHALL offer PDF without requiring feature-flag configuration or a member preference, and SHALL exclude PDF in Family GOTO.

#### Scenario: Established member selects the PDF entry

- **WHEN** the current established member uses ordinary capture outside Family GOTO
- **THEN** Import recipe file includes PDF among its selectable formats

#### Scenario: Legacy flag state cannot disable PDF

- **WHEN** PDF feature configuration is absent or a legacy disabled override or empty/loading/failed feature snapshot is present
- **THEN** the ordinary picker and confirmation remain available

#### Scenario: Family GOTO picker

- **WHEN** capture is Family GOTO
- **THEN** the picker does not advertise or stage PDF

#### Scenario: API validates member eligibility

- **WHEN** PDF intake is requested without household authentication or without an established member
- **THEN** the API rejects it with 401 or 400 respectively before persistence

### Requirement: Validate PDF file selection before confirmation

The ordinary picker SHALL accept a nonempty file of at most 20 MiB (20,971,520 bytes) only when its filename ends in .pdf and its MIME type is application/pdf, without regard to case. Selection validation SHALL check transport properties without parsing the document.

#### Scenario: Valid transport properties

- **WHEN** an eligible person selects a nonempty .pdf file with application/pdf type within the byte limit
- **THEN** the client opens PDF confirmation even if the document content has not yet been validated

#### Scenario: Invalid file selection

- **WHEN** a PDF candidate has incompatible extension or MIME type, is empty, or exceeds 20,971,520 bytes
- **THEN** the picker displays a file or size error and does not stage it for PDF confirmation

### Requirement: Review PDF identity and optional metadata before saving

PDF confirmation SHALL display the open-cream capture header with the top-right `48 × 48 CSS px` white circular Cancel (`×`) control, render the selected filename and one-recipe/ten-page/`20 MiB` guidance beside a `3.5px` terracotta context bar, offer the shared appreciation rating choices and optional notes (initially unrated), and require explicit `Save recipe`. It SHALL omit finished-dish photo selection and idle upload-interruption text before Save is activated.

#### Scenario: Review selected PDF

- **WHEN** a PDF selection reaches enabled confirmation
- **THEN** the person sees the top-right Cancel (`×`) control, filename and page/size context beside a terracotta bar, shared appreciation rating choices, and optional notes before any intake submission
- **AND** no finished-dish photo selector or idle upload-wait warning is presented

#### Scenario: Cancel selected PDF via top-right close control

- **WHEN** a person activates the top-right Cancel (`×`) control during enabled PDF confirmation
- **THEN** the unsaved PDF selection (and any staged shared PDF token) is discarded without submitting an import and navigation returns to `/home`

#### Scenario: Save metadata

- **WHEN** a person saves with an appreciation selection and notes
- **THEN** the client submits that rating and trimmed nonblank notes with the file
- **AND** an untouched rating is submitted as zero and blank notes are omitted

### Requirement: Discard interrupted PDF drafts

A staged PDF for the selected established member SHALL permit confirmation independently of preview snapshots. The unsaved PDF draft SHALL be discarded on page departure, hidden visibility, member change, changed capture query or transition to Family GOTO.

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

While Save awaits PDF intake, the client SHALL prevent repeat submission, disable metadata and Cancel controls, and show plain `Preparing your PDF…` text (no button spinner circle) plus a `role="status"` reassurance line. A failure or unusable response identity SHALL show an inline Hearth error alert and release the lock while retaining the draft. Unrecognized HTTP failures or missing/invalid IDs SHALL warn (without em-dashes) that resubmission can create a duplicate.

#### Scenario: Repeated Save during upload

- **WHEN** Save is activated repeatedly before its intake attempt finishes
- **THEN** only one request is sent, `Preparing your PDF…` and `We’ll take you home as soon as your PDF is saved.` are shown without a spinner circle, and metadata controls remain disabled during that attempt

#### Scenario: Intake rejection permits another attempt

- **WHEN** intake fails while the same foreground draft remains active
- **THEN** the inline Hearth error alert is displayed and the selected file, rating and notes remain available for another Save

#### Scenario: Response identity cannot be trusted

- **WHEN** a successful HTTP response lacks a usable recipe UUID
- **THEN** the client displays uncertain-upload feedback including the duplicate warning (without em-dashes) and does not navigate as a confirmed intake

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

A completed PDF recipe SHALL expose its ordered rendered pages through the existing recipe-library View Original controls and original-image endpoint. The retained source PDF SHALL remain separate from those image responses. Changes to legacy PDF feature configuration SHALL NOT remove completed recipe access or gate its original-page viewing.

#### Scenario: View completed PDF originals

- **WHEN** a person opens View Original for a completed PDF recipe with rendered pages
- **THEN** the existing photo viewer displays and navigates its ordered page images
- **AND** those image requests do not download the retained PDF file

#### Scenario: Legacy rollout configuration changes

- **WHEN** legacy PDF feature configuration changes after a PDF recipe completes
- **THEN** ordinary library and rendered-original access remain available

### Requirement: Recover eligible failed PDF imports using retained work

A paused PDF import with a failed task SHALL appear in existing Settings failed captures with Retry and Clear actions. Retry SHALL queue the failed task without rechecking new-acquisition eligibility and SHALL NOT certify successful recovery. Clearing an eligible unfinished conversion failure SHALL remove its failure entry and queue residue cleanup; source removal SHALL occur when cleanup executes while the residue remains eligible.

#### Scenario: Retry failed preparation after rollout configuration changes

- **WHEN** a PDF import has a paused failed conversion and a person retries it after legacy PDF feature configuration changes
- **THEN** the failed task is queued against its retained source without another upload or flag gate
- **AND** an invalid source can fail again

#### Scenario: Clear a failed conversion import

- **WHEN** a person confirms Clear for a paused failed PDF conversion with no usable named recipe content
- **THEN** the failure entry is removed and aggregate cleanup is queued
- **AND** executing that cleanup removes the retained PDF and any page residue

#### Scenario: Settings recovery request fails

- **WHEN** Retry or Clear fails in the Settings failure list
- **THEN** the row remains and displays retry error feedback

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

### Requirement: Request the configured processing language without certifying output language

When IMPORT_TARGET_LANGUAGE contains a nonblank value other than case-insensitive NONE, capture processing SHALL request that language for recipe extraction, description synthesis and generated recipe descriptions. Missing, whitespace-only or NONE values SHALL add no target-language override. This request SHALL NOT certify the language or accuracy of persisted provider output.

#### Scenario: Extract recipe content with an enabled target

- **WHEN** photo, rendered PDF or web-content extraction executes with an enabled target-language value
- **THEN** the provider request asks for the recipe name, ingredients, instructions and sections in that language
- **AND** ordinary semantic validation still governs whether extracted recipe content can be persisted

#### Scenario: Synthesize from a description with an enabled target

- **WHEN** description synthesis executes with an enabled target-language value
- **THEN** the provider request includes the target-language request alongside the submitted description
- **AND** the existing synthesis parsing and fallback rules remain in effect without a language-conformance guarantee

#### Scenario: Generate a recipe description with an enabled target

- **WHEN** generated recipe-description processing executes with an enabled target-language value
- **THEN** the provider request asks for that description in the configured language

#### Scenario: Target override disabled

- **WHEN** processing configuration is absent, whitespace-only, or equals NONE without regard to case
- **THEN** processing adds no configured target-language override to those requests
- **AND** this absence does not certify preservation of the source language

### Requirement: Extract servings for the selected ingredient basis

Image extraction SHALL request the existing `recipeYield` matching the extracted ingredient quantities. A single explicit serving count SHALL be retained. Multiple labelled serving columns SHALL use the smallest count, keeping every ingredient on that column's basis. Extraction SHALL NOT rescale quantities to a fixed serving count or introduce a second provider-output count field.

#### Scenario: Single four-portion card

- **WHEN** extraction reads the supplied radiatore card with “Portions: 4”, 510 g beef and 340 g pasta
- **THEN** its normalized result has recipeYield “4 portions”, retaining those ingredient quantities

#### Scenario: Columns labelled with serving symbols

- **WHEN** extraction reads the supplied Cook it card with two- and three-utensil column headings
- **THEN** it uses the two-serving column, records a two-serving recipeYield, and retains 360 g chicken and 500 g potatoes rather than the three-serving quantities

#### Scenario: Smaller column is not leftmost

- **WHEN** a card has clearly labelled serving columns of 4 and 2 in that order
- **THEN** extraction selects the column labelled 2, without mixing quantities from the column labelled 4

### Requirement: Resolve an explicit base without treating alternatives as a range

When a card states alternative serving counts and explicitly identifies the ingredient base, extraction SHALL retain that base and its printed quantities. Alternative counts SHALL NOT be interpreted as an interval, added together, or used to scale the extracted ingredients.

#### Scenario: Two or four with doubling note

- **WHEN** extraction reads the supplied zaatar card with “Portions: 2 ou 4” and “Double pour 4 portions” above the ingredients
- **THEN** it records recipeYield “2 portions” with 2 chicken breasts and 225 g Brussels sprouts, without doubling the ingredients

### Requirement: Keep unresolved serving counts unknown

Missing or unreadable serving evidence SHALL produce null recipeYield without inventing a count from food photographs, ingredient amounts, calories, time or household size. Visible unresolved alternatives SHALL remain yield text without claiming a selected count. A missing yield alone SHALL NOT make an otherwise valid recipe semantically incomplete.

#### Scenario: Unresolved alternatives

- **WHEN** a card says “2 or 4” but supplies no identifiable base or labelled ingredient columns
- **THEN** extraction retains the visible ingredients and yield text without claiming a single serving count

#### Scenario: Unreadable symbols

- **WHEN** ingredient headings cannot reliably be read as serving counts
- **THEN** extraction does not infer a count from the number of plates pictured

#### Scenario: Missing optional yield

- **WHEN** otherwise valid extraction has no visible serving-yield evidence
- **THEN** recipeYield is null and the missing yield alone does not fail extraction

### Requirement: Present Capture surfaces using Family Cookbook identity and dual-mode contrast

All `/capture` screens, headers, demo gates, overlays, and `LibraryToast` notices SHALL use Family Cookbook typography, dual-mode AA/AAA semantic roles, EN/FR copy without em-dashes, `>= 48 × 48 CSS px` targets, accessible alerts, and reduced motion. Every `/capture` state SHALL use an open-cream heading with a top-right `48 × 48 CSS px` circular Cancel (`×`) and no header divider; the camera card SHALL omit drop-hint copy; and the demo gate SHALL use a `>= 48 CSS px` secondary link.

#### Scenario: Capture entry, staging, URL, describe, and PDF views under Standard and High Contrast modes

- **WHEN** a household member views `/capture` (entry hub, photo staging, URL review, description capture, PDF confirmation, shared `.txt` review, demo gate, or `LibraryToast`) in `standard` or `high` contrast
- **THEN** every view presents the open-cream left-aligned header + `48 × 48 CSS px` circular Cancel (`×`) with no header divider line, and rendered text, buttons, borders, and toast surfaces satisfy AA thresholds in Standard mode and AAA opaque thresholds in High Contrast mode without horizontal overflow at `320 CSS px` or `200%` text scaling

#### Scenario: Interactive targets, keyboard focus, alerts, and photo thumbnail accessibility

- **WHEN** a person navigates `/capture` by keyboard or touch across gallery selection, staged photo thumbnails, remove photo, duplicate recipe links, header cancel, demo prepared-recipes link, form fields, and form validation errors
- **THEN** every interactive control is at least `48 × 48 CSS px`, photo thumbnails act as native buttons with keyboard activation, validation errors use `role="alert"`, inputs associate with their labels, and focused controls display visible `focus-visible` outlines

#### Scenario: Managed preview URLs, locale reactivity, and reduced motion

- **WHEN** photos are staged or removed, the active member switches language between EN and FR, or `prefers-reduced-motion: reduce` is enabled
- **THEN** staged photo object URLs are revoked cleanly on removal or unmount, Capture UI strings update immediately to EN/FR sentence-case copy without em-dashes, and continuous pulse/ping or spring animations respect reduced motion

### Requirement: Retire unused legacy Capture stub route and components

The client SHALL remove the unused `/capture/confirm` placeholder stub route and unreferenced legacy capture wrapper components while retaining staged photo object-URL revocation test coverage on the active capture component.

#### Scenario: Legacy capture stub and unreferenced wrapper components are removed

- **WHEN** Capture UI alignment completes
- **THEN** no stale placeholder `/capture/confirm` page or unreferenced pre-cookbook Capture wrapper exports remain in source
- **AND** active capture unit tests verify staged photo object URL creation and revocation without unrevoked leak on unmount or removal

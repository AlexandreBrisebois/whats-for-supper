# Spec Delta

## ADDED Requirements

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

While one or more background captures submitted in the active session remain pending completion or failure, Home SHALL display a non-blocking status ribbon stating the pending count, reassuring the person that they will be notified when ready, and offering a secondary action to start another capture. The ribbon SHALL use a Hearth pulsing indicator rather than voting-ochre or settled-garden fills and SHALL honor reduced motion.

#### Scenario: Pending background capture displays ambient Home ribbon

- **WHEN** a person views `/home` while one or more active-session captures have not yet emitted a ready or failed event
- **THEN** Home renders an opaque neutral card with a Hearth pulsing indicator, localized pending-count copy, and a `>= 48 CSS px` secondary action linking to `/capture`
- **AND** the Hearth pulse disables animation when `prefers-reduced-motion: reduce` is active

#### Scenario: Ribbon disappears once pending captures settle

- **WHEN** the last pending capture in the active session transitions to ready or failed
- **THEN** the ambient in-flight status ribbon is removed from `/home`

### Requirement: Present completion toast with duplicate-review prompt

When a `recipe_ready` event arrives for an active-session pending recipe, the client SHALL display a `5000 ms` opaque Garden-bordered toast with a `>= 48 × 48 CSS px` dismiss control and no left-border stripe or `+N more` pill. Suspected duplicates SHALL prompt review and open paired comparison on tap.

#### Scenario: Ordinary completion toast opens completed recipe

- **WHEN** a `recipe_ready` event without a suspected-duplicate flag arrives for an active-session pending recipe
- **THEN** the client renders an opaque white toast with a Garden border, localized ready copy, and `Tap to view recipe`
- **AND** activating the toast body dismisses the toast and navigates to `/recipes?open=<recipeId>`

#### Scenario: Suspected-duplicate completion toast opens paired review

- **WHEN** a `recipe_ready` event flagged as a suspected duplicate arrives for an active-session pending recipe
- **THEN** the toast subtitle displays localized `Possible duplicate · Tap to review` copy
- **AND** activating the toast body dismisses the toast and navigates to `/recipes?open=<recipeId>&reviewDuplicate=1`

#### Scenario: Explicit toast dismissal does not navigate

- **WHEN** a person activates the `48 × 48 CSS px` dismiss button on the completion toast
- **THEN** the notification is removed without navigating away from the current view

## MODIFIED Requirements

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

### Requirement: Capture appreciation rating and preparation notes

Capture review screens (photo staging, web link review, PDF confirmation, and shared `.txt` bundle review) SHALL present the same localized appreciation rating options as recipe detail (`1`: `👎 Dislike` / `Je n’aime pas`, `2`: `👍 Like` / `J’aime`, `3`: `❤️ Love` / `J’adore`) and an associated optional multi-line notes input with `>= 48 × 48 CSS px` targets, borderless-on-cream unselected choices, a raised white (`shadow-md`) selected surface without corner checkmarks (plus a crisp `1.5px` ink border in High Contrast mode), `aria-pressed` state, and visible keyboard focus.

#### Scenario: Select appreciation rating

- **WHEN** a person selects a rating option during photo, URL, PDF, or shared `.txt` capture review
- **THEN** the client records the chosen appreciation level (`1`, `2`, or `3`), or clears it to `0` when activated again
- **AND** the selected option exposes `aria-pressed="true"`, semantic Hearth/Garden/Ink text polarity, a raised white surface without a checkmark icon (with a `1.5px` high-contrast border when High Contrast is active), and a `>= 48 × 48 CSS px` button surface

#### Scenario: Enter optional preparation notes

- **WHEN** a person enters text into the notes input or activates its visible label
- **THEN** the label focuses its associated textarea via `htmlFor`/`id` and displays a clear visible keyboard focus indicator
- **AND** the client retains the text as captured recipe notes

### Requirement: Client-side photo upload progress feedback and submission lock

While photo upload is in progress, the client SHALL lock submission controls to prevent duplicate uploads without rendering idle upload-duration hints prior to submission. If uploading exceeds 800 milliseconds, the client SHALL display a photo upload overlay with a Hearth pulsing ring around the photo icon and calm localized copy (`Saving your photos…` and `We’ll take you home as soon as they’re saved.`), without multi-dot progress indicators or em-dashes.

#### Scenario: Submission lock prevents duplicate photo uploads

- **WHEN** photo upload is initiated by activating Save Recipe
- **THEN** the save button is disabled while awaiting intake and subsequent activation attempts are ignored

#### Scenario: Delayed upload overlay appears on long transfers

- **WHEN** photo upload takes longer than 800 milliseconds
- **THEN** the client displays an upload overlay with a Hearth pulsing ring (respecting reduced motion), `Saving your photos…`, and `We’ll take you home as soon as they’re saved.`

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

### Requirement: Persistent failure banner on workflow failure

If the background import workflow fails all retry attempts, the API SHALL publish a `recipe_failed` SSE event. When received for a pending recipe submitted in the current session, the client SHALL display a localized persistent Hearth recovery banner (`bg-terracotta-50` with `border-hearth-line`, without a solid left-border stripe or duplicate top-right close icon) containing an alert icon, recipe title without em-dashes, and `>= 48 × 48 CSS px` primary Retry and single secondary Dismiss controls.

#### Scenario: Display persistent failure banner on failed capture

- **WHEN** a `recipe_failed` event is received matching a recipe pending from the active session
- **THEN** the client removes the recipe from pending tracking and renders a persistent Hearth recovery card with localized EN/FR copy (without em-dashes), opaque High Contrast borders, the recipe name, and `>= 48 × 48 CSS px` Retry and single Dismiss buttons

#### Scenario: Retry failed capture from banner

- **WHEN** a person activates retry on the failure banner
- **THEN** the client calls the capture failure retry endpoint and dismisses the failure notification upon successful queuing

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

### Requirement: Lock PDF upload and retain foreground retry feedback

While Save is awaiting PDF intake, the client SHALL prevent repeated submission, disable metadata and Cancel controls, and display plain disabled `Preparing your PDF…` button text (without a button spinner circle) plus an inline `role="status"` line `We’ll take you home as soon as your PDF is saved.`. A rejection, network failure or unusable response identity SHALL display an inline Hearth error alert and release the lock, retaining the foreground selection and metadata unless its lifecycle has discarded them. Unrecognized HTTP failures or a missing or invalid response identity SHALL warn (without em-dashes) that resubmission can create a duplicate.

#### Scenario: Repeated Save during upload

- **WHEN** Save is activated repeatedly before its intake attempt finishes
- **THEN** only one request is sent, `Preparing your PDF…` and `We’ll take you home as soon as your PDF is saved.` are shown without a spinner circle, and metadata controls remain disabled during that attempt

#### Scenario: Intake rejection permits another attempt

- **WHEN** intake fails while the same foreground draft remains active
- **THEN** the inline Hearth error alert is displayed and the selected file, rating and notes remain available for another Save

#### Scenario: Response identity cannot be trusted

- **WHEN** a successful HTTP response lacks a usable recipe UUID
- **THEN** the client displays uncertain-upload feedback including the duplicate warning (without em-dashes) and does not navigate as a confirmed intake

### Requirement: Present Capture surfaces using Family Cookbook identity and dual-mode contrast

All `/capture` screens, header chrome, demo restriction cards, overlays, and `LibraryToast` completion notices SHALL use Family Cookbook typography and dual-mode semantic colors (`>= 4.5:1` text / `>= 3.0:1` icons in Standard AA; `>= 7.0:1` text and icons with opaque chrome and crisp borders in High Contrast AAA), EN/FR copy without em-dashes, `>= 48 × 48 CSS px` targets, accessible alerts, and reduced motion. Every `/capture` state SHALL render a left-aligned open-cream heading with a top-right `48 × 48 CSS px` white circular Cancel (`×`) button and no bottom header divider line; the Entry Hub camera card SHALL present only the camera shutter and gallery controls without extra drop-hint copy; and the demo restriction gate SHALL render `Explore prepared recipes` as a `>= 48 CSS px` secondary-styled link on a `border-chrome-line` card while keeping `.txt` bundle import available.

#### Scenario: Capture entry, staging, URL, describe, and PDF views under Standard and High Contrast modes

- **WHEN** a household member views `/capture` (entry hub, photo staging, URL review, description capture, PDF confirmation, shared `.txt` review, demo gate, or `LibraryToast`) in `standard` or `high` contrast
- **THEN** every view presents the open-cream left-aligned header + `48 × 48 CSS px` circular Cancel (`×`) with no header divider line, and rendered text, buttons, borders, and toast surfaces satisfy AA thresholds in Standard mode and AAA opaque thresholds in High Contrast mode without horizontal overflow at `320 CSS px` or `200%` text scaling

#### Scenario: Interactive targets, keyboard focus, alerts, and photo thumbnail accessibility

- **WHEN** a person navigates `/capture` by keyboard or touch across gallery selection, staged photo thumbnails, remove photo, duplicate recipe links, header cancel, demo prepared-recipes link, form fields, and form validation errors
- **THEN** every interactive control is at least `48 × 48 CSS px`, photo thumbnails act as native buttons with keyboard activation, validation errors use `role="alert"`, inputs associate with their labels, and focused controls display visible `focus-visible` outlines

#### Scenario: Managed preview URLs, locale reactivity, and reduced motion

- **WHEN** photos are staged or removed, the active member switches language between EN and FR, or `prefers-reduced-motion: reduce` is enabled
- **THEN** staged photo object URLs are revoked cleanly on removal or unmount, Capture UI strings update immediately to EN/FR sentence-case copy without em-dashes, and continuous pulse/ping or spring animations respect reduced motion

## REMOVED Requirements

### Requirement: Track background capture progress and auto-redirect

**Reason**: Replaced by immediate Save-and-Return-Home navigation so household members return straight to life without waiting through a 10-second countdown screen on `/capture`.
**Migration**: Use `Return directly to Home after accepted capture intake` and `Present ambient in-flight capture status on Home`.

### Requirement: Inline transition to ready status upon completion

**Reason**: Because `/capture` navigates immediately to `/home` once intake is accepted, `/capture` no longer holds an active queued waiting screen awaiting `recipe_ready`.
**Migration**: Completion notifications surface globally via `Present completion toast with duplicate-review prompt` (`LibraryToast`).

### Requirement: Show description synthesis waiting state

**Reason**: Description intake now follows the same immediate Save-and-Return-Home pattern as photo, URL, PDF, and `.txt` capture rather than holding a `Building your recipe…` countdown screen on `/capture`.
**Migration**: Use `Return directly to Home after accepted capture intake`, `Present ambient in-flight capture status on Home`, and `Present completion toast with duplicate-review prompt`.

### Requirement: Offer inline advice for another ready recipe with the completed name

**Reason**: Client-only duplicate lookup on the retired inline `/capture` completion screen missed background completions after navigating away; duplicate detection now runs in the backend finalization path and flags the recipe persistently for human review.
**Migration**: Use `Flag suspected duplicates automatically for human review` and `Resolve suspected duplicates through paired comparison` in `recipe-quality`.

### Requirement: Request discard of the newly captured duplicate from inline completion

**Reason**: Retiring the inline `/capture` completion screen removes its one-off `Discard duplicate` button in favor of Paired Duplicate Review reachable anytime from `LibraryToast`, `Recipes`, or `RecipeDetailSheet`.
**Migration**: Use `Resolve suspected duplicates through paired comparison` in `recipe-quality` (`Keep existing · move new to Bin`).

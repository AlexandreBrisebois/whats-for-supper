# Spec Delta

## MODIFIED Requirements

### Requirement: Capture appreciation rating and preparation notes
Capture review screens SHALL present localized appreciation options (1–3: Dislike / Not for me, Like / It was OK, Love / Loved it!) and an associated optional multi-line notes input with `>= 48 × 48 CSS px` targets, semantic role polarity, a non-colour pressed cue (`aria-pressed`), and visible keyboard focus in Standard and High Contrast modes.

#### Scenario: Select appreciation rating
- **WHEN** a person selects a rating option during photo, URL, or PDF capture review
- **THEN** the client records the chosen appreciation level (`1`, `2`, or `3`)
- **AND** the selected option exposes `aria-pressed="true"`, semantic Hearth/Garden/Ink contrast, a non-colour check cue, and a `>= 48 × 48 CSS px` button surface

#### Scenario: Enter optional preparation notes
- **WHEN** a person enters text into the notes input or activates its visible label
- **THEN** the label focuses its associated textarea via `htmlFor`/`id` and displays a clear visible keyboard focus indicator
- **AND** the client retains the text as captured recipe notes

### Requirement: Persistent failure banner on workflow failure
If the background import workflow fails all retry attempts, the API SHALL publish a `recipe_failed` SSE event. When received for a pending recipe submitted in the current session, the client SHALL display a localized, high-contrast persistent recovery banner with `>= 48 × 48 CSS px` Retry and Dismiss actions, visible keyboard focus, and reduced-motion respect.

#### Scenario: Display persistent failure banner on failed capture
- **WHEN** a `recipe_failed` event is received matching a recipe pending from the active session
- **THEN** the client removes the recipe from pending tracking and renders a persistent failure banner with localized EN/FR copy, opaque High Contrast surface borders, the recipe name, and `>= 48 × 48 CSS px` Retry and Dismiss buttons

#### Scenario: Retry failed capture from banner
- **WHEN** a person activates retry on the failure banner
- **THEN** the client calls the capture failure retry endpoint and dismisses the failure notification upon successful queuing

## ADDED Requirements

### Requirement: Present Capture surfaces using Family Cookbook identity and dual-mode contrast
All `/capture` screens, header chrome, overlays, and `LibraryToast` completion notices SHALL use Family Cookbook typography and dual-mode semantic colors (`>= 4.5:1` text / `>= 3.0:1` icons in Standard AA; `>= 7.0:1` text and icons with opaque chrome and crisp borders in High Contrast AAA), EN/FR copy, `>= 48 × 48 CSS px` targets, accessible alerts, and reduced motion.

#### Scenario: Capture entry, staging, URL, describe, and PDF views under Standard and High Contrast modes
- **WHEN** a household member views `/capture` (entry, photo staging, URL review, description capture, PDF confirmation, queued/ready completion, or `LibraryToast`) in `standard` or `high` contrast
- **THEN** rendered text, buttons (including primary Save/Synthesize and Capture shutter actions), borders, and sticky header/toast surfaces satisfy AA thresholds in Standard mode and AAA opaque thresholds in High Contrast mode without horizontal overflow at `320 CSS px` or `200%` text scaling

#### Scenario: Interactive targets, keyboard focus, alerts, and photo thumbnail accessibility
- **WHEN** a person navigates `/capture` by keyboard or touch across gallery selection, staged photo thumbnails, remove photo, duplicate recipe links, header cancel, form fields, and form validation errors
- **THEN** every interactive control is at least `48 × 48 CSS px`, photo thumbnails act as native buttons with keyboard activation, validation errors use `role="alert"`, inputs associate with their labels, and focused controls display visible `focus-visible` outlines

#### Scenario: Managed preview URLs, locale reactivity, and reduced motion
- **WHEN** photos are staged or removed, the active member switches language between EN and FR, or `prefers-reduced-motion: reduce` is enabled
- **THEN** staged photo object URLs are revoked cleanly on removal or unmount, Capture UI strings update immediately to EN/FR sentence-case copy, and continuous pulse/ping or spring animations respect reduced motion

### Requirement: Retire unused legacy Capture stub route and components
The client SHALL remove the unused `/capture/confirm` placeholder stub route and unreferenced legacy capture wrapper components while retaining staged photo object-URL revocation test coverage on the active capture component.

#### Scenario: Legacy capture stub and unreferenced wrapper components are removed
- **WHEN** Capture UI alignment completes
- **THEN** no stale placeholder `/capture/confirm` page or unreferenced pre-cookbook Capture wrapper exports remain in source
- **AND** active capture unit tests verify staged photo object URL creation and revocation without unrevoked leak on unmount or removal

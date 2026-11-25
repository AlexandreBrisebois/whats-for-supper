# Spec Delta

## MODIFIED Requirements

### Requirement: List active paused capture failures in update order

A successful failure list SHALL include paused or failed `url-import`, `recipe-import`, and `goto-synthesis` workflows having a failed task, ordered by workflow update time descending. It SHALL exclude other workflow types and workflows without a failed task. Failure identity SHALL be the workflow-instance identity, distinct from an associated recipe identity.

#### Scenario: Eligible capture failures exist

- **WHEN** multiple eligible `url-import`, `recipe-import`, and `goto-synthesis` workflows have distinct update times and failed tasks
- **THEN** their records are returned newest workflow update first with id equal to `workflowInstanceId` and `sourceType` reflecting `url`, `photos`, or `description`

#### Scenario: Scheduled or unrelated work exists

- **WHEN** work is pending or processing with a scheduled task, or a paused or failed workflow has another workflow type
- **THEN** that work is absent from active failed captures

### Requirement: Present friendly capture-failure guidance without raw diagnostics

Each loaded failure row SHALL display a step-specific friendly failure reason derived from the failed step and failure category, optional nonempty source preview, and a single row containing `RotateCcw` + `Retry`, an accessible `48 × 48 CSS px` `Copy` icon button, and an accessible `48 × 48 CSS px` `Trash2` button. List responses SHALL omit raw task error messages and stack traces; technical diagnostics SHALL be fetched on demand when the `Copy` icon button is activated and copied to the clipboard with a quiet neutral `Details copied` live status line (never green, no inline trace block). Saved URL captures whose import has not started SHALL explain that saved state and offer `Retry`.

#### Scenario: Display a returned failure

- **WHEN** a nonempty list is loaded with a failure's step-specific friendly reason and preview
- **THEN** its row displays both text values and the single 3-control row (`Retry` with `RotateCcw`, `Copy` icon button, and `Trash2` icon button) without inline raw stack traces

#### Scenario: Stored failure contains private diagnostics

- **WHEN** an eligible failed task has a stored error and stack trace
- **THEN** `GET /api/captures/failures` and `GET /api/captures/activity` provide step-specific friendly guidance without those raw diagnostics

#### Scenario: Copy technical diagnostics on demand

- **WHEN** a person activates the `48 × 48 CSS px` `Copy` icon button on a failed capture row
- **THEN** the client fetches diagnostic details via `GET /api/captures/failures/{id}/details`, copies the formatted step, error, stack trace, and workflow/recipe IDs to the clipboard, and surfaces a quiet neutral `Details copied` status line below the row without green styling or checkmarks

### Requirement: Confirm and lock failed-capture clearing

Activating a row's trash icon SHALL reveal an inline confirmation (`bg-white border-hearth-line`, never `window.confirm`) with localized consequence copy, `Cancel` (`secondary`, left), and `Delete` (`danger` blush with trash icon, right) for unfinished captures (`!isReady`) or `Dismiss` (`danger` blush, right) for already-published recipes (`isReady`), before sending `DELETE /api/captures/failures/{id}`. Activating `Cancel` SHALL dismiss without sending a request. Accepting `Delete` or `Dismiss` SHALL disable that row's confirmation controls until settled, without locking `Retry` or coordinating concurrent requests.

#### Scenario: Cancel clear confirmation

- **WHEN** a person activates a row's trash trigger and then activates `Cancel`
- **THEN** the row returns to its normal `Retry`, `Copy`, and `Trash2` controls without invoking `window.confirm` and no `DELETE` request is sent

#### Scenario: Confirm clear and wait

- **WHEN** a person activates `Delete` (or `Dismiss` for an already-published recipe) in the inline confirmation row
- **THEN** `DELETE` targets the failure ID and that row's confirmation controls are disabled while awaiting its result

### Requirement: Apply clear acknowledgement to the loaded list

When `Delete` or `Dismiss` resolves successfully, the mounted list SHALL remove that row and clear its action error. Removing the last row in Settings SHALL hide the section; removing the final item in the Capture Activity Sheet when no active or enriching items remain SHALL close the sheet back to Home without showing an empty screen. The UI SHALL NOT wait for queued residue cleanup or observe its command before removing the row.

#### Scenario: Clear one of multiple rows

- **WHEN** a delete request resolves successfully while other rows remain
- **THEN** only the targeted row is removed from the loaded list

#### Scenario: Clear the final row

- **WHEN** delete resolves successfully for the final loaded row
- **THEN** Settings hides the failed-capture section, and the Capture Activity Sheet closes cleanly back to `/home` when no active or enriching items remain without waiting for background cleanup or displaying an empty `All caught up` view

### Requirement: Protect usable recipe content during failed-capture cleanup

Clear SHALL soft-delete associated unfinished recipe residue whenever `recipe.IsReady` is false. Queued cleanup SHALL recheck that same `recipe.IsReady == false` condition before removing the recipe directory on disk and the recipe record from the database. Published recipes (`recipe.IsReady == true`) SHALL be retained even when a failed re-import workflow is dismissed. This SHALL NOT define manual issue resolution or ordinary Recycle Bin purge.

#### Scenario: Clear unfinished residue

- **WHEN** delete succeeds for an associated recipe with `IsReady == false` (even if partial ingredients, metadata, name, or images were persisted before failure)
- **THEN** that recipe is soft-deleted with failed-capture clear provenance and discoverability false while its storage awaits cleanup

#### Scenario: Cleanup still finds unfinished residue

- **WHEN** the queued consumer executes and the associated recipe still has `IsReady == false`
- **THEN** it removes any existing recipe directory recursively and removes the recipe record from the database, recording the outcome when persistence succeeds

#### Scenario: Content is usable at clear or cleanup

- **WHEN** the associated recipe has `IsReady == true`
- **THEN** dismiss retains that published recipe and cleanup skips deleting it if `IsReady == true` when checked

### Requirement: Keep failed-capture controls readable and touch-accessible

Failed-capture rows in the Capture Activity Sheet and Settings SHALL use sentence-case headings and preview text of at least `12 CSS px`, Family Cookbook dual-mode contrast, and `>= 48 CSS px` touch targets. Each row SHALL render a single action row with `RotateCcw` + `Retry` (`flex-1` primary Hearth), a `48 × 48 CSS px` `Copy` icon button (`aria-label`), and a `48 × 48 CSS px` blush-danger `Trash2` button (`aria-label`); inline confirmation SHALL place `Cancel` on the left and `Trash2` + `Delete` (or `Dismiss` for `isReady`) on the right.

#### Scenario: Household member reviews or clears a failed capture on mobile

- **WHEN** the Capture Activity Sheet or Settings displays one or more capture failures on viewports down to `320 CSS px`
- **THEN** section labels, friendly reasons, and preview snippets render cleanly (`>= 12 CSS px`), the single row keeps `RotateCcw` + `Retry`, `Copy` (`48 × 48 CSS px`), and `Trash2` (`48 × 48 CSS px`) separated without overflow, and activating `Trash2` reveals `>= 48 CSS px` `Cancel` (left) and `Trash2` + `Delete`/`Dismiss` (right) controls

## REMOVED Requirements

### Requirement: Present active session failure banners with dual-mode contrast and localization

**Reason:** Global off-Home failure banners disrupt browsing on other pages; failure status and recovery now live calmly on Home (`CaptureActivityBar` / `CaptureActivitySheet`) and in `/profile/settings`.

**Migration:** Check `/home` (Capture Activity Bar -> Capture Activity Sheet) or `/profile/settings` (`FailedCapturesSection`) for inline recovery controls.

## ADDED Requirements

### Requirement: Serve household capture activity feed

The system SHALL provide `GET /api/captures/activity` returning active, lexical-indexed-enriching, enrichment-paused, and failed capture workflows across `recipe-import`, `url-import`, and `goto-synthesis` for the household so Home and the Capture Activity Sheet survive reloads and sync across devices.

#### Scenario: Reload or secondary household device hydrates activity

- **WHEN** one household device submits captures and another device or refreshed browser tab loads `/home`
- **THEN** `GET /api/captures/activity` returns the current active, indexing, enriching, enrichment-paused, and failed items so Home displays the accurate Capture Activity Bar without relying on tab-local memory

### Requirement: Retry paused search enrichment without destructive clear

When a recipe is saved and lexically searchable (`IndexStatus == "ready"`) but vector enrichment failed (`EmbeddingStatus == "failed"`), the Capture Activity Sheet SHALL render a tappable Sunlight card (`bg-ochre-50 border-sunlight-line text-sunlight-ink`, `ChevronRight` to open the recipe) labeled `Searchable · Enrichment paused` with a single `RefreshCw` + `Retry enrichment` action (`>= 48 CSS px`), without trash or delete controls.

#### Scenario: Enrichment fails after lexical index succeeds

- **WHEN** `SearchIndexWorkflow` persists `IndexStatus == "ready"` and `EmbeddingStatus == "failed"`
- **THEN** the Capture Activity Sheet displays the tappable `Searchable · Enrichment paused` card (`ChevronRight` to open the recipe) with `RefreshCw` + `Retry enrichment` (`>= 48 CSS px`) and omits destructive delete controls

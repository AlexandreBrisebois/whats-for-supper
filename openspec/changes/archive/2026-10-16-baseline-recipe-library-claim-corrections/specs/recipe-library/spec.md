# Spec Delta

## MODIFIED Requirements

### Requirement: Synchronize library view and dismiss detail after deletion

After successful soft-deletion, the detail sheet SHALL invoke an optional deletion callback and close. On `/recipes`, the supplied callback SHALL start a new Search query. Removal from returned results SHALL depend on a successful subsequent read. If deletion rejects, the sheet SHALL remain open without invoking success callbacks.

#### Scenario: Dismiss detail sheet and refresh library on deletion success
- **WHEN** recipe soft-deletion succeeds from detail opened by `/recipes`
- **THEN** the detail sheet closes and the caller starts its Search refresh without navigating; a successful refreshed response excludes the deleted recipe

#### Scenario: Retain detail sheet and library state on deletion failure
- **WHEN** recipe soft-deletion request fails or is rejected
- **THEN** the detail sheet remains open, the recipe card remains visible in the library, and the failure is logged without displaying a user toast

### Requirement: Restore soft-deleted recipe to active library

A successful restore SHALL clear deletion timestamp and actor, assign an update timestamp, and return HTTP 200. The service SHALL attempt search-index dispatch after saving; dispatch failure SHALL be logged without reversing restoration. Successful UI completion SHALL remove the trash item. Later library inclusion SHALL still require stored readiness; search visibility depends on its own read/index path.

#### Scenario: Restore soft-deleted recipe to active status
- **WHEN** a person activates Restore for an item in the Recycle Bin
- **THEN** the system clears deleted_at and deleted_by, assigns updated_at and returns HTTP 200; a later successful standard list includes the recipe only when its stored readiness is true

#### Scenario: Trigger search index re-indexing upon recipe restore
- **WHEN** restoration has saved and the search-index dispatch is attempted
- **THEN** the service requests index-recipe-search for the restored ID; a dispatch exception is logged and does not reverse the saved restoration or by itself reject the restore response

#### Scenario: Remove restored recipe from trash list view
- **WHEN** the restore request completes successfully
- **THEN** the restored recipe is immediately removed from the Recycle Bin list

### Requirement: Permanently purge soft-deleted recipe with valid elevated PIN

On a successful purge with valid elevated PIN for a soft-deleted recipe, the system SHALL remove its filesystem directory, related search documents, votes, calendar events and recipe row, and return HTTP 200. Selected Pending indexing workflow instances SHALL be marked Failed in that save. This success path SHALL NOT imply running-worker cancellation or atomic file/database rollback.

#### Scenario: Purge recipe, filesystem assets, and dependencies with valid PIN
- **WHEN** a purge request is submitted with a PIN matching ELEVATED_ACTIONS_PIN for a soft-deleted recipe
- **THEN** the system removes the recipe directory from disk, deletes search documents, votes, and calendar events, removes the recipe row, and returns HTTP 200 with purged true

#### Scenario: Cancel pending index workflows during purge
- **WHEN** a recipe with pending search index workflow instances is permanently purged
- **THEN** the pending workflow instances are transitioned to failed status

#### Scenario: Remove purged recipe from trash list and close PIN dialog
- **WHEN** the permanent purge request succeeds
- **THEN** the PIN dialog closes and the purged recipe is removed from the Recycle Bin list

### Requirement: Present original photos in the photo viewer overlay

For an eligible loaded recipe with at least one original and a non-URL source type or absent source URL, View Original SHALL open the photo viewer. A valid finishedDishIndex SHALL lead the sequence; otherwise ascending original indices SHALL be used. The viewer SHALL start at sequence position zero, show the English View Original header and a position/total counter.

#### Scenario: Open photo viewer with finished dish first
- **WHEN** a person activates View Original for a recipe with imageCount 3 and valid finishedDishIndex 1
- **THEN** the photo viewer opens displaying photo index 1 first and counter “1 / 3”

#### Scenario: Open photo viewer with sequential ordering
- **WHEN** a person activates View Original for a recipe with imageCount 2 and finishedDishIndex -1
- **THEN** the photo viewer opens displaying photo index 0 first and counter “1 / 2”

#### Scenario: Open photo viewer as fallback for absent source URL
- **WHEN** a person activates View Original for a recipe with sourceType “url”, absent source URL and at least one original image
- **THEN** the application opens the photo viewer instead of attempting external navigation

### Requirement: Navigate between original photos with wrapping

For a multi-photo sequence, previous/next controls and ArrowLeft/ArrowRight SHALL wrap and reset zoom scale to 1. Pager dots SHALL select their sequence position directly. The zoom-reset rule SHALL apply to previous/next navigation, not to pager-dot selection.

#### Scenario: Advance to next photo with wrapping
- **WHEN** a person activates Next or presses ArrowRight while viewing the last photo of a multi-photo recipe
- **THEN** the viewer advances to the first photo in the resolved sequence and resets scale to 1

#### Scenario: Return to previous photo with wrapping
- **WHEN** a person activates Prev or presses ArrowLeft while viewing the first photo of a multi-photo recipe
- **THEN** the viewer displays the last photo in the resolved sequence and resets scale to 1

#### Scenario: Select photo via pager indicator
- **WHEN** a person activates a specific pager dot indicator
- **THEN** the viewer navigates directly to the corresponding photo in the resolved sequence

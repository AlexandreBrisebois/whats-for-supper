# Recipe-library deletion, Recycle Bin, restore, and purge delta

## ADDED Requirements

### Requirement: Offer Move to Bin control for loaded library recipe detail

In library detail viewing mode, the sheet SHALL offer an action gear menu containing a “Move to Bin” control. While loading or when editing recipe fields, the gear menu SHALL NOT be displayed. Activating the Move to Bin control SHALL initiate deletion immediately without presenting a secondary confirmation prompt.

#### Scenario: Access Move to Bin from the detail gear menu
- **WHEN** a person opens the action gear menu for a loaded recipe in detail viewing mode
- **THEN** the menu displays a “Move to Bin” action with a trash icon

#### Scenario: Trigger Move to Bin immediately without confirmation
- **WHEN** a person clicks the “Move to Bin” action in the gear menu
- **THEN** the application initiates soft-deletion without displaying a confirmation prompt

### Requirement: Soft-delete the loaded recipe when not assigned to active planner slots

When deleting a recipe that is not assigned to any active or future planner slots, the system SHALL record the current UTC timestamp as deleted_at and record the acting household member as deleted_by. The system SHALL remove any corresponding search document from storage and return HTTP 200 with the soft-deleted recipe details.

#### Scenario: Soft-delete unassigned recipe successfully
- **WHEN** a client sends a delete request for a recipe with no calendar events scheduled for today or later
- **THEN** the system sets deleted_at to the current timestamp, removes the recipe search document, and returns HTTP 200 with deletedAt populated

#### Scenario: Record actor and timestamp on soft-deleted recipe
- **WHEN** a household member deletes an unassigned recipe
- **THEN** the system stores the member's identifier in deleted_by alongside the deleted_at timestamp

### Requirement: Reject soft-delete when recipe is assigned to active planner slots

When deleting a recipe that is scheduled for the current date or a future date in the meal planner, the system SHALL reject the deletion request with HTTP 409 Conflict and error code RECIPE_ASSIGNED_TO_PLANNER. The response SHALL include the list of assigned dates. The recipe's deleted_at timestamp SHALL remain null.

#### Scenario: Reject deletion of scheduled recipe with Conflict
- **WHEN** a client requests deletion of a recipe assigned to a planner event on or after the current date
- **THEN** the system rejects the request with HTTP 409 Conflict, returning errorCode RECIPE_ASSIGNED_TO_PLANNER and the assigned date list

#### Scenario: Retain recipe availability on deletion rejection
- **WHEN** recipe deletion is rejected due to active planner assignment
- **THEN** the recipe remains stored without a deleted_at timestamp and remains available in the active library

### Requirement: Synchronize library view and dismiss detail after deletion

Upon successful soft-deletion of a recipe, the client SHALL invoke the deletion callback, dismiss the recipe detail sheet, and refresh the active library query so the deleted recipe card disappears from view without navigating away. If deletion fails, the detail sheet SHALL remain open and the recipe card SHALL remain visible in the library.

#### Scenario: Dismiss detail sheet and refresh library on deletion success
- **WHEN** recipe soft-deletion succeeds from the detail sheet
- **THEN** the detail sheet closes, the library query refreshes, the recipe card is removed from view, and the page URL remains unchanged

#### Scenario: Retain detail sheet and library state on deletion failure
- **WHEN** recipe soft-deletion request fails or is rejected
- **THEN** the detail sheet remains open, the recipe card remains visible in the library, and the failure is logged without displaying a user toast

### Requirement: Exclude soft-deleted recipes from standard library listings and search

The system SHALL exclude recipes with a non-null deleted_at timestamp from standard paged library listings and search results. Direct requests to read the detail of a soft-deleted recipe SHALL return HTTP 404 NotFound.

#### Scenario: Exclude soft-deleted recipe from standard paged library reads
- **WHEN** a client requests paged library recipes via GET /api/recipes
- **THEN** recipes with deleted_at populated are omitted from the returned list

#### Scenario: Exclude soft-deleted recipe from recipe search results
- **WHEN** a client executes a recipe search query
- **THEN** soft-deleted recipes matching the search text are omitted from search results

#### Scenario: Return NotFound for soft-deleted recipe detail lookup
- **WHEN** a client requests detail for a soft-deleted recipe via GET /api/recipes/{id}
- **THEN** the system returns HTTP 404 NotFound

### Requirement: Open Recycle Bin sheet from library browse header

The library browse view SHALL provide a Recycle Bin trigger control in its header area. Activating the control SHALL present the Recycle Bin bottom sheet overlay displaying the title “Recycle Bin” and a close button. Dismissing the sheet SHALL hide the overlay and return to the library browse view.

#### Scenario: Present Recycle Bin sheet from browse header trigger
- **WHEN** a person clicks the Recycle Bin button in the browse view header
- **THEN** the Recycle Bin bottom sheet opens displaying the title “Recycle Bin” and close button

#### Scenario: Dismiss Recycle Bin sheet back to browse view
- **WHEN** a person clicks the close button or sheet backdrop
- **THEN** the Recycle Bin sheet closes and the underlying browse view is displayed

### Requirement: List soft-deleted recipes in Recycle Bin

Opening the Recycle Bin SHALL fetch all soft-deleted recipes ordered by deletion timestamp descending. The sheet SHALL display loading feedback while the request is in flight. If no deleted recipes exist, it SHALL display an empty message. When deleted recipes exist, each item SHALL display its recipe name, localized deletion date, a Restore button, and a Delete button.

#### Scenario: Show loading indicator while retrieving trash items
- **WHEN** the Recycle Bin sheet mounts and requests deleted recipes
- **THEN** the sheet displays a loading indicator until the request completes

#### Scenario: Display empty bin message when no recipes are deleted
- **WHEN** the Recycle Bin request returns an empty list of deleted recipes
- **THEN** the sheet displays “Your Recycle Bin is empty.”

#### Scenario: Render soft-deleted recipes with name, date, and actions
- **WHEN** the Recycle Bin contains soft-deleted recipes
- **THEN** the sheet renders each item with its recipe name, formatted deletion date, Restore button, and Delete button

### Requirement: Restore soft-deleted recipe to active library

Activating Restore for a soft-deleted recipe SHALL send a restore request, clear its deleted_at and deleted_by fields, update its updated_at timestamp, and trigger search index re-indexing. Upon successful restoration, the client SHALL remove the recipe from the Recycle Bin list, and the recipe SHALL re-appear in standard library listings and search.

#### Scenario: Restore soft-deleted recipe to active status
- **WHEN** a person activates Restore for an item in the Recycle Bin
- **THEN** the system clears deleted_at and deleted_by, sets updated_at, returns HTTP 200, and re-includes the recipe in active library reads

#### Scenario: Trigger search index re-indexing upon recipe restore
- **WHEN** a soft-deleted recipe is successfully restored
- **THEN** the system triggers the index-recipe-search background workflow for the restored recipe

#### Scenario: Remove restored recipe from trash list view
- **WHEN** the restore request completes successfully
- **THEN** the restored recipe is immediately removed from the Recycle Bin list

### Requirement: Present elevated PIN dialog for permanent purge

Activating the Delete action for a recipe in the Recycle Bin SHALL open an elevated PIN dialog presenting a permanent deletion warning, a password-masked PIN input, a Cancel button, and a Delete Forever button. The Delete Forever button SHALL remain disabled while the PIN input is empty. Canceling SHALL dismiss the dialog without sending a purge request.

#### Scenario: Open PIN confirmation dialog for selected trash recipe
- **WHEN** a person clicks the Delete button for an item in the Recycle Bin
- **THEN** the elevated PIN dialog appears with title “Permanently Delete Recipe”, warning text, PIN input, Cancel, and Delete Forever buttons

#### Scenario: Dismiss PIN dialog on cancel without sending request
- **WHEN** a person clicks Cancel in the elevated PIN dialog
- **THEN** the dialog closes, no purge request is sent, and the item remains in the Recycle Bin

### Requirement: Permanently purge soft-deleted recipe with valid elevated PIN

Submitting the elevated PIN dialog with a valid PIN matching the server's configured elevated actions PIN SHALL permanently delete the soft-deleted recipe. The system SHALL cancel pending indexing workflows, delete the recipe's filesystem directory assets, remove related search documents, votes, and calendar events, delete the recipe record from the database, and return HTTP 200.

#### Scenario: Purge recipe, filesystem assets, and dependencies with valid PIN
- **WHEN** a purge request is submitted with a PIN matching ELEVATED_ACTIONS_PIN for a soft-deleted recipe
- **THEN** the system removes the recipe directory from disk, deletes search documents, votes, and calendar events, removes the recipe row, and returns HTTP 200 with purged true

#### Scenario: Cancel pending index workflows during purge
- **WHEN** a recipe with pending search index workflow instances is permanently purged
- **THEN** the pending workflow instances are transitioned to failed status

#### Scenario: Remove purged recipe from trash list and close PIN dialog
- **WHEN** the permanent purge request succeeds
- **THEN** the PIN dialog closes and the purged recipe is removed from the Recycle Bin list

### Requirement: Reject permanent purge on invalid PIN, missing configuration, or non-trash recipe

The system SHALL reject a purge request with HTTP 503 PIN_NOT_CONFIGURED if no elevated PIN is configured, with HTTP 403 FORBIDDEN if the provided PIN header is missing or incorrect, and with HTTP 409 NOT_IN_TRASH if the recipe is not soft-deleted. On rejection, the client SHALL keep the PIN dialog open, display an error message, and retain the item in the Recycle Bin.

#### Scenario: Reject purge with 403 on missing or incorrect PIN
- **WHEN** a purge request is sent without X-Elevated-Pin or with a non-matching PIN value
- **THEN** the system rejects the request with HTTP 403 FORBIDDEN and message “Missing or incorrect elevated PIN.”

#### Scenario: Reject purge with 503 when elevated PIN is unconfigured
- **WHEN** a purge request is sent while ELEVATED_ACTIONS_PIN is not configured on the server
- **THEN** the system rejects the request with HTTP 503 and errorCode PIN_NOT_CONFIGURED

#### Scenario: Reject purge with 409 when recipe is not in trash
- **WHEN** a purge request is sent for a recipe whose deleted_at is null
- **THEN** the system rejects the request with HTTP 409 Conflict and errorCode NOT_IN_TRASH

#### Scenario: Display error feedback and retain dialog on purge rejection
- **WHEN** the purge request fails with an error status
- **THEN** the PIN dialog remains open, displays an error message, and the recipe remains in the Recycle Bin

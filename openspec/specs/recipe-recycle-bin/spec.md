# Recipe recycle bin Specification

## Purpose

Let household members move eligible recipes to the Recycle Bin, inspect and restore deleted recipes, and request PIN-protected permanent purge with existing eligibility and failure boundaries.

## Relocation provenance (non-normative)

These requirements were relocated unchanged from their original capability owners. All applicable BSL/U/A qualifications, partial-success boundaries and deferred runtime/API/browser/database/model evidence transfer with them. Relocation establishes no new behavioral guarantee.

- [recipe-library evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/recipe-library.md)

## Capability dependencies (non-normative)

Preserved references to the former combined owners resolve through these current capability links. Each requirement retains its original normative text.

- [Return only eligible household library recipes](../recipe-library/spec.md#requirement-return-only-eligible-household-library-recipes)
- [Represent persisted recipe attribution and readiness](../recipe-library/spec.md#requirement-represent-persisted-recipe-attribution-and-readiness)
- [Publish lexical content before optional embedding work](../search-indexing/spec.md#requirement-publish-lexical-content-before-optional-embedding-work)

## Requirements

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

After successful soft-deletion, the detail sheet SHALL invoke an optional deletion callback and close. On `/recipes`, the supplied callback SHALL start a new Search query. Removal from returned results SHALL depend on a successful subsequent read. If deletion rejects, the sheet SHALL remain open without invoking success callbacks.

#### Scenario: Dismiss detail sheet and refresh library on deletion success
- **WHEN** recipe soft-deletion succeeds from detail opened by `/recipes`
- **THEN** the detail sheet closes and the caller starts its Search refresh without navigating; a successful refreshed response excludes the deleted recipe

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

### Requirement: Present elevated PIN dialog for permanent purge

Activating the Delete action for a recipe in the Recycle Bin SHALL open an elevated PIN dialog presenting a permanent deletion warning, a password-masked PIN input, a Cancel button, and a Delete Forever button. The Delete Forever button SHALL remain disabled while the PIN input is empty. Canceling SHALL dismiss the dialog without sending a purge request.

#### Scenario: Open PIN confirmation dialog for selected trash recipe
- **WHEN** a person clicks the Delete button for an item in the Recycle Bin
- **THEN** the elevated PIN dialog appears with title “Permanently Delete Recipe”, warning text, PIN input, Cancel, and Delete Forever buttons

#### Scenario: Dismiss PIN dialog on cancel without sending request
- **WHEN** a person clicks Cancel in the elevated PIN dialog
- **THEN** the dialog closes, no purge request is sent, and the item remains in the Recycle Bin

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

### Requirement: Disable the restoring trash item during its request

After Restore starts for a trash item, that item's Restore control SHALL remain disabled until the request settles. The control SHALL be enabled again after rejection if its item remains displayed. Existing successful restore removal SHALL apply; this local control SHALL NOT imply serialization of all recipe mutations.

#### Scenario: Wait for an item restore
- **WHEN** a displayed trash item has an outstanding Restore request
- **THEN** that item Restore control is disabled while other item state is retained

#### Scenario: Reenable a failed restore control
- **WHEN** the Restore request rejects while its trash item remains mounted
- **THEN** the item remains displayed and its Restore control becomes enabled again

### Requirement: Display pending permanent-purge submission feedback

While a PIN purge submission is pending and its dialog remains displayed, the submit control SHALL be disabled and show Deleting…. The PIN input and Cancel SHALL remain available. This feedback SHALL NOT imply that cancellation retracts a dispatched request or that programmatic form submission is guarded.

#### Scenario: Display a pending purge request
- **WHEN** the PIN form has dispatched purge and its dialog is still open
- **THEN** the submit control displays Deleting… and is disabled while PIN editing and Cancel remain available

### Requirement: Recover failed Recycle Bin reads
A failed bin read SHALL display an error and Retry instead of empty-bin feedback. Retry SHALL repeat the read with pending feedback; an empty successful result SHALL display the existing empty-bin state.

#### Scenario: Retry an unavailable bin
- **WHEN** a bin read rejects and Retry subsequently returns an empty result
- **THEN** error feedback precedes the retry and empty feedback appears only after success

### Requirement: Explain failed restore and move actions
A failed restore SHALL retain its entry, show visible failure feedback and reenable Restore. A failed move to bin SHALL retain the detail sheet and show visible failure feedback. Successful operations and permanent purge behavior SHALL retain their existing behavior.

#### Scenario: Restore fails then succeeds
- **WHEN** Restore rejects and a subsequent Restore succeeds
- **THEN** the entry remains with feedback after failure and disappears after success

#### Scenario: Move fails
- **WHEN** moving a recipe to bin rejects
- **THEN** the detail remains available with visible failure feedback

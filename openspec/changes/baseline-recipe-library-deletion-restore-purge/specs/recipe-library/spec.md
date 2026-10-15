# Recipe-library deletion, Recycle Bin, restore, and purge delta

## Non-normative evidence and scope

This session instruction authorizes this bounded draft only. BSL-recipe-library-024–026 in `docs/openspec-baseline-plan.md` map every requirement and scenario to inspected source and actual assertion coverage. These are implementation-supported claims under A10; runtime behavior is not-run and implementation/database qualification remains deferred under A34. Main recipe-library remains 44 requirements/94 scenarios and household-identity 36/92. The nine prior changes remain active; this draft adds a tenth.

Reuse library “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Open the household library and offer list presentation”, “Return only eligible household library recipes”, and “Dismiss recipe detail back to the loaded library”. These additions cover only missing ordinary-household recipe deletion (Move to Bin / soft-delete), Recycle Bin listing, recipe restore, and PIN-protected permanent purge behavior. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”.

U48–U52 retain source/assertion limits without repair:
- Move to Bin is activated directly from the detail gear menu without a confirmation dialog. If soft delete fails (e.g. 409 Conflict due to active planner schedule, or network error), the error is logged to `console.error` and no user-facing toast or inline error banner is displayed; the sheet simply remains open with the recipe unchanged.
- Soft-deleted recipes are excluded from standard library listings, detail GET (returning 404), and search queries via the EF Core query filter `DeletedAt == null`. Neither soft-delete, restore, nor purge broadcasts an SSE event. Multi-client synchronization relies on manual or route-driven query refreshes.
- There is no unit test file for `RecycleBinSheet.tsx` (`RecycleBinSheet.test.tsx` is missing); test coverage relies on mock verification in `browse-all-stack/page.test.tsx` and Playwright E2E tests (`search-hardening.spec.ts` and `browse-all-stack.spec.ts`).
- When `purgeRecipe` fails (whether 403 Forbidden, 503 Service Unavailable, 409 Conflict, or 404 NotFound), `RecycleBinSheet` displays a single generic error message (“Incorrect PIN or permanent delete is not available.”) without distinguishing between missing/invalid PIN, unconfigured server PIN, or non-trash recipe state.
- Soft-deletion checks only future or current-day calendar events (`Date >= today`) and rejects with 409 Conflict if found, but leaves historical calendar events untouched. In contrast, permanent purge cascades and deletes all calendar events (past and future), votes, search documents, and filesystem directory assets.

Reuse BSL-recipe-library-001–023 and preserve U29–U47 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Recipe capture/import, hero generation/regeneration, recipe sharing/export, detail editing, ratings/notes submission, discoverability toggling, cooking, planning, search/discovery ranking, votes/consensus, and demo/preview variants are excluded.

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

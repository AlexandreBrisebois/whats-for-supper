# Spec Delta

## Purpose

Let household members inspect, retry and clear failed capture workflows and request bulk imports for unnamed stored recipes, distinguishing workflow acknowledgements and summary counts from repaired recipes and completed cleanup.

## ADDED Requirements

### Requirement: Enter failed-capture management through Settings

Profile SHALL offer Settings at `/profile/settings`, whose content SHALL include failed-capture management without a separate preview disclosure. Existing household-identity rules govern shared access and navigation context. Settings SHALL offer Back to Profile.

#### Scenario: Open Settings from Profile
- **WHEN** a person activates Settings on Profile
- **THEN** Settings opens and includes the failed-capture section subject to returned-list visibility

#### Scenario: Return to Profile
- **WHEN** a person activates Back in Settings
- **THEN** navigation returns to `/profile`

### Requirement: Show failed-capture management only for a loaded nonempty list

Mounting failed-capture management SHALL request GET `/api/captures/failures`. The section SHALL remain absent while its initial list is pending, after an empty result, or after list rejection. A rejected list request SHALL NOT display a dedicated list error or empty recovery card.

#### Scenario: Initial request remains pending
- **WHEN** the initial failure-list request has not resolved
- **THEN** no failed-capture section or loading card is shown

#### Scenario: List is empty
- **WHEN** the initial request succeeds with no failures
- **THEN** the failed-capture section is absent

#### Scenario: List request rejects
- **WHEN** the initial request rejects
- **THEN** the section remains absent with no dedicated fetch-error message

### Requirement: List active paused capture failures in update order

A successful failure list SHALL include paused `url-import` and `recipe-import` workflows having a failed task, ordered by workflow update time descending. It SHALL exclude other workflow types and workflows without that paused-failed combination. Failure identity SHALL be the workflow-instance identity, distinct from an associated recipe identity.

#### Scenario: Eligible capture failures exist
- **WHEN** multiple eligible capture workflows have distinct update times
- **THEN** their records are returned newest workflow update first with id equal to workflowInstanceId

#### Scenario: Scheduled or unrelated work exists
- **WHEN** work is pending or processing with a scheduled task, or a paused failed workflow has another workflow type
- **THEN** that work is absent from active failed captures

### Requirement: Present friendly capture-failure guidance without raw diagnostics

Each loaded failure row SHALL display its friendly reason, optional nonempty source preview, Retry and an accessible Clear failed capture action. List responses SHALL omit raw task error messages and stack traces. Current active failures SHALL receive generic import retry guidance rather than a diagnosis inferred from private errors.

#### Scenario: Display a returned failure
- **WHEN** a nonempty list is loaded with a failure's friendly reason and preview
- **THEN** its row shows both values and Retry and Clear controls

#### Scenario: Stored failure contains private diagnostics
- **WHEN** an eligible failed task has a stored error and stack trace
- **THEN** the response provides generic friendly guidance without those raw diagnostics

### Requirement: Address capture retry to the loaded workflow failure

Retry SHALL send POST `/api/captures/failures/{id}/retry` using the row's failure ID without a feedback payload. When that request resolves successfully, the mounted row SHALL replace Retry with Retrying… and clear its action error. That acknowledgement SHALL NOT certify completed recovery or remove the row from the loaded list.

#### Scenario: Retry resolves successfully
- **WHEN** a person's Retry request resolves successfully for a loaded failure
- **THEN** its row remains, Retrying… replaces Retry and its action error clears

#### Scenario: Retry response is still pending
- **WHEN** a retry request has started but has not resolved
- **THEN** Retry remains visible without a request-pending lock or Retrying… acknowledgement

### Requirement: Retain failed-capture rows after rejected retry

A rejected retry SHALL retain the mounted row, show retry error guidance and leave Retry available for another attempt unless an overlapping successful request has already acknowledged retry. The action error SHALL clear on a later successful action rather than on starting another retry. Repeated activation before acknowledgement SHALL NOT imply deduplicated dispatch.

#### Scenario: Retry rejects without overlap
- **WHEN** the retry request rejects and no overlapping retry has succeeded
- **THEN** the row remains with Retry failed. Please try again. and an available Retry action

#### Scenario: Try retry again
- **WHEN** the person activates Retry again after rejection
- **THEN** another request targets the same failure ID and existing error remains until an action succeeds

### Requirement: Accept retry by resetting existing failed work

For an eligible failed capture, successful retry persistence SHALL queue its most recently updated failed task for immediate eligibility, clear that task's private diagnostics and resume the existing workflow as processing. The response SHALL be 202 with data.queued true. Retry SHALL retain task identity and retry count and SHALL NOT create a replacement capture or imply successful worker execution.

#### Scenario: Persist an eligible retry
- **WHEN** retry persistence succeeds for a paused capture with a failed task
- **THEN** the selected task becomes pending and due now, its error and stack trace clear, and its existing workflow becomes processing
- **AND** task and workflow update times advance while task identity and retry count remain

#### Scenario: Retry reaches an ineligible identity
- **WHEN** the requested workflow is missing or no longer qualifies as a paused failed capture
- **THEN** retry is rejected without resetting a task through that request

### Requirement: Confirm and lock failed-capture clearing

Clear SHALL ask for confirmation before sending DELETE `/api/captures/failures/{id}` using the loaded failure ID. Cancelling SHALL send no clear request. After confirmation, Clear SHALL be disabled for that row until the request settles. This per-row lock SHALL NOT imply locking Retry or coordinating concurrent retry and clear requests.

#### Scenario: Cancel clear confirmation
- **WHEN** the person dismisses the clear confirmation without accepting
- **THEN** the row remains and no DELETE is sent

#### Scenario: Confirm clear and wait
- **WHEN** the person accepts clear confirmation
- **THEN** DELETE targets the failure ID and that row's Clear control is disabled while awaiting its result

### Requirement: Apply clear acknowledgement to the loaded list

When Clear resolves successfully, the mounted list SHALL remove that row and clear its action error. Removing the last row SHALL hide the section. The UI SHALL NOT wait for queued residue cleanup or observe its command before removing the row.

#### Scenario: Clear one of multiple rows
- **WHEN** a clear request resolves successfully while other rows remain
- **THEN** only the targeted row is removed from the loaded list

#### Scenario: Clear the final row
- **WHEN** clear resolves successfully for the final loaded row
- **THEN** the row and failed-capture section disappear without waiting for background cleanup

### Requirement: Retain failed-capture rows after rejected clear

A rejected Clear SHALL retain the mounted row, show the same retry error guidance used for retry rejection and release the Clear lock. Another Clear SHALL require confirmation again. Rejection SHALL NOT be presented as successful removal or completed cleanup.

#### Scenario: Clear rejects
- **WHEN** a confirmed clear request rejects while the row remains mounted
- **THEN** the row remains, Retry failed. Please try again. appears and Clear becomes available again

#### Scenario: Try clearing again
- **WHEN** the person activates Clear after a rejected attempt
- **THEN** confirmation is requested again and acceptance sends another DELETE for the same failure ID

### Requirement: Persist clear and return queued cleanup identity

Successful clearing of an eligible failed capture SHALL remove its workflow and dependent tasks, queue residue cleanup with the workflow and available recipe identities, and return 202 with data.cleared true and data.cleanupCommandId. Missing workflows SHALL return 404 and nonclearable workflows 409. The acknowledgement SHALL establish saved removal and queued cleanup, not completed file or recipe deletion.

#### Scenario: Clear persistence succeeds
- **WHEN** an eligible clear persists successfully
- **THEN** the workflow and dependent tasks are removed and a pending residue cleanup command is saved with its returned nonempty command ID

#### Scenario: Clear is no longer eligible
- **WHEN** the target workflow is missing or is no longer a paused failed capture
- **THEN** clear returns 404 for absence or 409 for ineligibility without queuing cleanup through that request

### Requirement: Protect usable recipe content during failed-capture cleanup

Clear SHALL soft-delete associated unfinished recipe residue only when it is neither discoverable nor named with images or synthesized content. Queued cleanup SHALL recheck that same safety condition before removing recipe storage and the recipe record. Safe content SHALL be retained even though its failed workflow can be cleared. This SHALL NOT define manual issue resolution or ordinary Recycle Bin purge.

#### Scenario: Clear unfinished residue
- **WHEN** clear succeeds for an associated recipe failing the usable-content safety condition
- **THEN** that recipe is soft-deleted with failed-capture clear provenance and discoverability false while its storage awaits cleanup

#### Scenario: Cleanup still finds unfinished residue
- **WHEN** the queued consumer executes and the associated recipe still fails the safety condition
- **THEN** it removes any existing recipe directory recursively and removes the recipe record, recording the outcome when persistence succeeds

#### Scenario: Content is usable at clear or cleanup
- **WHEN** the associated recipe is discoverable or has a nonblank name with images or synthesized content
- **THEN** clear retains that recipe and cleanup skips deleting it if the condition still holds when checked

### Requirement: Distinguish subsequent failure reads from stale mounted state

After accepted retry or clear persistence, a subsequent successful list read SHALL exclude that workflow unless it again qualifies as a paused failed capture. Mounted Settings SHALL NOT automatically poll, refetch or invalidate this list after retry, worker completion or cleanup. A fresh mount SHALL request current failures; local Retrying… SHALL NOT establish terminal status.

#### Scenario: Read after accepted retry
- **WHEN** a new successful list read follows accepted retry with no intervening pause and failed task
- **THEN** that workflow is absent even if recipe recovery has not completed

#### Scenario: Read after clear
- **WHEN** a new successful list read follows clear with the workflow still absent
- **THEN** that failure is absent regardless of whether residue cleanup has executed

#### Scenario: Work changes while Settings remains mounted
- **WHEN** a retried workflow completes or fails again while the same Settings section remains mounted
- **THEN** its existing local row and Retrying… acknowledgement are not automatically reconciled with that outcome

### Requirement: Select unnamed stored recipes for bulk import requests

POST `/api/recipes/imports/bulk` SHALL select nondeleted recipes whose name is null and request a recipe-import workflow for each selected identity. A nonnull name, including an empty name, SHALL exclude a recipe. Selection SHALL NOT require a saved issue, failed task or eligible contextual feedback. Shared household authentication SHALL retain household-identity ownership.

#### Scenario: Select unnamed recipes
- **WHEN** bulk import is requested with two nondeleted recipes whose names are null and orchestration succeeds
- **THEN** one recipe-import request is made for each selected recipe with its recipe identity

#### Scenario: Exclude named or deleted records
- **WHEN** stored recipes have nonnull names or have been soft-deleted
- **THEN** those recipes are excluded from bulk selection

#### Scenario: An unnamed recipe already has work
- **WHEN** an unnamed nondeleted recipe has an existing workflow and bulk import is requested again
- **THEN** that existing workflow does not exclude it from another import request

### Requirement: Return accepted bulk workflow identities without certifying repair

After all selected bulk import requests return successfully, the API SHALL return unwrapped 202 with queuedCount equal to the number of returned workflow identities and instanceIds containing those identities. An empty selection SHALL return zero and an empty list. This acknowledgement SHALL NOT certify worker execution, recipe readiness, corrected content or report resolution.

#### Scenario: Nonempty bulk acceptance
- **WHEN** every selected recipe's workflow trigger returns successfully
- **THEN** the response is 202 with queuedCount matching instanceIds and the returned identities describe workflows rather than recipe IDs

#### Scenario: No eligible unnamed records
- **WHEN** bulk selection is empty
- **THEN** the response is 202 with queuedCount zero and instanceIds empty

### Requirement: Count stored recipe-import workflows in the import summary

GET `/api/recipes/import-status` SHALL return unwrapped 200 with importedCount counting Completed recipe-import instances, queueCount counting Pending plus Processing recipe-import instances and failedCount counting Failed recipe-import instances. It SHALL count workflow instances rather than recipes or reports and SHALL exclude other workflow types and Paused instances from these counts.

#### Scenario: Count stored import states
- **WHEN** recipe-import instances exist in Completed, Pending, Processing, Failed and Paused states
- **THEN** the first four contribute to their specified counters and Paused contributes to none

#### Scenario: Other workflow types exist
- **WHEN** url-import or other workflow types have stored states
- **THEN** they contribute to none of these import-summary counters

#### Scenario: No counted instances exist
- **WHEN** no recipe-import instances occupy a counted state
- **THEN** all three counters are zero

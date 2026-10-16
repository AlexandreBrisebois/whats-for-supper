# Recipe quality Specification

## Purpose

Let household members report problems with existing recipes, save feedback for review, and observe contextual re-import attempts requested by that submission where connected.

## Evidence and qualifications (non-normative)

Promoted under A74 from the reviewed recipe-quality baseline delta. BSL-recipe-quality-001–006 in the [durable plan](../../../docs/openspec-baseline-plan.md) records source support, inspected assertions and promotion evidence. Application behavior was not runtime-qualified; A34 remains deferred. U01/U75–U79 retain contextual URL dispatch, member polling access, resumed observation, response freshness and completion limitations. Successful processing retains a report for review; automatic resolution is not claimed.

Historical BSL-household-identity-014/015 and U22 qualification retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-quality requirement, new lifecycle approval or runtime result. A69's description-status caveat and feature-enabled PDF boundaries/U70–U74 remain unchanged. Promotion updates documentation only; the source change remains active and is not archived.

Review/manual-resolution additions promoted under A76 from `baseline-recipe-quality-review-resolution`; BSL-recipe-quality-007–011 and U80–U83 in the durable plan retain the actual review labels, DELETE conflict-contract gap, loaded-parent freshness and unqualified retry/access/database boundaries. General search remains a dependency of the uncreated recipe-search capability. Promotion adds documentation only, without runtime qualification or archival.

Remaining baseline additions accepted and promoted under RQ-P01 (2026-10-16) from `baseline-recipe-quality-cooking-feedback`, `baseline-recipe-quality-failure-references` and `baseline-recipe-quality-bulk-import-observation`. BSL-recipe-quality-017–019 and the completeness audit in the [capability plan](../../../docs/openspec-baseline/recipe-quality.md) record evidence and ownership. A34, U01, U75–U88 (including the U83 assertion correction), RQ-Q01–RQ-Q04 and all historical qualifications remain. Promotion establishes documentation acceptance, not runtime/database/clipboard/model qualification, execution, repair, cleanup, delivery or report resolution. The changes remain active and unarchived.

## Requirements

### Requirement: Offer reporting from loaded recipe detail

Successfully loaded recipe detail in viewing mode SHALL offer Report issue when no issue is returned and Review issue when one exists. The action SHALL open the issue form. It SHALL be absent while detail is loading or being edited. Shared access, member context and detail loading SHALL follow existing household-identity and recipe-library requirements.

#### Scenario: Open a new report
- **WHEN** a person opens the gear menu on loaded viewing-mode detail without an issue and activates Report issue
- **THEN** the Report issue dialog opens with no reasons selected and an empty collapsed note

#### Scenario: Open existing feedback
- **WHEN** a person activates Review issue on loaded detail with an issue
- **THEN** the Review issue dialog opens with the returned reasons selected and its note prefilled, expanded when nonempty

#### Scenario: Detail is loading or being edited
- **WHEN** detail retrieval is pending or the detail field editor is open
- **THEN** the reporting menu is absent

### Requirement: Dismiss and reopen an unsubmitted issue form

Close, the surrounding backdrop and Escape SHALL dismiss the issue form. Reopening after dismissal before submission SHALL initialize from the currently loaded issue rather than retain discarded local edits. Opening SHALL initially focus Close and expose a named modal dialog.

#### Scenario: Dismiss without submitting
- **WHEN** a person changes reasons or note then dismisses before Save through Close, backdrop or Escape
- **THEN** the form closes without submitting that draft

#### Scenario: Reopen discarded feedback
- **WHEN** the person reopens after an unsubmitted dismissal with unchanged loaded detail
- **THEN** reasons and note initialize again from the loaded issue, or empty values for a new report

### Requirement: Select issue reasons and an optional note

The form SHALL offer Ingredients, Steps and Duplicate with pressed states. Ingredients and Steps SHALL be combinable; selecting Duplicate SHALL clear content reasons, and selecting a content reason SHALL clear Duplicate. Without content-report eligibility, unselected content reasons SHALL be disabled with an explanation while Duplicate remains available. The note SHALL allow up to 500 characters.

#### Scenario: Select both content reasons
- **WHEN** an eligible person selects Ingredients and Steps
- **THEN** both remain selected and the note expands with guidance to add a note for re-import

#### Scenario: Switch to or from Duplicate
- **WHEN** a person selects Duplicate after content reasons, or a content reason after Duplicate
- **THEN** the previous incompatible selection clears and the new selection remains pressed

#### Scenario: No content eligibility
- **WHEN** loaded detail says content reporting is ineligible and no content reason is selected
- **THEN** Ingredients and Steps are disabled, Duplicate is enabled and the form explains content ineligibility

### Requirement: Submit feedback through Save with bounded pending feedback

Save SHALL be disabled without a selected reason, during its pending submission, or while the returned issue is re-importing. Save SHALL submit selected reasons and a trimmed note, using null for blank text. While the issue is re-importing, reason and note controls SHALL also be disabled and associated with a re-import explanation.

#### Scenario: Submit a normalized note
- **WHEN** a person saves selected Steps with note `  Check oven temperature  `
- **THEN** the submission carries Steps and `Check oven temperature`

#### Scenario: Submit without a note
- **WHEN** a person saves a selected reason with empty or whitespace-only note
- **THEN** the submission carries null note

#### Scenario: Submission or processing is pending
- **WHEN** a Save submission is pending or loaded feedback indicates re-importing
- **THEN** Save is disabled; during re-importing, reason and note controls are disabled with an explanation that updates can follow completion

### Requirement: Retain the open draft on submission error

A rejected Save SHALL display a retry error, end submission busy state and retain reasons and note while the form remains mounted. A response indicating saved feedback but failed launch SHALL retain the form and show that the report was saved but re-import could not start. Starting another Save SHALL clear the prior error.

#### Scenario: Save rejects
- **WHEN** a Save rejects while the form remains open
- **THEN** the form retains input and shows Could not save changes. Try again., with eligible Save available again

#### Scenario: Launch fails after feedback is saved
- **WHEN** the submission returns saved recipe detail with launch failure
- **THEN** detail applies the returned recipe and the open form shows that the report was saved but re-import could not start

### Requirement: Validate report input at submission

For an authorized submission, the API SHALL require a known member and recipe, one or more unique supported reasons and a note no longer than 500 characters after trimming. Content-only reporting SHALL require a recipe with a nonempty source URL or positive image count. Duplicate-only reporting SHALL remain available without that provenance. Existing household access requirements apply.

#### Scenario: Reject invalid reason or note input
- **WHEN** a submission supplies no reasons, a repeated or unsupported reason, or a trimmed note longer than 500 characters
- **THEN** it is rejected with 400

#### Scenario: Reject absent or unknown identity
- **WHEN** submission has no parseable member context, or identifies an unknown member or recipe
- **THEN** absent context returns 400 and unknown member or recipe returns 404

#### Scenario: Content-only report lacks provenance
- **WHEN** Ingredients or Steps without Duplicate is submitted for a recipe with neither source URL nor images
- **THEN** the API returns 409

### Requirement: Persist recipe-level feedback before attempting re-import

When valid report persistence succeeds, the API SHALL create or update the recipe's single report with normalized reasons, trimmed-null note and reporting/update attribution. Successful submission SHALL return 200 with updatedAt, authoritative recipe detail, reimportStarted, nullable importId and reimportLaunchFailed outside a data envelope. Saving a report SHALL NOT imply workflow completion.

#### Scenario: Save a manual-only report
- **WHEN** valid Duplicate feedback is saved successfully without a prior active attempt
- **THEN** the recipe has one report and the response contains its reported issue with no new import ID or started attempt

#### Scenario: Update saved feedback
- **WHEN** changed valid feedback is saved with no active linked attempt
- **THEN** the existing recipe report is updated rather than another report being added, retaining original reporting attribution and recording the updating member

### Requirement: Let the server decide whether feedback requests contextual processing

Any submission containing Duplicate SHALL remain manual-only. Content feedback without a nonblank note SHALL also remain manual-only. Content-only feedback with a nonblank note and eligible provenance SHALL be considered for contextual re-import under repeated-feedback rules. A successfully started attempt SHALL return its import ID; eligibility alone SHALL NOT imply successful launch or correction.

#### Scenario: Duplicate remains manual-only with content reasons
- **WHEN** the API accepts a valid report containing Duplicate together with content reasons and a note
- **THEN** that submission does not start contextual re-import

#### Scenario: Blank note remains manual-only
- **WHEN** an eligible recipe receives content-only feedback with null or trimmed-blank note and no prior active attempt
- **THEN** feedback is saved without starting contextual re-import

#### Scenario: Eligible launch succeeds
- **WHEN** eligible content-only feedback has a nonblank note, no matching prior attempt and contextual launch and attempt linking succeed
- **THEN** submission returns reimportStarted true and the attempt's nonempty import ID

### Requirement: Reuse active feedback and avoid unchanged terminal retries

Eligible contextual feedback matching a linked active attempt SHALL reuse its import ID. Changed feedback SHALL be rejected while that attempt is active. Matching feedback for a linked terminal attempt SHALL save without starting another attempt. Changed eligible feedback after a terminal attempt SHALL be considered for a new attempt rather than treated as the previous feedback.

#### Scenario: Repeat active feedback
- **WHEN** eligible contextual feedback has normalized reasons and trimmed note matching the linked pending or processing attempt
- **THEN** the response returns that same import ID with reimportStarted true without creating another attempt

#### Scenario: Change active feedback
- **WHEN** feedback changes while its linked attempt is pending or processing
- **THEN** submission returns 409 without replacing saved feedback

#### Scenario: Repeat terminal feedback
- **WHEN** normalized feedback matches the linked completed, failed or paused attempt
- **THEN** submission saves without starting another attempt or returning a new import ID

#### Scenario: Change terminal feedback
- **WHEN** feedback changes after the linked attempt is terminal and the new feedback is eligible
- **THEN** it is considered for a new contextual attempt, subject to launch success

### Requirement: Apply the authoritative submission result in detail

After successful Save without launch failure, detail SHALL display the returned recipe and dismiss the form. A started attempt with an import ID SHALL show background re-import acknowledgement. Manual-only saves SHALL show report/change acknowledgement; unchanged failed feedback SHALL instead explain that new detail is needed for another re-import attempt.

#### Scenario: Successful manual save
- **WHEN** a new manual-only report submission succeeds in detail
- **THEN** the form closes, returned issue detail is displayed and Marked for review acknowledgement appears

#### Scenario: Started attempt acknowledgement
- **WHEN** detail receives reimportStarted true and an import ID without launch failure
- **THEN** it closes the form and shows Reimporting in background

### Requirement: Observe a returned import ID while detail remains active

After receiving a started import ID, detail SHALL request that import's status and continue polling nonterminal results. A completed, failed or paused result SHALL cause detail retrieval for the target recipe; a successful refresh SHALL replace local detail and end polling. Responses for an import no longer watched SHALL be ignored. Polling errors SHALL leave the current watch eligible for another poll while mounted.

#### Scenario: Processing followed by terminal refresh
- **WHEN** the watched import returns processing and later completed, failed or paused, and target detail refresh succeeds
- **THEN** detail continues polling until that terminal result, applies refreshed detail and stops polling

#### Scenario: Ignore a superseded response
- **WHEN** a status or terminal detail response arrives after its import ID is no longer watched
- **THEN** it does not replace local detail or schedule further polling for that watch

#### Scenario: Status request rejects
- **WHEN** a status request rejects while its ID remains watched
- **THEN** another status poll is scheduled without treating rejection as completion

### Requirement: Expose guarded contextual processing outcomes

Connected processing SHALL use submitted feedback as source-examination guidance. A successful matching completion update SHALL expose readyToReview for content-only feedback and clear pending/failure feedback, retaining the report. A matching recorded fatal failure SHALL expose reported status, end pending state and provide saved-report retry guidance and its import ID. Stale attempt updates SHALL leave the current report unchanged.

#### Scenario: Matching content processing succeeds
- **WHEN** the linked content-only attempt reaches its report-completion update successfully
- **THEN** the issue becomes readyToReview with isReimporting false and no failure message, and remains present for review

#### Scenario: Matching fatal failure is recorded
- **WHEN** a fatal failure update is saved for the report's linked attempt
- **THEN** the issue remains reported with isReimporting false, saved-report guidance to add or change a detail, and the failed import ID

#### Scenario: Older processing finishes after another attempt is linked
- **WHEN** success or failure is recorded for an older import ID
- **THEN** it does not alter the report linked to the current import ID

### Requirement: Display returned issue indicators

Detail and library surfaces that receive issue status SHALL display Reported for reported and Review for readyToReview, with accessible descriptions distinguishing a reported recipe from an updated recipe ready for review. Detail SHALL display returned re-import failure guidance. Indicator rendering SHALL NOT imply immediate refresh of every already loaded library surface.

#### Scenario: Render a returned report status
- **WHEN** detail or a supported library card receives reported status
- **THEN** it displays Reported with the accessible description Recipe reported

#### Scenario: Render a returned review status
- **WHEN** detail or a supported library card receives readyToReview status
- **THEN** it displays Review with the accessible description Recipe updated — ready to review

### Requirement: Discover and apply recipe review filters

The Recipes page SHALL expose Reported and Ready to review through Filters and More filters. Selected review filters SHALL remain visible when More filters is collapsed. Review-filter changes SHALL remain drafts until Apply filters; dismissal SHALL leave the applied selection unchanged. Desktop and mobile SHALL use the same filter choices with responsive dialog placement.

#### Scenario: Reveal review choices
- **WHEN** a person opens Filters with neither review filter selected and expands More filters
- **THEN** Reported and Ready to review become available; the dialog is bottom-aligned on small screens and centered on desktop

#### Scenario: Apply a review selection
- **WHEN** the person selects a review filter and activates Apply filters
- **THEN** the dialog closes, the applied filter count updates and a search is requested with that review selection

#### Scenario: Dismiss a changed review draft
- **WHEN** a person changes review selections then dismisses the filter dialog without applying
- **THEN** the applied filters and results are not changed by that draft

#### Scenario: Retain selected review choices after collapse
- **WHEN** More filters is collapsed while a review choice is selected in the draft
- **THEN** that selected choice remains visible with its pressed state

### Requirement: Select saved issue membership for review

For otherwise matching search candidates, Reported SHALL include recipes with any saved issue, including ready, pending and failed issues. Ready to review SHALL include only issues whose saved status is readyToReview. When both filters are active, Ready to review SHALL take precedence. Other active search constraints SHALL continue to apply under recipe-search ownership.

#### Scenario: Reported is a superset
- **WHEN** Reported is applied to matching recipes with reported, re-importing, failed, ready and absent issues
- **THEN** all recipes with an issue qualify for the review predicate and the recipe without one does not

#### Scenario: Select ready reports
- **WHEN** Ready to review is applied to those candidates
- **THEN** only the candidate with a readyToReview issue qualifies for the review predicate

#### Scenario: Both review filters are selected
- **WHEN** Reported and Ready to review are both applied
- **THEN** review membership uses the readyToReview subset

#### Scenario: Compose review with current search constraints
- **WHEN** a review filter is applied with text or other active search filters
- **THEN** having a matching issue does not bypass those other constraints

### Requirement: Present review matches as ordinary results

While either review filter is active, the Recipes page SHALL show matching result cards under Results without a Top Pick hero. Cards SHALL reuse the existing issue indicators. A successful empty filtered result SHALL offer filter-removal guidance and Clear Filters. This review presentation SHALL NOT define general ranking or promotion policy.

#### Scenario: Receive review matches
- **WHEN** a successful search with an active review filter returns ordinary results and a Top Pick value
- **THEN** the page displays the ordinary result cards and their supplied indicators, suppresses the Top Pick hero and labels the section Results

#### Scenario: Receive no review matches
- **WHEN** a successful search with an active review filter returns no ordinary matches
- **THEN** the page shows No matches with these filters. Try removing one. and offers Clear Filters

### Requirement: Offer explicit manual resolution for an existing issue

An existing issue's Review issue form SHALL offer Mark as resolved with an explanation that it removes the recipe from Needs review. A readyToReview issue SHALL give that action stronger visual emphasis and ask the person to check the recipe before resolving. A new report form SHALL omit resolution. Existing requirements govern opening and initializing the form, reason/note behavior and pending/failure guidance.

#### Scenario: Review a reported issue
- **WHEN** the Review issue form displays a reported issue
- **THEN** Mark as resolved and Removes this recipe from Needs review. are displayed

#### Scenario: Review an updated recipe
- **WHEN** the form displays a readyToReview issue
- **THEN** Mark as resolved has stronger emphasis and the form says to check the recipe and mark it resolved when it looks right

#### Scenario: No saved issue exists
- **WHEN** the new Report issue form is opened without a saved issue
- **THEN** Mark as resolved is absent

### Requirement: Lock resolution during submission and contextual processing

Mark as resolved SHALL be disabled while Save or resolution is pending, or the returned issue indicates re-importing. During re-importing it SHALL be associated with the explanation that updates can follow completion. These control locks SHALL NOT imply that dialog dismissal or every form input is locked during a foreground submission.

#### Scenario: Foreground submission remains pending
- **WHEN** Save or Mark as resolved has started and its callback is still pending
- **THEN** Mark as resolved cannot start another resolution

#### Scenario: Loaded issue is re-importing
- **WHEN** the form receives an issue marked as re-importing
- **THEN** Mark as resolved is disabled and associated with Reimporting recipe… You can update this after it finishes.

### Requirement: Address manual resolution to the loaded recipe with member context

Manual resolution from detail SHALL send DELETE to that recipe's import-report resource without submitting the local reason/note draft. The API SHALL require parseable member context and an existing member and recipe. Household authentication and identity transport SHALL follow household-identity requirements; this SHALL NOT imply qualification of every household member's access to every related import operation.

#### Scenario: Resolve the loaded recipe
- **WHEN** a person activates enabled Mark as resolved on loaded recipe detail
- **THEN** the client requests DELETE /api/recipes/{id}/import-report using that recipe ID and current member context, without a feedback payload

#### Scenario: Missing parseable member context
- **WHEN** an otherwise authorized resolution request has no parseable member context
- **THEN** the API returns 400 without removing the report

#### Scenario: Unknown member or recipe
- **WHEN** an otherwise authorized resolution request identifies an unknown member or recipe
- **THEN** the API returns 404 without removing an existing report

### Requirement: Remove saved feedback through repeatable manual resolution

When permitted resolution persistence succeeds, the API SHALL remove the recipe's saved issue and return 200 with updatedAt and authoritative recipe detail containing importIssue null outside a data envelope. A repeat request with valid member and recipe SHALL also return cleared issue detail. Resolution SHALL NOT assert that recipe content was corrected or initiate re-import.

#### Scenario: Remove an existing report
- **WHEN** a permitted resolution of an existing report persists successfully
- **THEN** that report is removed and the response contains authoritative recipe detail with importIssue null

#### Scenario: Repeat resolution without a report
- **WHEN** resolution is requested again with an existing member and recipe and no intervening report
- **THEN** it returns 200 and recipe detail with importIssue null

### Requirement: Reject resolution while the linked contextual attempt is active

The API SHALL reject resolution without deleting saved feedback when the report's linked contextual attempt exists and is pending or processing. A linked completed, failed or paused attempt SHALL NOT by itself prevent manual resolution. Public issue status alone SHALL NOT establish whether the linked attempt is active.

#### Scenario: Resolve during a linked active attempt
- **WHEN** a resolution request reaches a report linked to an existing pending or processing attempt
- **THEN** the request is rejected and the report remains saved

#### Scenario: Resolve after a linked terminal attempt
- **WHEN** a report is linked to a completed, failed or paused attempt and permitted resolution persists successfully
- **THEN** the report is removed and cleared issue detail is returned

### Requirement: Apply successful resolution to the open detail

After a successful resolution response, detail SHALL replace its local recipe with the returned recipe, dismiss the issue form and acknowledge Marked as resolved. Returned cleared issue detail SHALL remove its issue indicator and change its gear action to Report issue. This acknowledgement SHALL NOT imply that every already loaded parent result was refreshed.

#### Scenario: Apply the authoritative cleared response
- **WHEN** detail receives a successful resolution response with importIssue null
- **THEN** the form closes, local detail uses the returned recipe, its issue indicator disappears and Marked as resolved is acknowledged

#### Scenario: Open the gear menu after resolution
- **WHEN** the person opens the detail gear menu after that cleared response
- **THEN** it offers Report issue instead of Review issue

### Requirement: Retain the mounted issue draft after resolution failure

A rejected resolution SHALL keep the mounted issue form open with its reason/note draft, show Could not mark as resolved. Try again. and end its busy state. A new eligible resolution attempt SHALL clear the previous error and retry. Recovery success SHALL remain conditional on that request's outcome.

#### Scenario: Resolution request rejects
- **WHEN** resolution rejects while the form remains mounted
- **THEN** its reason/note draft remains, the retry error appears and resolution becomes available again unless re-importing

#### Scenario: Try resolution again
- **WHEN** a person activates enabled Mark as resolved after rejection
- **THEN** the old error clears and another resolution is requested with submission locking

### Requirement: Reflect persisted resolution in subsequent successful reads

After report removal, a subsequent successful detail read SHALL return importIssue null and a new search SHALL exclude that recipe from both review predicates and return no issue status if it otherwise appears. These outcomes assume no intervening report creation and SHALL NOT imply immediate mutation of already loaded results or a search continuation snapshot.

#### Scenario: Read detail after resolution
- **WHEN** detail is successfully retrieved after report removal with no intervening report
- **THEN** it returns importIssue null and displays no issue indicator

#### Scenario: Search again after resolution
- **WHEN** a new search reads persisted state after report removal with no intervening report
- **THEN** the recipe is absent from Reported and Ready to review matches; if returned by another search it has no issue indicator

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

### Requirement: Merge contextual issue reasons with loaded saved feedback

When opened with a contextual reason, the shared issue form SHALL initialize with the saved issue reasons and note and add that reason only if absent. Context initialization SHALL NOT discard a saved Duplicate reason. Subsequent reason toggling and server manual-only Duplicate policy SHALL retain their existing recipe-quality meanings. Cooking entry, return and acknowledgement SHALL remain cooking-owned.

#### Scenario: Initialize a new contextual report
- **WHEN** the form opens without a saved issue and with Ingredients context
- **THEN** Ingredients is selected and the note starts empty

#### Scenario: Extend saved content feedback
- **WHEN** the form opens with saved Ingredients feedback and a note using Steps context
- **THEN** Ingredients and Steps are selected once each and the saved note remains

#### Scenario: Context overlaps a saved Duplicate reason
- **WHEN** the form opens with saved Duplicate feedback and Steps context
- **THEN** Duplicate and Steps initialize together, and an unchanged submission remains subject to the existing manual-only Duplicate policy

### Requirement: Offer failure reference copy controls when identifiers are returned

When the issue form receives both re-import failure guidance and a failed import ID, it SHALL offer Copy import ID and, when supplied, Copy recipe ID. Without both guidance and failed import ID it SHALL omit these controls. The controls SHALL use returned identifiers, without inferring that the attempt repaired the recipe or resolved its report.

#### Scenario: Both references are available
- **WHEN** the mounted issue form receives failure guidance, a failed import ID and a recipe ID
- **THEN** Copy import ID and Copy recipe ID are available

#### Scenario: Only the failed import reference is available
- **WHEN** the form receives failure guidance and failed import ID without a recipe ID
- **THEN** Copy import ID is available and Copy recipe ID is absent

#### Scenario: Failure guidance or import reference is absent
- **WHEN** the form lacks either failure guidance or a failed import ID
- **THEN** neither reference-copy control is shown

### Requirement: Acknowledge successful failure reference copying

Activating a failure reference control SHALL request clipboard writing of its corresponding identifier. After that request succeeds while the form remains mounted, the selected control SHALL display Copied and schedule its acknowledgement to clear after 1500 milliseconds. This SHALL NOT save feedback, resolve a report or retry an import.

#### Scenario: Copy a recipe reference successfully
- **WHEN** Copy recipe ID is activated and its clipboard write succeeds
- **THEN** the supplied recipe ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled

#### Scenario: Copy an import reference successfully
- **WHEN** Copy import ID is activated and its clipboard write succeeds
- **THEN** the supplied failed import ID has been passed to clipboard writing and that control displays Copied with timed reset scheduled

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

### Requirement: Restrict import identity reads to attributed recipe context

GET `/api/recipe-imports/{importId}` SHALL require bindable existing member context and an existing nondeleted recipe identified by the workflow's recipeId parameter with matching added-by attribution. A permitted read SHALL return unwrapped 200 with stored workflow detail. Missing or inaccessible imports SHALL return 404. Shared identity transport and background-processing stored-state meanings SHALL retain their existing ownership.

#### Scenario: Read an attributed import
- **WHEN** an existing member requests an existing import whose recipeId names that member's nondeleted recipe
- **THEN** the API returns 200 with that stored instance's identity, status and workflow detail

#### Scenario: Another known member requests the import
- **WHEN** a known member requests an import whose associated recipe was added by another member
- **THEN** the API returns 404 rather than that workflow detail

#### Scenario: Import or recipe context is absent
- **WHEN** the import is absent or its recipeId does not identify an accessible nondeleted recipe
- **THEN** the API returns 404 without successful import detail

# Recipe quality delta

## Purpose

Let household members report problems with existing recipes, save feedback for review, and observe contextual re-import attempts requested by that submission where connected.

## ADDED Requirements

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

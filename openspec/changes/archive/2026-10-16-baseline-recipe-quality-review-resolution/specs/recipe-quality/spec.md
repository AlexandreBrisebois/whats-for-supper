# Recipe quality review and resolution delta

## ADDED Requirements

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

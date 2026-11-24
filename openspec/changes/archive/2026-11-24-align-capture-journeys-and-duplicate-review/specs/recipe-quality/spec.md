# Spec Delta

## ADDED Requirements

### Requirement: Flag suspected duplicates automatically for human review

When a recipe transitions to ready or is imported from a shared bundle and matches an existing ready non-deleted library recipe by normalized source URL or normalized title and ingredient overlap, and the recipe has no existing import report, the system SHALL persist a reported import issue with reason `duplicate` without deleting either recipe. Issue detail responses SHALL include nullable `suspectedDuplicateRecipeId` naming the best live match when `duplicate` is present.

#### Scenario: Finalized or bundle-imported duplicate creates a reported duplicate issue

- **WHEN** a newly finalized or bundle-imported recipe has no existing import report and matches an existing ready non-deleted household recipe by normalized source URL, exact normalized title, or high title and ingredient overlap
- **THEN** both recipes remain in the library and the new recipe receives a saved `reported` import issue with `reasons: ["duplicate"]`

#### Scenario: Existing import report is preserved

- **WHEN** a recipe already has a saved import report when readiness completes
- **THEN** automatic duplicate detection does not overwrite its existing reasons, note, or attribution

#### Scenario: Detail issue response exposes live suspected duplicate identity

- **WHEN** recipe detail or report submission returns an `importIssue` whose `reasons` include `duplicate`
- **THEN** `importIssue.suspectedDuplicateRecipeId` identifies the highest-scoring ready non-deleted matching recipe, or `null` when no live match remains

### Requirement: Resolve suspected duplicates through paired comparison

When a loaded recipe has a `duplicate` import issue with a non-null `suspectedDuplicateRecipeId`, the client SHALL offer a Paired Duplicate Review modal reachable from the completion toast, detail issue badge, and `Review issue` action. The sheet SHALL display the new and existing recipes together without a header divider line and offer `Keep both recipes`, `Keep existing · move new to Bin`, and `Keep new · move existing to Bin` using existing resolution and Recycle Bin operations.

#### Scenario: Open paired comparison from toast, review filter detail, or detail badge

- **WHEN** a person opens `/recipes?open=<id>&reviewDuplicate=1` from the duplicate completion toast, or activates the detail issue badge or `Review issue` on a recipe whose `importIssue` has `duplicate` and a non-null `suspectedDuplicateRecipeId`
- **THEN** the Paired Duplicate Review modal opens with both recipes loaded side-by-side (`NEW IMPORT` and `EXISTING IN LIBRARY`), an open-cream header + `48 × 48 CSS px` circular Close (`×`) without a header divider line, and preview access for each recipe without hunting through the library

#### Scenario: Keep both recipes clears the duplicate issue

- **WHEN** a person activates `Keep both recipes` (`variant="secondary"`) in Paired Duplicate Review
- **THEN** the client sends `DELETE /api/recipes/{newId}/import-report`, both recipes remain active in the library, and the duplicate issue indicator clears

#### Scenario: Keep existing moves the new copy to Recycle Bin

- **WHEN** a person activates `Keep existing · move new to Bin` (`variant="danger"`) in Paired Duplicate Review
- **THEN** the client soft-deletes the newly imported recipe via `DELETE /api/recipes/{newId}` into Recycle Bin (where it remains recoverable) and keeps the existing recipe active

#### Scenario: Keep new moves the existing copy to Recycle Bin and clears the flag

- **WHEN** a person activates `Keep new · move existing to Bin` (`variant="danger"`) in Paired Duplicate Review
- **THEN** the client soft-deletes the older recipe via `DELETE /api/recipes/{existingId}` into Recycle Bin and clears the duplicate report on the kept recipe via `DELETE /api/recipes/{newId}/import-report`

## MODIFIED Requirements

### Requirement: Offer reporting from loaded recipe detail

Successfully loaded recipe detail in viewing mode SHALL offer Report issue when no issue is returned and Review issue when one exists. Activating Review issue (or the header issue badge) SHALL open Paired Duplicate Review when the loaded issue includes `duplicate` with a non-null `suspectedDuplicateRecipeId` (offering an option to open the standard issue editor), and SHALL otherwise open the standard issue form. Reporting controls SHALL be absent while detail is loading or being edited. Shared access, member context and detail loading SHALL follow existing household-identity and recipe-library requirements.

#### Scenario: Open a new report

- **WHEN** a person opens the gear menu on loaded viewing-mode detail without an issue and activates Report issue
- **THEN** the Report issue dialog opens with no reasons selected and an empty collapsed note

#### Scenario: Open existing feedback

- **WHEN** a person activates Review issue on loaded detail with a non-duplicate issue (or a duplicate issue with null `suspectedDuplicateRecipeId`)
- **THEN** the Review issue dialog opens with the returned reasons selected and its note prefilled, expanded when nonempty

#### Scenario: Open paired duplicate review from detail

- **WHEN** a person activates Review issue or the header issue badge on loaded detail whose `importIssue` includes `duplicate` and a non-null `suspectedDuplicateRecipeId`
- **THEN** Paired Duplicate Review opens with both recipes loaded and provides an escape control to edit the underlying issue report if needed

#### Scenario: Detail is loading or being edited

- **WHEN** detail retrieval is pending or the detail field editor is open
- **THEN** the reporting menu is absent

### Requirement: Select issue reasons and an optional note

The issue form SHALL render as an Era 3 opaque `bg-cream` (`border-chrome-line`) modal with a `48 × 48 CSS px` white circular Close (`×`) button, no header divider line, and localized EN/FR copy without em-dashes. It SHALL offer `Ingredients`, `Steps`, and `Duplicate` as `>= 48 CSS px` pressed pills styled in blush terracotta (`bg-terracotta-50 border-hearth-line text-hearth-ink`) when selected and crisp white (`border-chrome-line`) when unselected, **without checkmark icons** inside the pills. `Ingredients` and `Steps` SHALL be combinable; selecting `Duplicate` SHALL clear content reasons, and selecting a content reason SHALL clear `Duplicate`. Without content-report eligibility, unselected content reasons SHALL be disabled with an explanation while `Duplicate` remains available. The note textarea (`border-icon-affordance`) SHALL allow up to 500 characters.

#### Scenario: Select both content reasons

- **WHEN** an eligible person selects Ingredients and Steps
- **THEN** both pills remain selected (`aria-pressed="true"`) using blush terracotta styling without checkmark icons, and the note expands with localized guidance to add a note for re-import

#### Scenario: Switch to or from Duplicate

- **WHEN** a person selects Duplicate after content reasons, or a content reason after Duplicate
- **THEN** the previous incompatible selection clears and the new selection remains pressed

#### Scenario: No content eligibility

- **WHEN** loaded detail says content reporting is ineligible and no content reason is selected
- **THEN** Ingredients and Steps are disabled, Duplicate is enabled and the form explains content ineligibility

### Requirement: Display returned issue indicators

Detail and library surfaces that receive issue status SHALL display Reported for reported and Review for readyToReview, with localized EN/FR labels and accessible descriptions (without em-dashes) distinguishing a reported recipe (`Recipe reported`) from an updated recipe ready for review (`Recipe ready for review`). Detail SHALL display returned re-import failure guidance. Indicator rendering SHALL NOT imply immediate refresh of every already loaded library surface.

#### Scenario: Render a returned report status

- **WHEN** detail or a supported library card receives reported status
- **THEN** it displays Reported with the accessible description Recipe reported

#### Scenario: Render a returned review status

- **WHEN** detail or a supported library card receives readyToReview status
- **THEN** it displays Review with the accessible description Recipe ready for review

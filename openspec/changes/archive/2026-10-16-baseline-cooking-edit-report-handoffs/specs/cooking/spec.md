# Cooking draft delta

## Purpose

Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.

## ADDED Requirements

### Requirement: Edit a supported cooking instruction explicitly

From a focused instruction or single-page row, cooking SHALL offer editing of that step’s source instruction without adding section context to the editable value. Save SHALL submit the instruction array for the viewed recipe with the targeted string or object field replaced, retaining other entries and section structure.

#### Scenario: Edit a legacy instruction
- **WHEN** a person edits the second supported string instruction and activates Save
- **THEN** the viewed recipe update contains the changed second string and the other instruction entries

#### Scenario: Edit a section child
- **WHEN** a person saves a child instruction in a supported section
- **THEN** the corresponding child text or name is replaced while the section and its other children remain

#### Scenario: Edit section content
- **WHEN** a section supplies a non-generic display prefix
- **THEN** the editor contains the source instruction without that added prefix

### Requirement: Apply a successful step edit locally

After a changed step update resolves successfully, cooking SHALL apply the submitted instruction array to its local recipe, reparse supported steps, close the editor and announce Step saved. Saving an unchanged supported instruction SHALL close the editor without sending an update.

#### Scenario: Save a changed step
- **WHEN** the instruction update request resolves successfully
- **THEN** the edited instruction appears locally, the editor closes and a polite Step saved announcement is supplied

#### Scenario: Save unchanged text
- **WHEN** the editor value equals the supported step’s original editable instruction
- **THEN** the editor closes without an update request

### Requirement: Cancel an unsubmitted cooking edit

Cancel SHALL discard the open instruction edit without updating the recipe. For single-page rows, cancellation SHALL request focus return to that row’s edit control.

#### Scenario: Cancel a draft
- **WHEN** a person changes instruction text and activates Cancel before saving
- **THEN** the original displayed instruction remains and no recipe update is submitted

#### Scenario: Return focus to row
- **WHEN** a single-page instruction edit is cancelled and its edit control remains mounted
- **THEN** focus is requested on that row’s edit control

### Requirement: Retain single-page edit failure and retry controls

Single-page Save and Cancel SHALL be disabled during an edit save. A rejected save SHALL retain the editor and draft, display an alert with Try again, and end pending feedback so another attempt is available. Other row editors SHALL be disabled while an editor is open.

#### Scenario: Save pending
- **WHEN** a single-page changed instruction save is still pending
- **THEN** Save and Cancel are disabled and another row editor cannot be opened

#### Scenario: Save rejects
- **WHEN** a single-page instruction update rejects
- **THEN** the draft stays open with an error alert and Try again can resubmit it

### Requirement: Hand cooking content issues to the quality form

When the loaded recipe permits content reporting and no step editor is open, preparation SHALL offer Report issue with ingredients and reading SHALL offer Report issue with steps. These controls SHALL open the shared quality form with the corresponding context and loaded issue, without opening recipe detail.

#### Scenario: Report ingredients
- **WHEN** an eligible recipe is in preparation and a person requests ingredient reporting
- **THEN** the quality form opens with ingredients context while the cooking view remains mounted

#### Scenario: Report steps
- **WHEN** an eligible recipe is being read and a person requests step reporting
- **THEN** the quality form opens with steps context and the loaded issue

#### Scenario: Reporting unavailable
- **WHEN** the loaded recipe does not permit content reporting
- **THEN** cooking does not offer its contextual report control

### Requirement: Return from quality reporting to the mounted cooking context

Dismissing the cooking report form SHALL retain the mounted ingredient checks and reading bookmark. After a successful report submission or resolution, cooking SHALL apply the returned local recipe and close the form. A submission that reports a re-import launch failure SHALL leave the form open through its existing quality error handling.

#### Scenario: Dismiss a report draft
- **WHEN** a person closes the quality form during cooking
- **THEN** the cooking checks and reading bookmark remain

#### Scenario: Report or resolve succeeds
- **WHEN** the cooking report or resolution request returns successfully without a launch failure
- **THEN** the returned recipe is applied locally and the quality form closes

#### Scenario: Launch fails after report save
- **WHEN** report submission returns its recipe with re-import launch failure
- **THEN** cooking applies that recipe but leaves the quality form open for its saved-report/launch-failure feedback

### Requirement: Acknowledge cooking report background launch locally

When cooking receives reimportStarted from a successful quality submission, it SHALL show Reimporting in background as status feedback. This acknowledgement SHALL not claim that replacement recipe content is ready.

#### Scenario: Background launch acknowledged
- **WHEN** successful cooking report submission reports that re-import started
- **THEN** the form closes and Reimporting in background status appears without a readiness claim

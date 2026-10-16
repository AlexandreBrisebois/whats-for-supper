# Household identity member-renaming delta

## ADDED Requirements

### Requirement: Open an existing household member name for editing

Onboarding and Settings SHALL offer editing for each displayed household member. Activating Edit SHALL show a name input prefilled with that member's loaded name, together with Save and Cancel controls. Opening the editor SHALL leave the current selected member unchanged.

#### Scenario: Edit from onboarding
- **WHEN** a person activates Edit for a listed member on onboarding
- **THEN** the member's loaded name appears in the editor with Save and Cancel
- **AND** opening the editor does not select that member

#### Scenario: Edit from Settings
- **WHEN** a person activates Edit for a displayed member in Settings
- **THEN** the member's loaded name appears in the editor with Save and Cancel
- **AND** opening the editor leaves the current selection unchanged

### Requirement: Cancel an unsubmitted member-name edit

Before an update is submitted, Cancel or Escape SHALL close the member-name editor without requesting a name update. Reopening the editor SHALL prefill the member's currently loaded name rather than the discarded input.

#### Scenario: Cancel through the control
- **WHEN** a person edits a member's name and activates Cancel before submitting
- **THEN** the editor closes without a name-update request or change to the displayed member name

#### Scenario: Cancel with Escape
- **WHEN** a person presses Escape in an unsubmitted member-name editor
- **THEN** the editor closes without requesting a name update

#### Scenario: Reopen after cancellation
- **WHEN** a person reopens a member's editor after cancelling unsaved input
- **THEN** the input contains that member's currently loaded name

### Requirement: Submit a trimmed nonblank member-name edit

For a nonblank edited name, Save or Enter SHALL request an update for the edited member's ID using the name with surrounding whitespace trimmed and remaining casing preserved. Trimmed-blank input SHALL disable Save and SHALL NOT issue an update through Enter.

#### Scenario: Submit with Save
- **WHEN** a person enters the valid nonconflicting name ` Jordan Chef ` and activates Save
- **THEN** the application requests an update for the edited member's ID with name `Jordan Chef`

#### Scenario: Submit with Enter
- **WHEN** a person enters a valid nonconflicting name and presses Enter in the editor
- **THEN** the application requests the same trimmed-name update for that member

#### Scenario: Blank name is not submitted
- **WHEN** the edited name is empty or whitespace-only
- **THEN** Save is disabled and pressing Enter does not request an update

### Requirement: Update and return the existing household member

For an authorized ordinary-household PUT `/api/family/{id}` with an existing ID and valid nonconflicting name, when persistence succeeds the API SHALL update that member's name and updated timestamp, retain its ID, creation timestamp and preferences, and return `200 OK` with the updated member in `data`. The saved name SHALL be trimmed while preserving remaining casing.

#### Scenario: Successful rename response
- **WHEN** an authorized PUT supplies an existing member ID and a valid nonconflicting name, and persistence succeeds
- **THEN** the response is 200 with the same ID, trimmed name, updated timestamp and unchanged creation timestamp and preferences in `data`

#### Scenario: Saved name is available on later listing
- **WHEN** a rename succeeds and a subsequent authorized family-list request succeeds
- **THEN** the list contains the existing member ID with its updated name

### Requirement: Display a renamed member without changing active identity

After a successful rename response, the application SHALL display the returned name in the edited member's list row and close the editor. Renaming SHALL leave the selected member ID, identity cookies, onboarding completion and route unchanged. Renaming the selected member SHALL make its updated name available to existing selected-name display behavior.

#### Scenario: Rename another member
- **WHEN** a person successfully renames a listed member other than the active member
- **THEN** the edited row displays the returned name and the editor closes
- **AND** selected ID, identity cookies, onboarding completion and route remain unchanged

#### Scenario: Rename the selected member
- **WHEN** a successful rename response updates the currently selected member
- **THEN** its list row displays the returned name and the editor closes
- **AND** active identity remains the same ID with the updated name available to selected-name display

## MODIFIED Requirements

### Requirement: Return member preference defaults and saved values

For successful authorized family list and current-member reads, the API SHALL expose each returned member's browse mode, saved language nullable cooking view preference and nullable discoveryControlsPosition. Newly created members SHALL start with stack mode, no preferred language no explicit cooking view and no explicit Discovery position; clients SHALL interpret an absent cooking view as All steps and an absent Discovery position as Bottom.

#### Scenario: Read a new member
- **WHEN** a newly created member is returned by a successful family read
- **THEN** browseViewMode is stack, preferredLanguage and cookingViewMode are unset, and cooking uses All steps

#### Scenario: Read saved preferences
- **WHEN** the requested existing member has saved list mode and French language
- **THEN** successful family list and current-member responses represent list and fr for that member

#### Scenario: Read a saved Discovery position
- **WHEN** a member has successfully saved discoveryControlsPosition left, right or bottom
- **THEN** successful family list and current-member reads return that value for that member

### Requirement: Persist contract-valid member preference updates

For an existing target member, authorized PUT /api/family/{id}/preferences SHALL update only supplied contract-valid properties: browseViewMode stack or list, preferredLanguage en or fr, cookingViewMode step-by-step or all-steps, and discoveryControlsPosition left, right or bottom. Omitted preferences and the member name SHALL be preserved. The response and later family reads SHALL return the committed profile. At least one preference SHALL be supplied.

#### Scenario: Save both preferences
- **WHEN** a request for an existing member supplies browseViewMode list and preferredLanguage fr and persistence succeeds
- **THEN** the API returns the same member ID and name with list and fr in data and later family reads expose those values

#### Scenario: Save browse mode alone
- **WHEN** a request for a French-preferring member supplies browseViewMode stack without language and persistence succeeds
- **THEN** the returned and subsequently read profile has stack mode and retains fr

#### Scenario: Save cooking view alone
- **WHEN** a request supplies cookingViewMode step-by-step and omits browse mode and language
- **THEN** the saved cooking view is step-by-step while the member name, browse mode and language remain unchanged

#### Scenario: Save position alone
- **WHEN** an eligible member saves discoveryControlsPosition left without other preference fields
- **THEN** the committed response and subsequent family reads show left for that member
- **AND** other preferences, member name and other members remain unchanged

#### Scenario: Older client omits position
- **WHEN** a preference update supplies another valid preference and omits discoveryControlsPosition
- **THEN** the saved position is preserved

### Requirement: Reject invalid preferences and unavailable targets

The preference API SHALL return 400 for an unsupported supplied preference or an empty update and 404 for a nonexistent target member. Rejection SHALL not be presented by the client as a successful saved preference.

#### Scenario: Unsupported browse value
- **WHEN** a request for an existing member supplies browseViewMode carousel
- **THEN** the API returns 400

#### Scenario: Unsupported cooking view
- **WHEN** a request for an existing member supplies cookingViewMode carousel
- **THEN** the API returns 400 without changing any saved preference

#### Scenario: Target does not exist
- **WHEN** a preference update targets a nonexistent member ID
- **THEN** the API returns 404

#### Scenario: Unsupported position
- **WHEN** a position update supplies a value other than left, right or bottom
- **THEN** the API returns 400 without changing saved preferences

#### Scenario: Position update while preview disabled
- **WHEN** a position update targets a member without effective Comfortable one handed voting enablement
- **THEN** the API returns 409 without changing saved preferences
- **AND** an otherwise valid request omitting position remains governed by existing preference rules

### Requirement: Reconcile a single client preference save with its response

A single non-placement preference save for a loaded member SHALL apply its optimistic update, confirmed profile on success, or prior profile and error on failure, while preserving independently managed Discovery position in all three paths. An absent local member SHALL cause no request. A response without member identity SHALL count as failure.

#### Scenario: Save succeeds
- **WHEN** a loaded member preference is changed and a valid updated profile is returned
- **THEN** the optimistic profile is reconciled with the confirmed returned profile without overwriting independently managed Discovery position

#### Scenario: Save rejects or response lacks identity
- **WHEN** a single save fails or returns no member ID
- **THEN** the prior loaded profile is restored except for independently managed Discovery position, and an error is recorded

#### Scenario: Target is not locally loaded
- **WHEN** a save is requested for a member absent from the local family list
- **THEN** no preference API request is sent

#### Scenario: Discovery position save
- **WHEN** the update changes Discovery position
- **THEN** the position-specific save and selection-isolation requirements apply instead of whole-profile replacement or rollback

## ADDED Requirements

### Requirement: Confirm Discovery position saves honestly
A selected loaded member's position change SHALL show pending feedback until confirmed. Failure SHALL restore the confirmed position, preserve unrelated fields and offer an explicit retry of the intended choice for that member. Missing or mismatched response identity SHALL count as failure. A missing member context SHALL NOT submit a save.

#### Scenario: Pending then confirmed
- **WHEN** a valid position change is submitted and later confirmed for its originating member
- **THEN** the preview is identified as saving until confirmation, then announced as saved
- **AND** a fresh member load restores the confirmed choice

#### Scenario: Failure and retry
- **WHEN** a position save fails or returns invalid identity
- **THEN** the confirmed position returns and an error offers Retry without claiming the new choice was remembered
- **AND** retry submits only that member's intended position, only while the same member context is valid and the feature is enabled

#### Scenario: No loaded selection
- **WHEN** the selected identity has no loaded profile or selection is missing
- **THEN** placement is unavailable, safe Bottom remains, and no previous member is used as a save target

### Requirement: Isolate placement saves across member selections
Placement saves and feedback SHALL remain bound to their initiating member and selection generation. Late results SHALL NOT change another selection's layout or feedback, including after switching away and back. Duplicate placement submissions SHALL be prevented while a save is pending. Reconciliation SHALL preserve unrelated preference writes.

#### Scenario: Switch away and back with a pending save
- **WHEN** A starts saving, selection changes to B and then A before that save settles
- **THEN** the old completion does not own the new selection's layout or feedback
- **AND** A's confirmed position is reconciled before presenting it as saved; an already submitted write is not claimed to be undone

#### Scenario: Repeated position changes
- **WHEN** the member attempts another placement while their position save is pending
- **THEN** duplicate placement submission is prevented with pending feedback and navigation remains usable
- **AND** a later permitted change cannot be overwritten by an older response

#### Scenario: Unrelated preference completes
- **WHEN** language, browse or cooking preference updates overlap a placement save or failure
- **THEN** placement reconciliation does not revert those fields or replace the current member's unrelated feedback

#### Scenario: Unrelated save resolves after placement
- **WHEN** a language, browse or cooking save started before a position save and completes or fails after the position is confirmed
- **THEN** its older response or rollback does not replace the confirmed position

#### Scenario: Placement resolves after unrelated save
- **WHEN** a position save started before an unrelated preference save and completes or fails after that preference is confirmed
- **THEN** its response or rollback does not replace the confirmed unrelated preference

### Requirement: Keep Discovery position distinct from preview choice
The saved Discovery position SHALL be independent of the Comfortable one handed voting opt-in choice. Disabling the preview SHALL NOT delete the position. New or legacy members without a supported saved position SHALL resolve Bottom. An explicit Bottom save SHALL reset placement without altering other preferences.

#### Scenario: Disable and restore preview
- **WHEN** Right is saved and the preview is disabled then enabled again
- **THEN** Right remains the saved preference while disabled rendering uses Bottom, and enabled rendering can restore Right subject to fit

#### Scenario: Unknown or missing saved value
- **WHEN** a read has no supported position value
- **THEN** the client safely resolves Bottom without writing a replacement solely because of that read

# Spec Delta

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

## ADDED Requirements

### Requirement: Return member preference defaults and saved values

For successful authorized family list and current-member reads, the API SHALL expose each returned member's browse mode and saved language preference when present. Newly created members SHALL start with stack mode and no preferred language.

#### Scenario: Read a new member
- **WHEN** a newly created member is returned by a successful family read
- **THEN** browseViewMode is stack and preferredLanguage is unset

#### Scenario: Read saved preferences
- **WHEN** the requested existing member has saved list mode and French language
- **THEN** successful family list and current-member responses represent list and fr for that member

### Requirement: Persist contract-valid member preference updates

For an existing target member, authorized PUT /api/family/{id}/preferences with stack or list and optional en or fr SHALL save the supplied preferences, preserve the member name and return the updated profile in data. A browse-only update SHALL preserve the saved language.

#### Scenario: Save both preferences
- **WHEN** a request for an existing member supplies browseViewMode list and preferredLanguage fr and persistence succeeds
- **THEN** the API returns the same member ID and name with list and fr in data and later family reads expose those values

#### Scenario: Save browse mode alone
- **WHEN** a request for a French-preferring member supplies browseViewMode stack without language and persistence succeeds
- **THEN** the returned and subsequently read profile has stack mode and retains fr

### Requirement: Reject invalid browse preferences and unavailable targets

The preference API SHALL return 400 for an existing member's unsupported browse mode and 404 for a nonexistent target member. Rejection SHALL not be presented by the client as a successful saved preference.

#### Scenario: Unsupported browse value
- **WHEN** a request for an existing member supplies browseViewMode carousel
- **THEN** the API returns 400

#### Scenario: Target does not exist
- **WHEN** a preference update targets a nonexistent member ID
- **THEN** the API returns 404

### Requirement: Reconcile a single client preference save with its response

For a loaded member, a single preference save SHALL optimistically update that member, replace it with the returned profile on success, and restore its prior profile and record an error on rejection. If the member is absent locally it SHALL return without sending the save. A response without a member ID SHALL count as a failed save.

#### Scenario: Save succeeds
- **WHEN** a loaded member preference is changed and a valid updated profile is returned
- **THEN** the optimistic profile is replaced with the confirmed returned profile

#### Scenario: Save rejects or response lacks identity
- **WHEN** a single save fails or returns no member ID
- **THEN** the prior loaded profile is restored and an error is recorded

#### Scenario: Target is not locally loaded
- **WHEN** a save is requested for a member absent from the local family list
- **THEN** no preference API request is sent

# Spec Delta

## Purpose

Let a person with household access select an existing family member and use that member's identity in household journeys. This initial slice covers ordinary-household listing, selection, supported recovery and visible selected-name display.

## ADDED Requirements

### Requirement: List existing household members for selection

With household access established, onboarding SHALL offer the existing members returned by the family API as named selection controls. It SHALL display a loading message during member loading and an alert when the family-list request fails.

#### Scenario: Existing members are available
- **WHEN** onboarding successfully loads a nonempty family-member list
- **THEN** it offers each returned member by name for selection

#### Scenario: The household has no members
- **WHEN** onboarding successfully loads an empty family-member list
- **THEN** it displays the no-members message

#### Scenario: Member loading fails
- **WHEN** the family-list request made by onboarding fails
- **THEN** onboarding displays the loading error as an alert

### Requirement: Select an existing member from onboarding

When a person selects an existing member at onboarding and the identity-cookie writes succeed, the application SHALL record that member as the active browser identity and request navigation to Home. Selection SHALL use the existing member without creating a new member record.

#### Scenario: Successful existing-member selection
- **WHEN** a person with household access selects a listed member and the identity-cookie writes succeed
- **THEN** that member becomes the active browser identity
- **AND** the application requests navigation to Home without creating a new family member

### Requirement: Resolve the current member through the API

For an authorized household API request, GET `/api/family/me` SHALL resolve the member from a valid GUID in `X-Family-Member-Id`, falling back to the `x-family-member-id` cookie if the header is absent or not a valid GUID. For an existing member it SHALL return that member's profile in the `data` envelope. With neither a valid header nor a valid cookie identity it SHALL return 401.

#### Scenario: Header identity takes precedence
- **WHEN** an authorized request supplies a valid header GUID identifying an existing member and a cookie identifying a different member
- **THEN** the API returns the header-selected member's profile in `data`

#### Scenario: Cookie supplies the member identity
- **WHEN** an authorized request has no valid GUID in the identity header and supplies a cookie GUID identifying an existing member
- **THEN** the API returns the cookie-selected member's profile in `data`

#### Scenario: No parseable member identity is supplied
- **WHEN** an authorized request supplies neither a valid identity header GUID nor a valid identity cookie GUID
- **THEN** the current-member API returns 401

### Requirement: Recover identity when the protected client has no selection

When a protected page reaches client identity validation with neither an active selection nor a readable member cookie, the application SHALL attempt current-member API recovery. A successful profile response SHALL restore the selected member and make that member available for selected-name display. If recovery yields no member and no selection appears before the recovery check finishes, it SHALL request onboarding.

#### Scenario: Recover a server-readable identity
- **WHEN** protected client validation has neither a selected member nor a readable member cookie, and the current-member API receives a valid identity and successfully returns its profile
- **THEN** the application restores that member as the active selection and makes that member available for selected-name display

#### Scenario: Recovery yields no member
- **WHEN** protected client validation has neither a selected member nor a readable member cookie, current-member recovery yields no profile, and no selection appears before the recovery check finishes
- **THEN** the application requests navigation to onboarding

### Requirement: Display the selected member on Profile

When the selected member ID matches a loaded member, Profile SHALL display that member's name as the active member. Member-ID matching SHALL be case-insensitive.

#### Scenario: Display a loaded selected member
- **WHEN** Profile has a selected member ID matching a loaded member ID, including a difference only in letter case
- **THEN** its active-member control displays that member's name

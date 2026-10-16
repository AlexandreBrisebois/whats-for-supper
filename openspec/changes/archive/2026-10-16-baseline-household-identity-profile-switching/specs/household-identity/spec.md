# Household identity — Profile-switching delta

## ADDED Requirements

### Requirement: Offer the loaded household members in the Profile menu

Profile SHALL offer an active-member control that opens its loaded members as named choices on Profile without changing identity or navigating. The menu SHALL mark the currently selected member using case-insensitive ID matching. While family members are loading, Profile SHALL show a loading placeholder in place of the control. Selected-name display SHALL follow the existing Profile display requirement.

#### Scenario: Open choices on Profile
- **WHEN** a person on Profile opens the active-member control with a loaded member list
- **THEN** Profile displays each loaded member as a named choice without changing identity or navigating

#### Scenario: Mark the current member
- **WHEN** the open Profile menu contains a member matching the selected ID, including a difference only in letter case
- **THEN** that choice is marked as the current family member

#### Scenario: Family loading is pending
- **WHEN** family members are loading on Profile
- **THEN** Profile shows a loading placeholder in place of the active-member control

### Requirement: Dismiss the Profile member menu before selection

Closing the open Profile member menu through its toggle or an outside mouse press SHALL hide the choices without selecting a member, writing identity cookies, changing onboarding completion or requesting navigation. This dismissal SHALL apply before a member choice is activated.

#### Scenario: Close through the toggle
- **WHEN** a person closes the open Profile member menu through its toggle before choosing a member
- **THEN** the choices disappear and identity cookies, member selection, onboarding completion and route remain unchanged by the dismissal

#### Scenario: Close outside the menu
- **WHEN** a person presses the mouse button outside the open Profile member menu before choosing a member
- **THEN** the choices disappear and identity cookies, member selection, onboarding completion and route remain unchanged by the dismissal

### Requirement: Request member selection and Home from Profile

Choosing a loaded member in the Profile menu SHALL close the menu, request that member's selection, mark onboarding complete and request Home. When the identity-cookie actions succeed, the chosen member SHALL become the active browser identity without creating a member. Subsequent access, identity resolution, recovery and selected-name display SHALL follow existing requirements; Home arrival with the new identity is not guaranteed by the request.

#### Scenario: Choose a different loaded member
- **WHEN** a person with one selected member chooses a different loaded member in the Profile menu and the identity-cookie actions succeed
- **THEN** the menu closes, onboarding is marked complete and Home navigation is requested
- **AND** the chosen member becomes the active browser identity without creating a member

#### Scenario: Choose the current member again
- **WHEN** a person chooses the already selected member in the Profile menu and the identity-cookie actions succeed
- **THEN** selection of that member is requested again, the menu closes, onboarding is marked complete and Home navigation is requested
- **AND** the active member remains that member without creating another member

### Requirement: Continue from Profile with the loaded selected member

When Profile has a loaded selected member, it SHALL offer a Continue-as control displaying that member's name. Activating it SHALL request Home navigation without requesting member selection, writing identity cookies or changing onboarding completion. Subsequent page access and identity checks SHALL follow existing requirements.

#### Scenario: Continue as the selected member
- **WHEN** Profile has a loaded selected member and a person activates Continue-as
- **THEN** Home navigation is requested for the existing context without requesting a new selection, writing identity cookies or changing onboarding completion

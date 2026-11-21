# Spec Delta

## ADDED Requirements

### Requirement: Select a member from the Discovery handoff without requesting Home

A confirmed Discovery handoff SHALL select the chosen loaded member with the same identity-cookie and header effects as Profile selection, without creating a member or requesting Home. The selection SHALL persist after leaving Discovery until another selection. Profile selection SHALL keep requesting Home.

#### Scenario: Handoff selection persists

- **WHEN** Alex hands off to Maya in Discovery, Maya confirms, and the browser later opens Planner or reloads
- **THEN** Maya remains the selected member, shared SDK requests carry Maya's ID as `X-Family-Member-Id`, and Profile displays Maya
- **AND** no household member is created

#### Scenario: Handoff stays on Discovery

- **WHEN** the identity-cookie actions for a confirmed handoff succeed
- **THEN** the route remains Discovery and Home navigation is not requested

#### Scenario: Profile selection unchanged

- **WHEN** a member is chosen from the Profile menu after this change
- **THEN** the existing Profile behavior of marking onboarding complete and requesting Home still applies

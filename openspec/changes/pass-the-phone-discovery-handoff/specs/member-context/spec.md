# Spec Delta

## ADDED Requirements

### Requirement: Select a member from the Discovery handoff and return without requesting Home

A confirmed Discovery handoff or return to the handoff origin SHALL select the chosen loaded member with the same identity-cookie and header effects as Profile selection, without creating a member or requesting Home (except when a converged locked turn opens Planner after restoring the origin). Local lock state SHALL persist across reloads until returning to the origin or the origin is missing. Profile selection SHALL keep requesting Home.

#### Scenario: Handoff selection persists

- **WHEN** Alex hands off to Maya in Discovery, Maya confirms, and the browser reloads
- **THEN** Maya remains the selected member, shared SDK requests carry Maya's ID as `X-Family-Member-Id`, and the locked Discovery handoff state remains active
- **AND** no household member is created

#### Scenario: Handoff stays on Discovery

- **WHEN** the identity-cookie actions for a confirmed handoff or an in-Discovery return to origin succeed
- **THEN** the route remains Discovery and Home navigation is not requested

#### Scenario: Profile selection unchanged

- **WHEN** a member is chosen from the Profile menu after this change
- **THEN** the existing Profile behavior of marking onboarding complete and requesting Home still applies

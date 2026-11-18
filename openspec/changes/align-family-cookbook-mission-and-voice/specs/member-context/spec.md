# Spec Delta

## REMOVED Requirements

### Requirement: Present Profile as a coherent Solar Earth household surface
**Reason**: Retired the "Solar Earth" nomenclature in favor of the unified Family Cookbook visual identity.
**Migration**: Governed by "Present Profile as a coherent Family Cookbook household surface".

## ADDED Requirements

### Requirement: Present Profile as a coherent Family Cookbook household surface

Profile SHALL use a warm cream canvas, rounded light surfaces and soft depth consistent with the shared app shell. Its existing localised title and member name SHALL lead the hierarchy, with supporting sentence-case labels at least 14 CSS px at default text size. Settings SHALL remain a recognisable secondary action. Existing member selection consequences SHALL remain governed by member-context requirements.

#### Scenario: Returning member opens Profile
- **WHEN** Profile displays a loaded selected member
- **THEN** the page presents its localised title, active member name, member chooser, language preference and Settings in a clear reading order
- **AND** the page uses cream and light rounded surfaces with soft elevation rather than an additional fixed white-ended background gradient
- **AND** labels use readable sentence case rather than tiny tracked uppercase text

#### Scenario: Profile has no loaded selected member
- **WHEN** Profile renders without a loaded member matching the selected ID
- **THEN** the chooser displays its localised selection prompt without inventing an active name
- **AND** Settings remains reachable

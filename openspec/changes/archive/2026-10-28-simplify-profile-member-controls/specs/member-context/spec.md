# Spec Delta

## MODIFIED Requirements

### Requirement: Present Profile as a coherent Solar Earth household surface

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

### Requirement: Keep Profile controls readable and reachable as space changes

Profile SHALL preserve complete member names and action labels without horizontal page overflow at 320 CSS px width and at 200 percent text enlargement. Its open member choices SHALL remain scrollable when they exceed available space. Interactive targets SHALL be at least 48 by 48 CSS px, have visible keyboard focus and remain reachable above or through scrolling past the fixed navigation area.

#### Scenario: Long names and French expansion
- **WHEN** Profile shows a long member name and French labels at narrow width or enlarged text
- **THEN** text wraps without covering Settings, clipping choices or shrinking labels to fit
- **AND** member selection and both language controls remain reachable

#### Scenario: Household choices exceed the viewport
- **WHEN** the open member choices exceed the available viewport height
- **THEN** every choice can be reached by scrolling and keyboard navigation
- **AND** the focused choice is not hidden behind fixed navigation

### Requirement: Maintain readable Profile foreground and control states

Profile SHALL provide text contrast of at least 4.5:1 for ordinary text and 3:1 for qualifying large text on actual rendered backgrounds. Essential control boundaries, state cues and focus indicators SHALL have at least 3:1 contrast against adjacent colours. Enabled secondary actions SHALL remain visibly available and selected state SHALL not depend on colour alone.

#### Scenario: Review normal and interactive states
- **WHEN** Profile is displayed in its normal, open-menu, focused, hovered or pressed state
- **THEN** text and essential control cues meet the stated contrast on the composite background
- **AND** Settings remains recognisable as an enabled action

## ADDED Requirements

### Requirement: Keep Profile title without redundant member instructions

Profile SHALL retain the exact title `Table's Set!` in English and `À table !` in French. Profile SHALL NOT render the instructional subtitle or a separate Continue-as action, including during loading or when there is no matching selected member. The member chooser SHALL remain the member-selection control, governed by the existing menu, selection and dismissal requirements.

#### Scenario: Loaded Profile in either supported locale
- **WHEN** Profile displays a loaded selected member in English or French
- **THEN** its heading is exactly `Table's Set!` or `À table !`, respectively
- **AND** neither the instructional subtitle nor a separate Continue-as action is rendered
- **AND** the selected member remains displayed in the chooser and Settings and language controls remain available

#### Scenario: Profile members are loading
- **WHEN** Profile is loading family members
- **THEN** its localised title and existing loading placeholder are displayed without the instructional subtitle or a Continue-as action
- **AND** Settings and available language controls remain usable

#### Scenario: Profile has no matching selected member
- **WHEN** Profile renders without a loaded member matching the selected ID
- **THEN** its localised title and chooser selection prompt are displayed without the instructional subtitle or a Continue-as action
- **AND** Settings and language controls remain available

#### Scenario: Continue through the current member choice
- **WHEN** a person opens the loaded Profile chooser and activates the current member
- **THEN** the existing current-member selection behavior closes the menu, requests selection again, marks onboarding complete and requests Home
- **AND** removing the separate Continue-as action does not introduce automatic navigation when Profile loads or the chooser is dismissed

## REMOVED Requirements

### Requirement: Continue from Profile with the loaded selected member

**Reason**: The separate action duplicates the member chooser and is no longer needed.

**Migration**: Choose the current member or another member in the existing dropdown to request selection and Home. Current-member selection retains its existing cookie and onboarding consequences; it does not inherit the removed action's navigation-only behavior. Existing shared navigation remains available.

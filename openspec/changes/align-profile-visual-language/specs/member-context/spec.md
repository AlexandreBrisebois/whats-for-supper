# Spec Delta

## ADDED Requirements

### Requirement: Present Profile as a coherent Solar Earth household surface

Profile SHALL use a warm cream canvas, rounded light surfaces and soft depth consistent with the shared app shell. Its existing localised title and member name SHALL lead the hierarchy, with supporting sentence-case labels at least 14 CSS px at default text size. Settings and Continue-as SHALL remain recognisable secondary actions. Existing member selection and Continue-as consequences SHALL remain governed by member-context requirements.

#### Scenario: Returning member opens Profile
- **WHEN** Profile displays a loaded selected member
- **THEN** the page presents its localised title, active member name, member chooser, Continue-as, language preference and Settings in a clear reading order
- **AND** the page uses cream and light rounded surfaces with soft elevation rather than an additional fixed white-ended background gradient
- **AND** labels use readable sentence case rather than tiny tracked uppercase text

#### Scenario: Profile has no loaded selected member
- **WHEN** Profile renders without a loaded member matching the selected ID
- **THEN** the chooser displays its localised selection prompt without inventing an active name
- **AND** Continue-as is absent and Settings remains reachable

### Requirement: Expose Profile member-menu state and keyboard operation

The Profile member chooser SHALL expose whether its choices are expanded and associate the trigger with the choices. Named choices SHALL be keyboard reachable, expose the current member semantically and show a non-colour current-member cue. Escape from within the open chooser SHALL dismiss it and return focus to its trigger without changing identity, onboarding completion or route.

#### Scenario: Inspect and operate the open chooser
- **WHEN** a keyboard user opens the Profile member chooser
- **THEN** expanded state and associated named choices are available to assistive technology
- **AND** the user can reach and activate a choice using the keyboard
- **AND** any current member has a visible check cue and an accessible current-member indication using case-insensitive ID matching

#### Scenario: Leave the chooser with Escape
- **WHEN** the chooser is open and Escape is pressed with focus inside it
- **THEN** the choices close and focus returns to the trigger
- **AND** member selection, identity cookies, onboarding completion and route are unchanged by dismissal

### Requirement: Keep Profile controls readable and reachable as space changes

Profile SHALL preserve complete member names and action labels without horizontal page overflow at 320 CSS px width and at 200 percent text enlargement. Its open member choices SHALL remain scrollable when they exceed available space. Interactive targets SHALL be at least 48 by 48 CSS px, have visible keyboard focus and remain reachable above or through scrolling past the fixed navigation area.

#### Scenario: Long names and French expansion
- **WHEN** Profile shows a long member name and French labels at narrow width or enlarged text
- **THEN** text wraps without covering Settings, clipping choices or shrinking labels to fit
- **AND** member selection, Continue-as and both language controls remain reachable

#### Scenario: Household choices exceed the viewport
- **WHEN** the open member choices exceed the available viewport height
- **THEN** every choice can be reached by scrolling and keyboard navigation
- **AND** the focused choice is not hidden behind fixed navigation

### Requirement: Maintain readable Profile foreground and control states

Profile SHALL provide text contrast of at least 4.5:1 for ordinary text and 3:1 for qualifying large text on actual rendered backgrounds. Essential control boundaries, state cues and focus indicators SHALL have at least 3:1 contrast against adjacent colours. Enabled secondary actions SHALL remain visibly available and selected state SHALL not depend on colour alone.

#### Scenario: Review normal and interactive states
- **WHEN** Profile is displayed in its normal, open-menu, focused, hovered or pressed state
- **THEN** text and essential control cues meet the stated contrast on the composite background
- **AND** Continue-as and Settings remain recognisable as enabled actions

### Requirement: Make Profile ready without staged entrance motion

Profile SHALL present its essential controls without delayed entrance staging. With reduced motion requested, Profile and its member chooser SHALL omit entrance translation, zoom, chevron rotation animation and pulsing loading effects while retaining visible loading and expanded-state information. Loading SHALL retain a stable chooser footprint and an accessible localised loading description.

#### Scenario: Loading members with reduced motion
- **WHEN** Profile is loading family members and reduced motion is requested
- **THEN** it displays a stable non-pulsing placeholder with localised loading information
- **AND** Settings and available language controls remain usable

#### Scenario: Open loaded Profile with reduced motion
- **WHEN** Profile has loaded members and reduced motion is requested
- **THEN** its controls are visible without an entrance delay and the chooser opens without translation or zoom
- **AND** expanded state remains understandable without animation

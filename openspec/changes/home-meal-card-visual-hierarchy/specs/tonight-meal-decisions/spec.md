# Spec Delta

## ADDED Requirements

### Requirement: Present readable Tonight card content

The planned-meal and supper-choice cards SHALL use readable context, supporting copy and enabled action labels, including checking and preparing feedback. Normal text SHALL reach 4.5:1 contrast, qualifying large text 3:1, and meaningful control/state graphics 3:1 on their actual adjacent backgrounds. State and action meaning SHALL remain available through labels rather than colour alone.

#### Scenario: Essential copy on a card
- **WHEN** either Tonight card displays context, duration, supporting copy or enabled actions
- **THEN** those labels meet the relevant contrast threshold on their rendered backgrounds, including translucent surfaces
- **AND** essential context and action labels use readable sentence case rather than tiny tracked all-caps, except the existing localized Ready In wrapper and duration units

#### Scenario: Secondary action is available
- **WHEN** Order In or Change plan is enabled
- **THEN** its label and control treatment visibly communicate an available action rather than an unavailable control

### Requirement: Keep Tonight content reachable as space changes

Both Tonight cards SHALL accommodate long titles, localized labels and enlarged text without clipping essential content, overlapping controls or requiring horizontal page scrolling at 320 CSS px and wider. Action targets SHALL be at least 48 by 48 CSS px. Vertical page scrolling SHALL keep all card content and actions reachable above the bottom navigation.

#### Scenario: Narrow layout and expanded copy
- **WHEN** a card is shown at 320 CSS px with a long recipe title or French labels
- **THEN** its content wraps, actions remain readable and reachable, and the page has no horizontal overflow

#### Scenario: Enlarged text and tablet layout
- **WHEN** text is enlarged to 200 percent or the viewport changes between tablet portrait and landscape
- **THEN** all card text and controls remain available without overlap or truncation of action labels

### Requirement: Offer planned Tonight actions before opening details

A displayed planned recipe SHALL expose Cook and Change plan without opening ingredients or activating the card body. Cook SHALL open cooking for the displayed recipe without completing it. Change plan SHALL open existing recovery without a plan mutation on entry. Opening details SHALL NOT be a prerequisite for either action.

#### Scenario: Cook from the initial card
- **WHEN** a person activates Cook on the initial planned card
- **THEN** cooking opens for that displayed recipe without requiring a flip or submitting cooking completion

#### Scenario: Change plan from the initial card
- **WHEN** a person activates Change plan on the initial planned card
- **THEN** the existing backup-choice recovery opens for that recipe without submitting validation, movement, deferral, deletion or replacement
- **AND** cancellation before mutation leaves tonight unchanged under existing recovery requirements

### Requirement: Disclose Tonight ingredients explicitly

The planned card SHALL offer an explicit View ingredients control that reveals available ingredients and description inline, with a Hide ingredients control to collapse them. Expanding or collapsing details SHALL NOT mutate tonight or activate cooking/recovery. Details visibility SHALL be conveyed semantically, and hidden content SHALL NOT remain keyboard reachable.

#### Scenario: Expand and collapse details
- **WHEN** a person activates View ingredients, then Hide ingredients
- **THEN** the recipe details are revealed, then collapsed, and Cook and Change plan remain available
- **AND** both controls support keyboard activation with visible focus and an exposed expanded state

#### Scenario: Missing details or recipe changes
- **WHEN** ingredients are absent or the displayed recipe identity changes while details are expanded
- **THEN** absent ingredients have readable empty feedback, and a different recipe starts with its own details collapsed
- **AND** the former recipe's details are no longer displayed

#### Scenario: Reduced motion or ordinary card activation
- **WHEN** reduced motion is preferred or a person taps non-control card content
- **THEN** details remain explicitly controlled without requiring a 3D flip or motion to understand the state
- **AND** tapping non-control content does not trigger an action or toggle details

### Requirement: Prioritize immediate Tonight choices over GOTO setup

When supper choices are offered, a ready GOTO SHALL make Make this tonight the primary action; otherwise Quick Find SHALL be primary. Order In SHALL remain an available secondary action. Without an active GOTO, Profile setup SHALL follow the immediate supper choices in reading and focus order. Existing readiness and assignment rules SHALL determine action availability and effects.

#### Scenario: Ready GOTO
- **WHEN** the pivot has a ready active GOTO
- **THEN** Make this tonight leads the actions, with Quick Find and Order In available secondarily
- **AND** merely viewing the card submits no assignment

#### Scenario: No ready GOTO or active-read failure
- **WHEN** no active GOTO is available, including after a 404 or failed active read
- **THEN** Quick Find leads, Order In remains available, and Profile setup follows these supper choices without a GOTO confirmation action

#### Scenario: Checking or preparing a represented GOTO
- **WHEN** the pivot receives an existing GOTO identity whose represented status is checking or pending
- **THEN** it displays the corresponding readable feedback without Make this tonight, and keeps Quick Find and Order In available
- **AND** this presentation does not establish that the active-GOTO service returns pending recipes

### Requirement: Explain the Tonight choice without claiming a saved outcome

The pivot SHALL distinguish an ordinary unplanned night, an unassigned ready family GOTO and saved Mystery context using localized text. It SHALL NOT describe a ready GOTO as tonight's saved meal before selection, or imply that Order In places a delivery order. Existing optimistic assignment and staged recovery presentation SHALL retain their established persistence meanings.

#### Scenario: Unplanned night and ready family choice
- **WHEN** an ordinary empty night is shown with or without a ready GOTO
- **THEN** it identifies that nothing is planned for tonight
- **AND** a ready recipe is identified as the family's GOTO choice rather than a saved assignment

#### Scenario: Saved Mystery night
- **WHEN** supper choices are offered for a saved Mystery night
- **THEN** its saved non-cooking context remains visible without calling the day unplanned
- **AND** opening and cancelling Quick Find leaves that context unchanged

#### Scenario: English and French meaning
- **WHEN** either card is displayed in English or French
- **THEN** added or changed labels and feedback use the selected locale with equivalent state/action meaning and room to wrap
- **AND** duration retains its existing localized wrapper, units and missing-time behavior

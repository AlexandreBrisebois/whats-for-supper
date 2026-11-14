## MODIFIED Requirements

### Requirement: Disclose contributor recipe titles independently of shopping actions

Recipe-derived rows with contributors SHALL show a compact recipe-book control. Both Used in heading and source titles SHALL remain hidden until expansion. Expanded content SHALL show Used in and real contributor titles without repeated Review recipe wording. Checks and aisle tags SHALL remain separate. Duplicate occurrences SHALL not duplicate titles; absent contributors SHALL not invent sources.

#### Scenario: Inspect ordinary complete ingredient sources
- **WHEN** a complete pasta row has two contributors
- **THEN** its collapsed row exposes neither Used in heading nor names; activating the book reveals both with no grocery write, check change or aisle change
- **AND** collapsing hides the heading and names again

#### Scenario: Source recipe repeated or missing title
- **WHEN** a recipe contributes twice or its title cannot be resolved
- **THEN** expanded sources list it once or use localized Recipe title unavailable, not a fabricated title or Review recipe number
- **AND** a known identity retains its source link; no identity means no invented link

#### Scenario: No recipe contributors
- **WHEN** an extra or legacy row has no contributor identity
- **THEN** no book control, Used in heading, source title or fictitious link is shown, while applicable quantity warnings remain

### Requirement: Preserve original quantity inspection from grocery sources

Each source link SHALL initially open original-quantity review independently of planned portions or previews. Consultation SHALL not change shopping or plan state. A separate explicit Plan transition SHALL enter normal guarded planning without assigning by itself, while original evidence remains accessible. Missing/deleted access SHALL fail honestly. Closing without assignment SHALL restore the source week and shopping state.

#### Scenario: Planned recipe for six opens original basis two
- **WHEN** its title is activated from groceries
- **THEN** original two-serving evidence and source access appear, with no automatically applied dated quantities or assignment
- **AND** Plan is available as a deliberate transition rather than an immediate planning write

#### Scenario: Return after source consultation
- **WHEN** a person closes original review and returns to groceries
- **THEN** the selected week, checks and available list state remain without read-triggered recomputation

#### Scenario: Choose Plan deliberately
- **WHEN** Plan is activated in source review
- **THEN** normal dated target checks and assignment/recovery protections apply before a subsequent assignment can be requested
- **AND** merely transitioning neither clears quantity-warning markers nor acknowledges shopping checks

### Requirement: Make source disclosure accessible and quiet

The book control SHALL have a localized ingredient-specific name, expanded state and associated region, keyboard operation, visible focus and a 48 CSS px target. Collapsed source content SHALL be absent from reading/focus order. It SHALL stay distinct from checkboxes and aisle tags. Expanded titles and warnings SHALL wrap legibly at 320 CSS px, 200% text and English/French phone/tablet sizes.

#### Scenario: Keyboard and long French titles
- **WHEN** a person expands sources by keyboard in a narrow French layout
- **THEN** focus stays on the control, expanded state updates, Used in's French equivalent and links enter reading order, and long titles do not obscure checks, totals or aisle actions
- **AND** collapse removes those links from focus order

## ADDED Requirements

### Requirement: Keep quantity warnings outside collapsed sources

Source collapse SHALL NOT conceal incomplete-subtotal feedback or prior-unknown checked-amount review. Opening/closing Used in or entering Plan SHALL not clear either warning or acknowledge a check. A complete current total with prior_amount_unknown SHALL remain a full total plus its distinct prior-check warning. No usual-portions setting or reset control SHALL be added to groceries.

#### Scenario: Incomplete and prior unknown together
- **WHEN** a collapsed row has both incomplete quantities and prior_amount_unknown
- **THEN** both meanings remain understandable before source expansion, independently of the book and aisle controls

#### Scenario: Complete amount with prior warning
- **WHEN** current 600 g is complete but prior checked amount was unknown
- **THEN** 600 g remains the full current amount with prior-check feedback, including after source consultation and Plan transition

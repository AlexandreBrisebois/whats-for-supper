## MODIFIED Requirements

### Requirement: Add a name-only extra to the current grocery week

The grocery view SHALL accept a trimmed nonblank extra name for the deployment-calendar current week. A successful add SHALL display one distinct unchecked extra with `Extra` source label, default section, and current-week editability, and SHALL show a temporary localized confirmation (`Saved to {{section}}` with localized aisle name) without scrolling or moving focus away from the composer.

#### Scenario: Add one extra
- **WHEN** a member adds `Coffee` while the current deployment week is displayed
- **THEN** one unchecked Coffee row marked `Extra` appears in its server-selected section for that week

#### Scenario: Confirm the selected section
- **WHEN** an extra is added successfully outside the member's current scroll position in English or French
- **THEN** a temporary success message identifies the localized section (`grocery.aisles.<section>`) where it was saved within the visible visual viewport, including keyboard panning, without requiring scrolling, navigating, or moving focus away from the composer

#### Scenario: Blank name
- **WHEN** a member submits a name containing only whitespace
- **THEN** no extra is created and the composer remains available with validation guidance

#### Scenario: Add while another week is displayed
- **WHEN** the grocery view displays a past or future week
- **THEN** it does not offer creation for that displayed week

## ADDED Requirements

### Requirement: Maximize grocery item label width with right-aligned row icons

Grocery aisle item lists and rows SHALL omit nested horizontal container padding (`@min-[18rem]:p-4` compounding) and keep recipe-source (`BookOpen`) and aisle-reclassify (`Tag`) icon buttons compactly aligned at the right edge so ingredient names receive maximum horizontal room on phone viewports while retaining 48 CSS px touch targets.

#### Scenario: Narrow phone grocery row maximizes label width
- **WHEN** a grocery item with both recipe-source attribution (`BookOpen`) and section-reclassify (`Tag`) actions renders on a mobile screen
- **THEN** container and row padding are not compounded horizontally and both icon buttons align compactly at the right edge, leaving maximum width for the ingredient name and quantity hint without shrinking tap targets below 48 CSS px

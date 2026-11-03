# Recipe library delta

## ADDED Requirements

### Requirement: Fill the Recipes canvas while bounding its content

The Recipes canvas SHALL fill the app shell's available width above the bottom navigation. On a 390–393 CSS px phone, the grid/content SHALL use one 16–20 CSS px side gutter, without compounded page and content padding. The toolbar SHALL use its available width before wrapping. iPad content SHALL retain responsive gutters and bounded cards. Safe-area and short-viewport reachability SHALL remain in Explore and Search.

#### Scenario: Phone Browse or Search
- **WHEN** Recipes opens in stack or list presentation at 390–393 CSS px wide, with or without expanded Search controls
- **THEN** its outer surface reaches both viewport edges above the full-width dock, and the grid/content begins 16–20 CSS px from each side rather than behind compounded insets
- **AND** no horizontal overflow or bottom-navigation overlap hides the current collection or its recovery actions

#### Scenario: Toolbar uses available width
- **WHEN** the toolbar shows Search, All/Discovery, Go-To, Stack/List and Recycle bin at ordinary phone text size
- **THEN** it uses the available Recipes width before wrapping, without reducing any target below 48×48 CSS px
- **AND** at 200% text or when localized labels cannot fit, it wraps in visual and keyboard order without clipping controls

#### Scenario: iPad portrait and landscape
- **WHEN** Recipes opens on an iPad in portrait or landscape with a loaded or empty collection
- **THEN** its outer surface fills the shell, the compact grid starts within 24–32 CSS px of each side at 820 or 1180 CSS px, and the stack remains centered within a readable bound
- **AND** content remains readable, reachable and free of accidental narrow-page side strips

### Requirement: Identify Recipes as a library destination in the dock

The bottom Recipes navigation SHALL show a recipe-book icon with the existing localized Recipes label. Its destination and current-page indication SHALL remain `/recipes`; the magnifier SHALL remain the distinct Search control in the Recipes toolbar.

#### Scenario: Enter Recipes from another app page
- **WHEN** a person activates Recipes in the bottom navigation from Home, Planner or Profile
- **THEN** the book-labeled destination opens `/recipes` and identifies itself as the current page
- **AND** the Search control remains the first control in the Recipes toolbar

#### Scenario: Navigate with keyboard or large text
- **WHEN** a person reaches the Recipes dock entry by keyboard or at enlarged text size
- **THEN** its localized label, visible focus and usable target remain available without truncating or displacing the other destinations

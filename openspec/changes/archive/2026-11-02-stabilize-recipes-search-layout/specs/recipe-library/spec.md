# Recipe library delta

## ADDED Requirements

### Requirement: Keep the Recipes Search action at a stable left anchor

The first Recipes toolbar action, Search, SHALL remain at the same left content gutter while the other controls change label, state or row. The toolbar SHALL preserve Search, All/Discovery, Go-To, Stack/List and Recycle bin in visual and keyboard order, with at least 48×48 CSS px targets and no horizontal overflow.

#### Scenario: Scope label changes on a phone or tablet
- **WHEN** a person toggles All to Discovery or back at a fixed viewport, locale and text size
- **THEN** the Search action retains the same left edge within 1 CSS px, while the remaining toolbar actions may use or wrap in the available width

#### Scenario: Search and presentation change
- **WHEN** Search controls expand or hide, Search becomes active or inactive, or the person switches stack and list
- **THEN** the Search action stays at that left anchor and remains the first keyboard toolbar action without covering another control

#### Scenario: Narrow or enlarged toolbar
- **WHEN** French labels, a 320 CSS px phone, landscape or 200% text make the toolbar wrap
- **THEN** Search remains at the consistent left gutter on the first toolbar row, and all actions retain their order, visible focus, target size and reachability

### Requirement: Use the visible region above the Recipes dock for results

When controls fit above the dock, Recipes SHALL let the current list or stack use the visible space to within 8 CSS px of the actual dock top, accounting for browser viewport, keyboard, safe area and text changes. When controls cannot fit, they and the results SHALL remain reachable by intentional vertical scrolling without overlap or horizontal overflow. Collection position and request state SHALL survive disclosure changes under their existing contracts.

#### Scenario: Ordinary list and stack space
- **WHEN** a nonempty Explore or Search collection is shown in list or stack and the controls fit at phone or iPad size
- **THEN** the result viewport extends to within 8 CSS px above the bottom navigation rather than stopping at a fixed empty band
- **AND** the last result can be brought fully clear of the dock by scrolling or paging

#### Scenario: Browser chrome or keyboard changes visible height
- **WHEN** the browser's visual viewport grows or shrinks, including keyboard open and close
- **THEN** the current collection reflows to the visible region without obscuring the focused field, a result action or the bottom navigation
- **AND** its loaded results, pagination and position are retained

#### Scenario: Safe area and large text on a short screen
- **WHEN** safe-area insets, French text, 200% text or a short landscape/portrait viewport reduce available height
- **THEN** toolbar, context, recovery actions and recipes remain reachable by intentional scrolling with visible focus and usable targets
- **AND** content does not overlap the dock or require a complete first card to fit before scrolling when that is physically impossible

#### Scenario: Hide and restore Search controls
- **WHEN** Search controls hide and reopen while a Search result is loaded or a request is pending
- **THEN** the result region resizes without clearing criteria, results, pagination, list/stack position, presentation or the pending work

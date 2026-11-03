# Spec Delta

## MODIFIED Requirements

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

#### Scenario: Settled enlarged-text list viewport
- **WHEN** a loaded Explore or Search list is displayed at 393x852 CSS pixels with 200% root text in English or French, its controls fit above the dock, and layout has settled after reflow
- **THEN** the list's scrollable viewport ends between zero and 8 CSS pixels above the actual dock top
- **AND** list sizing does not extend its scrollable viewport below the dock or clip its usable bottom behind the canvas edge
- **AND** text enlargement alone does not clear the collection, criteria, pagination or current request state

#### Scenario: Reach the last list recipe after reflow and append
- **WHEN** a nonempty list has more loaded rows than fit above the dock, including an appended page, with controls fitting above the dock at ordinary or 200% text
- **THEN** list scrolling can bring the final recipe's name and activation target clear of the dock without an additional canvas scroll to uncover the list's bottom
- **AND** when that final row fits in the available result height, the complete row and its focused activation target can be shown above the dock
- **AND** a row taller than the available height remains readable and operable by intentional scrolling without requiring the whole row to fit at once
- **AND** keyboard activation opens the final recipe's existing detail sheet, and dismissal returns to that recipe under the existing focus and position contracts

## MODIFIED Requirements

### Requirement: Keep recipe detail actions clear of the sheet edge

When detail content is scrolled to its end, the final action SHALL have ordinary trailing space inside the sheet. At 16 px root text size, the normal read action's bottom-to-panel-edge gap SHALL be approximately 32 CSS px: 8 CSS px inside the button section plus the scroller's original 24 CSS px. The increment SHALL belong to the action section, without another dock or safe-area spacer.

#### Scenario: Read actions on phone and tablet
- **WHEN** a person scrolls the detail sheet to its end on a normal phone or tablet
- **THEN** the final action remains fully visible with approximately 32 CSS px of trailing space at normal text size
- **AND** the action section owns 8 CSS px of that space while the inner scroller retains 24 CSS px
- **AND** the sheet retains its existing placement, action order and button targets

#### Scenario: Edit actions and constrained content
- **WHEN** edit actions are last, or the detail sheet is shown on a short phone or with French/200% text
- **THEN** the final control and its focus ring remain reachable by scrolling without clipping or dock overlap
- **AND** the edit action section owns the same 8 CSS px increment while its existing margin remains unchanged
- **AND** the sheet does not add a duplicate safe-area spacer or change any action behavior

#### Scenario: Distinguish action section from scroll content
- **WHEN** the Read actions are visible at the end of the scrollable recipe detail
- **THEN** the added bottom space is inside the action section rather than a larger generic scroller padding
- **AND** the overall final control-to-panel edge gap stays at the established spacing step

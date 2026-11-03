# Spec Delta

## ADDED Requirements

### Requirement: Keep recipe detail actions clear of the sheet edge

When recipe detail content is scrolled to its end, the final action SHALL have ordinary trailing space inside the scrollable sheet. At a 16 px root text size, the intended spacing step SHALL be approximately 32 CSS px from the final action's bottom to the visible panel edge. This spacing SHALL be owned once by the inner scroller and SHALL NOT add separate dock or safe-area clearance.

#### Scenario: Read actions on phone and tablet
- **WHEN** a person scrolls the detail sheet to its end on a normal phone or tablet
- **THEN** the final action remains fully visible with approximately 32 CSS px of trailing space at normal text size
- **AND** the sheet retains its existing placement, action order and button targets

#### Scenario: Edit actions and constrained content
- **WHEN** edit actions are last, or the detail sheet is shown on a short phone or with French/200% text
- **THEN** the final control and its focus ring remain reachable by scrolling without clipping or dock overlap
- **AND** the sheet does not add a duplicate safe-area spacer or change any action behavior

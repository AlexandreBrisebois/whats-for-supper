## ADDED Requirements

### Requirement: Center the recipe stack above its bottom family action

In stack presentation, Recipes SHALL center the current card stack above the counter and Ask the Family panel when the content fits. The counter and panel SHALL form a bottom group above the dock without changing their dimensions or behavior. When content does not fit, card, counter and panel SHALL remain reachable by scrolling in that order. Reflow SHALL retain the active collection, position and pending work.

#### Scenario: Ordinary phone with free height
- **WHEN** a loaded stack is shown at 390×844 CSS pixels with collapsed Search controls and no planning row
- **THEN** the current card stack is centered in the space between the result top and counter
- **AND** the counter remains immediately above Ask the Family and the panel rests at the result bottom above the dock
- **AND** the card dimensions and backing peeks remain unchanged

#### Scenario: Tall tablet or expanded controls
- **WHEN** a loaded stack is shown on a tablet, or Search controls expand or hide while the content still fits
- **THEN** the card and bottom group redistribute within the available result height without changing card size or panel design
- **AND** Search criteria, result order, cursor and current position remain unchanged

#### Scenario: Constrained viewport or enlarged text
- **WHEN** short portrait, landscape, browser chrome, keyboard, safe area, French or 200 percent text leaves too little height for the stack and bottom group
- **THEN** the card, counter and complete Ask the Family panel remain reachable in that order by vertical scrolling
- **AND** they do not cover each other or the dock, shrink targets or cause horizontal overflow

#### Scenario: Planner context and recovery
- **WHEN** a planner-targeted stack or a stack with retry/loading feedback needs extra vertical room
- **THEN** the context and recovery controls remain reachable without an overlay from Ask the Family
- **AND** opening details, swiping and voting retain their existing behavior

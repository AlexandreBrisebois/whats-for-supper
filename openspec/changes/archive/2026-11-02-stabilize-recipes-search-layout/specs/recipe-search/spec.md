# Recipe search delta

## ADDED Requirements

### Requirement: Show planner target in a compact independent Recipes context

Planner-targeted Recipes SHALL show a compact, localized context row identifying the target day above the toolbar. It SHALL remain separate from Filters and visible whether Search controls are expanded or hidden, in stack and list. Search field and Filters SHALL still open directly below the toolbar. At ordinary phone text size the row's single-line height SHALL be no greater than 52 CSS px; long or enlarged text SHALL wrap and remain scrollable rather than clip.

#### Scenario: Enter from Planner or Home
- **WHEN** Recipes opens with a supported `addToDay` and `weekOffset` target from Planner or Home
- **THEN** a “Choosing for Monday” style localized context identifies the target day above the toolbar and the first recipe begins higher than with the former large banner
- **AND** the target identity, week context and existing selection action are unchanged

#### Scenario: Filters expand or change
- **WHEN** Filters opens, is dismissed, or applies selections that change its count or wrapping
- **THEN** the planning context keeps its independent position and target, without becoming part of the Filters row or changing the active Search session

#### Scenario: Hide Search or change view
- **WHEN** Search controls hide or reopen, or the person changes stack/list while planning
- **THEN** the compact context remains visible and the target, loaded results, current position and existing disclosure behavior are preserved

#### Scenario: Leave or recover the planning path
- **WHEN** the person activates the existing Cancel action or the calendar target needs its existing Retry action
- **THEN** Cancel returns to Planner and Retry remains available without inventing a Change-day action
- **AND** choosing a recipe continues through the existing assignment and occupied-slot recovery path

#### Scenario: French and enlarged content
- **WHEN** the day label or actions grow in French, at 200% text or on a short screen
- **THEN** the row reflows with visible focus, at least 48×48 CSS px action targets and no clipped text, horizontal overflow or dock overlap
- **AND** the first recipe and cancellation remain reachable by intentional scrolling when they cannot both fit initially

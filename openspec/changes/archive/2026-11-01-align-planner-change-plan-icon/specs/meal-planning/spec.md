## ADDED Requirements

### Requirement: Recognize recipe changes consistently across home and Planner

Planner's existing recipe-row change action SHALL use the same opposing horizontal arrows icon as the home meal card's Change plan action in narrow and wide layouts. The replacement SHALL preserve existing action availability, localized accessible names, sizing, hit targets and interaction behavior. Other actions' icons SHALL remain unchanged.

#### Scenario: Change an assigned recipe
- **WHEN** an assigned recipe row displays its change action in either Planner layout
- **THEN** the action shows opposing horizontal arrows matching the home meal card's Change plan icon
- **AND** its existing accessible name, dimensions and activation behavior remain unchanged, opening options for that row

#### Scenario: Existing availability rules apply
- **WHEN** Planner displays pending suggestions, empty days or non-cooking plans
- **THEN** the icon replacement does not introduce a recipe-change action where it was previously unavailable

#### Scenario: Other arrows retain their meaning
- **WHEN** Planner displays week navigation or Save for Next Week options
- **THEN** those actions retain their existing icons and behavior

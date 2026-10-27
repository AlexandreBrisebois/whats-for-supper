# Spec Delta

## MODIFIED Requirements

### Requirement: Render day content and planned count from displayed state

The planner SHALL render displayed days in their supplied order. Status-three days SHALL use non-cooking presentation before recipe presentation. Other days with recipe IDs SHALL display recipe names; ordinary days without them SHALL offer Plan supper. The planner SHALL NOT display a weekly recipe-count badge or a replacement aggregate progress indicator.

#### Scenario: Empty persisted week
- **WHEN** a successful read returns seven ordinary empty dates and no suggestions apply
- **THEN** the planner renders seven Plan supper day cards
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Recipe and non-cooking presentation
- **WHEN** a day has status three or an ordinary day has a recipe ID
- **THEN** status three selects non-cooking presentation; an ordinary recipe displays its name
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Pending recipe contributes to count
- **WHEN** a displayed suggestion has a recipe ID and pending marker
- **THEN** the suggestion remains pending without proving a persisted assignment
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Planner status or viewport changes
- **WHEN** the planner displays a Draft, VotingOpen or Locked week at a narrow or wide viewport
- **THEN** no weekly recipe-count badge or replacement aggregate progress indicator is displayed
- **AND** the existing week-status rules still determine the available voting actions

#### Scenario: Actions remain after badge removal
- **WHEN** the planner displays available voting actions
- **THEN** the actions remain reachable without a layout slot reserved for the removed badge

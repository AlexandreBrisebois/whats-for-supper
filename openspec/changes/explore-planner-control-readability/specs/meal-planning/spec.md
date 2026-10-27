# Spec Delta

## ADDED Requirements

### Requirement: Keep Planner context and empty-day actions readable

The selected week-context label and enabled Plan supper text SHALL maintain at least 4.5:1 contrast on their actual rendered backgrounds in applicable default, hover, pressed and focus states. Meaningful icons and control-identifying edges SHALL maintain at least 3:1 against adjacent backgrounds. Essential readability SHALL NOT depend on hover.

#### Scenario: Touch user sees an empty day
- **WHEN** Planner displays an enabled Plan supper action without hover
- **THEN** its text and meaningful action cue meet their applicable contrast targets and the action remains available

#### Scenario: Week context is displayed
- **WHEN** Planner displays This week or another selected week-context label
- **THEN** that label is readable as informational context without acquiring a button or link role

#### Scenario: Available action changes visual state
- **WHEN** an enabled Plan supper action is hovered, pressed or focused
- **THEN** its label and meaningful action cues remain readable without changing its planning behavior

### Requirement: Retain useful Planner label styling across languages

The week-context label SHALL retain its uppercase presentation and letter spacing while remaining readable and fitting the supported layout in English and French. Plan supper SHALL use its existing localized sentence-case action label. Strengthening these treatments SHALL NOT truncate essential labels or reduce existing touch targets.

#### Scenario: French labels expand
- **WHEN** Planner displays French week context and the empty-day planning action at a narrow viewport
- **THEN** complete labels remain visible, with uppercase week context and sentence-case planning text

#### Scenario: Larger text is requested
- **WHEN** the affected labels are displayed with enlarged text
- **THEN** they remain readable and reachable without overlapping navigation or adjacent controls

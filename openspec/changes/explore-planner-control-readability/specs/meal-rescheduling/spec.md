# Spec Delta

## ADDED Requirements

### Requirement: Make the enabled Planner drag grip recognizable

An enabled Planner drag grip SHALL maintain at least 3:1 contrast against its actual adjacent background in default and applicable hover, pressed, focused and grabbed states. Recognition SHALL NOT depend on hover. Stronger visual treatment SHALL preserve the existing accessible name, keyboard focus, hit area and hold-to-move behavior.

#### Scenario: Idle touch handle
- **WHEN** an enabled recipe handle is displayed without hover on a past, current or future date
- **THEN** its grip meets the contrast target and is recognizable before hold activation

#### Scenario: Handle changes state
- **WHEN** an enabled handle is hovered, focused or grabbed
- **THEN** its grip remains sufficiently contrasted and existing state/focus feedback remains distinguishable from date emphasis

#### Scenario: Gesture behavior is preserved
- **WHEN** a person scrolls before activation, holds to drag or uses the handle's keyboard commands
- **THEN** existing activation, fixed-date movement, focus-following and boundary rules continue independently of the stronger colors

#### Scenario: Drag feedback crosses temporal treatments
- **WHEN** a recipe is dragged between past, today and future slots
- **THEN** the existing source marker, destination date highlight/arrow and move/swap overlay remain distinguishable
- **AND** dates and temporal emphasis stay fixed without changing preview, cancellation, persistence or reconciliation behavior

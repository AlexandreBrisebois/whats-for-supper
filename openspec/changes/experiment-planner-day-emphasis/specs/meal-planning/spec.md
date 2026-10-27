# Spec Delta

## ADDED Requirements

### Requirement: Identify today's Planner date explicitly

When reliable authoritative deployment-calendar context is available, Planner SHALL distinguish the displayed date equal to today with a clear border and a visible localized Today label. This cue SHALL belong to the date slot, independently of its meal content or status. Future dates SHALL retain the normal treatment.

#### Scenario: Today has any meal state
- **WHEN** today's displayed date contains an empty slot, recipe, pending suggestion, non-cooking plan or cooked meal
- **THEN** that date has the Today label and border without changing the stored meal state

#### Scenario: Another week is displayed
- **WHEN** none of the displayed dates equals authoritative today
- **THEN** no displayed row is labeled Today

#### Scenario: Recipe changes date
- **WHEN** a recipe moves between today's slot and another date
- **THEN** the Today label and border stay with today's date rather than following the recipe

### Requirement: Quiet past Planner dates without implying completion

Planner SHALL give dates earlier than authoritative today less decorative emphasis while preserving readable essential text, recognizable controls and existing action availability. This date treatment SHALL NOT add cooked/completed labels, checkmarks, strike-through or success styling, and SHALL NOT alter stored meal state.

#### Scenario: Past meal was not cooked
- **WHEN** a past date contains an uncooked recipe or empty slot
- **THEN** the row receives quieter decorative treatment without implying that supper was cooked or completed
- **AND** existing actions remain available under their existing rules

#### Scenario: Past date has a recorded outcome
- **WHEN** a past date has a cooked status or non-cooking plan
- **THEN** its actual meal content and status remain distinct from the date-relative quiet treatment

#### Scenario: Text and controls on a quiet row
- **WHEN** past rows are displayed alongside today and future rows
- **THEN** essential past-row text remains readable and enabled controls do not acquire a disabled appearance from whole-row fading

### Requirement: Base Planner temporal emphasis on reliable calendar context

Planner SHALL classify displayed civil dates against reliable server-owned today rather than device-local dates or week-offset assumptions. Missing, invalid or expired context SHALL produce neutral date treatment until reliable context is obtained. Newly accepted context SHALL update the emphasis without date-related writes.

#### Scenario: Device uses another timezone
- **WHEN** the browser's local date differs from the authoritative deployment date
- **THEN** Today and past-date classification follow the deployment date

#### Scenario: Context cannot be confirmed
- **WHEN** calendar context is unavailable, invalid or expired and refresh is pending or fails
- **THEN** retained day content remains usable without Today or past-date emphasis inferred from a guessed date

#### Scenario: Deployment day changes
- **WHEN** the authoritative day boundary is reached and refreshed context is accepted
- **THEN** date emphasis updates to the new today, including across a week boundary
- **AND** no meal is automatically marked cooked or completed

#### Scenario: Week selection changes before content
- **WHEN** another week is selected while previously loaded dates remain visible
- **THEN** temporal emphasis is based on the actual displayed dates and reliable authoritative today, not the newly selected offset

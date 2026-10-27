# Spec Delta

## ADDED Requirements

### Requirement: Keep Planner context and empty-day actions readable

Selected week context, fixed weekday/month labels and enabled Plan supper text SHALL maintain at least 4.5:1 contrast on actual rendered backgrounds in applicable default, hover, pressed and focus states. Meaningful icons and control-identifying edges SHALL maintain at least 3:1 against adjacent backgrounds. Essential readability SHALL NOT depend on hover.

#### Scenario: Touch user sees an empty day
- **WHEN** Planner displays an enabled Plan supper action without hover
- **THEN** its text and meaningful action cues meet their contrast targets and the action remains available

#### Scenario: Week and fixed date context is displayed
- **WHEN** Planner displays selected week context and fixed weekday/month labels
- **THEN** those labels meet their text contrast target as informational context without acquiring button or link roles

#### Scenario: Available action changes visual state
- **WHEN** an enabled Plan supper action is hovered, pressed or focused
- **THEN** its label and meaningful cues remain readable without changing its planning behavior

### Requirement: Retain readable localized Planner labels

Week context SHALL use sentence case without forced uppercase or wide letter spacing. Plan supper SHALL use its existing localized sentence-case action label. Affected labels SHALL remain complete and readable in English and French with enlarged text and narrow layouts, without reducing existing touch targets or the available meal-content width by widening the date column.

#### Scenario: French labels expand
- **WHEN** Planner displays French week context, fixed dates and the empty-day action at a narrow viewport
- **THEN** essential labels remain complete and readable without overlapping adjacent controls or requiring a wider date column

#### Scenario: Larger text is requested
- **WHEN** affected labels are displayed with enlarged text
- **THEN** they remain readable and reachable, wrapping where necessary without overlapping navigation or adjacent controls

### Requirement: Identify today's Planner date compactly

With reliable authoritative deployment-calendar context, Planner SHALL outline the fixed date marker equal to today and display one localized Today label above that row, outside draggable content. The label SHALL have room to wrap without widening the date column or narrowing meal content. Other rows SHALL gain no temporal label line. Future dates SHALL retain normal treatment.

#### Scenario: Today has any meal state
- **WHEN** today's displayed date contains an empty slot, recipe, pending suggestion, non-cooking plan or cooked meal
- **THEN** that date has the outlined marker and Today label without changing its meal state or introducing a completion signal

#### Scenario: Another week is displayed
- **WHEN** none of the displayed dates equals authoritative today
- **THEN** no displayed row has a Today label or today's outline

#### Scenario: Recipe changes date
- **WHEN** a recipe moves between today's slot and another date
- **THEN** the Today label and outline stay with today's fixed date rather than following the recipe

#### Scenario: French Today label on a phone
- **WHEN** Aujourd’hui is displayed at a narrow viewport or with enlarged text
- **THEN** the complete label fits or wraps above its row without squeezing it into the date column or obscuring meal content

### Requirement: Quiet past Planner dates without implying completion

Dates earlier than authoritative today SHALL receive less decorative emphasis while preserving readable essential text, recognizable controls and existing action availability. This treatment SHALL NOT fade the whole row, add completion labels, checkmarks, strike-through or success styling, or alter meal state. Actual cooked and non-cooking status SHALL remain distinct from date-relative appearance.

#### Scenario: Past meal was not cooked
- **WHEN** a past date contains an uncooked recipe or empty slot
- **THEN** its decorative treatment is quieter without implying completion or disabling existing actions

#### Scenario: Past date has a recorded outcome
- **WHEN** a past date has a cooked status or non-cooking plan
- **THEN** its actual content and status remain distinguishable from the temporal treatment

#### Scenario: Text and controls on a quiet row
- **WHEN** past rows appear alongside today and future rows
- **THEN** affected text and meaningful controls meet their contrast targets without whole-row fading

### Requirement: Base Planner temporal emphasis on reliable calendar context

Planner SHALL classify displayed civil dates against reliable server-owned today rather than device-local dates or selected-week assumptions. Missing, invalid or expired context SHALL produce neutral temporal treatment until reliable context is obtained. Newly accepted context SHALL update emphasis without date-related writes or automatically changing meal state.

#### Scenario: Device uses another timezone
- **WHEN** the browser's local date differs from the authoritative deployment date
- **THEN** Today and past-date classification follow the deployment date

#### Scenario: Context cannot be confirmed
- **WHEN** context is unavailable, invalid or expired and refresh is pending or fails
- **THEN** retained day content remains usable without temporal emphasis inferred from a guessed date

#### Scenario: Deployment day changes
- **WHEN** the authoritative day boundary is reached and refreshed context is accepted
- **THEN** emphasis updates to the new today, including across a week boundary
- **AND** no meal is automatically marked cooked or completed

#### Scenario: Week selection changes before content
- **WHEN** another week is selected while previously loaded dates remain visible
- **THEN** emphasis follows the actual displayed dates and reliable authoritative today, not the newly selected offset

### Requirement: Keep date orientation distinct from interaction feedback

Today and past-date presentation SHALL leave keyboard focus, drag source/destination cues and existing action-success feedback independently distinguishable. The compact date cue SHALL NOT introduce a full-row Today outline, additional badges, a legend or repeated explanatory text. Temporal appearance SHALL NOT change action availability.

#### Scenario: Today is a drag destination
- **WHEN** today's slot becomes the candidate drag destination
- **THEN** destination feedback remains distinguishable from today's marker without moving the date or adding an overlapping label

#### Scenario: Focus or success appears on a temporal row
- **WHEN** a control on today's or a past row receives focus or existing action-success feedback
- **THEN** that feedback remains visible independently of the temporal treatment and the action retains its existing meaning

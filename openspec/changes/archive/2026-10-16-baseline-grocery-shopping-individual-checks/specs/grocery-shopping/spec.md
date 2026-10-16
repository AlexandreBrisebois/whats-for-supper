# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Use display name as the shared check identity

Grocery rows SHALL read and toggle checks by displayName within the loaded map. Rows sharing that display name SHALL share their checked state even when normalized keys or unit buckets differ. Rendered rows SHALL retain their supplied cardinality.

#### Scenario: Duplicate names
- **WHEN** three rendered Eau rows have different unit buckets and one is checked
- **THEN** all three show checked while three rows remain

#### Scenario: Uncheck duplicate
- **WHEN** one checked Eau row is unchecked
- **THEN** all rows sharing Eau show unchecked without deleting a row

### Requirement: Initialize an empty loaded check map from displayed names

When rows exist and the loaded check map has no keys, the grocery view SHALL initialize their display names as unchecked. A nonempty map SHALL be retained; a missing key SHALL display as unchecked.

#### Scenario: Empty map
- **WHEN** rows first render with an empty check map
- **THEN** their display names initialize to false

#### Scenario: Existing map
- **WHEN** the map contains Tomato true but lacks Lettuce
- **THEN** Tomato stays checked and Lettuce displays unchecked

### Requirement: Submit one optimistic grocery check at a time

A row activation SHALL immediately invert its local display-name check and submit only ingredientName and checked to the initiating week's item PATCH. Successful completion SHALL retain that optimistic check. The checkbox SHALL expose aria-checked and support click, Enter and Space activation.

#### Scenario: Check succeeds
- **WHEN** Tomato is unchecked and its activation request succeeds
- **THEN** Tomato becomes checked and the body contains ingredientName Tomato and checked true

#### Scenario: Uncheck succeeds
- **WHEN** Tomato is checked and its activation request succeeds
- **THEN** Tomato becomes unchecked with checked false

### Requirement: Persist a sequential single-key check update

For an existing weekly plan, a successful sequential item PATCH SHALL store the supplied check value while retaining other values read for that update, and return 204 after its save and publication attempt. Concurrent-update safety is outside this extracted guarantee.

#### Scenario: Set one key
- **WHEN** the stored map has Tomato false and Lettuce true and Tomato is set true without overlapping writes
- **THEN** both keys are true on a subsequent successful read

#### Scenario: Set false
- **WHEN** Tomato is set false in a sequential successful request
- **THEN** Tomato is retained with false

### Requirement: Recover a rejected individual check locally

When an item PATCH rejects, the view SHALL revert that display-name check to the inverse of the attempted value, retain other local keys, and show a per-item error indicator for three seconds. Other rows SHALL remain interactive.

#### Scenario: Failed check
- **WHEN** checking Tomato rejects while Lettuce is checked
- **THEN** Tomato reverts to unchecked, Lettuce stays checked and an error appears for Tomato

#### Scenario: Retry
- **WHEN** the member activates the reverted item again and that request succeeds
- **THEN** the new optimistic state remains after success

### Requirement: Order unchecked rows before checked rows within an aisle

Each displayed aisle SHALL place unchecked rows before checked rows, retaining supplied order within each group. Its count and completion indicator SHALL count rendered rows, including duplicate display names.

#### Scenario: Move down and back
- **WHEN** an unchecked row is checked and then unchecked
- **THEN** it moves after unchecked rows and returns to its source-relative unchecked position

#### Scenario: Duplicate completion
- **WHEN** every row shares one checked display name
- **THEN** the checked count includes every rendered row

### Requirement: Allow aisle collapse without immediately hiding a final checked item

Aisle headers SHALL expose expanded state and toggle only their own item region. Completed aisles SHALL initialize collapsed and re-collapse when the document returns visible. Checking the last item in an expanded aisle SHALL leave it expanded until another collapse trigger.

#### Scenario: Final item
- **WHEN** the last unchecked item in an expanded aisle is checked
- **THEN** completion is shown and the aisle stays expanded

#### Scenario: Return to app
- **WHEN** the document becomes visible with a completed aisle expanded
- **THEN** that completed aisle collapses

#### Scenario: Manual expand
- **WHEN** a collapsed aisle header is activated
- **THEN** its item region opens without changing checks

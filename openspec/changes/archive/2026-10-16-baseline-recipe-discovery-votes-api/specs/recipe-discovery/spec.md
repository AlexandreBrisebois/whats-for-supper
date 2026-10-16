# Recipe discovery delta

## Purpose

Collect member recipe preferences and expose discovery queues and voting suggestions while keeping suggestions distinct from persisted meal assignments.

## ADDED Requirements

### Requirement: Submit like or pass for the current recipe

Activating like or pass on a loaded front card SHALL remove that card locally and submit a background vote for its identity, using 1 for like and 2 for pass. Local removal SHALL NOT establish successful persistence.

#### Scenario: Like a card

- **WHEN** the person activates Like recipe
- **THEN** the current recipe is removed locally and a vote with value 1 is submitted

#### Scenario: Pass a card

- **WHEN** the person activates Dislike recipe
- **THEN** the current recipe is removed locally and a vote with value 2 is submitted

### Requirement: Attribute one stored vote to each recipe and member pair

A successfully persisted supported vote SHALL be keyed by recipe and member identity. A subsequent sequential submission for the same pair SHALL replace its vote and refresh its voting timestamp rather than add another row.

#### Scenario: First vote

- **WHEN** a supported submission has no existing row for its recipe/member pair and persistence succeeds
- **THEN** one row is stored for that pair

#### Scenario: Change vote

- **WHEN** a sequential supported submission finds an existing row and persistence succeeds
- **THEN** that row contains the replacement choice and updated timestamp

#### Scenario: Another member

- **WHEN** a different valid member votes for the same recipe and persistence succeeds
- **THEN** their distinct pair retains its own vote

### Requirement: Count likes separately from passes

Discovery recipe vote totals SHALL count stored value-1 votes for that recipe across stored members. A stored pass SHALL exclude that member recipe pair from their queue but contribute no like to its total.

#### Scenario: Mixed choices

- **WHEN** a recipe has two likes and one pass
- **THEN** its discovery like count is two

#### Scenario: Replace like with pass

- **WHEN** one member sequentially replaces a like with pass and persistence succeeds
- **THEN** the resulting like count decreases by one without adding another pair

### Requirement: Filter API discovery by category and cuisine

GET /api/discovery SHALL accept optional category and cuisine filters. Each nonempty filter SHALL restrict its matching field by equality and both supplied filters SHALL apply together before ordered results are returned under data. Omitting both SHALL allow the broader eligible member queue.

#### Scenario: Combined filters

- **WHEN** category Supper and cuisine Italian are supplied
- **THEN** only eligible unvoted rows matching both fields are returned

#### Scenario: No matching cuisine

- **WHEN** a nonempty cuisine has no eligible matching rows
- **THEN** data contains an empty recipe array

#### Scenario: Filters omitted

- **WHEN** neither filter is supplied
- **THEN** the API returns the broader eligible unvoted queue without a Supper-only restriction

### Requirement: List categories with remaining member candidates

GET /api/discovery/categories SHALL return distinct non-null categories from the requesting member eligible unvoted discovery rows under data. This category inventory SHALL NOT guarantee a Supper card or a particular category order.

#### Scenario: Exhaust a category

- **WHEN** all eligible rows of one category have votes from this member
- **THEN** that category is absent unless another eligible unvoted row remains

#### Scenario: No categories

- **WHEN** no eligible unvoted row has a non-null category
- **THEN** data contains an empty category array

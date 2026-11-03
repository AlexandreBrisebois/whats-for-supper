# Spec Delta

## MODIFIED Requirements

### Requirement: Order unchecked rows before checked rows within an aisle

Each displayed aisle SHALL place unchecked rows before checked rows, retaining supplied order within each group. Its count and completion indicator SHALL count rendered rows, including duplicate display names. This ordering SHALL include extra and recipe-derived rows together; within either check group, extras SHALL retain their supplied order before recipe-derived rows retain theirs.

#### Scenario: Move down and back
- **WHEN** an unchecked row is checked and then unchecked
- **THEN** it moves after unchecked rows and returns to its source-relative unchecked position

#### Scenario: Duplicate completion
- **WHEN** every row shares one checked display name
- **THEN** the checked count includes every rendered row

#### Scenario: Mixed rows in one aisle
- **WHEN** one aisle receives checked and unchecked extras and checked and unchecked recipe-derived rows
- **THEN** all unchecked extras appear in supplied order, followed by all unchecked recipe-derived rows in supplied order, then checked extras in supplied order, then checked recipe-derived rows in supplied order
- **AND** the aisle count and completion indicator include every row

#### Scenario: Extra check and uncheck
- **WHEN** one of two same-name unchecked extras in an aisle is checked and later unchecked while an unchecked recipe-derived row is also present
- **THEN** only that extra moves below every unchecked row when checked and returns to its source-relative position when unchecked
- **AND** the other extra and recipe-derived row retain their check states

#### Scenario: Authoritative check state arrives
- **WHEN** a successful schedule read or eligible household update changes an extra's loaded check state in a displayed aisle
- **THEN** the aisle places that extra in the group matching its authoritative check state while retaining the order of other rows

#### Scenario: Failed extra check restores order
- **WHEN** an extra moves after an optimistic check and the mutation is rejected
- **THEN** its authoritative unchecked state and source-relative position are restored while other rows retain their states and positions

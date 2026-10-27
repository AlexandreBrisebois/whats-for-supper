# Spec Delta

## MODIFIED Requirements

### Requirement: Navigate relative weeks and return to this week

The planner SHALL offer Previous week and Next week controls that request the selected offset minus or plus one through URL replacement. It SHALL offer Back to this week for nonzero offsets. For negative offsets its right-pointing arrow SHALL follow the label; for positive offsets its left-pointing arrow SHALL precede the label. URL replacement SHALL preserve other query parameters, omit weekOffset for zero and include it otherwise.

#### Scenario: Navigate forward or backward
- **WHEN** a person activates Next week or Previous week
- **THEN** the planner requests URL replacement with the selected offset incremented or decremented by one

#### Scenario: Return to zero
- **WHEN** a person activates Back to this week from a nonzero offset
- **THEN** the planner requests its URL without weekOffset while preserving other query parameters

#### Scenario: Return from a past week
- **WHEN** the selected week offset is negative
- **THEN** Back to this week displays a right-pointing arrow after its localized label
- **AND** the arrow is decorative and does not change the control's accessible name

#### Scenario: Return from a future week
- **WHEN** the selected week offset is positive
- **THEN** Back to this week displays a left-pointing arrow before its localized label
- **AND** the arrow is decorative and does not change the control's accessible name

#### Scenario: Already viewing this week
- **WHEN** the selected week offset is zero
- **THEN** Back to this week is absent

#### Scenario: Selection changes while displayed dates are retained
- **WHEN** the selected offset changes while days from the previous selection remain displayed during a read
- **THEN** the return control's direction, placement and visibility reflect the selected offset

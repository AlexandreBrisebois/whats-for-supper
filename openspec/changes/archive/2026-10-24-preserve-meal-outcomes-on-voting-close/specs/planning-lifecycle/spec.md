## MODIFIED Requirements

### Requirement: Lock persisted ordinary assignments while preserving recipe-free skips

Successful week locking SHALL change ordinary Planned entries in the selected Monday-through-Sunday range to day Locked while preserving all Cooked and Skipped statuses. Removed assignments SHALL NOT be recreated. Current Like counts SHALL be copied to matching recipes before vote clearing, and positive weekly history SHALL be captured under weekly-household-interest in the same consistent close boundary.

#### Scenario: Close preserves historical outcomes and open slots
- **WHEN** voting closes with removed assignments or legacy recipe-backed Skipped entries
- **THEN** removed recipes SHALL leave their slots available under existing planning behavior, legacy recipe-backed Skipped entries SHALL retain their representation, and Lock SHALL NOT record cooking completion or change recipe last-cooked values

#### Scenario: Planned recipe and non-cooking date
- **WHEN** locking succeeds with a Planned recipe and a recipe-free skipped plan
- **THEN** the recipe entry becomes Locked and the skipped plan retains its status and metadata

#### Scenario: Lock is not cooking
- **WHEN** a recipe is locked with no earlier last-cooked value
- **THEN** lock does not set its last-cooked value

#### Scenario: New round after meals were cooked
- **WHEN** a week reopens and a genuinely new round closes with past Cooked meals and future Planned meals
- **THEN** Cooked meals and their last-cooked values remain unchanged while Planned assignments become Locked
- **AND** completed-close replays preserve later votes and newer rounds under existing receipt rules

#### Scenario: Legacy recipe-backed skipped outcome
- **WHEN** a genuinely new round closes with an existing recipe-backed Skipped entry
- **THEN** that entry remains Skipped with its stored recipe association and is not converted back to a Locked meal

#### Scenario: Remove frees a slot before reopening
- **WHEN** a recipe assignment is explicitly removed and a genuinely new voting round closes
- **THEN** closing does not restore the removed recipe or create a calendar entry in its place

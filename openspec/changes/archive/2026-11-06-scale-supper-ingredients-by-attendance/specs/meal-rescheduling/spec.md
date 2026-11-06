## MODIFIED Requirements

### Requirement: Apply the shared date-delete lifecycle to recipe-backed entries

Recipe-backed removal SHALL use the same protected date-only DELETE and persistence-before-follow-up lifecycle as the accepted Delete the recipe-free entry before clear follow-up work requirement. It SHALL remove the selected calendar entry rather than delete the recipe. Without an optional expected-plan token it SHALL add no expected-recipe, day-status or week-status precondition; guarded callers SHALL follow the conditional-removal requirement. Removing a Cooked entry SHALL recalculate that recipe's last-cooked value from remaining Cooked entries using explicit actual preparation time when present and the legacy calendar-date fallback otherwise before refresh work.

#### Scenario: Recipe-backed date exists
- **WHEN** the selected date contains a recipe-backed entry and deletion persistence succeeds
- **THEN** that entry is removed, while the recipe remains available and the accepted recompute/publication sequence follows

#### Scenario: No calendar entry exists
- **WHEN** the date is already empty and no expected-plan token is supplied
- **THEN** deletion returns 204 without invoking the existing-entry follow-up sequence

#### Scenario: Correct a cooked meal with earlier history
- **WHEN** the latest Cooked assignment is removed and an earlier legacy Cooked calendar entry remains for that recipe
- **THEN** its last-cooked value becomes that earlier calendar date at midnight UTC
- **AND** assigning and marking the actual replacement Cooked uses the existing completion operation independently

#### Scenario: Remove the only cooked occurrence
- **WHEN** a recipe's only Cooked assignment is removed
- **THEN** its last-cooked value becomes null before follow-up publication

#### Scenario: Remove an ordinary planned entry
- **WHEN** a Planned entry is removed
- **THEN** removal does not change its recipe's last-cooked value

#### Scenario: Remaining occurrence was prepared ahead
- **WHEN** removal leaves Friday lasagna that was explicitly prepared Tuesday
- **THEN** recalculation uses Tuesday’s stored preparation time for that occurrence, not Friday’s planned date

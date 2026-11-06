## ADDED Requirements

### Requirement: Identify the original dated meal in disposition choices

Replacement choices SHALL name the original recipe and source date. Following-day movement SHALL show the actual next date and explain that consecutive occupied plans shift forward. Next Week SHALL describe first availability starting the following week. Removal SHALL say it removes that dated plan while keeping the recipe in the library. These choices SHALL NOT claim ingredients are already owned.

#### Scenario: Change a future Wednesday meal
- **WHEN** a person replaces a meal planned for a future Wednesday
- **THEN** the choice names that recipe and Wednesday, offers Thursday's actual date and does not call the source Tonight

### Requirement: Use consistent Next Week disposition across planning callers

Home, Planner and recipe-selection Next Week actions SHALL use exact-source deferral beginning the captured source week plus one. They SHALL use its confirmed scheduled date, preserve other dated plans and explain spillover beyond a full requested week. A no-op or missing destination SHALL NOT permit replacement assignment or success feedback.

#### Scenario: Next two weeks are full
- **WHEN** a replacement's Next Week disposition finds both the following and subsequent week full
- **THEN** the original moves to the next available date after those weeks, other plans stay in place and confirmation identifies the actual date and spillover

#### Scenario: Movement has no confirmed destination
- **WHEN** disposition returns no movement or no usable destination
- **THEN** replacement is not submitted and the selected recipe is retained with actionable feedback

### Requirement: Expose a removal precondition for a dated supper plan

Successful schedule reads SHALL expose a nullable opaque removalToken for each saved supper entry; empty supper dates SHALL have none. The token SHALL identify that entry and its persisted plan state without exposing that state in plaintext. A token from a different entry or changed state SHALL NOT authorise removal of the current plan.

#### Scenario: Another household member changes the day
- **WHEN** a read captures a removalToken and another member changes that dated plan
- **THEN** the previous token is stale even if the date is unchanged

### Requirement: Remove only the expected dated plan when guarded

Date deletion SHALL accept optional expectedPlanToken, rejecting malformed supplied tokens with 400. Comparison and removal SHALL be atomic: only a matching current supper entry can be removed. A missing or different entry SHALL return 409 without calendar, grocery or publication mutation. A match SHALL follow existing persistence and follow-up semantics. Omitted tokens SHALL preserve the legacy operation.

#### Scenario: Stale removal cannot delete a new plan
- **WHEN** guarded deletion uses a token from Lasagna but the date now holds Curry or a changed non-cooking plan
- **THEN** it returns 409 with no mutation and recovery asks the person to review the updated plan

#### Scenario: Guarded non-cooking replacement
- **WHEN** a person explicitly confirms replacing Take Out and its saved token still matches
- **THEN** the confirmed plan can be removed and guarded recipe assignment can follow

#### Scenario: Legacy deletion and later follow-up failure
- **WHEN** deletion omits a token, or a matching guarded deletion commits before a follow-up fails
- **THEN** omitted-token behavior remains compatible, and the latter failure does not imply restoration or authorise blind deletion replay

## MODIFIED Requirements

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Next Week action SHALL defer the exact dated recipe starting at the captured source week plus one, continuing into later weeks when full without shifting other plans. Completion SHALL confirm the actual destination and refresh the selected source week and Today when affected. Failure or an uncertain outcome SHALL retain actionable feedback without claiming movement or blindly replaying it.

#### Scenario: Committed Plan later has incomplete refresh
- **WHEN** the move is confirmed but its separate view refresh is incomplete
- **THEN** Planner SHALL explain that the meal moved and some updates could not refresh, with guidance to refresh the plan rather than repeat movement

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** deferral starts at offset two Monday rather than deployment-current next week and can continue into later weeks

#### Scenario: Movement request resolves or rejects
- **WHEN** the Plan later request returns a confirmed destination, rejects or has an uncertain outcome
- **THEN** confirmed destination is reported and the source week refreshed; rejection or uncertainty shows recovery feedback without confirming relocation or repeating an uncertain write

#### Scenario: Committed move has incomplete refresh
- **WHEN** a committed Next Week result is followed by incomplete refresh
- **THEN** Planner rereads the selected week and shows a warning that the meal moved and the plan should be refreshed, without resubmitting movement

### Requirement: Apply the shared date-delete lifecycle to recipe-backed entries

Recipe-backed removal SHALL use the same protected date-only DELETE and persistence-before-follow-up lifecycle as the accepted Delete the recipe-free entry before clear follow-up work requirement. It SHALL remove the selected calendar entry rather than delete the recipe. Without an optional expected-plan token it SHALL add no expected-recipe, day-status or week-status precondition; guarded callers SHALL follow the conditional-removal requirement. Removing a Cooked entry SHALL recalculate that recipe's last-cooked value from remaining Cooked calendar dates before refresh work.

#### Scenario: Recipe-backed date exists
- **WHEN** the selected date contains a recipe-backed entry and deletion persistence succeeds
- **THEN** that entry is removed, while the recipe remains available and the accepted recompute/publication sequence follows

#### Scenario: No calendar entry exists
- **WHEN** the date is already empty and no expected-plan token is supplied
- **THEN** deletion returns 204 without invoking the existing-entry follow-up sequence

#### Scenario: Correct a cooked meal with earlier history
- **WHEN** the latest Cooked assignment is removed and an earlier Cooked calendar entry remains for that recipe
- **THEN** its last-cooked value becomes that earlier calendar date at midnight UTC
- **AND** assigning and marking the actual replacement Cooked uses the existing completion operation independently

#### Scenario: Remove the only cooked occurrence
- **WHEN** a recipe's only Cooked assignment is removed
- **THEN** its last-cooked value becomes null before follow-up publication

#### Scenario: Remove an ordinary planned entry
- **WHEN** a Planned entry is removed
- **THEN** removal does not change its recipe's last-cooked value

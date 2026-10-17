# Spec Delta

## ADDED Requirements

### Requirement: Compute a completed-week interest signal

Recent interest SHALL use canonical week starts in the prior N complete planning weeks, default N=4, excluding the current calendar week and active reopened week. Positive unselected rows SHALL contribute at most once per recipe/week. Normalized H SHALL be qualifying week count divided by N, never a live vote total.

#### Scenario: Four-week boundary
- **WHEN** current deployment-calendar Monday is 2026-10-12 and N=4
- **THEN** September 14, 21, 28 and October 5 qualify; September 7 and October 12 do not

#### Scenario: Revote old week
- **WHEN** a September 7 row is updated on October 14
- **THEN** the update does not move it into the October 12 lookback

#### Scenario: Timezone boundary
- **WHEN** UTC Sunday/Monday differs from deployment-local date
- **THEN** the deployment planning-calendar Monday defines the window, not each browser timezone

#### Scenario: One versus five likes
- **WHEN** a qualifying row has one like or five
- **THEN** either contributes one week to H; its stored aggregate count is unchanged

#### Scenario: No historical data
- **WHEN** history is absent or historical ranking is disabled
- **THEN** existing surface ranking keys remain, apart from explicitly specified final stable ties and independently enabled cooldown

### Requirement: Keep historical eligibility independent of Discovery visibility

Historical signal calculation SHALL NOT suppress eligible positive interest solely because a recipe is outside Discovery or under cooldown. Surface-specific candidate rules SHALL decide eligibility separately. Selected-row history SHALL not itself contribute unselected interest.

#### Scenario: Search cooled recipe
- **WHEN** a cooled recipe matches typed Search filters and has qualifying interest
- **THEN** its H is available to Search; cooldown does not remove the result or its signal

#### Scenario: Selected positive row
- **WHEN** a recipe has only a selected positive row in the lookback
- **THEN** that row contributes zero to H
### Requirement: Validate historical lookback configuration

The API SHALL default historical lookback to four complete planning weeks. It SHALL validate an integer week count before activating configuration, reject nonpositive or malformed values with an actionable startup/configuration error, and keep this setting separate from Search rediscovery days. No user tuning control SHALL be added.

#### Scenario: Missing value
- **WHEN** the environment does not specify the setting
- **THEN** the API uses four weeks

#### Scenario: Invalid value
- **WHEN** the setting is zero, negative, fractional or not a number
- **THEN** the deployment reports invalid configuration rather than silently disabling safety or treating it as a month


#### Scenario: Reopen and close a prior week
- **WHEN** a qualifying historical week reopens then deliberately closes without touching recipe A
- **THEN** its H is excluded while active and can contribute again after close; A's untouched snapshot remains unchanged

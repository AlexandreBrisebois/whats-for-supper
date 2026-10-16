# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Present grocery shopping for the selected planner week

The Planner SHALL supply the selected week offset and loaded grocery lines to the grocery view. The narrow layout SHALL open shopping from the grocery tab with a return-to-planner action; the wide layout SHALL show an embedded checklist alongside Planner.

#### Scenario: Narrow shopping
- **WHEN** the grocery tab is selected in the narrow Planner layout
- **THEN** the checklist uses the selected offset and loaded lines

#### Scenario: Wide shopping
- **WHEN** Planner uses the wide layout
- **THEN** the embedded checklist receives the same week offset and loaded lines

### Requirement: Show the grocery empty state for no loaded lines

When no grocery rows are grouped for display, the checklist SHALL show its empty-list planning guidance. Where a close callback exists, Start Planning SHALL return through that callback.

#### Scenario: Empty list
- **WHEN** the grocery view has no loaded lines
- **THEN** empty-list guidance is displayed

#### Scenario: Start planning
- **WHEN** Start Planning is available and activated
- **THEN** the view invokes its return-to-planner callback

### Requirement: Restore available grocery adjuncts during week initialization

On a usable initialization result for the still-selected offset, the grocery view SHALL use returned lines or an empty list and apply an available generated dictionary check map. With no usable check map, it SHALL retain its loaded map. Meal-planning owns request eligibility and calendar interpretation.

#### Scenario: Generated check map
- **WHEN** a successful generated schedule result supplies additional-data checks and grocery lines
- **THEN** initialization replaces loaded checks and lines with those values

#### Scenario: Absent checks
- **WHEN** usable schedule data has no available check-map object
- **THEN** the loaded checks remain while lines use returned values or an empty list

### Requirement: Retain loaded grocery content on failed or superseded initialization

Failed or unusable initialization SHALL retain loaded grocery lines. A response whose requested offset differs from the currently selected offset SHALL not replace those lines. Pending initialization SHALL not itself clear loaded grocery content.

#### Scenario: Read fails
- **WHEN** a new week read rejects while grocery rows are already loaded
- **THEN** those rows remain available after loading ends

#### Scenario: Older offset
- **WHEN** a prior offset response arrives after a different offset is selected
- **THEN** that response does not replace the new week's lines

### Requirement: Refresh persisted needs after supported schedule changes

Successful assignment and removal recomputation SHALL update persisted needs for the affected week. A supported cross-week recipe move SHALL recompute both source and destination weeks. These consequences SHALL preserve unrelated check entries absent a supported merge or rename transition.

#### Scenario: Remove one of two recipes
- **WHEN** one of two distinct contributing recipes is removed and recomputation succeeds
- **THEN** only the remaining recipe contributes grocery needs and unrelated check keys remain

#### Scenario: Cross-week move
- **WHEN** a supported recipe move to another week completes both recomputations
- **THEN** source needs lose and destination needs gain that recipe's supplies while unrelated maps remain

### Requirement: Refresh scheduled recipe and ingredient affected weeks at connected service boundaries

Successful recipe synchronization SHALL recompute distinct weeks containing that recipe. A successful ingredient correction SHALL recompute stored weeks identified as containing that normalized key. No affected week SHALL require a grocery read to trigger this recalculation.

#### Scenario: Scheduled recipe sync
- **WHEN** recipe synchronization saves facts for a recipe assigned in two weeks
- **THEN** recomputation is invoked for each distinct affected week

#### Scenario: Unscheduled recipe sync
- **WHEN** a synchronized recipe has no calendar assignments
- **THEN** no week is recomputed for that recipe

### Requirement: Carry forward supported predecessor checks during mechanical normalization

When compatible previous grocery lines become one normalized line, recomputation SHALL mark it checked only when every matched predecessor was explicitly checked. A single renamed predecessor SHALL retain its prior check value or false if absent; obsolete predecessor display-name keys SHALL be replaced while unrelated keys remain.

#### Scenario: Mixed predecessor checks
- **WHEN** two compatible prior names merge and one check is absent or false
- **THEN** the merged name is unchecked and obsolete predecessor keys are removed

#### Scenario: All checked
- **WHEN** all matched predecessors are explicitly true
- **THEN** the merged normalized name is checked

#### Scenario: Single rename
- **WHEN** one prior display name is renamed mechanically and was checked
- **THEN** the normalized display-name key is true and the old name key is removed

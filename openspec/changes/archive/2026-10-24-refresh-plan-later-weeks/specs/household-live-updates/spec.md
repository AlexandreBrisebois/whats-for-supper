## MODIFIED Requirements

### Requirement: Attempt incremental schedule publication after supported saves

After a supported schedule mutation reaches its publication boundary, the server SHALL attempt its named slot or week update with the saved date or reread schedule and any available request connection exclusion. Committed cross-week legacy movement SHALL attempt source and destination snapshots independently; failure SHALL NOT prevent the other attempt or undo the move.

#### Scenario: Publication attempt does not establish receipt
- **WHEN** a supported mutation saves state and attempts publication
- **THEN** saved state SHALL NOT by itself imply emitted bytes, browser receipt or applied consumer state

#### Scenario: Week mutation reaches publication
- **WHEN** opening voting, locking, assignment, removal of an existing entry or a same-week move completes its preceding save and required reads or recomputation
- **THEN** publication is attempted with a reread schedule for that operation's week

#### Scenario: Defer reaches both publication boundaries
- **WHEN** a defer operation completes its preceding saves and recomputation and both publication calls are reached
- **THEN** snapshots are attempted for each distinct source and destination week with the supplied exclusion and optional move sequence

#### Scenario: Overdue finalization reaches publication
- **WHEN** overdue finalization saves changes and reads an affected week's schedule successfully
- **THEN** a week update is attempted for that week without a request exclusion identity

#### Scenario: Slot validation reaches publication
- **WHEN** validation saves a changed scheduled entry or creates a recipe-free skipped entry and reaches publication
- **THEN** a slot update is attempted with its ISO date, recipe or null, status and available non-cooking metadata

#### Scenario: Plan later moves to another week
- **WHEN** Planner cross-week push commits its placement
- **THEN** both affected weeks receive snapshot publication attempts, even if one follow-up fails

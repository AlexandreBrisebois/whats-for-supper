## MODIFIED Requirements

### Requirement: Return targeted Search assignment to Planner
After confirmed recipe-detail assignment, Search SHALL return to the captured Planner week/day and reference Monday. Planner SHALL read that week, bring the day into view and provide one accessible, transient recipe/date confirmation. Routine success SHALL leave no persistent banner or Refresh control. A success query or temporary ring alone SHALL NOT establish persistence. If refresh fails after confirmed save, Planner SHALL report saved-but-not-refreshed without repeating assignment.

#### Scenario: Search assignment resolves
- **WHEN** explicit-target Search assignment resolves for index two in week one
- **THEN** navigation targets Planner index two in week one with the captured reference and transient accessible recipe/date confirmation after authoritative reading, without a persistent success banner or Refresh

#### Scenario: Planner receives success feedback parameters
- **WHEN** Planner receives a truthy success value and a dayIndex
- **THEN** it reads the captured week and brings the matching card into view with reduced-motion support; any temporary highlight supplements the transient accessible confirmed-result text

### Requirement: Confirm completed planning without inventing work
Recipe detail SHALL confirm the new recipe and Planner date. Replacement SHALL state the original's confirmed removal or actual moved date, including Next Week spillover. Ordinary completion SHALL use transient accessible feedback. Replacement/spillover feedback SHALL stay readable until dismissal or context departure. Success SHALL offer no Refresh and require no further acceptance, rating or planning task. Saved-but-unrefreshed feedback SHALL distinguish persistence from unavailable refresh.

#### Scenario: Replacement and deferred original complete
- **WHEN** Curry is saved to Wednesday and Lasagna was deferred past a full next week to the following Monday
- **THEN** Planner confirms Curry's Wednesday date and Lasagna's actual Monday date and explains the full-week spillover

## ADDED Requirements

### Requirement: Keep planning-return recovery actionable

A failed reconciliation after confirmed save SHALL retain saved-but-not-refreshed feedback with read retry. A mismatching reread SHALL show changed-plan guidance without asserting the old assignment is current. Retry SHALL only reread; it SHALL NOT repeat assignment or prior-meal disposition. Navigation and retained plan content SHALL remain usable.

#### Scenario: Saved assignment cannot refresh
- **WHEN** assignment was acknowledged and the Planner reconciliation read fails
- **THEN** Planner distinguishes saved state from unavailable refresh and offers a read-only retry
- **AND** retry does not submit assignment, move, defer or removal

#### Scenario: Another household member changes the saved day
- **WHEN** reconciliation returns another recipe or an incompatible day
- **THEN** Planner shows current schedule and changed-plan guidance rather than the old success confirmation

### Requirement: Retire obsolete planning-return confirmation

Planner SHALL reconcile a matching captured planning return independently of whether routine success is visibly rendered. Once its confirmed outcome is consumed or dismissed, returning to an old success URL SHALL NOT replay it. A URL alone SHALL NOT create confirmation. Late reads SHALL NOT apply feedback or schedule snapshots after departure from their captured week/date/reference context.

#### Scenario: Routine success is consumed
- **WHEN** a matching return is reconciled and its transient confirmation completes
- **THEN** later render, Back navigation or reload of the old success URL does not resurrect that confirmation

#### Scenario: Leave while a read is pending
- **WHEN** the selected week/reference or return context changes before reconciliation completes
- **THEN** the old read does not overwrite the new context or show stale feedback

#### Scenario: Replacement outcome is dismissed
- **WHEN** the user dismisses confirmed replacement/spillover feedback
- **THEN** no write or acceptance step occurs and the old receipt does not reappear

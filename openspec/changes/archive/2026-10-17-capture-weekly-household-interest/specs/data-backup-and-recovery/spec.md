# Spec Delta

## ADDED Requirements

### Requirement: Export complete aggregate history without voter data

The existing backup workflow SHALL write a versioned, complete aggregate-history artifact, including an explicit empty dataset. Export SHALL use a consistent history generation and preserve recipe/week keys, counts and selection snapshots without historical voter fields.

#### Scenario: Export after touched zero
- **WHEN** a row was removed by a zero-like revote before export
- **THEN** the complete artifact omits it and cannot leave an older nonempty artifact masquerading as current

#### Scenario: Concurrent export and close
- **WHEN** history changes while export runs
- **THEN** the artifact represents one committed generation, never a partially applied close

### Requirement: Restore authoritative history snapshots idempotently

A valid complete history artifact SHALL replace history within its declared household scope after dependencies are resolved. Repeating restore SHALL not accumulate counts. An absent legacy artifact SHALL preserve existing destination history or leave an empty destination empty; an explicit empty artifact SHALL clear the declared scope.

#### Scenario: Repeat restore
- **WHEN** the same snapshot is restored twice
- **THEN** the resulting aggregates and snapshot fields are identical, not doubled

#### Scenario: Absent versus empty
- **WHEN** one restore omits history and another supplies an explicitly empty versioned history artifact
- **THEN** absence preserves destination history; explicit empty replaces it with empty

#### Scenario: Bad artifact
- **WHEN** history version, week key or positive-count validation fails
- **THEN** history replacement is not committed; the management result reports failure rather than treating it as empty

#### Scenario: Missing dependency
- **WHEN** a history artifact references a recipe unavailable after dependency restore
- **THEN** history restore does not create a phantom recipe or partially replace its scope; the failure is reported

#### Scenario: Removed row
- **WHEN** the destination has a stale positive row absent from a valid complete snapshot
- **THEN** successful scoped replacement removes it instead of resurrecting it through merge

#### Scenario: Restore invalidates stale requests
- **WHEN** a complete history snapshot is successfully restored
- **THEN** operational close receipts from the prior restored world cannot mutate a new round, and affected historical continuation generations are invalidated for restart

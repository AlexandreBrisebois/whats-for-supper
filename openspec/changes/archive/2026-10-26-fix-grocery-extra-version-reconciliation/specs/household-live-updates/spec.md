# Spec Delta

## MODIFIED Requirements

### Requirement: Keep newer local extra versions during reconciliation

Extra reconciliation SHALL compare stable occurrence identity and version. An incoming occurrence SHALL NOT replace a newer loaded version, and an incoming collection SHALL NOT remove a locally pending occurrence until its mutation resolves or authoritative refresh confirms the result.

#### Scenario: Older event follows local save
- **WHEN** an event supplies version four for an occurrence already loaded at version five
- **THEN** version five remains displayed

#### Scenario: Pending optimistic deletion
- **WHEN** an event still contains an occurrence whose local deletion is pending
- **THEN** the row remains optimistically absent until deletion resolves or authoritative recovery restores it

#### Scenario: Newer household edit
- **WHEN** an event supplies a higher version for a nonpending occurrence
- **THEN** the loaded row adopts the newer authoritative snapshot

#### Scenario: Older checked event reaches a future-week view
- **WHEN** a future-week grocery view holds an unchecked occurrence at version five and an eligible extra event supplies that occurrence checked at version four
- **THEN** version five remains visible instead of being removed by the older checked projection
- **AND** pending local mutations remain guarded and accepted equal-or-newer checked state can remove a nonpending projected occurrence

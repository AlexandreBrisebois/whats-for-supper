# Spec Delta

## ADDED Requirements

### Requirement: Attempt authoritative extra publication after committed changes

After an extra add, check, uncheck, rename, recategorization, deletion, or carry-forward reconciliation commits, the server SHALL attempt a `grocery_extras_updated` event containing the affected absolute Monday and authoritative visible extra occurrences for that week. An available request connection exclusion SHALL be forwarded.

#### Scenario: Extra mutation commits
- **WHEN** a current-week extra rename commits and reaches publication
- **THEN** the server attempts an extra update for that absolute week with its authoritative visible extras

#### Scenario: Carry-forward materializes occurrences
- **WHEN** current-week reconciliation creates one or more carried extra occurrences
- **THEN** the server attempts an extra update for the current absolute week after those occurrences commit

#### Scenario: Publication fails after save
- **WHEN** an extra mutation commits but event publication fails
- **THEN** the mutation remains saved and later schedule read or reconnect can recover authoritative state without reporting the save as rolled back

### Requirement: Apply received extras only to eligible shopping views

A parsed `grocery_extras_updated` event SHALL identify the occurrences' absolute Monday. It SHALL reconcile those rows when the grocery view displays that Monday or any later Monday and the occurrences belong to the deployment current week. Each future-week view SHALL retain only unchecked extras. Other views, absent identity, or unusable collections SHALL trigger no guessed update.

#### Scenario: Matching loaded week
- **WHEN** an extra update identifies the loaded absolute Monday with a valid authoritative collection
- **THEN** loaded extra rows are replaced while recipe-derived rows and checks remain unchanged

#### Scenario: Future-week shopping view
- **WHEN** an extra update identifies the deployment current Monday while any future week is displayed
- **THEN** that view reconciles its projected extras by identity and version, removes checked or removed extras, and preserves next week's recipe-derived rows

#### Scenario: Another week
- **WHEN** an extra update identifies a Monday not eligible for the displayed current or future-week shopping view
- **THEN** the displayed grocery rows remain unchanged through that handler

#### Scenario: Week identity is absent
- **WHEN** an extra update omits its absolute Monday
- **THEN** the client requests authoritative state rather than applying the collection to the displayed offset

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

### Requirement: Recover extras through schedule snapshots and reconnects

Eligible schedule snapshots SHALL include the authoritative extra occurrences for that shopping view and reconcile them under the same occurrence-week identity, version, and pending-mutation guards as an extra event. Live delivery SHALL remain a freshness hint rather than a durable replay guarantee.

#### Scenario: Event was missed
- **WHEN** an extra event was not received and a later schedule read returns the affected week
- **THEN** the returned authoritative extras reconcile the loaded grocery view

#### Scenario: Reconnect current week
- **WHEN** a browser reconnects after another device changed a current-week extra
- **THEN** the connected current-week schedule can recover that extra state without event replay

#### Scenario: Snapshot is older than pending work
- **WHEN** a matching schedule snapshot arrives while a local extra mutation remains pending
- **THEN** the pending row is not silently replaced until its outcome is reconciled

# Spec Delta

## ADDED Requirements

### Requirement: Attempt incremental schedule publication after supported saves

After a supported schedule mutation reaches its publication boundary, the server SHALL attempt its named slot or week update with the saved date or reread schedule. An available request connection exclusion SHALL be passed to publication. Saved state SHALL NOT by itself imply emitted bytes, browser receipt or applied consumer state.

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

### Requirement: Dispatch received slot updates by date

On successful parsing and completion of preceding handler steps, a received `slot_updated` event SHALL offer recipe, status and non-cooking data to Today only for the browser-local current date, then offer the dated update to the displayed week and invalidate Search promotion data. Today's accepted recent optimistic recipe guard SHALL still apply.

#### Scenario: Slot date is today
- **WHEN** a parsed slot event identifies the browser-local current date
- **THEN** Today is offered the payload before displayed-week reconciliation and Search invalidation

#### Scenario: Slot date is another day
- **WHEN** a parsed slot event identifies another date
- **THEN** Today is left untouched by this handler while the dated update is still offered to the displayed week and Search is invalidated

### Requirement: Apply slot changes only to loaded dates

A received slot update SHALL replace recipe and status only on matching dates already in the loaded displayed schedule. A null recipe SHALL clear that date's recipe; non-cooking metadata SHALL remain only for status three, and the pending marker SHALL clear. Empty or unmatched schedules SHALL retain their days.

#### Scenario: Matching loaded date
- **WHEN** a slot event matches a loaded date
- **THEN** that date receives recipe and status, applicable non-cooking data and a cleared pending marker while other dates remain unchanged

#### Scenario: Matching date clears a recipe
- **WHEN** a matching slot event supplies a null recipe and ordinary status
- **THEN** that date's recipe and non-cooking metadata clear

#### Scenario: No loaded match
- **WHEN** the displayed schedule is empty or contains no matching date
- **THEN** its days remain unchanged without inserting or queuing the slot

### Requirement: Dispatch week updates through existing snapshot guards

A parsed `week_updated` event SHALL pass its schedule and optional echo sequence to displayed-week reconciliation, invalidate Search promotion data and then offer its local-current-date entry to Today if present, provided preceding steps return. Accepted snapshot merge, adjunct and Today guards SHALL apply; a displayed-week rejection SHALL NOT itself suppress the independent Today offer.

#### Scenario: Ordinary matching week update
- **WHEN** a received week event has no echo sequence and matches the loaded offset
- **THEN** its snapshot uses the accepted displayed-week merge or deferral rules and Search is invalidated

#### Scenario: Another week includes today
- **WHEN** a week event without an echo identifies another displayed offset but contains the browser-local current date
- **THEN** the displayed week ignores it while Search is invalidated and Today is still offered that entry

#### Scenario: Week omits today
- **WHEN** a parsed week event contains no local-current-date entry and displayed-week reconciliation returns
- **THEN** Search is invalidated and Today remains untouched through this handler

### Requirement: Consume move echoes as confirmation before offset filtering

A received week snapshot with an echo sequence SHALL advance confirmed move sequence to the maximum of its current value and the echo, then skip that supplied snapshot before week-offset filtering. If a deferred snapshot exists with no active drag and equal local and confirmed sequences, it SHALL be cleared and reconciled using the accepted snapshot rules. Confirmation SHALL NOT imply all stores applied the echo payload.

#### Scenario: Echo supplies another offset
- **WHEN** a week event includes echo sequence five while confirmed sequence is three, regardless of its snapshot offset
- **THEN** confirmed sequence becomes five and that supplied snapshot is skipped by displayed-week reconciliation

#### Scenario: Older echo arrives
- **WHEN** an echo sequence is lower than the confirmed sequence
- **THEN** confirmed sequence does not decrease and the supplied snapshot remains skipped

#### Scenario: Deferred snapshot becomes eligible after echo
- **WHEN** an echo leaves local and confirmed sequences equal, no drag is active and a deferred snapshot exists
- **THEN** the deferred snapshot is cleared from its slot and offered again to ordinary snapshot reconciliation

#### Scenario: Drag or sequence mismatch remains
- **WHEN** an echo leaves a drag active or local and confirmed sequences unequal
- **THEN** the deferred snapshot is retained without release by this echo path

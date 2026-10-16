# Household live updates delta

## ADDED Requirements

### Requirement: Identify received relative-week data by absolute deployment week

Week snapshots, smart defaults, grocery updates and week-specific invalidations SHALL identify their absolute Monday. Consumers SHALL resolve the intended week by that identity before applying relative-offset guards. The same offset for a different Monday SHALL NOT replace loaded content or grocery checks. Missing identity SHALL trigger a fresh read rather than guessing the week. Move echoes SHALL retain their separate confirmation semantics.

#### Scenario: Old week-zero snapshot arrives after rollover
- **WHEN** the client has loaded October 12 through 18 and a late week-zero snapshot identifies October 5 as its Monday
- **THEN** the old snapshot cannot replace the loaded week or its checks despite matching numeric offset zero

#### Scenario: Same absolute week has another relative offset
- **WHEN** an event identifies the loaded absolute Monday but its offset was computed against an earlier reference week
- **THEN** the client maps the event to that loaded week before applying the existing merge, deferral and optimistic guards

#### Scenario: Payload cannot identify its week
- **WHEN** received relative-week data has no usable absolute Monday
- **THEN** the client refreshes the relevant context and schedule instead of applying the data to an assumed week zero

### Requirement: Reconcile Today using current authoritative deployment context

Connected, slot and week handlers SHALL select Today using meal-planning's current deployment context, refreshing it when expired. A late event SHALL NOT move that context back to an earlier day. A same-recipe optimistic guard SHALL remain scoped to its captured date and SHALL NOT suppress a different day's reconciliation.

#### Scenario: Two clients have different device dates
- **WHEN** a Tokyo browser and a Toronto browser receive an October 11 slot update while the deployment date is October 11
- **THEN** both offer that slot to Today under the existing optimistic guard

#### Scenario: Yesterday arrives after midnight
- **WHEN** the deployment date is October 12 and a late event concerns October 11
- **THEN** it can update a matching loaded Planner date but does not replace October 12 Tonight

#### Scenario: Same recipe appears on two dates
- **WHEN** yesterday's optimistic guard identifies the same recipe as today's newly loaded plan
- **THEN** the old date's guard does not suppress today's plan

## MODIFIED Requirements

### Requirement: Read week zero on every accepted connection

The initial snapshot SHALL read the server's current week at offset zero on each accepted request, including a later reconnection. Its schedule SHALL contain seven Monday-through-Sunday day entries, week status, lock state and available persisted grocery state/items. It SHALL NOT select the browser's displayed offset or replay missed domain notifications.

#### Scenario: Read the current schedule
- **WHEN** the initial schedule read succeeds
- **THEN** the connected data contains weekOffset zero and seven dated entries based on the deployment calendar current week, with recipes or empty slots and available non-cooking metadata

#### Scenario: Reconnect while another week is displayed
- **WHEN** a later request is accepted while the browser displays a different week
- **THEN** the server reads week zero again rather than that displayed week's schedule or missed event history

### Requirement: Select Today independently from the received snapshot

After displayed-week reconciliation returns, a connected snapshot SHALL offer Today an update only when its days include the deployment-local current date. It SHALL supply that entry's recipe or null, status or zero and non-cooking metadata or null. An absent current-date entry SHALL leave Today unchanged through this handler.

#### Scenario: Today is present
- **WHEN** a connected snapshot contains the deployment-local current date
- **THEN** Today receives that entry for guarded reconciliation even if another week is displayed

#### Scenario: Today is absent
- **WHEN** no snapshot day matches the deployment-local current date
- **THEN** this handler leaves Today unchanged rather than clearing it

### Requirement: Dispatch received slot updates by date

On successful parsing and completion of preceding handler steps, a received `slot_updated` event SHALL offer recipe, status and non-cooking data to Today only for the deployment-local current date, then offer the dated update to the displayed week and invalidate Search promotion data. Today's accepted recent optimistic recipe guard SHALL still apply.

#### Scenario: Slot date is today
- **WHEN** a parsed slot event identifies the deployment-local current date
- **THEN** Today is offered the payload before displayed-week reconciliation and Search invalidation

#### Scenario: Slot date is another day
- **WHEN** a parsed slot event identifies another date
- **THEN** Today is left untouched by this handler while the dated update is still offered to the displayed week and Search is invalidated

### Requirement: Dispatch week updates through existing snapshot guards

A parsed `week_updated` event SHALL pass its schedule and optional echo sequence to displayed-week reconciliation, invalidate Search promotion data and then offer its deployment-current-date entry to Today if present, provided preceding steps return. Accepted snapshot merge, adjunct and Today guards SHALL apply; a displayed-week rejection SHALL NOT itself suppress the independent Today offer.

#### Scenario: Ordinary matching week update
- **WHEN** a received week event has no echo sequence and matches the loaded offset
- **THEN** its snapshot uses the accepted displayed-week merge or deferral rules and Search is invalidated

#### Scenario: Another week includes today
- **WHEN** a week event without an echo identifies another displayed offset but contains the deployment-local current date
- **THEN** the displayed week ignores it while Search is invalidated and Today is still offered that entry

#### Scenario: Week omits today
- **WHEN** a parsed week event contains no deployment-current-date entry and displayed-week reconciliation returns
- **THEN** Search is invalidated and Today remains untouched through this handler

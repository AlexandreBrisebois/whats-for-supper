# Household live updates Specification

## Purpose

Provide the shared household live-update connection and initial schedule snapshot, and describe how received snapshots reconcile the displayed week and Today without implying lossless recovery or complete state convergence.

## Evidence and qualifications (non-normative)

Promoted under A82 from the reviewed `baseline-household-live-updates-connection-reconciliation` delta. BSL-household-live-updates-001–006 in the [durable plan](../../../docs/openspec-baseline-plan.md) records source identities, complete requirement/scenario mappings, inspected assertions and promotion evidence. These requirements describe implementation-supported behavior; runtime/API/browser/network/database/model qualification remains deferred under A34.

U95–U101 retain stream contract omissions, unlocked controller writes, native reconnect limits, conditional or stale snapshot application, browser-local Today guards, the raw grocery dictionary/additionalData mismatch and substituted assertion limits. Attempted connection, registration, emitted data, receipt and applied state remain separate. No durable replay, Last-Event-ID recovery, exactly-once delivery, global ordering, cross-replica broadcast, guaranteed reconnection, immediate freshness or complete convergence is established.

Shared access/member context remains with household-identity, readiness/failure notifications with recipe-capture, contextual polling/recovery with recipe-quality and workflow acceptance/retries with background-processing. All historical qualifications, including A69, feature-enabled PDF/U70–U74 and U01/U75–U94, remain intact. Promotion is documentation only; the source change remains active.

## Requirements

### Requirement: Attempt the stream from the mounted app shell

The browser app shell SHALL attempt a credentialed connection to `/api/stream` on mounting. A nonempty public API base SHALL be concatenated with `/api/stream`; an absent or empty base SHALL use the relative path. Navigation retaining that shell SHALL retain its connection effect rather than create a page-specific connection.

#### Scenario: No public API base
- **WHEN** the app shell mounts with an absent or empty public API base
- **THEN** it constructs a connection to `/api/stream` with credentials enabled

#### Scenario: Public API base supplied
- **WHEN** the app shell mounts with public API base `https://api.example.com`
- **THEN** it constructs a credentialed connection to `https://api.example.com/api/stream`

#### Scenario: Navigation retains the app shell
- **WHEN** navigation changes child pages while retaining the mounted app shell
- **THEN** that shell retains its connection effect across that navigation

### Requirement: Apply shared access and stream-specific member checks

GET `/api/stream` SHALL use the household-identity API access gate. After authorization it SHALL require a GUID-valued `x-family-member-id` cookie, returning 400 with member-cookie guidance when absent or unparseable. A member header alone SHALL NOT replace this cookie; this stream check SHALL NOT establish member existence.

#### Scenario: Household access is missing
- **WHEN** a stream request supplies a member cookie but no accepted household credential
- **THEN** the API access gate returns 401 before stream registration

#### Scenario: Member cookie is absent or malformed
- **WHEN** an authorized stream request has no parseable member cookie, including when it supplies only a member header
- **THEN** the response is 400 with `x-family-member-id cookie is required` and no connection is registered

#### Scenario: Parseable member context reaches registration
- **WHEN** an authorized stream request has a GUID-valued member cookie
- **THEN** it proceeds to stream registration without a member-existence lookup in this endpoint

### Requirement: Return a fresh connection identity with a successful snapshot

Each accepted stream request SHALL register a fresh connection identity before retrieving its initial snapshot. When retrieval and output succeed, it SHALL emit a `connected` event carrying `type: connected`, `schedule` and that `connectionId` directly in the frame data. Registration alone SHALL NOT establish successful emission, receipt or state application.

#### Scenario: Initial snapshot succeeds
- **WHEN** registration, schedule retrieval and initial output succeed
- **THEN** the stream writes and flushes a `connected` frame with the schedule and newly registered connection identity

#### Scenario: Snapshot retrieval fails after registration
- **WHEN** the schedule read throws after a connection was registered
- **THEN** cleanup removes that registration without establishing a successful connected snapshot

### Requirement: Read week zero on every accepted connection

The initial snapshot SHALL read the server's current week at offset zero on each accepted request, including a later reconnection. Its schedule SHALL contain seven Monday-through-Sunday day entries, week status, lock state and available persisted grocery state/items. It SHALL NOT select the browser's displayed offset or replay missed domain notifications.

#### Scenario: Read the current schedule
- **WHEN** the initial schedule read succeeds
- **THEN** the connected data contains weekOffset zero and seven dated entries based on the server UTC current week, with recipes or empty slots and available non-cooking metadata

#### Scenario: Reconnect while another week is displayed
- **WHEN** a later request is accepted while the browser displays a different week
- **THEN** the server reads week zero again rather than that displayed week's schedule or missed event history

### Requirement: Frame and maintain the open response

An accepted stream SHALL set `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` and `X-Accel-Buffering: no`. Named data frames SHALL use an event line, a JSON data line and a blank-line terminator. After successful initial output, the controller SHALL attempt flushed `: ping` comment frames at fifteen-second timer ticks until cancellation or failure.

#### Scenario: Emit a data frame
- **WHEN** a named frame is written successfully
- **THEN** its bytes contain `event: <name>`, newline, `data: <JSON>` and two terminating newlines without a success data envelope

#### Scenario: Heartbeat tick succeeds
- **WHEN** the post-snapshot timer ticks with the request active and output succeeds
- **THEN** the controller writes and flushes `: ping` followed by a blank line, without a domain-state update

#### Scenario: Request ends
- **WHEN** request cancellation or a stream-loop failure leaves the accepted request
- **THEN** its connection registration is removed

### Requirement: Keep browser connection failures bounded to the mounted effect

A connection-construction exception SHALL be logged and end that mounting attempt. A later connection error SHALL be logged without an application-created replacement connection, retry timer or store reset. Reconnection attempts SHALL be delegated to the browser's native connection while it remains eligible; no successful reconnect deadline is established.

#### Scenario: Construction throws
- **WHEN** native connection construction throws
- **THEN** the effect logs the failure and does not schedule another attempt from that invocation

#### Scenario: Connection reports an error
- **WHEN** the constructed connection invokes its error callback
- **THEN** the hook logs the error without closing and recreating the connection or clearing optimistic state

#### Scenario: Shell unmounts
- **WHEN** the shell's connection effect is cleaned up
- **THEN** it closes that connection

### Requirement: Dispatch received connected snapshots without resetting optimistic guards

On a successfully parsed `connected` event, the browser SHALL retain a supplied truthy connection identity, pass the schedule to displayed-week reconciliation and then attempt Today reconciliation. Receipt SHALL NOT clear optimistic guards or confirm pending move sequences merely because a connection opened. Without a supplied identity it SHALL retain any existing identity.

#### Scenario: Receive a connected identity
- **WHEN** a valid connected payload includes a truthy connectionId
- **THEN** it replaces the stored connection identity before schedule reconciliation

#### Scenario: Connected identity is omitted
- **WHEN** a parsed connected payload has no truthy connectionId
- **THEN** the previous identity remains and the schedule is still passed to reconciliation

#### Scenario: Reconnect with pending optimistic work
- **WHEN** another connected snapshot arrives while optimistic work remains guarded
- **THEN** it uses those existing reconciliation guards without blanket clearing or move confirmation

### Requirement: Reconcile only the displayed snapshot week

A snapshot without a move echo SHALL replace or merge displayed-week state only when its week offset matches the loaded week, treating an omitted offset as zero. A different offset SHALL leave that week's state unchanged. The independent Today reconciliation SHALL remain eligible even if displayed-week reconciliation ignores the snapshot.

#### Scenario: Displayed week matches
- **WHEN** a snapshot's week offset matches the loaded week with no drag or unconfirmed move
- **THEN** its day entries are reconciled into that week and its synchronization timestamp advances

#### Scenario: Another week is displayed
- **WHEN** week one is displayed and a connected snapshot identifies week zero
- **THEN** the week-one state and its synchronization timestamp remain unchanged by that snapshot

### Requirement: Defer day replacement during local moves

A matching snapshot without a move echo SHALL defer day replacement while a drag is active or a local move is unconfirmed, retaining the latest deferred snapshot while applying incoming week status and advancing the synchronization timestamp. Reconnection alone SHALL NOT release this deferral.

#### Scenario: Local move is unconfirmed
- **WHEN** a matching connected snapshot arrives with a local move sequence ahead of the confirmed sequence
- **THEN** current days remain, the snapshot is retained for later reconciliation, and week status and synchronization time update

#### Scenario: Drag remains active
- **WHEN** a matching snapshot arrives during a drag
- **THEN** current days remain and that latest snapshot replaces any previously deferred snapshot

#### Scenario: Deferred snapshot becomes eligible
- **WHEN** a move echo confirms all local moves with no active drag, or drag end finds all moves confirmed, and a deferred snapshot exists
- **THEN** that snapshot is cleared from the deferred slot and passed through snapshot reconciliation again

### Requirement: Preserve existing day content under snapshot merge guards

An eligible snapshot SHALL preserve prior pending suggestion content for the same date when no persisted recipe or non-cooking entry replaces it. If every normalized incoming day lacks a recipe, it SHALL also retain prior recipes and their statuses for matching ordinary dates and retain existing week status when prior days exist. Persisted recipes and non-cooking entries SHALL take precedence for their dates.

#### Scenario: Pending content remains unassigned
- **WHEN** a snapshot leaves a matching pending day without a persisted recipe or non-cooking entry
- **THEN** its prior pending recipe, pending marker and vote metadata are retained

#### Scenario: Server occupies the date
- **WHEN** the matching incoming day has a persisted recipe or non-cooking entry
- **THEN** that day is used instead of preserving its prior pending suggestion

#### Scenario: Incoming week has no recipes
- **WHEN** all normalized incoming days lack recipes and existing ordinary matching days contain recipes
- **THEN** those previous recipes and statuses remain, and prior week status remains when prior days exist

### Requirement: Apply available snapshot adjuncts conditionally

An eligible nondeferred snapshot SHALL set the week's grocery items to supplied items or an empty list. Snapshot check-state SHALL replace the loaded grocery check map only when a usable `groceryState.additionalData` object is present. Receipt of a plain check-state dictionary SHALL NOT by itself establish that the grocery check map was reconciled.

#### Scenario: Additional-data check map is present
- **WHEN** an eligible snapshot contains groceryState.additionalData as an object
- **THEN** its check map is applied synchronously after the week state update

#### Scenario: Raw or missing check map
- **WHEN** an eligible snapshot has a plain groceryState dictionary or no groceryState.additionalData
- **THEN** the existing loaded check map remains while grocery items use the supplied list or an empty list

### Requirement: Select Today independently from the received snapshot

After displayed-week reconciliation returns, a connected snapshot SHALL offer Today an update only when its days include the browser-local current date. It SHALL supply that entry's recipe or null, status or zero and non-cooking metadata or null. An absent current-date entry SHALL leave Today unchanged through this handler.

#### Scenario: Today is present
- **WHEN** a connected snapshot contains the browser-local current date
- **THEN** Today receives that entry for guarded reconciliation even if another week is displayed

#### Scenario: Today is absent
- **WHEN** no snapshot day matches the browser-local current date
- **THEN** this handler leaves Today unchanged rather than clearing it

### Requirement: Preserve Today's recent optimistic recipe guard

Today SHALL suppress an offered update with a different recipe identity while its optimistic write is less than two seconds old. Otherwise it SHALL apply recipe and status, retain non-cooking metadata only for status three and clear the optimistic timestamp. Matching recipe identity SHALL permit detail updates inside the guard window. Suppressed updates SHALL NOT be queued for timed replay.

#### Scenario: Different recipe arrives inside the guard
- **WHEN** Today has a recent optimistic write and the offered recipe identity differs
- **THEN** Today retains its state without scheduling application of that suppressed snapshot

#### Scenario: Matching recipe arrives inside the guard
- **WHEN** Today has a recent optimistic write and the offered recipe identity matches
- **THEN** it accepts the supplied details and status and clears the guard

#### Scenario: Guard is absent or expired
- **WHEN** Today has no optimistic timestamp or its age is at least two seconds
- **THEN** the offered recipe, status and applicable non-cooking metadata are applied and the optimistic timestamp clears

### Requirement: Use connection identity only for immediate echo exclusion

Subsequent requests through the shared API client SHALL attach a stored nonempty connection identity as `X-SSE-Connection-ID`. At publication boundaries that pass that header through as exclusion, broadcasts SHALL skip the matching current registration and attempt other registrations. A missing or obsolete identity SHALL NOT identify a different newly registered connection for exclusion.

#### Scenario: Matching registered identity is excluded
- **WHEN** a publication receives an exclusion identity matching a current registration
- **THEN** it skips that registration while attempting other registered responses

#### Scenario: Identity is missing or obsolete
- **WHEN** publication has no exclusion identity or one that matches no current registration
- **THEN** that identity excludes no registered response

### Requirement: Bound delivery to current process registrations

Publication SHALL attempt named frames only for responses registered in the current process, serializing each broadcast write through that registration's broadcast lock. A caught response write or flush failure SHALL remove that registration. This SHALL NOT establish serialization with controller snapshot/heartbeat writes, durable delivery, subscriber acknowledgement or cross-process propagation.

#### Scenario: Healthy registered responses
- **WHEN** a broadcast writes successfully to two registered in-process responses
- **THEN** both response bodies contain the named frame without establishing browser receipt or application

#### Scenario: Registered response fails during output
- **WHEN** a registered response throws inside broadcast write or flush handling
- **THEN** that registration is removed during the broadcast and other reachable healthy responses remain eligible

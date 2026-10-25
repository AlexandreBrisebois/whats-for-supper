# Household live updates Specification

## Purpose

Provide the shared household live-update connection and initial schedule snapshot, and describe how received snapshots reconcile the displayed week and Today without implying lossless recovery or complete state convergence.

## Planning dependencies (non-normative)

References in preserved requirements to the former combined meal-planning owner resolve through the current capability links below. The referenced behavior and each existing requirement body remain unchanged.

- [Expose one authoritative calendar context with schedule reads](../deployment-calendar/spec.md#requirement-expose-one-authoritative-calendar-context-with-schedule-reads)
- [Refresh expired Today context before a new action](../deployment-calendar/spec.md#requirement-refresh-expired-today-context-before-a-new-action)

## Evidence and qualifications (non-normative)

Promoted under A82 from the reviewed `baseline-household-live-updates-connection-reconciliation` delta. BSL-household-live-updates-001–006 in the [durable plan](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline-plan.md) records source identities, complete requirement/scenario mappings, inspected assertions and promotion evidence. These requirements describe implementation-supported behavior; runtime/API/browser/network/database/model qualification remains deferred under A34.

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
- **THEN** the connected data contains weekOffset zero and seven dated entries based on the deployment calendar current week, with recipes or empty slots and available non-cooking metadata

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

An eligible nondeferred snapshot SHALL replace grocery items and any supplied raw or generated-client boolean check dictionary. Explicit false values and empty dictionaries SHALL be retained. Missing or null check-state SHALL retain loaded checks. Existing absolute-week, move-echo and optimistic deferral guards SHALL apply before replacement.

#### Scenario: Missing snapshot grocery items
- **WHEN** an eligible snapshot omits grocery items
- **THEN** the grocery item list SHALL become empty while check-state follows the supplied, missing or null map rules

#### Scenario: Additional-data check map is present
- **WHEN** an eligible snapshot contains groceryState.additionalData with checked and unchecked entries
- **THEN** its complete check map replaces the loaded map synchronously after the week state update

#### Scenario: Raw connected or week update reconciles grocery content
- **WHEN** an eligible connected or week_updated snapshot, including reconnect, supplies raw groceryState with checked and unchecked entries
- **THEN** its grocery items and complete check map replace the loaded content with explicit false values retained

#### Scenario: Explicit empty map clears checks
- **WHEN** an eligible snapshot supplies an empty raw or generated-client check dictionary
- **THEN** prior grocery checks are removed

#### Scenario: Raw or missing check map
- **WHEN** an eligible snapshot omits check-state or supplies null
- **THEN** loaded checks remain while grocery items use the supplied list or an empty list

#### Scenario: Another week or optimistic move guards adjuncts
- **WHEN** a snapshot identifies another absolute week or is deferred during an active or unconfirmed move
- **THEN** it does not replace loaded grocery items or checks until eligible reconciliation

### Requirement: Select Today independently from the received snapshot

After displayed-week reconciliation returns, a connected snapshot SHALL offer Today an update only when its days include the deployment-local current date. It SHALL supply that entry's recipe or null, status or zero and non-cooking metadata or null. An absent current-date entry SHALL leave Today unchanged through this handler.

#### Scenario: Today is present
- **WHEN** a connected snapshot contains the deployment-local current date
- **THEN** Today receives that entry for guarded reconciliation even if another week is displayed

#### Scenario: Today is absent
- **WHEN** no snapshot day matches the deployment-local current date
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

### Requirement: Forward received vote totals to existing consumers

A parsed `vote_updated` event SHALL offer its recipe identity and vote count first to the displayed-week consumer and then to Discovery, provided preceding steps return. Matching loaded planner recipes SHALL receive that recipe vote count without creating missing entries. Discovery SHALL receive the same update for its own interest and ranking policy; vote meaning remains owned by recipe discovery.

#### Scenario: Loaded recipe receives a total
- **WHEN** a vote event identifies a recipe in the displayed schedule
- **THEN** matching planner recipe objects receive the count and Discovery is offered the same identity and count

#### Scenario: Planner has no matching recipe
- **WHEN** no displayed planner recipe matches the event identity
- **THEN** planner content remains unchanged and Discovery is still offered the update without inserting a planner recipe

### Requirement: Filter received smart defaults by their nested week

A parsed `smart_defaults_updated` event SHALL offer its defaults for application only when `defaults.weekOffset` strictly equals the loaded week offset. A different or absent nested offset SHALL leave the displayed schedule unchanged through this handler. The outer event offset SHALL NOT override this gate.

#### Scenario: Nested week matches
- **WHEN** defaults identify the loaded week offset
- **THEN** those defaults are offered for pending-slot reconciliation

#### Scenario: Outer and nested offsets differ
- **WHEN** the outer event identifies the loaded week but its defaults identify another week
- **THEN** the handler ignores those defaults

#### Scenario: Nested offset is absent
- **WHEN** the event has no nested defaults week offset
- **THEN** it does not pass this handler's week gate even when the loaded week is zero

### Requirement: Reconcile received suggestions without replacing occupied slots

Eligible smart defaults SHALL fill empty or pending displayed slots by day index, retaining supplied recipe display data and pending vote metadata. Persisted recipe slots and status-three non-cooking slots SHALL remain unchanged. A pending slot absent from the new defaults SHALL clear its suggestion and pending vote metadata. This consequence SHALL NOT assign a recipe on the server or define consensus eligibility.

#### Scenario: Suggestion replaces an eligible slot
- **WHEN** eligible defaults contain a preselected recipe for an empty or pending day index
- **THEN** that slot contains the suggestion with pending marker and supplied vote metadata

#### Scenario: Persisted or non-cooking slot is occupied
- **WHEN** eligible defaults address a persisted recipe slot or status-three non-cooking slot
- **THEN** that slot remains unchanged

#### Scenario: Suggestion is withdrawn
- **WHEN** a previously pending slot has no preselected entry in eligible new defaults
- **THEN** its recipe clears, pending becomes false and its pending vote and unanimous metadata become null

### Requirement: Attempt invalidation at supported schedule publication boundaries

The server SHALL attempt `fill_the_gap_invalidated` for the affected week after assignment or removal of an existing dated entry reaches its preceding week-publication boundary successfully. The unscheduled-cooking validation branch SHALL attempt this invalidation after saving cooking history. An available request connection exclusion SHALL be forwarded; invalidation SHALL NOT imply refreshed candidate data.

#### Scenario: Assignment or removal reaches invalidation
- **WHEN** the supported operation completes its preceding persistence, recomputation and week-publication call
- **THEN** a fill-the-gap invalidation is attempted with the affected week offset and supplied exclusion

#### Scenario: Cooking history changes without matching scheduled recipe
- **WHEN** the unscheduled-cooking validation branch saves the recipe's cooking history and reaches publication
- **THEN** it attempts a fill-the-gap invalidation for the date's week without a slot update from that branch

### Requirement: Signal candidate freshness separately from fetching results

A parsed `fill_the_gap_invalidated` event SHALL advance the shared Discovery invalidation generation and the generation for its supplied week, then invalidate Search promotion data if preceding steps return. Other week-specific generations SHALL remain unchanged. These signals SHALL NOT by themselves supply results, rerun server eligibility policy or establish a successful refresh.

#### Scenario: Invalidate one week's candidates
- **WHEN** a parsed invalidation identifies week one
- **THEN** the global generation and week-one generation advance, other week generations remain and Search promotion data is invalidated

#### Scenario: Matching Quick Find is ready
- **WHEN** a mounted Quick Find has completed initial fetching and observes a newer generation for its week
- **THEN** it attempts another suggestion fetch for that week without a successful-result guarantee

#### Scenario: Other week's Quick Find observes unchanged generation
- **WHEN** an invalidation changes only another week's generation
- **THEN** that invalidation does not trigger the modal's week-generation refresh effect

### Requirement: Attempt publication of saved vote consequences

After saving a vote and reading its like count, the server SHALL attempt an update with recipe identity and count. In an owned round, successful recalculation SHALL attempt smart-default and session updates for the owner's absolute week after every saved vote, even after convergence. Without an owner, early-vote publication SHALL remain available without claiming convergence. Attempts SHALL NOT define vote eligibility, guarantee threshold transitions or establish receipt.

#### Scenario: Saved vote reaches publication
- **WHEN** vote persistence and resulting like-count retrieval succeed and publication is reached
- **THEN** a vote update is attempted with that recipe identity and count without a request connection exclusion

#### Scenario: Discovery recalculation reaches publication
- **WHEN** an owned round's recalculation succeeds after a saved vote
- **THEN** a smart-default update is attempted carrying the owner's week and those defaults without a request connection exclusion

### Requirement: Attempt grocery check-map publication at supported saves

After a full grocery-state update or single-item toggle saves successfully and reaches publication, the server SHALL attempt `grocery_updated` with its week offset and resulting check map, forwarding an available request exclusion. Grocery recomputation SHALL attempt this event only when its check-state transition changed the map and a publisher is available. Publication SHALL NOT imply browser application.

#### Scenario: Grocery mutation reaches publication
- **WHEN** a full map update or single-item toggle completes its save and reaches publication
- **THEN** the event attempt carries the affected week and resulting complete check map with the supplied exclusion

#### Scenario: Recompute changes check state
- **WHEN** recomputation saves a changed check map and has a publisher
- **THEN** it attempts a grocery update for that week without a request exclusion

#### Scenario: Recompute has no check-state transition
- **WHEN** recomputation does not change its check map
- **THEN** it does not publish a grocery event from that recomputation path merely because grocery line items were recalculated

### Requirement: Replace received grocery checks only for the loaded week

A parsed `grocery_updated` event SHALL replace the loaded grocery check map with its supplied dictionary only when its week offset strictly equals the displayed week's loaded offset. A different or absent offset SHALL leave that map unchanged. This event SHALL NOT itself replace grocery line items, change the displayed week or use the snapshot additional-data wrapper.

#### Scenario: Matching week replaces checks
- **WHEN** a grocery event identifies the loaded week and supplies a valid check dictionary
- **THEN** that dictionary replaces the loaded check map, including removal of prior keys absent from the event, while line items remain unchanged

#### Scenario: Another or missing week
- **WHEN** a grocery event identifies another week or omits its week offset
- **THEN** the loaded check map remains unchanged through this handler

### Requirement: Forward ready hints beyond pending capture tracking

After parsing `recipe_ready` and completing any matching capture dispatch, the browser SHALL record the recipe identity in its session ready-hint set even when no pending capture matches. Repeated identities SHALL remain a single set membership. This hint SHALL NOT itself persist recipe readiness or replay missed notifications; capture presentation remains with “Inline transition to ready status upon completion” in recipe-capture.

#### Scenario: No capture is pending
- **WHEN** a parsed ready event has no matching pending capture and handler steps return
- **THEN** the session ready set contains its identity without adding a capture notification

#### Scenario: Ready identity repeats
- **WHEN** the same ready identity is handled again and handler steps return
- **THEN** it remains one set membership without establishing exactly-once transport

### Requirement: Preserve available lifecycle context at the capture handoff

When a parsed lifecycle event matches pending capture tracking, shared dispatch SHALL forward available event context to the existing capture notification consumer. Ready context includes identity, display name and image; failure context includes recipe and workflow identities, diagnostics and partial data. Capture SHALL retain ownership of “Persistent failure banner on workflow failure”; forwarding context SHALL NOT expose raw diagnostics as user guidance.

#### Scenario: Ready context reaches the journey
- **WHEN** a ready event matches pending capture tracking
- **THEN** dispatch removes that pending identity and appends ready context using event name, then pending name, then identity as nullish fallbacks, with the supplied image

#### Scenario: Failure context reaches the journey
- **WHEN** a failed event matches pending capture tracking
- **THEN** dispatch removes that pending identity and appends failure context with workflow identity, error, failed step and partial data, using partial name, pending name and identity as nullish name fallbacks

#### Scenario: Failure has no pending match
- **WHEN** a failed event has no matching pending capture
- **THEN** this handler adds no capture notification and does not mark the identity ready

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

### Requirement: Dispatch received slot updates by date

On successful parsing and completion of preceding handler steps, a received `slot_updated` event SHALL offer recipe, status and non-cooking data to Today only for the deployment-local current date, then offer the dated update to the displayed week and invalidate Search promotion data. Today's accepted recent optimistic recipe guard SHALL still apply.

#### Scenario: Slot date is today
- **WHEN** a parsed slot event identifies the deployment-local current date
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

### Requirement: Expose authoritative voting session snapshots

An authorized session read SHALL identify the operational round, active absolute week if any, server incarnation, revision and session phase. Owned snapshots SHALL include required slots, covered slots, candidate count and matching smart defaults from one consistent calculation. Unowned snapshots SHALL distinguish absent capacity from confirmed zero capacity. Reads SHALL NOT assign recipes, close voting or capture history.

#### Scenario: Direct Discovery entry for next week
- **WHEN** next week owns voting but a fresh browser has initialized Planner at week zero
- **THEN** the session read identifies next week's round and coverage without navigating Planner or guessing its owner from local state

#### Scenario: Consistent progress and suggestions
- **WHEN** a saved vote or plan edit changes session coverage
- **THEN** a returned snapshot's counts and suggestions describe the same calculation, not a client merge of unrelated schedule and defaults reads

### Requirement: Reuse household transport for session updates

Session changes SHALL publish replacement state through the existing household stream, including changes caused by open, close, votes and relevant committed plan edits. Publication SHALL follow persistence; failure SHALL NOT imply rollback. The browser SHALL reconcile on Discovery entry, successful stream reconnect, foreground resume and successful local mutations affecting the session, without a second connection or polling loop.

#### Scenario: Member stops without another swipe
- **WHEN** a connected member receives a converged session snapshot
- **THEN** Discovery reflects it without requiring that member to vote again

#### Scenario: Missed event
- **WHEN** a disconnected member reconnects after another member converges
- **THEN** the browser reads current session state and adopts that result even when no subsequent vote occurs

#### Scenario: Echo excluded from ordinary schedule event
- **WHEN** a local plan mutation succeeds but its ordinary schedule event excludes the initiating connection
- **THEN** the local completion path still refreshes session state

#### Scenario: Publication fails after commit
- **WHEN** a vote or close persists but SSE publication fails
- **THEN** later successful session reads recover persisted truth; no duplicate close or compensating vote deletion is triggered by the notification failure

### Requirement: Reject stale session projections

Consumers SHALL reject older revisions within a server incarnation and prevent superseded requests, old rounds and old-week suggestions from replacing newer accepted state. A changed server incarnation SHALL require authoritative reconciliation before accepting its revision baseline. Duplicate state SHALL be idempotent. Session freshness SHALL NOT depend on browser wall clocks.

#### Scenario: Delayed old-round event
- **WHEN** a prior round's convergence arrives after the next round has been confirmed
- **THEN** it cannot stop the new round or restore its old suggestions

#### Scenario: Duplicate or reordered update
- **WHEN** revision eight is accepted before revisions seven and eight are received again
- **THEN** seven is ignored and duplicate eight adds no assignment, celebration replay or count increment

#### Scenario: Host restarts
- **WHEN** the client encounters a new server incarnation with a lower revision
- **THEN** it reconciles through the authoritative read and can accept restarted-host state without remaining stuck on the old revision

#### Scenario: Planner is viewing another week
- **WHEN** session state identifies a different absolute week than the displayed Planner
- **THEN** session state can update Discovery but its suggestions do not overwrite the displayed week's days

### Requirement: Keep convergence separate from live suggestion replacement

A newer authoritative session snapshot SHALL continue updating pending suggestions after convergence while preserving persisted recipes and Other plans. It SHALL not revive swiping in the same host round. Existing snapshot retention guards SHALL NOT restore obsolete suggestions after a newer confirmed session projection has withdrawn or reordered them.

#### Scenario: Late unanimity changes ordering
- **WHEN** a late saved vote changes existing suggestion order after convergence
- **THEN** the loaded owning Planner week receives the revised pending placement while Discovery retains its celebration

#### Scenario: Older defaults arrive after replacement
- **WHEN** an older smart-default event or pending read arrives after a newer session projection
- **THEN** it cannot restore superseded pending content; legacy payloads lacking freshness metadata trigger a read for an active session instead of overwriting it

#### Scenario: Occupied date wins
- **WHEN** a committed Other plan occupies a formerly pending date
- **THEN** refreshed suggestions respect the occupied date without overwriting its plan or persisting a replacement meal

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

### Requirement: Order coordinated grocery publication attempts with committed mutations

For normal recipe-derived check-map mutations on one application instance, grocery publication attempts for a week SHALL follow their server processing order and occur only after successful persistence. An earlier mutation's publication attempt SHALL finish or fail before a later mutation's attempt begins. This does not guarantee receipt, replay or ordering against independent schedule reads and snapshots.

#### Scenario: Two successful mutations publish
- **WHEN** two overlapping item requests commit in processing order A then B and both reach grocery publication
- **THEN** A's map is attempted before B's map, with B containing the current persisted effects of both distinct-key updates

#### Scenario: Recompute publishes a transition
- **WHEN** a check update and a recomputation that changes checks both reach publication
- **THEN** their grocery publication attempts follow the same processing order as their saved map transitions

#### Scenario: Earlier publication fails
- **WHEN** A commits but its publication attempt fails and B later commits successfully
- **THEN** B can attempt publication and a fresh schedule read can recover the committed map without replay of A

#### Scenario: Ordered delivery and reread
- **WHEN** two tabs receive all applicable grocery events in publication order after distinct-key updates settle and neither has pending local mutations or another competing snapshot
- **THEN** both show the latest complete check map and a fresh eligible schedule read agrees with persisted state

#### Scenario: Independent older snapshot arrives late
- **WHEN** an older independently obtained schedule snapshot arrives after a newer grocery event
- **THEN** this publication-order guarantee does not establish stale-snapshot rejection, and a subsequent fresh eligible read after outstanding responses settle recovers persisted checks

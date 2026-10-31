# Anonymous error observation

## Purpose

Make unexpected browser and Next server failures discoverable as minimized diagnostics, with honest optional journey correlation, occurrence identity and delivery limits.

## ADDED Requirements

### Requirement: Report unexpected browser failures centrally

When enabled, WFS SHALL attempt `pwa.browser.error` for observable uncaught script errors, unhandled promise rejections and client render failures reaching its boundaries. Reporting SHALL leave application exception handling, reset and navigation unchanged. Failures before enabled initialization, caught business failures and unavailable cross-origin detail SHALL NOT be claimed as covered. Pre-opt-in errors SHALL NOT be buffered for later collection.

#### Scenario: Script and promise failures
- **WHEN** an initialized enabled document observes an uncaught script error or unhandled rejection
- **THEN** it attempts a browser-authority ERROR record with the approved observing category
- **AND** it does not serialize the thrown value, rejection payload, message, stack or source URL

#### Scenario: Route or root render failure
- **WHEN** an unexpected client render failure reaches a route or root boundary
- **THEN** it attempts the same safe reporting path without requiring a surviving React provider
- **AND** accessible fallback navigation and existing reset behavior remain usable

#### Scenario: Error before enabled initialization
- **WHEN** an error occurs before the server-derived enabled decision is available or while collection is disabled
- **THEN** it is dropped without buffering or later replay
- **AND** ordinary application handling remains unchanged

### Requirement: Reuse the existing anonymous document stream

Browser errors SHALL reuse existing enabled document-local session/tab and the same increasing source-sequence allocator as opening/navigation. They SHALL NOT initialize a visit for an error, create colliding sequences or reset context on ordinary provider replacement/remount. Context SHALL remain in memory for that Document. Stage SHALL identify only the last actually presented approved static primary screen, omitted when unknown.

#### Scenario: Opening through error to later presentation
- **WHEN** a fresh enabled document observes opening, Home presentation, a browser error and later Search presentation
- **THEN** those records share the existing session/tab, have distinct event IDs and one increasing source sequence
- **AND** the error snapshots `stage.name=home`, later navigation remains observable and no recovery or journey termination is synthesized

#### Scenario: Early error without context
- **WHEN** reporting is enabled but the document coordinator has not created session/tab, including before F2's first eligible presentation
- **THEN** a standalone browser error is attempted without session/tab/sequence/stage
- **AND** it creates no opening or visit and does not move F2 context initialization earlier

#### Scenario: Existing context without a presented screen
- **WHEN** enabled document context already exists but no eligible screen has actually been observed
- **THEN** the error uses that existing session/tab and shared sequence
- **AND** it omits stage rather than inventing a screen or discarding available correlation

#### Scenario: Boundary or provider replacement
- **WHEN** an existing enabled document's boundary or root providers are replaced or remounted
- **THEN** reporting can access the same document scope and sequence
- **AND** it creates no new session/tab or opening; a new browser Document instead has independent state

### Requirement: Capture error time and context at observation

WFS SHALL snapshot browser occurrence time, safe reason and available context at the observing callback, before deferred forwarding or subsequent presentation. It SHALL retain separate server observation time in the standard timestamp field and preserve the existing browser clock validation policy. It SHALL NOT resnapshot or repair chronology at export.

#### Scenario: Screen changes before deferred export
- **WHEN** Home is presented, an error is observed and Search is presented before its delayed forwarding runs
- **THEN** the error retains Home and its original occurrence time and source sequence
- **AND** server observation describes Action acceptance rather than delayed export, with receiver receipt remaining separate

#### Scenario: Invalid browser clock
- **WHEN** browser time is malformed, not a positive safe-integer Unix millisecond value, older than 24 hours or more than five minutes ahead of server Action observation
- **THEN** the submission is dropped without replacement time or retry
- **AND** sequence gaps and missing records remain disclosed incomplete evidence

### Requirement: Report Next-captured server failures separately

WFS SHALL attempt `pwa.server.error` for unexpected failures observed by the Next Node request-error hook using server authority and a bounded awaited export. With no approved browser request-context propagation, these SHALL be standalone diagnostics without session/tab/sequence/stage. WFS SHALL NOT infer context from cookies, household identity, URLs, request data, digests, timestamps or nearby browser records. Browser forwarding through Node SHALL remain browser authority.

#### Scenario: Server failure without a browser scope
- **WHEN** the hook observes a render, route, action or proxy failure
- **THEN** a standalone server-authority ERROR remains discoverable without invented browser context
- **AND** it exports no request path, headers, cookies, body or raw error

#### Scenario: Server error reaches a browser fallback
- **WHEN** a framework-marked server error also reaches a browser boundary
- **THEN** the server hook owns the exception report and the boundary suppresses its overlapping exception report without exporting or hashing the marker
- **AND** an actually presented browser fallback remains separate screen evidence

#### Scenario: Server hook export is interrupted or fails
- **WHEN** the Node hook reports to an unavailable or rejecting receiver
- **THEN** bounded awaited work is contained, without relying on detached work surviving request completion
- **AND** the original exception handling is unchanged and no telemetry recursion occurs

### Requirement: Emit the exact minimized error envelope

Errors SHALL use standard OTLP/HTTP JSON logs at `/v1/logs`, no compression, severityNumber 17, scope `wfs.anonymous` and fixed body `WFS unexpected error observed`. Names/services SHALL be `pwa.browser.error` / `wfs-pwa-browser` or `pwa.server.error` / `wfs-pwa-server`, with separate credentials. Resources SHALL carry service name/version; correlation and reason SHALL be record attributes, times standard timestamp fields.

#### Scenario: Required fields and resource version
- **WHEN** an error is serialized
- **THEN** required log attributes are reason, random event.id and random exception.occurrence.id
- **AND** optional browser attributes are existing session.id/tab.id/shared source.sequence and known stage.name, with no fabricated trace ID
- **AND** resource service.version is trimmed server-owned WFS_VERSION or unknown, never browser-selected
- **AND** timeUnixNano is original occurrence time and observedTimeUnixNano is server observation, not delayed export

#### Scenario: Approved categories
- **WHEN** a browser error is classified
- **THEN** reason is `browser.script`, `browser.rejection` or `browser.render`
- **AND** server reasons are only `server.render`, `server.route`, `server.action`, `server.proxy` or `server.unknown`
- **AND** each describes its observing boundary, not root cause, unique incident count, affected people or business outcome

#### Scenario: Private thrown content
- **WHEN** thrown values contain search terms, recipe content, credentials, identifiers or arbitrary exception names
- **THEN** no raw message, stack, arbitrary exception type/name, digest, request data, URL, private identifier or content-derived hash is exported
- **AND** the receiver's ability to retain raw diagnostic fields does not broaden WFS's envelope

#### Scenario: Strict browser admission
- **WHEN** input contains unknown keys, accessor fields, arrays, partial context, malformed UUIDs/integers, oversized payloads or arbitrary producer/event/body/destination values
- **THEN** the exact-shape boundary rejects it before export without echoing rejected content
- **AND** accepted browser evidence retains browser authority, fixed envelope and at most 2 KiB input

### Requirement: Separate record identity from failure occurrence and correlation

`event.id` SHALL identify a log record, `exception.occurrence.id` a local failure episode, and session/tab anonymous document correlation. One owner SHALL suppress demonstrable same-episode callbacks including effect replay. Distinct failed retries/requests SHALL receive new identities even with reused Error objects/categories. Equal text/category SHALL NOT establish identity. Suppression state SHALL be bounded; uncertain overlap SHALL be disclosed.

#### Scenario: Same-episode overlap
- **WHEN** browser native and boundary callbacks demonstrably observe one local failure episode or its effect is replayed
- **THEN** at most one report is admitted with one occurrence identity and one event identity

#### Scenario: Distinct failed retry or request
- **WHEN** reset/retry produces another failure or another server request independently fails with the same Error object/category
- **THEN** that failure has a new occurrence identity and event ID
- **AND** admission caps can still drop delivery, so admitted records are not complete failure counts

#### Scenario: Receiver exact replay
- **WHEN** the same captured log is replayed with the same event ID under the same app/source/signal before or after storage reopen
- **THEN** qualification verifies that exact replay adds no diagnostic record or journey contribution
- **AND** reuse of exception occurrence ID alone with distinct event IDs is not assumed to deduplicate receipt

#### Scenario: Unknown cross-producer overlap
- **WHEN** a native callback lacks the framework ownership marker needed to establish overlap with a server report
- **THEN** documentation discloses that exact cross-producer suppression cannot be established
- **AND** neither shared text/category nor temporal proximity merges the observations

### Requirement: Discover diagnostics independently of journey configuration

Qualification and integration guidance SHALL require ERROR records to be inspectable in Sentrame Errors & exceptions and protected diagnostic reads without an error mapping, operational goal, trace ID or journey scope. Supported browser correlation SHALL allow diagnostic evidence in an appropriate existing capture without making the error a graph step. WFS SHALL NOT automatically map errors to exit, completion or activity to obtain visibility.

#### Scenario: Standalone diagnostic without a goal or mapping
- **WHEN** a standalone WFS error is received in a disposable receiver without journey mappings or an operational goal
- **THEN** protected reads and Errors & exceptions expose the diagnostic, its safe reason, identity and authority
- **AND** absence of a journey is not called ingestion failure

#### Scenario: Linked supporting diagnostic
- **WHEN** a browser error has matching existing scope/tab within supported captured opening/navigation boundaries
- **THEN** protected reads associate it with the intended journey as supporting evidence while it remains unmapped
- **AND** the before/after path remains inspectable where retained; severity alone neither completes nor terminates the journey nor refreshes mapped inactivity

#### Scenario: Explicit visible error step
- **WHEN** an owner deliberately configures an exact service/source/log/name mapping with reviewed optional reason conditions
- **THEN** a step can show the error visibly under that prospective captured definition
- **AND** this is optional interpretation, not required diagnostic discovery, automatic exit, goal or activity

#### Scenario: Missing context or unsupported linkage
- **WHEN** context is absent or capture boundaries, retention or other supported linkage conditions do not permit association
- **THEN** the received error remains a diagnostic with unavailable/unknown linkage
- **AND** no visit, beginning, pre-error path or causal relationship is fabricated

#### Scenario: Receiver display or search gap
- **WHEN** retained reason, stage or occurrence is absent from prominent labels or supported search/filter fields
- **THEN** documentation distinguishes retention, inspection and search support using actual UI/read API evidence
- **AND** needed category filtering, clearer labels, journey navigation or server/browser linkage is separate receiver/propagation work rather than a broader WFS payload or artificial mapping

### Requirement: Contain storms and recursive pipeline failures

Reporting SHALL recheck runtime server opt-in, preserve token secrecy/producer separation and cap browser error attempts at ten per document lifetime across adapters. Reset/remount/minute rollover SHALL NOT replenish the cap. Each producer/process SHALL partition its 120/minute limit into 20 errors and 100 ordinary records, retaining four active requests and two-second timeout.

#### Scenario: Deferred browser delivery
- **WHEN** a browser error is accepted by its Server Action
- **THEN** forwarding is deferred so receiver latency does not serialize ordinary Server Actions
- **AND** telemetry failure cannot change application handling or create retries or queues

#### Scenario: Error storm
- **WHEN** one document produces thousands of errors and is reset/remounted repeatedly
- **THEN** it attempts no more than ten error submissions over its lifetime, while independent documents have independent caps
- **AND** process error/ordinary partitions and concurrency remain bounded without a growing queue or suppression collection

#### Scenario: Pipeline rejection
- **WHEN** validation, reporting, configuration, scheduling or receiver export fails, redirects or times out
- **THEN** it creates no recursive telemetry error, unhandled telemetry rejection, durable queue, retry or user-visible failure
- **AND** endpoint details and credentials are not exposed, and navigation/reset remain usable

#### Scenario: Disabled server with stale client
- **WHEN** a previously enabled document submits after server disablement
- **THEN** the server exports no error regardless of its local enabled state

### Requirement: Preserve honest outcome and qualification boundaries

An error SHALL be evidence of an observed failure occurrence, not proof that the whole journey failed, ended or recovered. Later presentation SHALL NOT manufacture business recovery; handled business events belong to their actual owners. Qualification SHALL distinguish unit/mock, real browser/handler-or-boundary/Action/Node capture, actual Sentrame durable protected reads/reopen, configured derivation, deployed routes and physical devices.

#### Scenario: Continue after error
- **WHEN** the app remains usable and later presents another screen
- **THEN** navigation continues to be observable without an automatic recovery or completion record
- **AND** later real business outcomes require their own authoritative observations

#### Scenario: Handled business failure
- **WHEN** a vote, assignment or import handler catches a failure and provides feedback
- **THEN** this central capability makes no coverage promise
- **AND** inventory work separately identifies any semantic failure/persistence/recovery owner

#### Scenario: Actual receiver qualification
- **WHEN** qualifying WFS errors
- **THEN** real browser hooks/boundaries, Actions and Node exporter reach disposable Sentrame, with independent protected receipt/reopen and journey-derivation assertions
- **AND** exact identities/categories/context survive reopen and private sentinels remain absent
- **AND** HTTP success, mocks, source review and another SDK's sample are not substitutes

#### Scenario: Synthetic completion fixture
- **WHEN** completed journey behavior needs qualification in a disposable receiver
- **THEN** an explicitly synthetic meaningful presentation goal is activated before fresh records are emitted
- **AND** error alone leaves the journey active, completion follows only the actual selected presentation, and no fake production goal is added

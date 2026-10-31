# Spec Delta

## MODIFIED Requirements

### Requirement: Report Next-captured server failures separately

WFS SHALL attempt `pwa.server.error` for unexpected failures observed by the Next Node request-error hook using server authority and a bounded awaited standard-export flush. With no approved browser request-context propagation, these SHALL be standalone diagnostics without session/tab/sequence/stage. WFS SHALL NOT infer context from cookies, household identity, URLs, request data, digests, timestamps or nearby browser records. Browser forwarding through Node SHALL remain browser authority.

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
- **THEN** bounded awaited flush/export work is contained, without relying on detached work surviving request completion
- **AND** the original exception handling is unchanged and no telemetry recursion occurs

### Requirement: Emit the exact minimized error envelope

Errors SHALL use standard OTLP/HTTP Protobuf logs under standard-telemetry-export at `/v1/logs`, no compression, severityNumber 17, scope `wfs.anonymous` and fixed body `WFS unexpected error observed`. Names/services SHALL be `pwa.browser.error` / `wfs-pwa-browser` or `pwa.server.error` / `wfs-pwa-server`, with separate credentials. Resources SHALL carry service name/version; correlation and reason SHALL be record attributes, times standard timestamp fields.

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

### Requirement: Contain storms and recursive pipeline failures

Reporting SHALL recheck runtime opt-in and preserve token secrecy/producer separation. Browser errors SHALL share ten attempts/document across adapters, never replenished by reset/remount/minute rollover. Each producer/process SHALL cap at 100 ordinary/20 errors/minute and at most four active log exports with two-second caller/processor waits and Node socket inactivity. Standard-telemetry-export SHALL own bounded memory batching/transient retries; application retry/durable queues are forbidden.

#### Scenario: Deferred browser delivery
- **WHEN** a browser error is accepted by its Server Action
- **THEN** admission to the standard bounded export pipeline is deferred so receiver latency does not serialize ordinary Server Actions
- **AND** telemetry failure cannot change application handling or create application retry loops, persistent queues or additional observations

#### Scenario: Error storm
- **WHEN** one document produces thousands of errors and is reset/remounted repeatedly
- **THEN** it attempts no more than ten error submissions over its lifetime, while independent documents have independent caps
- **AND** process error/ordinary partitions and concurrency remain bounded without an unbounded queue or suppression collection

#### Scenario: Pipeline rejection
- **WHEN** validation, reporting, configuration, scheduling or receiver export fails, redirects or times out
- **THEN** it creates no recursive telemetry error, unhandled telemetry rejection, durable queue, application retry loop or user-visible failure
- **AND** endpoint details and credentials are not exposed, and navigation/reset remain usable

#### Scenario: Disabled server with stale client
- **WHEN** a previously enabled document submits after server disablement
- **THEN** the server exports no error regardless of its local enabled state

#### Scenario: SDK transient retry preserves failure identity
- **WHEN** a standard exporter retries a batch containing an error
- **THEN** its occurrence/event IDs, original time and observer category are unchanged and no new error occurrence is created
- **AND** queue or SDK timeout/retry exhaustion can drop it without changing application handling

# standard-telemetry-export Specification

## Purpose

Deliver minimized WFS observations to Sentrame through maintained standard telemetry implementations while preserving producer authority, bounded loss and application independence.

## Requirements

### Requirement: Use standard delivery without a parallel custom transport

Selected telemetry SHALL use maintained standard providers, processors and OTLP/HTTP Protobuf exporters with no compression. Application code SHALL NOT implement OTLP envelopes, serialization, HTTP delivery, retry loops or persistent queues. Each record SHALL have one export owner; migration SHALL remove its superseded delivery path after parity qualification.

#### Scenario: Existing observations migrate
- **WHEN** an enabled browser opening, screen, surface or error is admitted
- **THEN** its actual standard exporter sends the approved log envelope to `/v1/logs`
- **AND** no handwritten exporter or second pipeline sends the same record
- **AND** resource/name, safe attributes, occurrence/server-observation times and record identity preserve their established meanings

#### Scenario: A producer uses a standard sink
- **WHEN** a trusted API issue fact is emitted through its existing maintained log sink
- **THEN** supported standard named-log or retained `event.name` representation identifies the exact fact
- **AND** its actual wire/receiver projection is qualified rather than inferred from a message template or numeric EventId

### Requirement: Preserve opt-in and credential authority

PWA export SHALL require existing valid server-owned opt-in, destination and distinct browser/server credentials. API export SHALL require explicit opt-in, a valid destination and server credential only. Browser evidence SHALL always use browser authority. Invalid configuration SHALL fail closed; generic telemetry environment settings SHALL NOT bypass these decisions.

#### Scenario: Disabled or invalid producer
- **WHEN** its flag is absent/not exactly true, its destination is invalid or its required credential is absent
- **THEN** it sends nothing to Sentrame and pre-opt-in evidence is not queued for later use
- **AND** ordinary application startup and business behavior continue

#### Scenario: API container configuration
- **WHEN** only API server telemetry is configured
- **THEN** no browser credential is supplied to the API or shipped to browser assets
- **AND** non-Sentrame operational logging retains its existing destination and scope

#### Scenario: Ambient exporter settings conflict
- **WHEN** generic exporter environment settings name a different endpoint, credential or extra pipeline
- **THEN** they cannot redirect or enable this selected WFS export

#### Scenario: Ambient disk retry or redirect
- **WHEN** ambient settings select disk retry, or the receiver redirects an export
- **THEN** selected WFS export never writes a durable queue or follows the redirect
- **AND** its explicitly owned standard SDK policy permits only bounded memory retry, without changing unrelated operational pipelines

### Requirement: Bound in-memory delivery and SDK retry

Delivery SHALL use bounded memory-only batching and finite standard transient retry. Two seconds SHALL limit caller/processor waiting and Node socket inactivity, not total network lifetime. Queue overflow, terminal rejection and exhausted SDK timeout/retry policy SHALL drop records. Durable queues, business replay and delivery-dependent UI SHALL remain absent. Existing producer/category admission caps SHALL remain independent.

#### Scenario: Receiver outage or slow receiver
- **WHEN** the receiver stalls or returns retryable failures
- **THEN** standard SDK wait/retry settings, Node socket inactivity and the approved .NET diagnostic-body limitation and configured queue/concurrency bounds remain in force
- **AND** the application does not await normal telemetry delivery, grow memory without bound or replay a business operation

#### Scenario: Active stream or delayed retry outlives caller waiting
- **WHEN** an actively streaming response or SDK retry/backoff outlives the two-second caller/processor wait
- **THEN** caller completion does not imply cancellation and the request may remain active under its SDK policy, including Node socket inactivity and the .NET diagnostic-body limitation
- **AND** occupied exporter/Agent slots still count toward the configured concurrency cap; later batches cannot create additional providers or sockets to evade it
- **AND** no application cancellation layer, custom transport, global HTTP patch or durable retry is added

#### Scenario: .NET unsuccessful diagnostic response body
- **WHEN** pinned Linux .NET 11 RC2 / OTel 1.20 exporter Error diagnostics read an unsuccessful response body
- **THEN** an inactive read may outlive two seconds, as the reproduced >3.2-second probe demonstrates, while supported caller waits and queue/connection bounds remain configured
- **AND** neither successful ForceFlush nor HttpClient timeout proves all I/O terminated; no total deadline, diagnostic-body inactivity bound or blocked-read shutdown guarantee is claimed
- **AND** selected exporters retain private memory-only retry, redirect refusal, admission and pre-buffer privacy without a fork, custom cancellation/transport, global patch or new dependency/service

#### Scenario: Storm and full queues
- **WHEN** log or native-span input exceeds the configured capacity
- **THEN** logs retain the existing 100 ordinary/20 error records per minute per producer and at most four active log exports
- **AND** each log/trace queue holds at most 256 records, with export batches at most 64, scheduled delay at most one second and one concurrent batch per queue
- **AND** traces use independent capacity and errors retain independent admission from ordinary logs

#### Scenario: Shutdown, crash and changed configuration
- **WHEN** the Next standalone host terminates, including normal SIGTERM/SIGINT cleanup
- **THEN** telemetry delivery remains best effort and pending queued records can be lost; normal host shutdown does not guarantee a flush attempt or delivery
- **AND** any available natural Node beforeExit flush waits at most five seconds without bypassing host termination; Next's explicit signal exit need not invoke that hook
- **AND** no custom server host, competing signal/exit handler or application cancellation layer is added to guarantee delivery; crash/forced termination can also lose queued records
- **AND** Node admission and batch-export entry recheck enabled configuration; API settings are fixed at process start and require recreation to change, without a live-reconfiguration promise
- **AND** already-started SDK work may continue under its supported policy; flush completion does not guarantee cancellation, while process recreation drops old memory state

### Requirement: Minimize telemetry before export buffering

Only reviewed fixed names, bodies, categories and attributes SHALL enter export buffers. Private data SHALL be excluded from names, attributes, resource fields, exception events, status descriptions, links and automatic context. The receiver's filtering SHALL NOT be the privacy boundary. The exporter SHALL not collect its own network requests or generate recursive errors.

#### Scenario: Private sentinels reach native instrumentation
- **WHEN** a request, fetch, exception, logging scope or resource contains synthetic private queries, IDs, content, URLs, notes, hashes or credentials
- **THEN** those values are absent from queued/exported names and all retained fields
- **AND** unknown fields are dropped rather than copied using a denylist

#### Scenario: Browser forwarding inherits server context
- **WHEN** a browser observation is forwarded while a Node request span is active
- **THEN** its log retains only its approved document context and browser authority
- **AND** no ambient server trace/span, baggage, request identity or scope is attached

#### Scenario: Export itself fails
- **WHEN** configuration, sanitization, SDK diagnostics, export or receiver processing fails
- **THEN** reporting contains that failure without a recursive telemetry record or user-visible effect
- **AND** telemetry endpoints and credentials are not logged

### Requirement: Preserve received semantics across wire migration

Wire-format/batching changes SHALL preserve existing named-log meanings and stable record identities across SDK delivery retries. Browser event identity SHALL remain independent of trace identity. Previous JSON evidence SHALL remain historical; new HTTP Protobuf exports SHALL require their own actual durable receipt and reopen qualification.

#### Scenario: Retry after an uncertain receiver response
- **WHEN** a receiver persists a batch but its acknowledgement is lost and the SDK retries
- **THEN** retransmitted logs preserve event IDs, timestamps and semantic fields
- **AND** protected receipt/reopen checks verify exact replay does not add diagnostic records or journey contributions
- **AND** this does not promise complete or exactly-once delivery

#### Scenario: Roll back the application release
- **WHEN** the migration is disabled or an earlier application image is restored
- **THEN** existing receiver records and product data need no rewrite or storage reset
- **AND** no record is dual-written for compatibility

### Requirement: Qualify each producer and evidence boundary

Implementation acceptance SHALL distinguish unit/mock checks, real browser/Action/Node, API/database, actual exporters/receiver protected durable reads/reopen, deployment and physical devices. Required slice qualification SHALL remain incomplete when unavailable. Historical receiver samples and the journey inventory SHALL NOT qualify a new exporter, runtime or business observation.

#### Scenario: Real producer qualification
- **WHEN** a slice claims exporter integration complete
- **THEN** its real producer emits to fresh disposable Sentrame and protected reads verify exact meaning, authority, privacy and retention after reopen
- **AND** HTTP success, recorded fixture preload and mocked business responses alone do not satisfy that claim

#### Scenario: E2E capability assignment
- **WHEN** implementation adds or renames a browser qualification spec
- **THEN** it has exactly one capability-suite or explicit live-qualification assignment and the CI inventory/selection checks pass
- **AND** receiver-required checks have explicit disposable resource/configuration requirements rather than silently joining an unprovisioned mocked suite

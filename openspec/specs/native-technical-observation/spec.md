# native-technical-observation Specification

## Purpose

Expose minimized native server-operation timing and structure in Sentrame without treating technical execution as browser presentation, durable business success or persistent journey identity.

## Requirements

### Requirement: Observe native server operations

Enabled technical observation SHALL reuse the frameworks' existing request/render/server-fetch and ASP.NET/HTTP instrumentation, preserving native operation timing, kind and within-process parentage for admitted spans. One trace provider per process SHALL own capture. Manual wrappers SHALL NOT recreate framework spans or invent business duration from adjacency.

#### Scenario: Next request renders and fetches
- **WHEN** an admitted Node GET/HEAD server request executes rendering and an instrumented server fetch
- **THEN** `/v1/traces` contains supported native operations with safe fixed names, actual start/end times and their available local parent relationships
- **AND** a browser fetch or screen presentation is not inferred from those server operations

#### Scenario: Node Actions and unknown roots
- **WHEN** a Node root is a POST/Server Action, uses another non-GET/HEAD method or lacks a recognized request-method classification
- **THEN** that root and its children are excluded from native trace export in this increment
- **AND** existing explicit server-error and browser observation coverage remains unchanged
- **AND** this conservative coverage limit avoids tracing telemetry Actions without inspecting their payloads

#### Scenario: API request executes
- **WHEN** an admitted API request uses existing ASP.NET/HTTP instrumentation
- **THEN** its existing provider exports its supported minimized spans without a parallel profiler/agent or a second trace provider
- **AND** missing/uninstrumented operations remain missing rather than fabricated

### Requirement: Export only safe technical vocabulary

Native spans SHALL retain only reviewed fixed operation names, numeric timing/status, native technical identity and allowlisted static method/route classifications. Dynamic URLs/paths, queries, content, business identifiers, exception detail/events, status descriptions, resource identity, baggage and arbitrary links SHALL be absent from the export queue. Unrecognized operations SHALL be dropped or classified with a fixed safe name.

#### Scenario: Dynamic route and failed fetch
- **WHEN** a request path or fetch URL contains a recipe ID, query, household token or content and fails with private text
- **THEN** exported/queued span names are fixed operation classifications such as `next.request`, `next.render`, `next.fetch`, `api.request` or `api.http`
- **AND** only approved static route classification, method, numeric status and technical timing/identity are retained
- **AND** no raw exception event, URL, status description or content-derived hash escapes

#### Scenario: Host and process enrichment
- **WHEN** a default resource detector can obtain host, container, user, process or device identity
- **THEN** only approved service/version and fixed SDK metadata are retained
- **AND** detection is disabled when unnecessary rather than relying on receiver removal

### Requirement: Keep technical correlation request-local

Technical trace identity SHALL describe only an admitted process-local request and its children. It SHALL NOT become browser document, person, household, background-work or cross-document correlation. Browser-provided trace/baggage and remote-parent identities SHALL NOT become exported continuity; cross-service propagation and joining SHALL remain outside this increment.

#### Scenario: Repeated client context
- **WHEN** unrelated documents send identical traceparent, tracestate or baggage headers
- **THEN** those values cannot connect their exported WFS requests or business facts
- **AND** each admitted root is locally created, or a remote-parent trace is entirely excluded
- **AND** request authorization and business responses are unchanged

#### Scenario: Work outlives a request or process
- **WHEN** processing continues in queued work, another process, a restart or a later document
- **THEN** this capability does not reconstruct continuity or persist a telemetry scope
- **AND** native duration of the original request does not claim end-to-end processing time

### Requirement: Sample and bound technical traffic independently

Technical roots SHALL use standard 10-percent trace-identity sampling with local child decisions inherited from their root. Semantic logs SHALL not be independently step-sampled. Technical queues SHALL use the standard-export bounds and separate capacity, so technical bursts cannot consume browser/error-log admission. Partial/unsampled traces SHALL remain incomplete evidence.

#### Scenario: High technical traffic
- **WHEN** ordinary requests generate many native spans
- **THEN** standard root sampling and bounded trace queues constrain export
- **AND** observed traces do not establish exact request or failure counts
- **AND** partial traces from queue loss do not imply skipped application operations

#### Scenario: Telemetry request and exporter failures
- **WHEN** export requests, observation Actions, receiver checks or SDK reporting execute
- **THEN** they are excluded from exported native technical spans and recursive diagnostics
- **AND** a receiver outage does not create additional telemetry load

### Requirement: Preserve outcome and error ownership

Technical success/status SHALL describe only the native operation. It SHALL NOT certify persisted business work, presentation, human completion or background readiness. Minimized semantic error logs SHALL retain their existing observing owner; automatic span exception detail SHALL be removed, and overlapping technical failure status SHALL NOT trigger another semantic error report or business outcome.

#### Scenario: Successful response with pending or partial work
- **WHEN** a capture response returns accepted work or an issue save persists before launch fails
- **THEN** the request trace describes its execution and technical status only
- **AND** trusted persistence and browser response facts remain separately named observations

#### Scenario: Next failure reaches both hook and boundary
- **WHEN** native request tracing, the server error hook and a browser fallback observe one failure
- **THEN** native status remains technical evidence, the existing hook/boundary suppression rules remain in force and no raw automatic exception is exported
- **AND** no correlation is inferred between a standalone error log and a nearby trace

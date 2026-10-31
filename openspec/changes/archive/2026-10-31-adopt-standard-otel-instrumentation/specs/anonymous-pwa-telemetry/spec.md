# Spec Delta

## MODIFIED Requirements

### Requirement: Use standard named-log intake

Opening export SHALL use standard OTLP/HTTP Protobuf logs at `/v1/logs`, no compression and server-held browser Bearer authentication under the standard-telemetry-export capability. It SHALL NOT require a proprietary Sentrame envelope/SDK, span, trace ID or fabricated spans. `timeUnixNano` SHALL describe browser observation and `observedTimeUnixNano` server forwarding observation, never delayed export time.

#### Scenario: Ordinary receipt without journey fields
- **WHEN** previously emitted openings without journey fields are received as valid standard logs
- **THEN** missing context is not an intake error, while journey reconstruction remains unavailable
- **AND** new WFS openings follow the revised correlated envelope rather than relying on this legacy compatibility case

#### Scenario: Correlated ordinary log receipt
- **WHEN** the receiver receives an opening through the actual HTTP Protobuf SDK export path
- **THEN** protected reads verify service/version, browser source, name, classification, correlation and both observation timestamps
- **AND** no span or trace ID is required for receipt or a configured journey path

#### Scenario: Invalid browser clock
- **WHEN** observation time is malformed, older than 24 hours or more than five minutes ahead of server forwarding observation
- **THEN** the opening is dropped without replacing its time or rearming its document attempt
- **AND** application behavior remains unaffected

### Requirement: Drop telemetry without disrupting entry

Opening delivery SHALL remain best effort under standard-telemetry-export, allowing bounded memory batching/transient SDK retries without durable queues, unload flush or UI acknowledgement. Each producer SHALL retain independent 100 ordinary/20 error admissions/minute, at most four active requests, two-second caller/processor waits and Node socket inactivity, and redirect rejection. Telemetry failure SHALL NOT block rendering, authentication, navigation or recovery.

#### Scenario: Receiver or forwarding failure
- **WHEN** delivery encounters a transient failure, exhausts its SDK timeout/retry policy, returns terminal rejection, redirects, or is interrupted by process termination
- **THEN** only eligible SDK delivery retries under the standard SDK timeout/retry policy are permitted, preserving the original record identity, and no application error is displayed for telemetry
- **AND** the document's attempt remains consumed

#### Scenario: Browser budget is exhausted
- **WHEN** browser export reaches its rate or concurrency limit
- **THEN** additional browser records are dropped without consuming independent server capacity

#### Scenario: Browser callback is not retried by batching
- **WHEN** the SDK batches or retries an already-admitted opening
- **THEN** no browser callback is replayed, the one-document attempt remains consumed and original occurrence/observation times are preserved
- **AND** abrupt loss of the process can lose memory-only records


### Requirement: Limit interpretation to received opening evidence

Documentation SHALL explain that received openings describe browser-reported entry screens, not unique people, exact session totals, shortcut attribution, authentication success, completed tasks or abandonment. Absence SHALL NOT prove no opening occurred. Qualification SHALL separately establish wire receipt, durable receiver retention, configured derivation, deployed routes and physical-device behavior.

#### Scenario: Receipt without journey correlation
- **WHEN** previously deployed openings or checks are retained as browser logs without session/tab IDs
- **THEN** their unassigned status or empty journey graph is not evidence of failed ingestion
- **AND** no trace IDs are fabricated to make standalone logs appear in Traces

#### Scenario: Correlated entry is not a second visit
- **WHEN** opening and initial screen are mapped in one anonymous document stream
- **THEN** they are two useful observations of entry and presentation within that scope, not two visits
- **AND** receiver goal/inactivity segmentation can still produce multiple journeys within one document scope

#### Scenario: Qualification uses the new local receiver model
- **WHEN** WFS qualification runs against the unpublished local Sentrame build
- **THEN** it records the tested receiver build, storage/projection model, HTTP-Protobuf/no-compression SDK path and actual protected receipt/read results separately from mock and other SDK evidence
- **AND** it uses fresh isolated compatible storage without resetting or migrating an existing deployment implicitly

#### Scenario: Entry is followed by a task failure
- **WHEN** a recorded opening is followed by failed login, failed capture or departure
- **THEN** that opening alone does not distinguish those outcomes

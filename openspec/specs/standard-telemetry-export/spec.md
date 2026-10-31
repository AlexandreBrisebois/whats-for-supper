# standard-telemetry-export Specification

## Purpose

Keep the retired WFS Sentrame/OpenTelemetry integration absent while preserving ordinary diagnostics, product correctness and historical/external boundaries.

## Requirements

### Requirement: Keep the retired integration absent

WFS SHALL register no application-owned OTel log, trace or metric export pipeline and SHALL produce no dedicated Sentrame observations, forwarding operations or document correlation. Legacy telemetry configuration SHALL NOT enable collection. No replacement remote exporter SHALL be introduced by this removal.

#### Scenario: Old enabled configuration remains
- **WHEN** the upgraded browser, Node and API processes run with obsolete enabled flag, endpoint and token settings
- **THEN** no WFS integration log, span or metric export is attempted
- **AND** no browser telemetry Action or observer initializes

#### Scenario: Product activity and errors
- **WHEN** people navigate, open surfaces, view originals, save or resolve issues, or encounter errors
- **THEN** no dedicated Sentrame observations are generated
- **AND** ordinary product behavior and error handling remain available

### Requirement: Preserve independent diagnostics and Save validity

Removal SHALL preserve ordinary application/framework logging, independent search diagnostics and local raw Save-response validity checks. It SHALL preserve confirmed saves, partial launch-failure handling, resolution, polling, retained drafts, navigation, cooking and current gesture behavior without introducing business retries.

#### Scenario: Save response is malformed or uncertain
- **WHEN** a Save returns missing or inconsistent flags, invalid raw clocks or unusable authoritative detail
- **THEN** existing local uncertainty classification and product decoding/error behavior remain
- **AND** no normalization default falsely establishes a confirmed result for observation

#### Scenario: Report persists before launch fails
- **WHEN** a report is confirmed saved and its optional reimport launch fails
- **THEN** existing saved report, compensation, returned result and draft/error behavior remain
- **AND** removal neither rolls back the confirmed save nor initiates another business attempt

#### Scenario: Ordinary diagnostic is written
- **WHEN** existing application or framework code writes an ordinary console/file/error/search diagnostic
- **THEN** its existing local sink and filtering behavior remain, except for removed OTel delivery
- **AND** it is not removed solely because its owner uses the word telemetry

### Requirement: Retire active configuration and guidance honestly

Current application setup and qualification guidance SHALL no longer instruct enabling Sentrame or promise telemetry coverage. Historical archives and evidence SHALL remain historical. Release metadata, unrelated CLI telemetry opt-outs and independently required transitive packages SHALL retain their own roles.

#### Scenario: Read current setup after cleanup
- **WHEN** an operator reads current samples, capability contracts, test inventory or setup guidance
- **THEN** no active Sentrame opt-in or receiver qualification is required
- **AND** retired capability links identify retirement rather than promise observation

#### Scenario: Framework dependency still references OTel
- **WHEN** an independently required framework or AI package retains a transitive OTel dependency
- **THEN** its owning dependency edge is documented and no WFS provider/export registration uses it
- **AND** historical source/test evidence is not rewritten as removal proof

### Requirement: Preserve external retention and deployment boundaries

Source removal SHALL NOT delete Sentrame retained records, revoke credentials, alter running deployments or modify the Sentrame repository. Claims of stopped export SHALL distinguish changed source from upgraded running processes. Completion SHALL include an actual residual logging and dependency review.

#### Scenario: Removal patch exists before deployment
- **WHEN** the removal is implemented locally while an older deployment continues running
- **THEN** no claim is made that the older deployment stopped exporting
- **AND** deploying, revoking credentials and deleting retained data require separate authorization

#### Scenario: Final remaining logging review
- **WHEN** implementation acceptance is assessed
- **THEN** actual remaining sinks, levels, emitted fields, privacy exposure, correlation and dependency owners are reviewed against the changed source
- **AND** ordinary logging changes remain a separate owner decision

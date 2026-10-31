# Spec Delta

## REMOVED Requirements

### Requirement: Observe native server operations

**Reason**: Application-owned OTel native tracing is retired.

**Migration**: Remove providers/instrumentation/export plumbing; preserve ordinary framework diagnostics and application operations. No replacement trace exporter or propagation scheme is introduced.

#### Scenario: Native operation after retirement
- **WHEN** the upgraded application handles requests, rendering or outbound HTTP
- **THEN** WFS registers no OTel native trace pipeline and sends no integration spans while ordinary operations continue

### Requirement: Export only safe technical vocabulary

**Reason**: Application-owned OTel native tracing is retired.

**Migration**: Remove providers/instrumentation/export plumbing; preserve ordinary framework diagnostics and application operations. No replacement trace exporter or propagation scheme is introduced.

#### Scenario: Native operation after retirement
- **WHEN** the upgraded application handles requests, rendering or outbound HTTP
- **THEN** WFS registers no OTel native trace pipeline and sends no integration spans while ordinary operations continue

### Requirement: Keep technical correlation request-local

**Reason**: Application-owned OTel native tracing is retired.

**Migration**: Remove providers/instrumentation/export plumbing; preserve ordinary framework diagnostics and application operations. No replacement trace exporter or propagation scheme is introduced.

#### Scenario: Native operation after retirement
- **WHEN** the upgraded application handles requests, rendering or outbound HTTP
- **THEN** WFS registers no OTel native trace pipeline and sends no integration spans while ordinary operations continue

### Requirement: Sample and bound technical traffic independently

**Reason**: Application-owned OTel native tracing is retired.

**Migration**: Remove providers/instrumentation/export plumbing; preserve ordinary framework diagnostics and application operations. No replacement trace exporter or propagation scheme is introduced.

#### Scenario: Native operation after retirement
- **WHEN** the upgraded application handles requests, rendering or outbound HTTP
- **THEN** WFS registers no OTel native trace pipeline and sends no integration spans while ordinary operations continue

### Requirement: Preserve outcome and error ownership

**Reason**: Application-owned OTel native tracing is retired.

**Migration**: Remove providers/instrumentation/export plumbing; preserve ordinary framework diagnostics and application operations. No replacement trace exporter or propagation scheme is introduced.

#### Scenario: Native operation after retirement
- **WHEN** the upgraded application handles requests, rendering or outbound HTTP
- **THEN** WFS registers no OTel native trace pipeline and sends no integration spans while ordinary operations continue

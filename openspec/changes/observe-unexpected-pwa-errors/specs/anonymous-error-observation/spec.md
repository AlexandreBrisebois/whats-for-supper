# Anonymous error observation

## Purpose

Make unexpected browser and Next server failures discoverable through safe bounded observations, preserving source authority and honest limits on correlation, overlap and delivery.

## ADDED Requirements

### Requirement: Report unexpected browser failures centrally

When enabled, WFS SHALL attempt `pwa.browser.error` for observable uncaught script errors, unhandled promise rejections and client render failures reaching its error boundaries. Reporting SHALL leave normal browser and application handling unchanged. Failures before initialization and already handled failures SHALL NOT be claimed as covered.

#### Scenario: Script and promise failures
- **WHEN** an initialized enabled document observes an uncaught script error or unhandled rejection
- **THEN** it reports a browser-authority ERROR record with a fixed bounded category
- **AND** it does not serialize the thrown value, promise payload, message, stack or source URL

#### Scenario: Route or root render failure
- **WHEN** an unexpected client render failure reaches an application boundary
- **THEN** it attempts the same safe reporting path without depending on a surviving root provider
- **AND** fallback navigation and existing retry behavior remain usable

### Requirement: Report Next-captured server failures separately

WFS SHALL attempt `pwa.server.error` when the Next server error hook observes an unexpected request failure. It SHALL use server producer authority and only the approved category and occurrence envelope. It SHALL NOT export request paths, headers, cookies, bodies or raw errors, or infer browser journey context from them.

#### Scenario: Server failure without a browser scope
- **WHEN** the server hook observes a render, route, action or proxy failure
- **THEN** a standalone server-authority ERROR record remains useful without a journey ID
- **AND** no synthetic browser scope is invented

#### Scenario: Server error reaches a browser fallback
- **WHEN** a framework-marked server error also reaches a browser error boundary
- **THEN** the server hook owns the exception report and the browser does not emit another exception for that server error
- **AND** browser fallback presentation, if observable, remains a separate screen fact

### Requirement: Export only reviewed error categories

Error logs SHALL use severity ERROR 17 and fixed service/scope/body. Allowed record attributes SHALL be `reason`, a generated `exception.occurrence.id`, `event.id`, and optional approved browser screen/scope/tab/sequence context. Category SHALL describe the observing boundary; raw error types, messages, stacks and framework digests SHALL NOT be exported.

#### Scenario: Private thrown content
- **WHEN** an error contains search terms, recipe content, credentials, identifiers or arbitrary type names
- **THEN** none of that content or a hash derived from it appears in the exported record
- **AND** only the observing category identifies the failure class

#### Scenario: Approved categories
- **WHEN** a browser error is classified
- **THEN** `reason` is one of `browser.script`, `browser.rejection` or `browser.render`
- **AND** server categories are restricted to `server.render`, `server.route`, `server.action`, `server.proxy` or `server.unknown`

### Requirement: Separate overlap from distinct occurrences

One local reporting owner SHALL suppress overlapping reports for the same observable occurrence where object or boundary-lifecycle identity is available. Separate failures and retries SHALL remain distinct admitted occurrences. Similar categories or equal messages SHALL NOT establish duplicate identity or exact global exception counts.

#### Scenario: Overlapping client hooks
- **WHEN** a boundary and browser hook observe the same identified client error occurrence
- **THEN** at most one exception record is admitted with one generated occurrence identity

#### Scenario: Failure after recovery or in another request
- **WHEN** a retry fails again or an independent request fails
- **THEN** it has a new occurrence identity even if the category is unchanged
- **AND** quotas can still suppress export with disclosed count uncertainty

### Requirement: Preserve error context without implying a failed journey

Browser errors SHALL attach existing enabled in-memory navigation context when available and SHALL remain reportable when it is absent. Errors SHALL NOT end a journey, manufacture recovery, classify departure as failure or imply that a later successful action repaired the same operation.

#### Scenario: Early error
- **WHEN** initialization permits reporting but no eligible screen has been presented
- **THEN** a standalone browser error is attempted without inventing a screen or visit context

#### Scenario: Continue after error
- **WHEN** the app remains usable and later presents another screen
- **THEN** later navigation remains observable
- **AND** no business-recovery event is synthesized by the error hooks

### Requirement: Contain storms and recursive pipeline failures

Reporting SHALL recheck server opt-in and preserve producer separation. Browser errors SHALL be limited to 10 attempts/minute per document and error exports to 20/minute per producer per Node process. Total export SHALL remain at most 120/minute per producer with 20 reserved for errors, four concurrent requests and a two-second timeout.

#### Scenario: Error storm
- **WHEN** one browser produces thousands of errors
- **THEN** document and process quotas bound attempted intake without a growing queue
- **AND** ordinary observations retain a separate 100/minute process allowance

#### Scenario: Pipeline rejection
- **WHEN** reporting, validation or receiver export fails
- **THEN** it creates no further telemetry error, retry, unhandled rejection or user-visible failure
- **AND** rejected payloads, endpoint details and credentials are not logged

#### Scenario: Disabled server with stale client
- **WHEN** an enabled old client reports after server disablement
- **THEN** the server exports no error record

### Requirement: Disclose collection and qualification limits

Documentation SHALL distinguish central hooks from handled feature failures, occurrence suppression from complete counts, and stub tests from durable receiver, deployed-route and device qualification. Local loss indicators SHALL NOT be presented as receiver-supported counters or proof of complete collection.

#### Scenario: Handled business failure
- **WHEN** a vote, assignment or import handler catches a failure and provides feedback
- **THEN** this central capability makes no promise to observe it
- **AND** its journey inventory identifies the owner of any later semantic event

#### Scenario: Actual receiver read
- **WHEN** isolated real WFS errors are received by the reviewed local Sentrame build
- **THEN** protected reads verify event name, severity, category and producer authority without raw diagnostics
- **AND** a different SDK sample or an HTTP success alone does not qualify this path

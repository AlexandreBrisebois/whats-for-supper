## MODIFIED Requirements

### Requirement: Present friendly capture-failure guidance without raw diagnostics

Each loaded failure row SHALL display its friendly reason, optional nonempty source preview, Retry and an accessible Clear failed capture action. List responses SHALL omit raw task error messages and stack traces. Acquisition failures SHALL receive generic import retry guidance rather than a diagnosis inferred from private errors. Saved URL captures whose import has not started SHALL instead explain that saved state and offer Retry.

#### Scenario: Display a returned failure
- **WHEN** a nonempty list is loaded with a failure's friendly reason and preview
- **THEN** its row shows both values and Retry and Clear controls

#### Scenario: Stored failure contains private diagnostics
- **WHEN** an eligible failed task has a stored error and stack trace
- **THEN** the response provides generic friendly guidance without those raw diagnostics

### Requirement: Accept retry by resetting existing failed work

For an eligible failed acquisition task, successful retry persistence SHALL queue its most recently updated failed task for immediate eligibility, clear that task's private diagnostics and resume the existing workflow as processing. The response SHALL be 202 with data.queued true. Retry SHALL retain task identity and retry count and SHALL NOT create a replacement capture or imply successful worker execution.

#### Scenario: Persist an eligible retry
- **WHEN** retry persistence succeeds for a paused capture with a failed acquisition task
- **THEN** the selected task becomes pending and due now, its error and stack trace clear, and its existing workflow becomes processing
- **AND** task and workflow update times advance while task identity and retry count remain

#### Scenario: Retry reaches an ineligible identity
- **WHEN** the requested workflow is missing or no longer qualifies as a paused failed capture
- **THEN** retry is rejected without resetting a task through that request

## ADDED Requirements

### Requirement: Retain durable recovery for accepted URL captures

Accepted URL intake SHALL persist a pending recipe and recoverable initialization state together before starting asynchronous acquisition. Failure to initialize acquisition SHALL retain those identities and appear in existing failed captures. An accepted recipe identity SHALL NOT certify acquisition or readiness.

#### Scenario: Initialization fails after saved intake
- **WHEN** URL recipe persistence succeeds but initialization cannot load valid work
- **THEN** intake returns the saved recipe identity and a fresh failure list exposes saved-but-not-started guidance with Retry and Clear

#### Scenario: Intake stops after persistence
- **WHEN** intake stops after durable persistence but before initialization completes
- **THEN** its saved recipe remains recoverable through a subsequent failure read

### Requirement: Reconcile initialization retry against existing durable work

Retry of saved-but-not-started URL capture SHALL initialize acquisition on the existing workflow and recipe identities. Concurrent or repeated initialization SHALL preserve a single acquisition graph. A committed initialization whose reply is lost SHALL be reconciled by rereading that workflow before further work is created.

#### Scenario: Retry succeeds
- **WHEN** initialization retry succeeds
- **THEN** existing asynchronous acquisition becomes eligible and a new failure read excludes its initialization failure

#### Scenario: Initialization retry fails
- **WHEN** initialization fails again
- **THEN** the same saved capture remains recoverable without another intake or recipe identity

#### Scenario: Concurrent retries or uncertain reply
- **WHEN** initialization requests overlap or the first committed initialization reply is lost
- **THEN** rereading or retrying retains one acquisition graph on the same workflow

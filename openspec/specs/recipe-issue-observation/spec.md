# recipe-issue-observation Specification

## Purpose

Provide bounded evidence of recipe-issue Save responses and trusted report persistence/removal without exposing feedback content or asserting reimport success or cross-document causality.

## Requirements

### Requirement: Observe the current foreground Save result

An explicit Save from visible mounted recipe detail SHALL attempt one browser-authority `pwa.recipe_issue.save_result` for its current submission. Its fixed reason SHALL be `saved_manual`, `processing_acknowledged`, `saved_launch_failed` or `unconfirmed`. It SHALL reuse the existing document stream and reflect the response/error actually observed, never infer persistence from HTTP status alone.

#### Scenario: Saved manual feedback
- **WHEN** the current Save returns valid authoritative detail with no started attempt and no launch failure
- **THEN** the browser attempts `saved_manual`
- **AND** the meaning includes unchanged terminal feedback and does not assert a new report, a correction or a unique person

#### Scenario: Started or reused processing
- **WHEN** the current valid response reports reimportStarted with a returned import identity and no launch failure
- **THEN** the browser attempts `processing_acknowledged` without exporting that identity
- **AND** the result does not distinguish newly launched from reused work or claim readiness/completion

#### Scenario: Report saved but launch failed
- **WHEN** the current valid response explicitly reports saved feedback and reimportLaunchFailed
- **THEN** the browser attempts `saved_launch_failed` once before existing retained-draft error handling
- **AND** it does not also report `unconfirmed` for the deliberate launch-failure error

#### Scenario: Rejected, lost or unusable response
- **WHEN** the current Save rejects or its response cannot establish one of the recognized result states
- **THEN** the browser attempts `unconfirmed`
- **AND** it does not claim no report or workflow was persisted, or initiate a business retry

#### Scenario: Response normalization loses validity
- **WHEN** the generated response omits required flags, supplies inconsistent result fields or lacks valid authoritative detail for the submitted recipe
- **THEN** observation classifies it as `unconfirmed` before existing wrapper coercion can turn missing values into false
- **AND** local telemetry qualification preserves existing product response/error handling without exporting response content or identifiers

### Requirement: Bound result lifetime without changing the issue journey

Save-result observation SHALL require the same visible mounted detail/submission generation, share document sequence with existing observations and allow at most ten attempts per document. Rerender/replay SHALL not repeat a result. Departure, replacement, hidden settlement or supersession SHALL suppress the late observation rather than defer it. Telemetry SHALL not change existing draft, polling, retry, focus or resolution behavior.

#### Scenario: Stale response after departure
- **WHEN** Save settles after detail closes, another recipe opens, another submission supersedes it or the document becomes hidden
- **THEN** no late result is admitted or replayed on return
- **AND** no stored correlation, content hash or durable operation identity is introduced

#### Scenario: Retry and repetition
- **WHEN** a later explicit Save is attempted in the same document
- **THEN** it is a new admitted attempt with a new event ID and increasing sequence, subject to the document cap
- **AND** polling, rerenders, resolving an issue and automatic refresh do not manufacture Save results

### Requirement: Emit a trusted report-save fact after persistence

A successful report-persistence boundary SHALL attempt one server-authority `wfs.recipe_issue.saved` named log for that save, before any optional reimport follow-up. Rejected or unconfirmed persistence SHALL emit no saved fact. A later launch, compensation or read failure SHALL not erase the already-known save or change business handling.

#### Scenario: Manual save or reused feedback persists
- **WHEN** report persistence confirms its ordinary database save for valid feedback
- **THEN** the API attempts one saved fact even if the feedback is unchanged or processing is manual-only
- **AND** the fact means a confirmed save boundary, not unique content change, a unique recipe or a completed reimport

#### Scenario: Launch fails after report save
- **WHEN** the report save is confirmed and optional reimport launch subsequently fails
- **THEN** its saved fact remains valid and no reimport-success fact is emitted
- **AND** telemetry failure cannot affect the saved report, compensation or returned response

#### Scenario: Outer transaction or uncertain commit
- **WHEN** save returns inside an uncommitted outer transaction or persistence throws with an uncertain outcome
- **THEN** no durable saved fact is emitted at that point
- **AND** the implementation does not guess from intended state or replay the business operation to obtain telemetry

### Requirement: Observe explicit persisted report removal

Explicit resolution SHALL attempt one server-authority `wfs.recipe_issue.resolved` only after an existing report is removed and its persistence is confirmed. Resolution of an already absent report, active-attempt rejection, recipe cascade deletion and failed/uncertain persistence SHALL emit no resolved fact. The fact SHALL not certify repaired content or recipe removal.

#### Scenario: Existing report is resolved
- **WHEN** the explicit resolution command confirms removal of an existing inactive report
- **THEN** it attempts one resolved fact after the save boundary
- **AND** existing returned detail and UI acknowledgment remain unchanged

#### Scenario: Repeated or rejected resolution
- **WHEN** resolution finds no report, rejects active work or fails to confirm persistence
- **THEN** no resolved fact is emitted
- **AND** existing idempotent response/rejection behavior is preserved

### Requirement: Export only minimized issue observations

Issue observations SHALL use standard named INFO logs with fixed body, service/version, occurrence time and random event ID. Browser results SHALL include only fixed reason, approved existing document context and actually presented stage. API facts SHALL carry no document, trace, recipe/import/workflow/person/household identity, reason selection, feedback, note, content hash or error detail.

#### Scenario: Feedback contains private sentinel values
- **WHEN** a saved draft, response, logging scope or request includes private synthetic values
- **THEN** none appears in log names, bodies, resources, attributes or context
- **AND** browser evidence uses the browser credential while API facts use the server credential

#### Scenario: Independent server and browser evidence
- **WHEN** a saved fact and a browser result both arrive
- **THEN** each is inspectable with its producer authority and meaning
- **AND** no shared operation key, timing join or graph edge is used to claim they describe the same save

### Requirement: Keep issue interpretation and delivery bounded

Issue facts SHALL obey standard-export bounds, with no sampling of individual semantic logs. Interpretation SHALL describe received save/removal/response observations, not exact user or workflow totals. Repeated business saves SHALL be distinct observations; SDK retransmission SHALL preserve record identity. Missing records SHALL not prove failed or absent business work.

#### Scenario: Lost telemetry and retries
- **WHEN** export drops a saved fact or retransmits a batch after an uncertain response
- **THEN** the business save remains unchanged, retransmitted records retain their original identity and absence remains unknown
- **AND** no background polling, durable queue or all-journey event registry fills the gap

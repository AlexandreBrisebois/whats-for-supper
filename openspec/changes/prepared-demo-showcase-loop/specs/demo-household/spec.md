# Demo household delta

## MODIFIED Requirements

### Requirement: Accept demo snapshot capture as background work
An operator-authorized POST /api/management/demo-capture SHALL trigger demo-capture with empty parameters and return 202 containing message Demo capture task enqueued. and taskId identifying the accepted workflow instance. Shared visitor household access alone SHALL NOT authorize capture. Acceptance SHALL follow background-processing requirement `Persist initial workflow and task identities before returning` and SHALL NOT certify completion.

#### Scenario: Capture accepted
- **WHEN** operator authorization and workflow acceptance succeed for demo-capture
- **THEN** 202 contains the enqueue message and accepted instance identity as taskId

#### Scenario: Capture outside automatic mode
- **WHEN** an authorized operator requests demo-capture with DEMO_MODE disabled and workflow acceptance succeeds
- **THEN** the management action still accepts capture; automatic demo activation is not an action-level prerequisite

### Requirement: Capture the core demo data set
A successful demo capture SHALL publish a complete versioned prepared household baseline with explicit membership, including empty collections, for every baseline-owned state category. It SHALL include members, active and soft-deleted recipes, prepared search, plans with grocery state, calendar events, grocery-extra history, settings, member overrides, categories and aggregate history. Operational identities SHALL NOT be replayable.

#### Scenario: Core snapshot
- **WHEN** an operator captures the prepared household
- **THEN** the baseline includes its complete declared membership and relationships, not only members, recipes and search documents

#### Scenario: Activity omitted
- **WHEN** capture runs with live votes and import execution state present
- **THEN** those transient identities are not replayable and the manifest declares their selected reset policy instead of silently omitting unknown state

#### Scenario: Retired recipe fields
- **WHEN** recipe snapshot serialization encounters retired fields isHealthyChoice, dietaryProfile, fopFlags, fopClassification, healthProfile, healthEvent or balanceSummary
- **THEN** those fields are omitted from serialized recipe objects

### Requirement: Copy recipe-root files into the snapshot
Successful capture SHALL publish a verified inventory of baseline-owned original images, source PDFs, hero images and required recipe/search artifacts with the database baseline. Publication SHALL replace the selected baseline only after validation succeeds; failure SHALL retain the prior complete baseline. The manifest SHALL identify format, capture time, membership, asset integrity and calendar anchor.

#### Scenario: Recipe-root files
- **WHEN** baseline recipes reference originals, hero images or source PDFs
- **THEN** all required bytes and their relative references are verified before publication, without adopting unrelated temporary or orphan files

#### Scenario: Configured roots
- **WHEN** data and recipe roots are configured
- **THEN** capture resolves their existing owners and never publishes a baseline inside an active root that reset will erase

#### Scenario: Manifest written
- **WHEN** capture reaches successful publication
- **THEN** one selected complete generation contains a manifest and all matching data and assets

#### Scenario: Capture interrupted
- **WHEN** capture is interrupted while staging data or assets
- **THEN** visitors and later reset still use the previous complete baseline, never the partial generation

### Requirement: Check core snapshot presence before destructive restore
Demo reset SHALL validate supported format, explicit required membership, relationships, calendar mapping and asset integrity before any live deletion or publication. Legacy core-only snapshots SHALL fail with recapture guidance, not imply empty missing collections. Missing, malformed or unsupported inputs SHALL leave live state and the last complete baseline unchanged.

#### Scenario: Required artifact absent
- **WHEN** a required collection or asset directory is absent, even if the old four core files exist
- **THEN** execution fails preflight before deleting database rows or active recipe files

#### Scenario: Malformed core JSON
- **WHEN** a required artifact cannot be deserialized or validated
- **THEN** execution fails before destructive replacement

#### Scenario: Legacy core snapshot
- **WHEN** upgraded reset receives a legacy version-1 core snapshot
- **THEN** it reports recapture required without changing live state

### Requirement: Replace supported core state during successful restore
Successful reset SHALL replace baseline-owned database facts and assets as one recoverable publication, remove visitor-only membership, and apply the declared date policy consistently. It SHALL coordinate writes and stale work so no earlier generation can mutate the new baseline. Success SHALL be reported only when the published household is coherent and its model-free derived state is ready.

#### Scenario: Restore captured records
- **WHEN** validated baseline publication completes
- **THEN** captured members, recipe facts, planner, calendar, groceries, preferences and history replace visitor changes under the declared reset policy

#### Scenario: Database replacement fails
- **WHEN** database replacement fails before commit
- **THEN** the prior complete live generation remains or is recovered before household writes resume, and reset reports failure

#### Scenario: Concurrent visitor write
- **WHEN** a visitor mutation races the reset boundary
- **THEN** it either completes in the old generation and is reset or is rejected for refresh; it cannot silently leak into the restored generation

### Requirement: Clear transient activity when restoring core state
Reset SHALL clear visitor votes and import reports under the proposed fresh-round policy while restoring prepared plans, grocery items/checks, calendar events and grocery-extra lineage. It SHALL replace aggregate history rather than accumulate it, regenerate round/close and optimistic-concurrency identities, and invalidate stale maintenance commands, uploads and continuations.

#### Scenario: Activity cleared
- **WHEN** votes, reports and queued visitor work accumulated since capture
- **THEN** reset removes their ability to affect the new generation while restoring the prepared household facts

#### Scenario: Grocery state cleared with plans
- **WHEN** visitors changed plan groceries or extra occurrences
- **THEN** reset replaces them with captured plan grocery state and complete extra history, including explicit emptiness, checked state and tombstones

#### Scenario: Repeat reset
- **WHEN** the same baseline is reset twice at the same calendar anchor
- **THEN** authoritative facts are equivalent without duplicated history, extras or counts; operational identities are fresh each time

### Requirement: Retain active workflow instances during activity clearing
Reset SHALL preserve its own orchestration and only explicitly approved model-free maintenance work. Other pre-reset pending or processing visitor work SHALL be quiesced or invalidated before publication and unable to publish afterward. It SHALL NOT replay captured workflow instances, tasks, leases or provider work.

#### Scenario: Remove nonactive history
- **WHEN** old visitor workflow history is encountered
- **THEN** it is removed or retained solely as bounded diagnostics, never replayed as baseline work

#### Scenario: Keep active work
- **WHEN** Pending or Processing visitor jobs exist at reset
- **THEN** they are fenced from the new generation; only reset orchestration and explicitly safe maintenance remain eligible

#### Scenario: Delayed worker completion
- **WHEN** an old worker attempts publication after reset
- **THEN** its obsolete generation is rejected without altering restored facts or assets

### Requirement: Replace active recipe files after database commit
Reset SHALL publish recipe assets through the same recoverable generation boundary as baseline database facts, not an unprotected delete-and-copy step. An interruption before or after database commit SHALL be reconciled to a complete prior or committed generation before household operations resume.

#### Scenario: Files restored
- **WHEN** baseline publication succeeds
- **THEN** active recipe assets correspond to restored facts and visitor-only assets are no longer active

#### Scenario: File replacement fails
- **WHEN** file staging or publication fails
- **THEN** reset reports failure and recovers a complete generation without presenting missing assets as a successful reset

### Requirement: Schedule recurrence after successful restore dependency
Automatic demo reset SHALL continue at future configured UTC cron occurrences after either success or a terminal reset failure, without a tight retry loop. It SHALL use shared workflow acceptance/retry semantics and prevent duplicate effective successors across retry or restart. Failure to establish a future occurrence SHALL be observable and recoverable without claiming reset success.

#### Scenario: Restore dependency succeeds
- **WHEN** reset completes successfully
- **THEN** a successor is durably scheduled at the next configured occurrence

#### Scenario: Restore dependency fails
- **WHEN** reset reaches terminal failure
- **THEN** the failure remains visible and future recurrence is independently established or explicitly reported unhealthy

#### Scenario: Child scheduling fails
- **WHEN** cron calculation or successor acceptance fails
- **THEN** diagnostics report no confirmed successor and shared retry/reconciliation can recover without duplicate effective resets

#### Scenario: Restart after failure
- **WHEN** the application restarts with a failed reset and no valid successor
- **THEN** eligible startup reconciliation establishes the next future occurrence without immediate catch-up or duplicate active reset

### Requirement: Execute demo management workflows through their declared tasks
Demo capture and reset SHALL remain background workflows with persisted task identities. A 202 acceptance SHALL NOT imply completion. Successful results SHALL identify the selected baseline, completed generation and restored/cleared state counts; recurrence outcomes SHALL remain distinguishable from reset outcomes.

#### Scenario: Capture execution result
- **WHEN** capture completes successfully
- **THEN** its persisted result identifies the complete baseline and membership/asset counts

#### Scenario: Restore execution result
- **WHEN** reset completes successfully
- **THEN** its persisted result identifies the applied baseline, coherent generation and state dispositions

#### Scenario: Startup seed meaning
- **WHEN** automatic demo seeding accepts a workflow
- **THEN** it schedules restoring an existing prepared baseline rather than generating sample content or invoking AI

### Requirement: Report snapshot-file and cron diagnostics with management status
Management diagnostics SHALL distinguish baseline absence, unsupported format, failed integrity/preflight, publication recovery, last reset outcome and confirmed next occurrence. A valid cron or enqueue result SHALL NOT alone certify baseline readiness, recurring health or successful reset. Status SHALL remain available during recovery.

#### Scenario: Missing core snapshot
- **WHEN** required baseline content is missing
- **THEN** readiness is false with actionable missing-content diagnostics

#### Scenario: Valid cron with missing snapshot
- **WHEN** cron is valid but the selected baseline is invalid
- **THEN** diagnostics separately show cron validity, baseline failure and whether a future occurrence is confirmed

#### Scenario: Invalid restore cron
- **WHEN** the configured cron is invalid
- **THEN** diagnostics report INVALID_CRON without claiming healthy recurrence

#### Scenario: Reschedule result is newer
- **WHEN** a reschedule task is newer than the completed reset task
- **THEN** management diagnostics still distinguish the reset outcome from successor scheduling

### Requirement: Keep the ordinary Search entry visible in demo presentation
The Recipes page SHALL retain ordinary Search in visitor mode and serve typed search through model-free lexical retrieval with existing filters and recovery navigation. Similar SHALL use compatible prepared embeddings or lexical source facts without generating a query embedding. Visitor edits SHALL retain lexical availability without paid repair.

#### Scenario: Search input available
- **WHEN** a visitor searches prepared recipes
- **THEN** the input remains visible and results require no outbound model request

#### Scenario: Prepared embedding unavailable
- **WHEN** prepared search embeddings are missing or incompatible
- **THEN** lexical search and Similar fallback remain usable without provider retries

#### Scenario: Visitor edits a recipe
- **WHEN** a visitor changes searchable facts, rating, notes or discoverability
- **THEN** derived lexical state is updated without embedding generation and stale embeddings are not presented as current

### Requirement: Reset aggregate history with demo state
Capture SHALL include complete aggregate history consistent with baseline recipes and calendar policy. Successful reset SHALL replace history exactly once, regenerate operational round/history identities and invalidate stale close requests. Legacy incomplete demo snapshots SHALL require recapture, independently of ordinary backup merge compatibility.

#### Scenario: Legacy demo reset
- **WHEN** upgraded reset receives a core snapshot without required history
- **THEN** it refuses destructive reset with recapture guidance rather than inventing or clearing history

#### Scenario: Captured demo history
- **WHEN** reset applies a valid complete baseline containing history
- **THEN** history is restored once under the shared calendar mapping without retaining visitor rows

#### Scenario: Stale browser after reset
- **WHEN** a pre-reset browser retries a close
- **THEN** it cannot clear new round votes or recreate prior visitor history

## ADDED Requirements

### Requirement: Separate operator baseline authority from visitor experiments
Visitor mode SHALL apply whenever API demo mode is enabled. Baseline capture, replacement and selection SHALL require operator authority unavailable to visitors; shared visitor household access alone SHALL NOT grant it. Visitor requests SHALL NOT disable demo mode or enable AI preparation. Existing demo identity and ordinary household access SHALL remain available.

#### Scenario: Visitor tries to replace the baseline
- **WHEN** a visitor calls management capture or selection using only demo household access
- **THEN** the request is rejected before modifying the selected baseline or preparation policy

#### Scenario: Authorized preparation
- **WHEN** an operator explicitly prepares and captures a baseline outside visitor mode
- **THEN** normal preparation can proceed under operator authority without exposing that authority to the visitor session

### Requirement: Enforce visitor mode at every model boundary
While visitor mode is active, the system SHALL send zero outbound AI/model requests from requests, workflows, retries, startup, maintenance or reset. This includes chat, streaming, query/document embeddings, extraction, synthesis, categorization and image generation, including direct provider clients. A feature override, force flag or available credential SHALL NOT bypass this policy.

#### Scenario: Direct and background routes
- **WHEN** visitors search, edit, upload, reimport, regenerate a hero, request suggestions or trigger permitted management actions
- **THEN** neither synchronous nor subsequently queued/retried work sends a model request

#### Scenario: Maintenance and reset
- **WHEN** startup, dreaming, reconciliation, reset or successor scheduling runs in visitor mode
- **THEN** no model request is sent, including for stale or missing embeddings and categories

#### Scenario: Credentials exist
- **WHEN** provider credentials and model-enabled feature flags are available in visitor mode
- **THEN** the no-request policy still holds at each provider boundary

#### Scenario: Preparation is separate
- **WHEN** an operator explicitly prepares content outside visitor mode
- **THEN** normal authorized AI behavior is available, but visitors cannot switch the serving installation into that preparation state

### Requirement: Give honest model-free visitor outcomes
Visitor interactions SHALL use prepared content or deterministic local behavior when available. Unsupported AI-dependent actions SHALL explain the demo limitation before work starts and SHALL NOT claim acquired, generated or repaired content exists. Ordinary non-demo behavior SHALL remain unchanged.

#### Scenario: Hero regeneration
- **WHEN** a visitor requests forced hero generation
- **THEN** the existing prepared hero remains and the action reports that generation is unavailable in demo mode without a provider call

#### Scenario: Capture cannot be fulfilled locally
- **WHEN** a visitor submits content requiring AI extraction
- **THEN** the interface offers a prepared demonstration or explicit unavailable outcome, not a false ready recipe or endless retry

#### Scenario: Non-demo installation
- **WHEN** demo mode is disabled in an ordinary authorized installation
- **THEN** its existing AI actions and provider behavior remain available under their ordinary contracts

### Requirement: Rebuild derived state without restoring operational tokens
Reset SHALL rebuild SQL views, lexical/filter/affinity state and client-visible generations deterministically from restored facts. It SHALL reuse only compatible prepared embeddings and SHALL invalidate process-local continuation caches and stale optimistic writes. Host configuration, credentials, backup archives and device preferences SHALL NOT be captured or reset as household facts.

#### Scenario: New table or state owner
- **WHEN** the supported household schema introduces a state category not classified by the baseline format
- **THEN** capture/reset compatibility checks fail visibly until its restore, clear, preserve or rebuild policy is declared

#### Scenario: Mounted browser survives reset
- **WHEN** a visitor leaves planner, groceries or Search mounted through reset
- **THEN** obsolete writes and continuations cannot apply and the interface rehydrates a coherent new generation with refresh guidance

#### Scenario: Independent host and device state
- **WHEN** household reset completes
- **THEN** deployment secrets, clock configuration, unrelated backups and valid device preferences remain outside baseline replacement

### Requirement: Apply one explicit calendar anchor to the prepared household
The baseline SHALL record its application-calendar anchor and policy. Under the proposed relative-week policy, reset SHALL apply one whole-week offset to all declared calendar-facing dates and week keys, preserving weekday, ordering, lineage and relative historical windows. Audit timestamps SHALL retain their meaning; reset SHALL NOT change the application clock or UTC cron schedule.

#### Scenario: Reset in a later week
- **WHEN** a baseline is reset several weeks after capture
- **THEN** plans, calendar events, extra occurrences and aggregate history move coherently relative to the reset application's current week

#### Scenario: Boundary and retry
- **WHEN** reset crosses a week boundary or is retried after interruption
- **THEN** one pinned anchor governs the complete publication; related records cannot land in different reset weeks

#### Scenario: Rebased state eligibility
- **WHEN** dated recipe rotation, cooked, deferred or deletion state participates in eligibility
- **THEN** its declared calendar mapping is validated together with planner/history references, without shifting operational expiry or retry timestamps

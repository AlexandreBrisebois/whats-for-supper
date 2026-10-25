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

#### Scenario: Concurrent capture
- **WHEN** capture overlaps household writes or worker asset updates
- **THEN** bounded coordination produces mutually consistent database facts and asset bytes; timeout leaves the previously selected baseline unchanged

#### Scenario: Capture interrupted
- **WHEN** capture is interrupted while staging data or assets
- **THEN** visitors and later reset still use the previous complete baseline, never the partial generation

### Requirement: Check core snapshot presence before destructive restore
Demo reset SHALL validate supported format, explicit required membership, relationships, calendar mapping and asset integrity before any live deletion or publication. Legacy core-only snapshots SHALL fail with recapture guidance, not imply empty missing collections. Missing, malformed or unsupported inputs SHALL leave live state and the last complete baseline unchanged.

#### Scenario: Required artifact absent
- **WHEN** a required collection or asset directory is absent, even if the old four core files exist
- **THEN** execution fails preflight before deleting database rows or active recipe files

#### Scenario: Explicitly empty asset set
- **WHEN** the format declares no required recipe assets and an existing empty asset directory matches its verified inventory
- **THEN** preflight accepts that explicit emptiness; an absent directory is not treated as proof of an empty snapshot

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

#### Scenario: Quiescence times out
- **WHEN** in-flight mutations or workers cannot drain or be fenced within the bounded reset interval
- **THEN** reset fails before publication, preserves the prior complete generation and offers retry guidance

#### Scenario: Concurrent visitor write
- **WHEN** a visitor mutation races the reset boundary
- **THEN** it either completes in the old generation and is reset or is rejected for refresh; it cannot silently leak into the restored generation

#### Scenario: Grocery write or recomputation finishes late
- **WHEN** a pre-reset grocery check, bulk check, recomputation or extra mutation completes after publication
- **THEN** it cannot replace restored grocery items, checks or extra lineage, including where baseline entity IDs are reused

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

#### Scenario: Alternate baseline dispatch
- **WHEN** a visitor uses generic workflow trigger or task reset to launch or replay baseline capture
- **THEN** operator authorization is enforced before that work can be accepted or modify the selected baseline; the management-route restriction cannot be bypassed

#### Scenario: Authorized preparation
- **WHEN** an operator explicitly prepares and captures a baseline outside visitor mode
- **THEN** normal preparation can proceed under operator authority without exposing that authority to the visitor session

### Requirement: Rebuild derived state without restoring operational tokens
Reset SHALL rebuild SQL views and lexical/filter/affinity state from restored facts without model requests. It SHALL reuse only compatible prepared embeddings and invalidate stale continuations and optimistic writes through the accepted reset boundary. Host configuration, credentials, backup archives and device preferences SHALL NOT be captured or reset as household facts.

#### Scenario: New table or state owner
- **WHEN** the supported household schema introduces a state category not classified by the baseline format
- **THEN** capture/reset compatibility checks fail visibly until its restore, clear, preserve or rebuild policy is declared

#### Scenario: Mounted browser survives reset
- **WHEN** a visitor leaves planner, groceries or Search mounted through reset
- **THEN** obsolete writes and continuations cannot apply and the interface rehydrates a coherent new generation with refresh guidance

#### Scenario: Independent host and device state
- **WHEN** household reset completes
- **THEN** deployment secrets, clock configuration, unrelated backups and valid device preferences remain outside baseline replacement

#### Scenario: Operator-owned setting or artifact
- **WHEN** a stored setting key or file belongs to host/operator configuration rather than declared household facts
- **THEN** reset preserves it and never serializes its secrets into the public baseline; unclassified ownership prevents destructive publication

#### Scenario: Reset-triggered local work
- **WHEN** reset schedules permitted indexing, reconciliation or maintenance and a prior task attempts late publication
- **THEN** the new household's derived state is built without model requests and obsolete work cannot overwrite it
- **AND** accepted model-free imports, local report resolution and prepared content remain usable under their ordinary demo contracts, with visitor-only membership removed by reset

### Requirement: Apply one explicit calendar anchor to the prepared household
The baseline SHALL record its accepted calendar policy and anchor. Under the proposed relative-week option, reset SHALL use one whole-week offset for declared calendar-facing dates and week keys, preserving weekday, ordering and lineage. Audit, retention and notification timestamps SHALL follow their separately reviewed field policies. Reset SHALL NOT change the application clock or UTC cron schedule.

#### Scenario: Reset in a later week
- **WHEN** a baseline using the proposed relative-week policy is reset several weeks after capture
- **THEN** plans, calendar events, extra occurrences and aggregate history move coherently relative to the reset application's current week

#### Scenario: Boundary and retry
- **WHEN** reset crosses a week boundary or is retried after interruption
- **THEN** one pinned anchor governs the complete publication; related records cannot land in different reset weeks

#### Scenario: Rebased state eligibility
- **WHEN** LastCookedDate, CreatedAt/New eligibility, DeletedAt retention or other declared timestamp-sensitive facts affect the restored household
- **THEN** their accepted field policies are validated with planner/history references without silently refreshing audit history, disabling retention or shifting operational expiry/retry timestamps

### Requirement: Provide a coherent synthetic demo household
The public baseline SHALL use deterministic synthetic household identities and authored or approved nonprivate content with coherent recipe, plan, grocery, history and asset references. It SHALL retain ordinary voting, explicit plan saving, grocery extras and cooking semantics. It SHALL NOT present prepared votes, media or extracted content as a visitor's own processing result.

#### Scenario: Playable fresh round
- **WHEN** the prepared household is restored under the proposed fresh-vote policy
- **THEN** exactly one open round has fresh identity, consistent plan ownership, available dates and enough eligible recipes for ordinary household voting to converge
- **AND** prepared saved meals and non-cooking days remain distinct from pending matches

#### Scenario: Matches are not a saved menu
- **WHEN** a visitor reaches convergence and opens See your matches
- **THEN** existing round-week navigation shows matches awaiting explicit saving and closing; the celebration and navigation themselves do not assign meals or close voting

#### Scenario: Fixture provenance and relationships
- **WHEN** a baseline is selected for public use
- **THEN** its member names, recipe text, original PDF/images and hero media contain no real household private data or credentials and all declared relationship/asset references validate
- **AND** automated qualification fixtures and checks require no AI requests; authorized operator preparation remains separate

### Requirement: Explain shared demo state and recovery without a tour
Reset recovery SHALL reuse existing demo guidance and ordinary navigation without adding a mandatory tour or replaying a dismissed introduction. It SHALL distinguish restored state from successful visitor saves and prevent stale local edits from being replayed. A localized secondary self-hosting path SHALL explain the difference from operator-configured AI without a free-provider or guaranteed reset-schedule promise.

#### Scenario: Interrupted visitor during reset
- **WHEN** a visitor returns to a mounted task after reset or misses the reset event
- **THEN** ordinary reconciliation refreshes its authoritative state, explains the reset accessibly in English/French and provides a usable continuation without claiming an obsolete save succeeded
- **AND** valid device preferences and the demo explanation acknowledgement remain intact; the old local draft is not automatically replayed

#### Scenario: Honest self-hosting choice
- **WHEN** a visitor follows self-hosting guidance
- **THEN** it distinguishes the restricted public demo from operator-configured AI capabilities without promising free provider use or that every capability was exercised in the demo


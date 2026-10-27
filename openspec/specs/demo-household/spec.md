# Demo household Specification

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../household-identity/spec.md),
[background processing](../background-processing/spec.md) and
[management status](../data-backup-and-recovery/spec.md#requirement-project-the-latest-selected-management-result). Named requirements
below refer to those owners without changing their shared policy.

## Evidence and qualifications (non-normative)

Accepted and promoted under DH-P01 (2026-10-16) after the user's conditional
verification-and-promotion instruction and a passing pre-promotion verification.
The six selected demo-household deltas contribute 26 requirements and 62 scenarios.
[Capability evidence and lifecycle record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/demo-household.md)
contains BSL-demo-household-001–016, all requirement/scenario mappings, inspected
assertion/substitution limits and source identities.

These are implementation-supported baseline requirements. Runtime/API/database,
browser/device and provider qualification remains not-run/deferred under A34.
U07 and DH-U01–DH-U09 remain in force: no global AI blocking or zero-cost guarantee,
atomic database/filesystem restore, complete asset or soft-deleted-library reset,
exactly-once scheduling, guaranteed recurrence/recovery, production authentication
qualification or cross-host configuration consistency is established. Presence-only
snapshot diagnostics and cron-validity diagnostics do not certify a working restore.
Approved-contract disagreements and custom workflow-root limitations remain outside
normative claims. Promotion changes documentation only; the six changes stay active
and unarchived, with no application implementation authorized or performed.

## Relocated requirement references (non-normative)

References in preserved requirements to a combined capability now resolve to these exact requirement owners. This navigation does not change their policy.

- [List existing household members for selection](../member-context/spec.md#requirement-list-existing-household-members-for-selection)
- [Resolve the current member through the API](../member-context/spec.md#requirement-resolve-the-current-member-through-the-api)

<a id="requirement-read-latest-management-workflow-diagnostics"></a>

The former requirement Read latest management workflow diagnostics and its Latest management selection and Completed task result scenarios now resolve to [Project the latest selected management result](../data-backup-and-recovery/spec.md#requirement-project-the-latest-selected-management-result). Demo-specific management diagnostics remain owned here.

## Requirements

### Requirement: Resolve demo activation from API configuration

The API SHALL enable demo behavior when DEMO_MODE parses as true. Missing or blank values SHALL disable it; false SHALL disable it. Invalid nonblank values SHALL disable it and produce a configuration warning.

#### Scenario: Enable demo
- **WHEN** DEMO_MODE is a parseable true value, including case or surrounding whitespace accepted by Boolean parsing
- **THEN** demo behavior is enabled

#### Scenario: Disable demo
- **WHEN** DEMO_MODE is absent, blank or parseable false
- **THEN** demo behavior is disabled

#### Scenario: Invalid activation
- **WHEN** DEMO_MODE is a nonblank value that cannot be parsed as a Boolean
- **THEN** demo behavior is disabled and a warning is logged

### Requirement: Report API demo diagnostics through anonymous health

GET /api/health SHALL expose demoMode, demoModeRawValue and demoRestoreCronValid without household authentication. An absent raw value SHALL be reported as an empty string. Database connectivity and core-table checks SHALL determine healthy/200 or unhealthy/503 independently of cron validity.

#### Scenario: Healthy diagnostics
- **WHEN** database connectivity and core-table checks succeed
- **THEN** health returns 200 with healthy status, timestamp, checks and demo diagnostics

#### Scenario: Invalid cron diagnostics
- **WHEN** the restore cron cannot yield a valid next occurrence but database checks succeed
- **THEN** health reports demoRestoreCronValid false while retaining healthy status and HTTP 200

#### Scenario: Unhealthy storage
- **WHEN** a database connectivity or core-table check fails
- **THEN** health returns 503 with unhealthy status and demo diagnostics

### Requirement: Prefill Welcome without bypassing household access

After a successful health response with demoMode true, Welcome SHALL fill an empty passphrase with Swipe-Match-Cook and preserve a nonempty current value. Submission SHALL continue through household-identity requirements `Enter the household with its shared passphrase` and `Give passphrase submission feedback and allow retry`.

#### Scenario: Empty welcome passphrase
- **WHEN** Welcome receives demoMode true while its passphrase is empty and the page is still active
- **THEN** the passphrase field becomes Swipe-Match-Cook without submitting or authenticating

#### Scenario: User already typed
- **WHEN** Welcome receives demoMode true with a nonempty current passphrase
- **THEN** the current passphrase is retained

#### Scenario: Health unavailable
- **WHEN** the convenience health request fails
- **THEN** Welcome remains available for ordinary passphrase entry and submission

### Requirement: Reject demo member creation

For an authorized valid POST /api/family while demo mode is enabled, the API SHALL reject new-member creation with 403 and message New user creation is restricted in Demo Mode. Existing-member selection and context SHALL remain governed by household-identity requirements `List existing household members for selection` and `Resolve the current member through the API`.

#### Scenario: Demo creation refused
- **WHEN** an authorized caller submits a valid new-member request with demo mode enabled
- **THEN** the response is 403 with the restriction message and no member is created by this action

### Requirement: Present demo identity independently of authentication

With PWA DEMO_MODE enabled, the application SHALL display the informational Demo identity hint (Démo in French). When the baked release channel is beta, the hint SHALL retain an accessible beta-channel description. The hint SHALL be noninteractive and SHALL NOT grant household access.

#### Scenario: Demo hint
- **WHEN** a demo identity is rendered in English or French
- **THEN** the hint has role note and the localized accessible name without an interactive control

#### Scenario: Beta demo identity
- **WHEN** demo identity is rendered for the baked beta channel
- **THEN** Demo or Démo is the label and the beta-channel description is accessible

### Requirement: Select demo installation artwork

With PWA demo identity enabled, the manifest and document icon references SHALL select the demo artwork variant, or beta-demo for the baked beta channel, while retaining the application name. Manifest output SHALL use application/manifest+json and no-store, max-age=0.

#### Scenario: Stable demo artwork
- **WHEN** the public manifest is requested with PWA demo enabled in the stable channel
- **THEN** manifest icon and shortcut-icon paths use /icons/install-v1/demo and the name remains What's for Supper?

#### Scenario: Beta demo artwork
- **WHEN** the manifest and document metadata are resolved with PWA demo enabled in the beta channel
- **THEN** their selected icon references use the beta-demo variant

### Requirement: Accept demo snapshot capture as background work
An authenticated POST /api/management/demo-capture with demo mode disabled SHALL trigger demo-capture with empty parameters and return 202 containing message Demo capture task enqueued. and taskId identifying the accepted workflow instance. Acceptance SHALL follow background-processing requirement `Persist initial workflow and task identities before returning` and SHALL NOT certify completion.

#### Scenario: Capture accepted
- **WHEN** demo mode is disabled and authenticated workflow acceptance succeeds for demo-capture
- **THEN** 202 contains the enqueue message and accepted instance identity as taskId

#### Scenario: Capture outside automatic mode
- **WHEN** an authorized operator requests demo-capture with DEMO_MODE disabled and workflow acceptance succeeds
- **THEN** the management action still accepts capture; automatic demo activation is not an action-level prerequisite

#### Scenario: Capture rejected in demo mode
- **WHEN** demo mode is enabled and capture is requested through management, a generic workflow trigger or task reset, or previously accepted capture work reaches execution
- **THEN** capture SHALL be rejected at that boundary

### Requirement: Capture the core demo data set
A successful demo capture SHALL publish a complete versioned prepared household baseline with explicit membership, including empty collections, for every baseline-owned state category. Operational identities SHALL NOT be replayable.

#### Scenario: Core snapshot
- **WHEN** an operator captures the prepared household
- **THEN** the baseline includes its complete declared membership and relationships, not only members, recipes and search documents

#### Scenario: Activity omitted
- **WHEN** capture runs with live votes and import execution state present
- **THEN** those transient identities are not replayable and the manifest declares their selected reset policy instead of silently omitting unknown state

#### Scenario: Retired recipe fields
- **WHEN** recipe snapshot serialization encounters retired fields isHealthyChoice, dietaryProfile, fopFlags, fopClassification, healthProfile, healthEvent or balanceSummary
- **THEN** those fields are omitted from serialized recipe objects

#### Scenario: Prepared facts and reset dispositions
- **WHEN** a successful capture publishes the baseline
- **THEN** it SHALL include members, active and soft-deleted recipes, prepared search, settings, member overrides and categories
- **AND** it SHALL explicitly declare clearing calendar events, meal plans and their grocery state, grocery extras, votes, import reports and aggregate voting history rather than replaying that captured activity
- **AND** recipe LastCookedDate SHALL be cleared during reset

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

### Requirement: Accept demo snapshot restore as background work

An authorized POST /api/management/demo-restore SHALL trigger demo-restore with empty parameters and return 202 containing message Demo restore task enqueued. and taskId identifying the accepted workflow instance. Accepted work SHALL use background-processing lifecycle requirements rather than imply completed restore.

#### Scenario: Restore accepted
- **WHEN** shared household authorization and workflow acceptance succeed
- **THEN** 202 returns the restore enqueue message and instance identity

#### Scenario: Missing snapshot at acceptance
- **WHEN** demo snapshot files are absent but orchestration accepts demo-restore
- **THEN** the action returns acceptance; snapshot validation occurs during execution

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
- **THEN** captured members, recipe facts, preferences replace visitor changes, while calendar events, meal plans, groceries/extras, voting/cooking history, votes and reports are cleared

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
- **THEN** it cannot recreate cleared grocery items, checks or extra lineage or mutate the new generation

### Requirement: Clear transient activity when restoring core state
Reset SHALL clear votes, import reports, prior weekly planning records and their grocery items/checks, calendar events and all grocery-extra occurrences/lineage so visitors start with an empty planner, calendar and groceries and a fresh voting round.

#### Scenario: Activity cleared
- **WHEN** votes, reports and queued visitor work accumulated since capture
- **THEN** reset removes their ability to affect the new generation while restoring the prepared household facts

#### Scenario: Grocery state cleared with plans
- **WHEN** visitors changed plan groceries or extra occurrences
- **THEN** reset clears all meal plans, grocery items/checks and extra occurrences, including lineage and tombstones, rather than restoring prepared grocery state

#### Scenario: Repeat reset
- **WHEN** the same baseline is reset twice at the same calendar anchor
- **THEN** authoritative facts are equivalent without duplicated history, extras or counts; operational identities are fresh each time

#### Scenario: Fresh round and stale authority
- **WHEN** reset publishes the restored household
- **THEN** one new empty current-week voting record SHALL own the fresh round and SHALL contain no assigned meals, grocery items, checks or old notification timestamp
- **AND** reset SHALL clear aggregate history and recipe LastCookedDate, regenerate round/close and optimistic-concurrency identities, and invalidate stale maintenance commands, uploads and continuations

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

### Requirement: Seed an initial restore only for eligible demo startup

On hosted startup with demo enabled, the seeder SHALL schedule demo-restore only when no demo-restore instance is Pending or Processing. Disabled demo mode SHALL skip seeding. The eligible startup SHALL use empty parameters and the next configured UTC cron occurrence as its root-task schedule.

#### Scenario: Disabled startup
- **WHEN** demo mode is disabled when seeding starts
- **THEN** no demo restore is seeded

#### Scenario: Existing active restore
- **WHEN** a demo-restore instance is Pending or Processing
- **THEN** seeding returns without creating another initial restore

#### Scenario: Eligible startup
- **WHEN** demo mode is enabled with no Pending or Processing demo-restore and cron calculation and acceptance succeed
- **THEN** a demo-restore instance is accepted with its root scheduled at the next configured UTC occurrence

#### Scenario: Only paused history
- **WHEN** only Paused or terminal demo-restore instances exist and other prerequisites succeed
- **THEN** those instances do not suppress the initial seed

### Requirement: Default the automatic restore schedule to daily UTC

Blank or absent DEMO_RESTORE_CRON_UTC SHALL select 0 3 * * *. Nonblank configuration SHALL supply the restore cron. Scheduling SHALL follow background-processing requirement `Resolve child cron schedules against future UTC minutes`, using a future whole UTC minute rather than an immediate catch-up run.

#### Scenario: Before daily target
- **WHEN** the default cron is resolved at 02:30 UTC
- **THEN** the next restore root schedule is 03:00 UTC that day

#### Scenario: At daily target
- **WHEN** the default cron is resolved at exactly 03:00 UTC
- **THEN** the next restore root schedule is 03:00 UTC the following day

#### Scenario: Custom daily target
- **WHEN** a valid configured cron selects 04:30 UTC and the clock is before that target
- **THEN** that configured target supplies the next eligible UTC schedule

### Requirement: Contain startup restore seeding failures

If cron calculation fails, initial seeding SHALL log INVALID_CRON and return without scheduling a restore. Other startup seeding exceptions SHALL be caught and logged by the hosted seeding boundary. These outcomes SHALL NOT imply a successful seed or a background seeding retry.

#### Scenario: Invalid cron
- **WHEN** the seeder cannot calculate the configured next occurrence
- **THEN** it logs a warning with INVALID_CRON and creates no restore through this seed

#### Scenario: Trigger fails
- **WHEN** workflow acceptance raises an exception during hosted seeding
- **THEN** the hosted boundary logs the failure and does not rethrow it as a seeder startup failure

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

### Requirement: Seed packaged demo workflow definitions at startup

Startup SHALL attempt to copy packaged YAML workflow definitions, including demo-capture and demo-restore when present, into the configured workflow root, replacing existing files of the same names. Missing packaged workflow directories or copy errors SHALL be logged without a successful-seeding guarantee.

#### Scenario: Packaged definitions available
- **WHEN** the packaged workflow directory contains demo definitions and copying succeeds
- **THEN** the target workflow root contains those definitions, replacing same-named files

#### Scenario: Definition source unavailable
- **WHEN** neither packaged workflow directory exists
- **THEN** startup definition seeding logs a warning and returns without copying definitions

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

### Requirement: Bypass the five demo workflow processor names
With demo enabled, dispatch for ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition and CategorizeIngredients SHALL fail explicitly as unavailable rather than execute the ordinary processor or claim content was produced. Existing non-demo dispatch SHALL remain unchanged.

#### Scenario: Each named processor bypassed
- **WHEN** a demo worker dispatches one of the five named processor tasks
- **THEN** it reports the demo restriction without running its ordinary model processor or generating content

#### Scenario: Bypass result completes task
- **WHEN** a model-dependent task is unavailable in demo mode
- **THEN** it cannot manufacture successful extraction, generated content or readiness from a bypass result; ordinary non-transient task failure handling applies

### Requirement: Block outgoing calls through the decorated chat client

In demo mode, outgoing response and streaming-response requests through the registered decorated chat client SHALL throw before delegating to the underlying chat provider. With demo disabled, that decorator SHALL delegate these requests normally.

#### Scenario: Response blocked
- **WHEN** a consumer invokes a response request through the decorated chat client in demo mode
- **THEN** it fails with Outgoing AI Chat calls are disabled in Demo Mode. before provider delegation

#### Scenario: Stream blocked
- **WHEN** a consumer invokes a streaming-response request through the decorated chat client in demo mode
- **THEN** it fails with Outgoing AI Streaming Chat calls are disabled in Demo Mode. before provider delegation

#### Scenario: Normal chat delegation
- **WHEN** demo mode is disabled and a consumer invokes either chat request form through the decorator
- **THEN** the request is delegated to the underlying client without the demo rejection

### Requirement: Keep the ordinary Search entry visible in demo presentation
The Recipes page SHALL retain ordinary Search in demo mode. Typed search SHALL use lexical retrieval without generating a query embedding. Similar SHALL retain compatible prepared-vector retrieval or its existing lexical fallback. Local recipe edits and reconciliation SHALL publish lexical state without paid embedding repair.

#### Scenario: Search input available
- **WHEN** the Recipes page renders with established member context in demo mode
- **THEN** ordinary Search remains usable without an outbound model request

#### Scenario: Compatible prepared Similar
- **WHEN** a demo recipe has a compatible prepared vector
- **THEN** Similar can use that stored vector without creating another embedding; absent or incompatible vectors use the existing local fallback

#### Scenario: Edits and repair
- **WHEN** a visitor edits searchable facts or startup/maintenance dispatches indexing or reconciliation
- **THEN** lexical state remains available without model requests or repeated embedding-only repair for demo restrictions

### Requirement: Reset aggregate history with demo state
The baseline SHALL explicitly declare clearing aggregate voting history and recipe cooking history. Successful reset SHALL clear that history, regenerate operational round/history identities for a fresh current-week round and invalidate stale close requests. Legacy incomplete demo snapshots SHALL require recapture, independently of ordinary backup merge compatibility.

#### Scenario: Legacy demo reset
- **WHEN** upgraded reset receives a core snapshot without required history
- **THEN** it refuses destructive reset with recapture guidance rather than inventing or clearing history

#### Scenario: Captured demo history
- **WHEN** reset applies a valid complete baseline containing history
- **THEN** aggregate history is empty and recipe LastCookedDate is null, with fresh round/history identities and no retained visitor rows

#### Scenario: Stale browser after reset
- **WHEN** a pre-reset browser retries a close
- **THEN** it cannot clear new round votes or recreate prior visitor history

### Requirement: Reject demo requests at every model boundary
API demo mode SHALL prevent outgoing chat/streaming, query/document embedding and hero-generation model requests, including direct clients. Credentials, feature flags, force options, startup, background dispatch and retries SHALL NOT bypass it. Non-demo provider delegation SHALL remain unchanged.

#### Scenario: Provider transports are forbidden
- **WHEN** any supported model boundary is invoked in demo mode with dummy credentials present
- **THEN** no underlying provider or transport is called, including forced generation and repeated attempts

#### Scenario: Non-demo delegation
- **WHEN** demo mode is disabled and a model operation is authorized
- **THEN** ordinary delegation continues under existing contracts; isolated tests use provider doubles

### Requirement: Refuse unavailable AI actions before accepting private content
Demo AI capture, contextual reimport, bulk import, failed-capture retry, original-photo regeneration and hero generation SHALL return 403 with status, code DEMO_AI_UNAVAILABLE and an explanatory message before processing a request body or changing household facts/assets. UI entry SHALL explain the restriction before private file selection/upload and offer prepared recipes or return navigation.

#### Scenario: Direct capture or generation request
- **WHEN** a demo caller posts photo/PDF/URL/description capture, contextual import feedback that can launch reimport, bulk import, failed-capture retry, original-photo regeneration or hero regeneration
- **THEN** 403 explains the restriction without parsing uploaded private content, accepting model work, changing recipe/media state or implying success

#### Scenario: Prepared content and local work
- **WHEN** a visitor browses original PDF/images and prepared heroes, edits ordinary recipe facts, votes, saves a plan, checks groceries/extras or cooks
- **THEN** local behavior and existing prepared bytes remain available without a model request

#### Scenario: Restriction unavailable to the browser
- **WHEN** the browser has not established API demo status
- **THEN** private AI upload entry waits with retry/return guidance rather than guessing that upload is permitted

#### Scenario: Resolve a prepared report locally
- **WHEN** a demo visitor reviews an existing issue while model availability is restricted or unknown
- **THEN** local Mark as resolved remains available under its existing active-import rules and uses the existing DELETE operation; AI report submission is withheld and private-note editing is disabled
- **AND** resolve failure remains visible and retryable without claiming success

#### Scenario: Import a prepared shared text bundle
- **WHEN** a visitor selects and reviews a valid shared .txt recipe bundle while model availability is restricted or unknown
- **THEN** the existing model-free bundle import remains usable, preserving supplied prepared facts/media without a model workflow
- **AND** AI photo/PDF/link/description controls remain unavailable; non-text file selection through this safe picker is rejected before parsing or staging AI capture

#### Scenario: Availability resolves during a local import
- **WHEN** a visitor opens the safe text picker or reviews a prepared bundle before availability resolves to ordinary non-demo mode
- **THEN** that picker and local draft remain attached and usable without a camera interruption or discarded preview; ordinary AI capture becomes available after confirmed non-demo status

### Requirement: Offer a reopenable demo context explanation
The demo SHALL provide a compact pale sage strip with readable dark charcoal text at the top of the ordinary app shell, respecting safe areas, that opens one short phone sheet or compact iPad dialog. It SHALL explain the sample shared household, other visitors' changes, temporary changes that will be reset and avoiding personal information. Start exploring and an explicit close SHALL dismiss it. Existing identity hints SHALL retain their noninteractive meaning.

#### Scenario: Tap the context band
- **WHEN** a visitor activates Demo · What to know or its French equivalent in the ordinary demo shell
- **THEN** a named, readable dialog opens with the shared-state explanation, Start exploring and an explicit close, without navigation, household mutation or a mandatory tour
- **AND** the band remains available after dismissal for voluntary reopening

#### Scenario: Truthful restrictions
- **WHEN** the explanation describes AI limitations or reset behaviour
- **THEN** its claims match verified restrictions for the delivered demo and do not imply universal AI blocking, zero cost, processed visitor uploads, a guaranteed reset countdown or a schedule not established by evidence

#### Scenario: Responsive accessible control and surface
- **WHEN** the context band and explanation render in EN/FR on iPhone, Pixel Phone or iPad
- **THEN** the band has at least a 32 CSS pixel touch height as an explicitly approved exception to the former 44px band requirement, visible focus and text contrast of at least 4.5:1 on each actual interaction background, with no text clipping or obscured navigation
- **AND** the phone sheet or compact tablet dialog supports readable focus, accessible name/description, contained keyboard focus, Escape/explicit close, focus return, reduced motion and reachable actions under text expansion

#### Scenario: Approved compact band target
- **WHEN** the context band renders at ordinary text size
- **THEN** its full-width sage surface and accessible target have a 32 CSS pixel minimum height without decorative cream padding above or below; necessary device safe-area inset remains respected
- **AND** the label uses 13px/18px medium text and a 16px help icon, retaining Demo · What to know and Démo · À savoir
- **AND** at 320px width or with enlarged text the label and strip can grow and wrap without clipping, horizontal overflow or overlapping targets

#### Scenario: Matching exploration action
- **WHEN** Start exploring or its French equivalent renders
- **THEN** it uses existing dark sage with white text, darker hover and pressed surfaces, contrasting visible focus and at least 4.5:1 text contrast in every state
- **AND** modal buttons and the separate setup link retain at least 44 CSS pixel target height; the compact-band exception does not reduce other controls

#### Scenario: Approved demo explanation
- **WHEN** the explanation renders in English
- **THEN** its four body paragraphs say exactly:
  - Welcome to What’s for Supper! You’re sharing this demo with other visitors, just like a family sharing the app. You’ll see their changes as you explore, and they’ll see yours.
  - Try things out! Your changes are temporary and will be reset. Please don’t add personal information.
  - AI capture and generation are turned off in this demo. Explore the recipes we’ve prepared for you instead.
  - When you set up your own What’s for Supper, AI features require your own subscription.
- **AND** in French its four body paragraphs say exactly:
  - Bienvenue dans What’s for Supper! Vous partagez cette démo avec d’autres visiteurs, comme une famille qui utilise l’application ensemble. Vous verrez leurs changements au fil de votre exploration, et ils verront les vôtres.
  - Amusez-vous à essayer! Vos changements sont temporaires et seront réinitialisés. Veuillez ne pas ajouter de renseignements personnels.
  - La capture et la génération par IA sont désactivées dans cette démo. Explorez plutôt les recettes que nous avons préparées pour vous.
  - Lorsque vous installez votre propre What’s for Supper, les fonctionnalités d’IA nécessitent votre propre abonnement.
- **AND** the separate Set up your own household link and Start exploring action remain
- **AND** non-demo strings and provider, account or authentication behavior are unchanged

#### Scenario: Static title without a focus outline
- **WHEN** the disclaimer opens and its named title receives initial focus
- **THEN** the static title has no visible outline while dialog naming, focus containment, Escape/close and return focus remain correct
- **AND** keyboard focus indicators on the band, close button, setup link and Start exploring remain visible; unrelated dialog title styling is unchanged

### Requirement: Introduce demo context only at a safe first visit
An undismissed demo explanation SHALL automatically appear once at the first eligible normal ready Home entry before visitor interaction. It SHALL NOT interrupt active work, another dialog or a deep-link handoff. Deferred readiness SHALL NOT cause a mid-task popup. Automatic introduction SHALL preserve existing destinations and household/member setup.

#### Scenario: First normal ready entry
- **WHEN** an undismissed visitor reaches ordinary Home with household/member context and routing ready, no pending task or competing dialog, and interaction has not begun
- **THEN** the explanation opens once before interaction and can be dismissed immediately without a tour or task prerequisites

#### Scenario: Protected handoff
- **WHEN** entry carries a recipe, capture/share/import or voting deep-link intent
- **THEN** automatic introduction does not interrupt or replace that destination and is deferred to a later normal visit; voluntary reopening remains available

#### Scenario: Readiness arrives after interaction
- **WHEN** readiness resolves after a visitor has begun a task or while another dialog is active
- **THEN** automatic introduction is withheld rather than queued to interrupt the task, and ordinary app behaviour continues

### Requirement: Remember demo explanation dismissal outside shared state
Start exploring and user-initiated close SHALL store a simple demo-specific browser acknowledgement outside household snapshot/reset state, without a tracking ID or server synchronization. Storage failure SHALL fall back to visit-local memory. Navigation, reset, member/locale switches and cosmetic copy changes SHALL NOT replay an acknowledged introduction. Manual reopening SHALL remain available.

#### Scenario: Dismiss and reset
- **WHEN** the visitor uses Start exploring or explicit close, then returns, switches members or the demo household resets
- **THEN** that browser's acknowledgement prevents automatic reintroduction while the context band can still reopen the explanation

#### Scenario: Browser storage unavailable
- **WHEN** reading or writing persistent browser storage fails
- **THEN** the explanation remains usable and a visit-local presentation/dismissal guard prevents repeated automatic openings during the same app visit
- **AND** no durable cross-reload or cross-device memory is promised

#### Scenario: Cosmetic change or another browser
- **WHEN** wording, styling or locale changes after acknowledgement
- **THEN** it does not automatically reopen the explanation; another browser/device or cleared storage has its own first-visit state

#### Scenario: Mode-specific preference
- **WHEN** the pattern is later reused for beta
- **THEN** demo and beta use distinct acknowledgement keys and truthful mode-specific content; demo acknowledgement does not imply beta dismissal
- **AND** demo on a beta channel uses the demo explanation without automatically stacking a second mode introduction

#### Scenario: Automatic opening is not acknowledgement
- **WHEN** the explanation was automatically presented but routing removes it before the visitor dismisses it
- **THEN** the current visit does not repeatedly open it and no persisted dismissal is manufactured from that unmount

### Requirement: Separate operator baseline authority from visitor experiments
Visitor mode SHALL apply whenever API demo mode is enabled. Baseline capture, replacement and selection SHALL be rejected whenever demo mode is enabled, at acceptance, alternate dispatch/retry and execution boundaries. Preparation/capture SHALL use authenticated private household access with demo mode disabled. Visitor requests SHALL NOT disable demo mode or enable AI preparation. Existing demo identity and ordinary household access SHALL remain available.

#### Scenario: Visitor tries to replace the baseline
- **WHEN** a visitor calls management capture or selection using only demo household access
- **THEN** the request is rejected before modifying the selected baseline or preparation policy

#### Scenario: Alternate baseline dispatch
- **WHEN** a visitor uses generic workflow trigger or task reset to launch or replay baseline capture
- **THEN** the demo-mode capture prohibition is enforced before that work can be accepted or modify the selected baseline; the management-route restriction cannot be bypassed

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
The baseline SHALL declare clearing all calendar events, plans/groceries/extras and voting/cooking history rather than rebasing activity. Reset SHALL pin one current deployment-calendar anchor for its fresh round and regenerate round/history authority. Recipe/member audit timestamps SHALL retain their captured meaning and ordinary soft-delete retention SHALL remain applicable. Old notification timestamps SHALL NOT be replayed. Reset SHALL NOT change the application clock or UTC cron schedule.

#### Scenario: Reset in a later week
- **WHEN** a baseline is reset several weeks after capture
- **THEN** calendar events, meal plans and grocery extras remain empty; aggregate voting history is empty and recipe LastCookedDate is null

#### Scenario: Boundary and retry
- **WHEN** reset crosses a week boundary or is retried after interruption
- **THEN** one pinned anchor governs the complete publication; related records cannot land in different reset weeks

#### Scenario: Rebased state eligibility
- **WHEN** LastCookedDate, CreatedAt/New eligibility, DeletedAt retention or other declared timestamp-sensitive facts affect the restored household
- **THEN** LastCookedDate is cleared and audit timestamps retain their captured meaning without disabling retention or shifting operational expiry/retry timestamps

### Requirement: Provide a coherent synthetic demo household
The public baseline SHALL use deterministic synthetic household identities and authored or approved nonprivate content with coherent recipe, plan, grocery, history and asset references. It SHALL retain ordinary voting, explicit plan saving, grocery extras and cooking semantics. It SHALL NOT present prepared votes, media or extracted content as a visitor's own processing result.

#### Scenario: Playable fresh round
- **WHEN** the prepared household is restored under the accepted fresh-vote policy
- **THEN** exactly one open round has fresh identity, an empty planner/calendar/groceries, available dates and enough eligible recipes for ordinary household voting to converge
- **AND** visitors explicitly create saved meals and non-cooking days; pending matches do not populate the empty planner automatically

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

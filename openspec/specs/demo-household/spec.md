# Demo household Specification

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../household-identity/spec.md) and
[background processing](../background-processing/spec.md). Named requirements
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

An authorized POST /api/management/demo-capture SHALL trigger demo-capture with empty parameters and return 202 containing message Demo capture task enqueued. and taskId identifying the accepted workflow instance. Acceptance SHALL follow background-processing requirement `Persist initial workflow and task identities before returning` and SHALL NOT certify capture completion.

#### Scenario: Capture accepted
- **WHEN** shared household authorization and workflow acceptance succeed for demo-capture
- **THEN** 202 contains the enqueue message and accepted instance identity as taskId

#### Scenario: Capture outside automatic mode
- **WHEN** an authorized caller requests demo-capture with DEMO_MODE disabled and workflow acceptance succeeds
- **THEN** the management action still accepts capture; automatic demo activation is not an action-level prerequisite

### Requirement: Capture the core demo data set

A successful demo capture SHALL write family-members.json, recipes.json and recipe-search-documents.json beneath the resolved data root's demo directory. It SHALL capture all queried members and search documents and active recipe rows visible through ordinary recipe filtering, without exporting votes, weekly plans or calendar events as snapshot data.

#### Scenario: Core snapshot
- **WHEN** capture completes for members, active recipes and search documents
- **THEN** the three JSON artifacts contain those queried core records

#### Scenario: Activity omitted
- **WHEN** capture runs with votes, weekly plans and calendar events present
- **THEN** capture does not export these collections into snapshot artifacts

#### Scenario: Retired recipe fields
- **WHEN** recipe snapshot serialization encounters retired fields isHealthyChoice, dietaryProfile, fopFlags, fopClassification, healthProfile, healthEvent or balanceSummary
- **THEN** those fields are omitted from serialized recipe objects

### Requirement: Copy recipe-root files into the snapshot

A successful capture SHALL replace the demo/recipes directory with recursively copied files from the resolved active recipe root. It SHALL write manifest.json with schemaVersion 1, capture time, member/recipe/search-document counts and the copied recipe-file count.

#### Scenario: Recipe-root files
- **WHEN** capture completes with metadata, originals, hero images or source PDFs present beneath the active recipe root
- **THEN** those files retain relative paths beneath demo/recipes

#### Scenario: Configured roots
- **WHEN** DATA_ROOT or DataRoot and RECIPES_ROOT or RecipesRoot select configured roots
- **THEN** capture uses the resolved data root for demo artifacts and the resolved recipe root for file copying

#### Scenario: Manifest written
- **WHEN** capture reaches successful manifest publication
- **THEN** manifest.json records the capture time and counts after copying

### Requirement: Accept demo snapshot restore as background work

An authorized POST /api/management/demo-restore SHALL trigger demo-restore with empty parameters and return 202 containing message Demo restore task enqueued. and taskId identifying the accepted workflow instance. Accepted work SHALL use background-processing lifecycle requirements rather than imply completed restore.

#### Scenario: Restore accepted
- **WHEN** shared household authorization and workflow acceptance succeed
- **THEN** 202 returns the restore enqueue message and instance identity

#### Scenario: Missing snapshot at acceptance
- **WHEN** demo snapshot files are absent but orchestration accepts demo-restore
- **THEN** the action returns acceptance; snapshot validation occurs during execution

### Requirement: Check core snapshot presence before destructive restore

Demo restore SHALL require manifest.json, family-members.json, recipes.json and recipe-search-documents.json before deleting active database state. Missing required files SHALL fail execution before deletion. Core JSON deserialization SHALL occur before the deletion transaction.

#### Scenario: Required artifact absent
- **WHEN** restore executes with one or more required core snapshot files absent
- **THEN** execution fails with a missing-or-incomplete snapshot error before active data deletion

#### Scenario: Malformed core JSON
- **WHEN** a required core data file cannot be deserialized
- **THEN** execution fails before beginning destructive database replacement

### Requirement: Replace supported core state during successful restore

For a valid compatible snapshot, no concurrent writes and active recipes without soft-deleted-row conflicts, successful restore SHALL replace members, active recipe rows and search documents with captured core records. Database replacement SHALL commit before recipe-file replacement. A database replacement exception SHALL attempt transaction rollback and propagate failure.

#### Scenario: Restore captured records
- **WHEN** supported core replacement and subsequent file copy complete successfully
- **THEN** captured members, recipe facts and search documents are restored and temporary members are absent

#### Scenario: Database replacement fails
- **WHEN** an exception occurs within the replacement transaction
- **THEN** rollback is attempted and execution fails without advancing to recipe-file replacement

### Requirement: Clear transient activity when restoring core state

Without concurrent writes, on successful database replacement demo restore SHALL clear recipe import reports, recipe votes, weekly plans and calendar events rather than restore them from the snapshot. Clearing weekly plans SHALL also remove the grocery state and items stored within those rows.

#### Scenario: Activity cleared
- **WHEN** restore successfully commits after votes, reports, weekly plans and calendar events have accumulated
- **THEN** those collections are empty at that commit, before subsequent concurrent activity

#### Scenario: Grocery state cleared with plans
- **WHEN** weekly plans contain stored grocery state and items when restore commits
- **THEN** the removed plans no longer retain those grocery values

### Requirement: Retain active workflow instances during activity clearing

During successful demo restore, workflow instances whose status is neither Pending nor Processing SHALL be removed with their tasks. Pending and Processing instances SHALL remain eligible under shared background-processing rules; restore SHALL NOT cancel or quiesce that active work.

#### Scenario: Remove nonactive history
- **WHEN** restore processes Completed, Failed or Paused workflow history
- **THEN** those instances and their related tasks are removed when database replacement commits

#### Scenario: Keep active work
- **WHEN** Pending or Processing instances exist during restore
- **THEN** restore does not remove those instances as stale history or cancel their processors

### Requirement: Replace active recipe files after database commit

After core database replacement commits, successful demo restore SHALL replace the active recipe-root files with recursively copied snapshot recipe files at their relative paths. This boundary SHALL NOT promise rollback of committed database state when file replacement fails.

#### Scenario: Files restored
- **WHEN** the snapshot recipe directory exists and post-commit file replacement completes
- **THEN** active recipe files correspond to the copied snapshot files, replacing prior destination files

#### Scenario: File replacement fails
- **WHEN** an I/O exception occurs during post-commit file replacement
- **THEN** execution propagates failure after the database has already committed, without automatic database compensation

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

The demo-restore workflow SHALL place reschedule after the restore task. After successful dependency promotion, reschedule SHALL start another demo-restore using DEMO_RESTORE_CRON_UTC with the daily fallback. Child acceptance and retries SHALL follow background-processing requirements `Start child workflows through shared acceptance` and `Classify automatic retry eligibility at the attempt boundary`.

#### Scenario: Restore dependency succeeds
- **WHEN** restore completes and shared dependency promotion succeeds
- **THEN** reschedule can launch a child restore scheduled at the next configured occurrence

#### Scenario: Restore dependency fails
- **WHEN** restore has not completed successfully
- **THEN** the dependent reschedule remains ineligible through dependency promotion

#### Scenario: Child scheduling fails
- **WHEN** reschedule cannot calculate its cron or accept the child workflow
- **THEN** the task enters shared failure handling without certifying a future restore

### Requirement: Seed packaged demo workflow definitions at startup

Startup SHALL attempt to copy packaged YAML workflow definitions, including demo-capture and demo-restore when present, into the configured workflow root, replacing existing files of the same names. Missing packaged workflow directories or copy errors SHALL be logged without a successful-seeding guarantee.

#### Scenario: Packaged definitions available
- **WHEN** the packaged workflow directory contains demo definitions and copying succeeds
- **THEN** the target workflow root contains those definitions, replacing same-named files

#### Scenario: Definition source unavailable
- **WHEN** neither packaged workflow directory exists
- **THEN** startup definition seeding logs a warning and returns without copying definitions

### Requirement: Execute demo management workflows through their declared tasks

demo-capture SHALL execute its capture task; demo-restore SHALL execute restore followed by dependent reschedule. Successful capture and restore processor results SHALL contain message and member, recipe and search-document counts. Result persistence SHALL follow background-processing requirement `Persist returned processor results without clearing prior results on null`.

#### Scenario: Capture execution result
- **WHEN** the capture task completes successfully
- **THEN** its returned result reports Demo state captured. and the three core record counts

#### Scenario: Restore execution result
- **WHEN** the restore task completes successfully
- **THEN** its returned result reports Demo state restored. and the three core record counts

#### Scenario: Startup seed meaning
- **WHEN** automatic demo seeding accepts a workflow
- **THEN** it schedules restoring the existing snapshot rather than creating sample members or recipes

### Requirement: Read latest management workflow diagnostics

GET /api/management/status SHALL select the newest created instance among db-backup, db-restore, db-disaster-recovery, demo-capture and demo-restore. When found, it SHALL return its identity, workflow type, persisted status and timestamps, plus the newest updated completed-task result with a nonnull stored result, if present.

#### Scenario: Latest management selection
- **WHEN** several selected management workflows exist and status is read successfully
- **THEN** the newest by createdAt is returned even if it differs from the caller's earlier taskId

#### Scenario: Completed task result
- **WHEN** the selected instance has completed tasks with stored results
- **THEN** result is taken from the newest updated such task, which can be reschedule rather than restore

### Requirement: Report snapshot-file and cron diagnostics with management status

A successful management status response SHALL report demoSnapshotReady and demoSnapshotMissing from presence of the four required core files. It SHALL report demoRestoreSeederHealthy from cron validity and demoRestoreSeederErrorCode as INVALID_CRON when invalid or null when valid. These fields SHALL NOT certify asset integrity or successful startup seeding.

#### Scenario: Missing core snapshot
- **WHEN** status finds a management instance but required core files are missing
- **THEN** demoSnapshotReady is false and demoSnapshotMissing lists absent required filenames

#### Scenario: Valid cron with missing snapshot
- **WHEN** cron is valid while required files are absent
- **THEN** demoRestoreSeederHealthy is true and its error code null independently of demoSnapshotReady

#### Scenario: Invalid restore cron
- **WHEN** status finds an instance and cron calculation fails
- **THEN** demoRestoreSeederHealthy is false and its error code is INVALID_CRON

### Requirement: Bypass the five demo workflow processor names

With demo enabled, worker dispatch for ExtractRecipe, GenerateDescription, SynthesizeRecipe, WebAcquisition and CategorizeIngredients SHALL return a Demo Mode Bypass result naming the processor instead of executing its ordinary processor body. Normally persisted task completion SHALL follow shared background-processing rules without certifying produced recipe content.

#### Scenario: Each named processor bypassed
- **WHEN** a demo worker dispatches one of the five named processor tasks
- **THEN** its result identifies Demo Mode Bypass and that processor name without running the ordinary processor body

#### Scenario: Bypass result completes task
- **WHEN** a bypass returns normally and completion persistence succeeds
- **THEN** the task is Completed with a stored bypass result; this alone does not certify acquired content or a ready recipe

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

The Recipes page SHALL retain its ordinary recipe-search input when health reports demoMode true. Its visibility SHALL NOT certify successful semantic embedding, provider isolation or cost-free search.

#### Scenario: Search input available
- **WHEN** the Recipes page renders with established household/member context and demo health presentation
- **THEN** the recipe-search input remains visible

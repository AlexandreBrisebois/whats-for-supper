# Demo household delta

## Purpose

Describe the existing resettable showcase, its access presentation, snapshot effects, scheduling and bounded AI suppression so operators and household visitors can distinguish supported behavior from unqualified guarantees.

Shared rule owners: [household identity](../../../../../specs/household-identity/spec.md) and
[background processing](../../../../../specs/background-processing/spec.md). Named
requirements below refer to those owners without changing their shared policy.

## ADDED Requirements

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

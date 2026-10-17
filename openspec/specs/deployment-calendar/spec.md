# Deployment calendar Specification

## Purpose

Provide authoritative deployment-local supper dates and Monday-based weeks, captured calendar references and expiry boundaries, independently of browser and server operating-system timezones.

## Evidence and qualifications (non-normative)

These requirements were relocated unchanged from the combined meal-planning specification. Applicable [historical qualifications](../meal-planning/spec.md#evidence-and-qualifications-non-normative) and the [durable meal-planning evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/meal-planning.md) transfer with them, including BSL/U/A identifiers, partial-success limits and deferred runtime qualification. Relocation establishes no new API/browser/database/model guarantee.

## Related owners (non-normative)

Cross-capability requirement references resolve to the following authoritative owners:

- [Return seven dates from the deployment calendar week](../meal-planning/spec.md#requirement-return-seven-dates-from-the-deployment-calendar-week)
- [Resolve assignment dates from the server week](../meal-assignment/spec.md#requirement-resolve-assignment-dates-from-the-server-week)
- [Submit dated-source movement through the protected operation](../meal-rescheduling/spec.md#requirement-submit-dated-source-movement-through-the-protected-operation)
- [Defer the exact dated recipe through a protected operation](../meal-rescheduling/spec.md#requirement-defer-the-exact-dated-recipe-through-a-protected-operation)


## Requirements

### Requirement: Resolve supper dates through the deployment calendar

Meal dates and Monday-based weeks SHALL use the configured deployment timezone at the supplied current instant, independently of server OS and browser timezone. An absent setting SHALL use UTC. An invalid explicit setting SHALL prevent startup with configuration guidance. Existing civil dates SHALL retain their literal values; operation timestamps SHALL remain UTC instants.

#### Scenario: Sunday in deployment and Monday elsewhere
- **WHEN** the instant is 2026-10-12T01:30:00Z, the deployment zone is America/Toronto, the server OS uses UTC and the browser uses Asia/Tokyo
- **THEN** today is 2026-10-11 and current week is 2026-10-05 through 2026-10-11

#### Scenario: Unconfigured deployment
- **WHEN** no deployment timezone is configured at that instant
- **THEN** today is 2026-10-12 and current week begins 2026-10-12

#### Scenario: Invalid explicit timezone
- **WHEN** startup receives an unresolvable configured timezone
- **THEN** startup fails with the invalid setting identified instead of serving dates in another zone

#### Scenario: Preserve stored history
- **WHEN** an existing calendar event or UTC cooking timestamp is read after configuring a timezone
- **THEN** its stored civil date or instant is not rewritten

### Requirement: Configure deployment timezone through shipped deployment templates

The shipped Synology environment template SHALL expose Calendar__TimeZone with default UTC and an IANA override example. Its Compose template SHALL pass that setting to the API, using UTC when omitted or empty. Supported repository API deployment templates SHALL carry the same setting. The PWA SHALL consume the API calendar without requiring a separate timezone setting.

#### Scenario: Existing Synology environment omits the new setting
- **WHEN** the Synology Compose template is resolved against an existing environment without Calendar__TimeZone
- **THEN** the API receives UTC without requiring replacement of the existing environment file

#### Scenario: Administrator overrides the deployment timezone
- **WHEN** an administrator sets Calendar__TimeZone=America/Toronto in the Synology project environment and recreates the API container
- **THEN** the API uses America/Toronto for its deployment calendar and the PWA obtains that calendar from the API

#### Scenario: Empty template setting
- **WHEN** Calendar__TimeZone is empty during supported Compose template resolution
- **THEN** the API receives UTC

### Requirement: Document deployment timezone setup and changes

The Synology operator guide and household user guide SHALL explain administrator-owned deployment dates and the UTC default. Operator guidance SHALL name Calendar__TimeZone, show an IANA override, explain API recreation and invalid-value failure, and preserve existing environment values during upgrades. It SHALL distinguish meal dates from UTC timestamps and UTC maintenance schedules.

#### Scenario: First installation follows the operator guide
- **WHEN** an administrator follows the shipped Synology setup instructions
- **THEN** the guide explains where to set Calendar__TimeZone, its UTC default, an America/Toronto example and how to verify the returned calendar zone and dates

#### Scenario: Existing installation changes its timezone
- **WHEN** an administrator follows the upgrade or timezone-change instructions
- **THEN** the guide directs editing the existing environment without replacing secrets, recreating the API container and checking calendar output, and explains that stored dates are not migrated and UTC maintenance schedules remain UTC

#### Scenario: Household member reads date guidance
- **WHEN** a household member reads the user guide's date behavior
- **THEN** it explains that Today and week boundaries follow the deployment timezone even when the member's device uses another timezone

### Requirement: Expose one authoritative calendar context with schedule reads

Successful schedule reads SHALL include the deployment timezone, captured UTC instant, current deployment date, current Monday, requested week's Monday and next deployment-day boundary as a UTC instant. All date context and returned dates SHALL derive from the same captured instant or explicit week reference. The requested week's identity SHALL remain distinct from the current week.

#### Scenario: Read another week
- **WHEN** a read requests offset one while deployment today is 2026-10-11
- **THEN** its current Monday is 2026-10-05, requested Monday is 2026-10-12 and seven entries span October 12 through 18

#### Scenario: Capture crosses midnight during retrieval
- **WHEN** retrieval starts before deployment midnight and finishes after it
- **THEN** its context and week dates remain internally consistent with the captured reference

### Requirement: Keep relative operations anchored to their intended calendar week

Relative schedule reads, suggestions, assignment, movement, defer, voting and locking SHALL accept an optional explicit Monday reference for their offsets. Omission SHALL use the deployment current Monday captured at operation entry. Browser actions SHALL retain their captured reference and target date through dependent requests and follow-ups. Invalid or non-Monday references SHALL return 400 before mutation.

#### Scenario: Assignment finishes across Sunday midnight
- **WHEN** an action captures October 5 as reference Monday and Sunday index six, then its assignment reaches the server after deployment Monday begins
- **THEN** it targets October 11 and leaves October 18 unchanged

#### Scenario: Relative move has two offsets
- **WHEN** a captured action supplies source offset zero and target offset one
- **THEN** both offsets resolve from that same reference Monday

#### Scenario: Invalid reference
- **WHEN** a relative operation supplies an invalid date or a Tuesday reference
- **THEN** it returns 400 without changing a calendar entry or weekly plan

### Requirement: Refresh expired Today context before a new action

A newly initiated Today action SHALL use current authoritative deployment context. At or after its supplied next-day boundary, or after resuming without a reliable clock anchor, the client SHALL refresh context before choosing its date. If context cannot be obtained, the action SHALL remain retryable with visible date-unavailable feedback and SHALL NOT dispatch a guessed-date mutation.

#### Scenario: New action after midnight
- **WHEN** a new Today action begins after the context for October 11 expires
- **THEN** it refreshes context and targets October 12 rather than reusing October 11

#### Scenario: Refresh fails
- **WHEN** a Today action requires context refresh and that read fails
- **THEN** no date-dependent write is dispatched, the choice remains available and failure feedback permits retry

### Requirement: Preserve civil-date arithmetic through daylight saving changes

Calendar-day navigation and labels SHALL operate on civil dates. Advancing a date SHALL advance one date even when the elapsed interval is 23 or 25 hours. Calendar projections for different instants in a repeated hour SHALL identify the same date. Elapsed optimistic guard durations SHALL remain independent of timezone and wall-clock adjustments.

#### Scenario: Spring daylight saving boundary
- **WHEN** Toronto instants 2026-03-08T06:59:59Z and 2026-03-08T07:00:00Z are projected
- **THEN** both resolve to March 8 and the following date is March 9

#### Scenario: Repeated autumn hour
- **WHEN** Toronto instants 2026-11-01T05:30:00Z and 2026-11-01T06:30:00Z are projected
- **THEN** both resolve to November 1 without creating duplicate calendar dates

#### Scenario: Clock adjustment during optimistic guard
- **WHEN** the device wall clock changes while a two-second or twenty-second guard is active
- **THEN** expiry follows the injected elapsed duration instead of that wall-clock change

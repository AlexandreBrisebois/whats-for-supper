# Spec Delta

## Purpose

Describe existing application data export, reconstruction and operational recovery with explicit partial-failure and asynchronous boundaries.

## ADDED Requirements

### Requirement: Replace the active report export even when empty

Export SHALL replace recipe-import-reports.json with current report projections, including reasons, note, status, attribution, timestamps and attempt diagnostics, and SHALL write an empty array when no reports remain.

#### Scenario: Reported content
- **WHEN** active reports include duplicate and content reasons
- **THEN** export retains their reasons and note in the report artifact

#### Scenario: Resolved reports
- **WHEN** reports were removed before a later export
- **THEN** the later report artifact contains an empty array

### Requirement: Restore report dependencies and normalize interrupted work

Restore SHALL skip reports for missing recipes and upsert other reports by recipe ID. Missing member attribution SHALL become null. Reimporting reports SHALL return to Reported with workflow identity, last attempt, reimported time and error cleared.

#### Scenario: Interrupted re-import
- **WHEN** a saved report is Reimporting and its recipe exists
- **THEN** restore yields Reported with prior attempt linkage and diagnostics cleared

#### Scenario: Missing reporter
- **WHEN** a saved report refers to an unavailable reporting member
- **THEN** restore keeps the report with null reportedBy

#### Scenario: Missing recipe
- **WHEN** a report references a recipe absent even when deleted recipes are considered
- **THEN** restore skips that report

### Requirement: Tolerate absent or unreadable report artifacts

Restore SHALL skip a missing report artifact for legacy compatibility and SHALL log and skip report artifact JSON or I/O read failures.

#### Scenario: Legacy export
- **WHEN** recipe-import-reports.json does not exist
- **THEN** restore continues without report import

#### Scenario: Invalid report JSON
- **WHEN** the report file cannot be parsed as the report list
- **THEN** restore logs the failure and continues without importing that list

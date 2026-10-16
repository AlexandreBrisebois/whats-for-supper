# Spec Delta

## Purpose

Adapt the household experience using member language and browsing preferences and member-specific preview resolution, while distinguishing browser choices from persisted member settings.

## ADDED Requirements

### Requirement: Load a member preview snapshot and clear previous choices

On protected-app member selection, the client SHALL clear its preview snapshot and load flags for that selection. With no selected member it SHALL keep an empty snapshot without a request. Window focus SHALL refresh the selected member's snapshot. While absent or loading, a feature with no enabled snapshot entry SHALL resolve disabled.

#### Scenario: Load or refresh a selected member
- **WHEN** a member becomes selected or the protected app receives window focus with a selected member
- **THEN** the previous snapshot clears and the client requests GET /api/feature-flags for the current member context

#### Scenario: Clear member selection
- **WHEN** selection becomes empty
- **THEN** the snapshot clears without a flag request and absent flags resolve disabled

### Requirement: Disclose only available opt-in preview controls

Settings SHALL show a collapsed Preview features section with the count of opt-in flags, omitting it when no opt-in flags and no load error exist. Expanding SHALL expose named switches and descriptions for opt-in flags only, with disclosure state and control association available to assistive technology.

#### Scenario: Opt-in flags are available
- **WHEN** Settings receives opt-in and fixed-mode flags
- **THEN** only opt-in flags contribute to the count and expanded named switches

#### Scenario: No available previews
- **WHEN** no opt-in flags and no snapshot error exist
- **THEN** Settings omits the section

### Requirement: Apply a preview choice only after confirmation

Changing an available preview switch SHALL send PATCH /api/feature-flags/{key} with enabled, retain the confirmed choice until success, disable duplicate pending changes for that flag and show saving feedback. Success SHALL replace that flag with the server response and announce the saved enabled or disabled state.

#### Scenario: Save is pending
- **WHEN** a member requests an available preview change and the request is pending
- **THEN** the confirmed switch value remains, the switch is disabled and saving feedback appears

#### Scenario: Save succeeds
- **WHEN** the server confirms a preview change
- **THEN** the confirmed response replaces the flag, pending state clears and saved enabled or disabled feedback is announced

### Requirement: Recover from preview load and save failures

A failed snapshot load SHALL clear flags and display a load-error alert with Retry in Settings. An ordinary save failure SHALL retain the confirmed choice, release pending state and offer retry feedback for that flag. A 409 save conflict SHALL refresh the snapshot and release the pending flag even if that refresh fails.

#### Scenario: Snapshot load fails and retries
- **WHEN** loading the member snapshot fails
- **THEN** absent flags resolve disabled and Settings displays an alert with Retry that requests another snapshot

#### Scenario: Save rejects
- **WHEN** a preview save rejects without 409
- **THEN** the confirmed choice remains, the switch becomes available again and save-error feedback offers another attempt

#### Scenario: Deployment changes during save
- **WHEN** a save returns 409
- **THEN** the client refreshes flags and clears pending state whether the refresh succeeds or fails

### Requirement: Discard preview results from a previous member selection

After selection changes, preview load and mutation responses or failures from an older member-selection generation SHALL not alter the current member's flags or errors. Switching away and back SHALL not make a prior generation's response current again.

#### Scenario: Previous member save resolves late
- **WHEN** a save for one selection resolves after another member has been loaded
- **THEN** it does not overwrite the current member's flags, pending changes or errors

#### Scenario: Switch away and back
- **WHEN** a member is deselected by switching to another member and later selected again before an old save resolves
- **THEN** that old save response is discarded

### Requirement: Show preview text using available translations and server fallback

Preview controls SHALL use catalog text for known preview names, descriptions and feedback in the active translation-lookup locale, and retain server-provided names and descriptions when the corresponding translation key is unavailable.

#### Scenario: French preview feedback
- **WHEN** translation lookup uses French for a known preview
- **THEN** its name, description, saving/error feedback and saved-state announcements use available French catalog text

#### Scenario: Unknown preview metadata
- **WHEN** an opt-in flag has server-provided metadata but no matching catalog entries
- **THEN** the controls use that server-provided metadata

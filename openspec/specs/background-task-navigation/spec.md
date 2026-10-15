# Background Task Navigation

## Purpose

Keep the primary meal-planning experience available while background operations
run, with progress feedback in the destination context. This capability records
the existing background-task UX policy previously held in the core mission.

## Requirements

### Requirement: Return to the primary context during background work

For background operations such as photo imports, AI synthesis and link fetching,
the UI SHALL prioritize immediate auto-navigation back to the primary context,
usually Home. The destination screen SHALL provide background-task status feedback
rather than blocking the user on a transition screen.

#### Scenario: A background operation continues after navigation

- **WHEN** the user starts a background operation such as a photo import, AI synthesis or link fetch
- **THEN** the UI prioritizes immediate auto-navigation to the primary context while the operation continues
- **AND** the destination screen provides task status feedback, such as a processing indicator in the library or Home feed

## ADDED Requirements

### Requirement: Recover failed Recycle Bin reads
A failed bin read SHALL display an error and Retry instead of empty-bin feedback. Retry SHALL repeat the read with pending feedback; an empty successful result SHALL display the existing empty-bin state.

#### Scenario: Retry an unavailable bin
- **WHEN** a bin read rejects and Retry subsequently returns an empty result
- **THEN** error feedback precedes the retry and empty feedback appears only after success

### Requirement: Explain failed restore and move actions
A failed restore SHALL retain its entry, show visible failure feedback and reenable Restore. A failed move to bin SHALL retain the detail sheet and show visible failure feedback. Successful operations and permanent purge behavior SHALL retain their existing behavior.

#### Scenario: Restore fails then succeeds
- **WHEN** Restore rejects and a subsequent Restore succeeds
- **THEN** the entry remains with feedback after failure and disappears after success

#### Scenario: Move fails
- **WHEN** moving a recipe to bin rejects
- **THEN** the detail remains available with visible failure feedback

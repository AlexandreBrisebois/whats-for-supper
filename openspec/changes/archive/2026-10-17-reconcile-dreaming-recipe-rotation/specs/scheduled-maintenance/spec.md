# Spec Delta

## ADDED Requirements

### Requirement: Schedule recipe rotation reconciliation in Dreaming

The existing Dreaming workflow SHALL include recipe-rotation reconciliation and record its own outcome. Launching child work SHALL not be reported as completed reconciliation. Existing maintenance responsibilities and workflow retry/diagnostic ownership SHALL remain intact.

#### Scenario: Launch versus completion
- **WHEN** Dreaming dispatches reconciliation but the child fails
- **THEN** the parent launch does not establish that recipes were reconciled

#### Scenario: Recover nightly failure
- **WHEN** a nightly pass fails and a later pass succeeds
- **THEN** the later pass uses current dates/configuration and restores eligible recipes then

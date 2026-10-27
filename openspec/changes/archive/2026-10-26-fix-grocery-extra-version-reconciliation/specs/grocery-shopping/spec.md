# Spec Delta

## MODIFIED Requirements

### Requirement: Reconcile extra mutations against absolute week and version

An extra mutation response or household update SHALL affect a loaded row only when occurrence identity and the row's absolute occurrence week match and its version is not older than loaded state. The selected grocery week MAY differ when it is any future week. Missing or conflicting identity SHALL trigger authoritative refresh rather than name-based guessing.

#### Scenario: Navigate during rename
- **WHEN** a rename response arrives after the member navigates to another week
- **THEN** it updates only the matching occurrence if that view is eligible to present it and does not rename a same-name row by inference

#### Scenario: Older household update
- **WHEN** a loaded extra has version five and a household update supplies version four
- **THEN** version five remains displayed

#### Scenario: Uncertain mutation outcome
- **WHEN** a mutation response is lost after the server may have committed it
- **THEN** the client rereads authoritative week state before offering a retry that could repeat the action

#### Scenario: Older checked schedule state reaches a future-week view
- **WHEN** a future-week grocery view holds an unchecked occurrence at version five and an eligible schedule response or snapshot supplies that same occurrence checked at version four
- **THEN** the newer unchecked occurrence remains visible and actionable
- **AND** an accepted equal-or-newer checked occurrence removes it from that future-week projection

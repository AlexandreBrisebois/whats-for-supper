# Spec Delta

## ADDED Requirements

### Requirement: Clearing a failed capture preserves retained recipe corrections

Clearing a failed capture SHALL retain recipe records with persisted ingredient, instruction or canonical content, including explicit saved empty values, and their existing reports and source files. Existing empty-placeholder cleanup and workflow clearing SHALL remain. Clear SHALL NOT certify content, resolve feedback or change readiness.

#### Scenario: Human correction precedes Clear
- **WHEN** a person saves original ingredient or step corrections and then clears the associated failed capture
- **THEN** the workflow can be cleared without deleting the corrected recipe, report or files

#### Scenario: Placeholder has no persisted recipe content
- **WHEN** the existing clear and cleanup guards find an eligible empty placeholder without protected content
- **THEN** existing residue cleanup remains available

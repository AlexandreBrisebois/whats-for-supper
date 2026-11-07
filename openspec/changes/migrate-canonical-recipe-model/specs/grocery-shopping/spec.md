# Spec Delta

## ADDED Requirements

### Requirement: Convert ambiguous legacy check identity once during upgrade

Upgrade SHALL inventory old name-level checks and their target rows while no shopping is in progress. It SHALL record the chosen one-time transition and retain evidence without inventing independent historical row intent. Extra occurrence history SHALL remain unchanged; removed prior-check warning state SHALL not migrate into a new acknowledgement workflow.

#### Scenario: One name controls several rows
- **WHEN** an old true name key corresponds to several future independent rows
- **THEN** the dry run lists that affected set and execution waits for the explicit transition decision; it does not claim each row was individually acknowledged

#### Scenario: One-to-one continuation
- **WHEN** the old key maps provably to one continuing row
- **THEN** the proposed transition preserves its check; ambiguous resets, if approved, occur only once

#### Scenario: No shopping in progress
- **WHEN** migration cutover begins under the confirmed idle-shopping condition
- **THEN** it performs the approved bounded transition without a shopping review dialog or changes to household extras/history

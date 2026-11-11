# Spec Delta

## ADDED Requirements

### Requirement: Start a new recipe-derived list after the idle upgrade

Under the confirmed no-active-list upgrade, the next recipe-derived grocery list SHALL be new with unchecked rows and no inherited legacy name-level checks or demand baselines. Historical list/check data and extra occurrence history SHALL remain preserved. This SHALL NOT authorize deleting history or resetting unrelated household data.

#### Scenario: Old name controlled several historical rows
- **WHEN** retained old name-level checks ambiguously covered multiple rows
- **THEN** history retains its original meaning without invented independent acknowledgements, and no old check is copied into the new list

#### Scenario: New list after update
- **WHEN** the first recipe-derived list is generated after the confirmed idle upgrade
- **THEN** every new recipe row starts unchecked without a check baseline, even if a retained historical name matches

#### Scenario: Preserve extras and household data
- **WHEN** upgrade creates the new recipe-derived list
- **THEN** extra occurrence/history, household relationships and historical list/check records remain; extras follow their existing lifecycle rather than being deleted or reset by recipe-list generation

#### Scenario: Unexpected active list
- **WHEN** upgrade assessment contradicts the confirmed no-active-list condition
- **THEN** it stops and reports the discrepancy before retiring or overwriting that list, without silently clearing checks or deleting data

#### Scenario: Baseline uses conservative shopping identities
- **WHEN** the portions upgrade runs before bilingual catalogue adoption
- **THEN** the new list uses saved demand identities and conservative fallbacks without inventing cross-language equivalence
- **AND** every food/category reference already present remains preserved

# Spec Delta

## MODIFIED Requirements

### Requirement: Order discovery by likes and cooking recency

Queue reads SHALL order by descending like count, then by last-cooked date ascending with never-cooked recipes before dated recipes at the same count. Equal remaining keys SHALL use H descending from weekly-household-interest, then stable recipe identity. Historical signal SHALL not change live like counts or consensus.

#### Scenario: Higher interest

- **WHEN** recipes differ in like count
- **THEN** the higher-count recipe comes first regardless of cooking date

#### Scenario: Equal interest

- **WHEN** equal-count recipes include never-cooked, older-cooked and newer-cooked recipes
- **THEN** they appear in that sequence


## ADDED Requirements

### Requirement: Preserve Discovery candidate meanings during history ranking

Historical ranking SHALL operate only within the existing member-eligible Discovery queue and retain vote-count then cooked-recency priority. History SHALL not restore a member-voted, unavailable or non-discoverable recipe to that queue.

#### Scenario: Current votes dominate
- **WHEN** A has more current likes than B but B has greater H
- **THEN** A remains first

#### Scenario: Historical tie
- **WHEN** A and B share live count and cooked date but B has greater H
- **THEN** B precedes A without changing either displayed vote count

# Spec Delta

## MODIFIED Requirements

### Requirement: Order browse promotion before ordinary rediscovery

Browse SHALL rank promotion-eligible candidates first by affinity descending and saved cooked-event date ascending. Remaining ordering SHALL use never-cooked recipes first, recipe last-cooked date ascending, H descending from weekly-household-interest, creation descending and identity. With no active review filter, its initial bounded candidate window SHALL select the first promotion-eligible report-free candidate as Top Pick, removing it from alternatives.

#### Scenario: Two eligible favorites

- **WHEN** eligible candidates differ in saved affinity
- **THEN** the larger affinity ranks first

#### Scenario: No promotable candidate in initial window

- **WHEN** the initial candidate window has no eligible report-free candidate
- **THEN** Top Pick is absent and ordinary alternatives remain

#### Scenario: Equal ordinary cooking dates

- **WHEN** ordinary candidates share a last-cooked date
- **THEN** H descending, then creation descending and identity break the remaining ties

## ADDED Requirements

### Requirement: Augment standard ranked Search without replacing relevance

Standard ranked Search SHALL retain retrieval, existing score components, planner demotion and explicit cooked-recency ties. After those substantive keys it SHALL apply H descending before creation/identity presentation ties. Similar mode SHALL remain unchanged; H SHALL not create new TopPick or promotion eligibility.

#### Scenario: Unequal relevance scores
- **WHEN** A has higher final existing score but B greater H
- **THEN** A remains ahead of B

#### Scenario: Equivalent intent
- **WHEN** two standard candidates have equal final scores and applicable cooked-recency keys
- **THEN** higher H resolves the tie before creation/identity

#### Scenario: Similar request
- **WHEN** Similar mode retrieves related recipes
- **THEN** historical family interest does not alter its ordering

#### Scenario: Cooled exact match
- **WHEN** a recently cooked non-Discovery recipe matches typed intent and existing filters
- **THEN** it remains findable with its qualifying H; no new cooldown gate applies

#### Scenario: No eligible TopPick
- **WHEN** history exists but the existing Browse promotion or report-free conditions fail
- **THEN** history does not manufacture a TopPick, badge or Surprise Me eligibility

### Requirement: Keep history stable across continuation

Historical ranking SHALL apply before result limits and remain stable throughout a valid continuation chain. A changed historical generation or window SHALL either preserve the chain snapshot or cause an explicit restart; clients SHALL not silently append a newly reordered historical sequence.

#### Scenario: Window turns Monday
- **WHEN** the historical window changes between Browse pages
- **THEN** the chain uses its original historical inputs or requests restart, without silent duplicates or omissions caused by that change

#### Scenario: Revote between pages
- **WHEN** a closed historical week is updated after page one
- **THEN** the old chain is pinned or rejected for restart; existing cards remain until recovery

#### Scenario: Typed continuation
- **WHEN** a typed ranked continuation loads after new history arrives
- **THEN** stored ranked order is preserved and existing eligibility rechecks remain in force

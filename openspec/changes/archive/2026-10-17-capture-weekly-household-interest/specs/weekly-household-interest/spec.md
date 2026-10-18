# Spec Delta

## Purpose

Preserve positive household interest from completed planning rounds independently of mutable live votes, without creating individual preference histories.

## ADDED Requirements

### Requirement: Store positive household recipe-week aggregates

The system SHALL retain positive household totals by canonical planning-week Monday and recipe identity, including selected recipes. It SHALL retain no historical member identity, negative count or individual vote. History SHALL remain until the associated recipe or household is permanently removed; ranking age-out SHALL NOT delete it.

#### Scenario: Selected and overlooked recipes
- **WHEN** a close has recipe A liked by 3 and assigned, B liked by 2 and unassigned, and C with only passes
- **THEN** history records A=3 selected and B=2 unselected for that week; no C positive row or voter identities are recorded

#### Scenario: Interest is not eating
- **WHEN** a recipe has positive history or a selected snapshot
- **THEN** the data does not assert consumption, nutrition, dislike from silence or an individual preference

#### Scenario: History ages out
- **WHEN** a positive record becomes older than the ranking window
- **THEN** the record remains stored but contributes no recent-interest signal

### Requirement: Replace touched revote contributions

A deliberate revote SHALL replace only recipe-week rows touched by votes in that round. It SHALL preserve every untouched row and its selection snapshot. A touched final zero-like result SHALL remove its prior positive row without retaining negative or individual history.

#### Scenario: Replace not add
- **WHEN** A had 5 likes and a revote closes with 2
- **THEN** A stores 2, not 7; its selected flag reflects this closing plan

#### Scenario: Untouched remains unchanged
- **WHEN** B had 4 likes and is not voted on in the revote
- **THEN** B and its prior snapshot fields remain unchanged, even if the current plan changed

#### Scenario: Touched zero
- **WHEN** C had 3 likes but the revote contains only final passes for C
- **THEN** C has no positive row afterward; no negative-history row is created

#### Scenario: Fresh recipe
- **WHEN** D has no prior row and closes with 1 like
- **THEN** D gets one positive row, regardless of whether it was selected

### Requirement: Use canonical week keys and stable snapshots

The system SHALL derive history week identity from the selected plan Monday under the deployment planning calendar. Close time, restore time and revote update time SHALL NOT change that identity. Later plan edits SHALL NOT silently rewrite a closed snapshot.

#### Scenario: Late close
- **WHEN** a week starting October 5 closes on October 14
- **THEN** its history key remains October 5

#### Scenario: Edited later
- **WHEN** an assigned recipe is removed from the plan after close
- **THEN** its existing selected snapshot remains as captured until that recipe is touched by a deliberate revote

#### Scenario: Duplicate meal slots
- **WHEN** one recipe occupies two dates in the same plan
- **THEN** its positive total is stored once for that recipe/week, not multiplied by assignments

### Requirement: Separate active votes from historical evidence

Historical records SHALL NOT populate working member votes, live totals, consensus or match membership. An active reopened week SHALL NOT contribute its previous snapshot to historical ranking until its next close completes.

#### Scenario: Reopen with prior history
- **WHEN** a previously closed week reopens
- **THEN** its history remains durable but is excluded from the active historical signal; live votes remain operational member choices

#### Scenario: Changed household
- **WHEN** a member leaves or tastes change
- **THEN** stored history remains aggregate evidence; no attribution or inferred dislike is reconstructed

### Requirement: Start without invented history

Migration and legacy restore SHALL NOT manufacture recipe-week history from current votes, ratings, cooked dates or selected calendar vote counts. Missing historical data SHALL behave as an empty signal.

#### Scenario: Upgrade existing household
- **WHEN** the database contains years of meal plans but no history dimension
- **THEN** history starts empty and existing live votes remain usable

#### Scenario: Missing old backup sidecar
- **WHEN** a legacy backup is restored into an empty history store
- **THEN** no weekly interest rows are invented

### Requirement: Isolate household data and removal

History reads, exports and restores SHALL remain within the existing household data boundary. Permanent recipe or household removal SHALL remove its associated aggregate history consistently with that removal; soft deletion SHALL make history ineligible without inventing a hard-reset feature.

#### Scenario: Unavailable recipe
- **WHEN** a recipe is soft-deleted or not ready
- **THEN** its historical record cannot make it a suggestion

#### Scenario: Permanent removal
- **WHEN** existing permanent purge removes recipe A
- **THEN** history for A is removed without affecting unrelated recipes

#### Scenario: Privacy
- **WHEN** a history operation is logged or exported
- **THEN** it contains no historical voter identities; logs do not expose family preference payloads
### Requirement: Preserve untouched rows on an empty revote

An intentionally reopened round that closes with no touched recipes SHALL leave every existing recipe-week history row unchanged. It SHALL still complete the new round safely without confusing it with a retry of the prior close.

#### Scenario: Empty deliberate revote
- **WHEN** a closed week reopens and closes again with no votes
- **THEN** all history rows remain unchanged and the new close receipt is distinct from the prior one


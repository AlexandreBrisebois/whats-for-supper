# Spec Delta

## MODIFIED Requirements

### Requirement: Read eligible unvoted recipes

A discovery queue read SHALL include only persistently discoverable, ready, undeleted recipes without a vote by the requesting member. Recipe readiness and deletion remain owned by recipe-library; recipe-rotation owns cooldown reconciliation and rotation reasons. Reads SHALL not recompute cooked cooldown and SHALL exclude recipes selected on the current-week persisted meal plan.

#### Scenario: Member already voted

- **WHEN** an otherwise eligible recipe has a stored vote of either supported kind by this member
- **THEN** it is excluded from that member queue

#### Scenario: Different member voted

- **WHEN** an otherwise eligible recipe has votes only from other members
- **THEN** those votes alone do not exclude it

#### Scenario: Recipe unavailable

- **WHEN** a recipe is not discoverable, not ready or deleted
- **THEN** it is absent from the discovery view

### Requirement: Filter API discovery by category and cuisine

GET /api/discovery SHALL accept optional category and cuisine filters. A category of Supper SHALL use explicit supper suitability under recipe-rotation; other nonempty category values and cuisine SHALL use field equality and both supplied filters SHALL apply together before ordered results are returned under data. Omitting both SHALL allow the broader eligible member queue.

#### Scenario: Combined filters

- **WHEN** category Supper and cuisine Italian are supplied
- **THEN** only eligible unvoted rows supper-suitable and matching Italian cuisine are returned

#### Scenario: No matching cuisine

- **WHEN** a nonempty cuisine has no eligible matching rows
- **THEN** data contains an empty recipe array

#### Scenario: Filters omitted

- **WHEN** neither filter is supplied
- **THEN** the API returns the broader eligible unvoted queue without a Supper-only restriction

## ADDED Requirements

### Requirement: Exclude current-week selected recipes from Discovery

Discovery SHALL exclude matching recipe-backed CalendarEvents in the current deployment-calendar week with status Planned (0), Locked (1) or Cooked (2). This includes manual assignment before voting closes. Uncommitted suggestions, Skipped (3) and AwaitingConsensus (4) SHALL not count as committed selections. This gate SHALL use existing week events, not a new selection-history store, and SHALL not restrict Search/Browse.

#### Scenario: Manual selection before close
- **WHEN** a recipe is assigned to this week's meal plan through Quick Find or Search while voting is still open
- **THEN** it is excluded from current-week Discovery without requiring vote close or a cooked event

#### Scenario: Pending suggestion only
- **WHEN** a recipe is only a displayed pending suggestion and has not been assigned
- **THEN** the suggestion alone does not count as selected for this exclusion

#### Scenario: Future-week plan
- **WHEN** a recipe is assigned only to a future week
- **THEN** that assignment alone does not exclude it from current-week Discovery under the current-week scope

#### Scenario: Remove the selected meal
- **WHEN** the recipe is no longer selected anywhere in the current week
- **THEN** plan membership no longer excludes it; all other eligibility, including effective cooked suppression, still applies

#### Scenario: Plan visibility is not library visibility
- **WHEN** a recipe is excluded from Discovery because it is selected this week
- **THEN** normal Search/Browse and direct recipe detail remain accessible under their existing rules

### Requirement: Refresh Discovery after committed selection changes

The proposed interaction contract SHALL remove a newly selected recipe from Discovery after assignment commits through existing invalidation and refetch, without waiting for Dreaming. Queue reads and category counts SHALL use the same plan-membership guard. Stale responses SHALL not override newer selection state. This SHALL NOT recompute cooked cooldown on reads.

#### Scenario: Card is open during another member's selection
- **WHEN** an assignment commits while another member has that recipe in their Discovery queue
- **THEN** invalidation and refresh remove the card; a subsequent queue read also excludes it

#### Scenario: Assignment fails
- **WHEN** assignment persistence fails before commit
- **THEN** an optimistic selection alone does not permanently remove the recipe from Discovery

#### Scenario: Delayed response
- **WHEN** a pre-assignment queue response arrives after a post-assignment refresh
- **THEN** the stale response cannot restore the selected card

### Requirement: Treat committed manual assignment as locked-in choice

Discovery plan exclusion SHALL not require the week to be closed or an individual status-1 validation request. A committed Planned event SHALL be sufficient. Historical vote rows SHALL remain unchanged by this eligibility check; it SHALL not imply a historical-priority veto on other surfaces.

#### Scenario: Planned before weekly close
- **WHEN** Quick Find or Search commits a Planned (0) recipe event for this week while voting remains open
- **THEN** Discovery excludes that recipe without calling the API-only AwaitingConsensus-to-Locked transition

#### Scenario: Cooked or still awaiting confirmation
- **WHEN** A has a current-week Cooked (2) event and B only an AwaitingConsensus (4) event
- **THEN** A is excluded by committed-plan membership while B is not excluded by that gate alone

#### Scenario: Keep historical evidence
- **WHEN** last week's liked-unselected recipe is committed to this week's plan
- **THEN** it leaves current-week Discovery while its stored history remains; normal Search/Browse do not gain a new historical-boost veto

# Recipe discovery delta

## Purpose

Collect member recipe preferences and expose discovery queues and voting suggestions while keeping suggestions distinct from persisted meal assignments.

## ADDED Requirements

### Requirement: Calculate consensus from all stored members

Consensus eligibility SHALL require at least ceil((familySize + 1) / 2) likes for a recipe, where familySize is the count of stored family members. Passes SHALL NOT contribute to the numerator. One like alone SHALL NOT imply consensus for a multi-member family.

#### Scenario: Two members

- **WHEN** two stored members yield one like
- **THEN** the threshold is two and the recipe is not a consensus candidate

#### Scenario: Four members

- **WHEN** four stored members yield three likes
- **THEN** the threshold is three and the existing undeleted recipe is a consensus candidate

### Requirement: Return consensus candidates as suggestions without assignment

GET /api/schedule/{weekOffset}/smart-defaults SHALL return familySize, consensusThreshold, preSelectedRecipes, openSlots and consensusRecipesCount under data for the requested offset. Reading suggestions SHALL NOT create calendar assignments, change weekly plan status or clear votes.

#### Scenario: Read candidates

- **WHEN** a successful smart-default read finds eligible consensus recipes
- **THEN** the response describes suggestions without persisting those assignments

#### Scenario: No consensus

- **WHEN** no existing undeleted recipe reaches the threshold
- **THEN** preSelectedRecipes is empty and consensusRecipesCount is zero

### Requirement: Place suggestions only in unoccupied week day indices

Smart defaults SHALL place at most seven candidates into unoccupied day indices zero through six, skipping every date with a stored calendar entry in the requested week. Remaining unoccupied indices SHALL be openSlots. consensusRecipesCount SHALL count qualifying candidates even when fewer fit.

#### Scenario: Occupied day

- **WHEN** a stored event occupies day index zero and one candidate fits later
- **THEN** the candidate receives the next available index rather than zero

#### Scenario: Week full

- **WHEN** all seven dates have stored events
- **THEN** preSelectedRecipes and openSlots are empty even if qualifying candidates exist

### Requirement: Distinguish unanimity metadata from persisted locks

Suggestions SHALL rank unanimous candidates before other consensus candidates, then by last-cooked date descending. Each suggestion SHALL carry its recipe display facts, like count, family size, day index and unanimity flag. It SHALL return suggestion isLocked metadata without that metadata establishing a persisted calendar lock.

#### Scenario: Unanimous suggestion

- **WHEN** a candidate has a like from every stored member
- **THEN** unanimousVote is true on its suggestion without a write; suggestion lock metadata does not establish persistence

#### Scenario: Majority suggestion

- **WHEN** a candidate meets consensus without unanimity
- **THEN** its unanimousVote flag is false without establishing a persisted lock

### Requirement: Keep suggestion display and assignment distinct at the discovery handoff

Navigating from Discovery to Planner SHALL NOT itself submit a recipe assignment. Planner suggestion composition SHALL follow meal-planning Compose voting suggestions separately from persisted assignments. Persisting a displayed suggestion SHALL require the planning assignment operation; suggestion metadata alone SHALL NOT establish assignment.

#### Scenario: Leave discovery for planner

- **WHEN** the person activates Go to Planner from Discovery
- **THEN** navigation occurs without a discovery-issued assignment request

#### Scenario: Voting-open composition

- **WHEN** Planner reads suggestions for its voting-open week
- **THEN** eligible suggestions can appear pending under the existing meal-planning requirement without persistence

### Requirement: Reconsider queue eligibility after stored votes are removed

On a later discovery read, a recipe whose requesting-member vote has been removed SHALL no longer be excluded by that vote. It SHALL still satisfy the current queue view and requested filters. This consequence SHALL NOT promise automatic refresh after a planning lock.

#### Scenario: Removed vote

- **WHEN** the requesting member vote was removed and the recipe still satisfies eligibility and filters
- **THEN** a subsequent queue read can include it again

#### Scenario: Recipe remains unavailable

- **WHEN** a removed vote belongs to a now deleted or undiscoverable recipe
- **THEN** removing that vote does not restore queue eligibility

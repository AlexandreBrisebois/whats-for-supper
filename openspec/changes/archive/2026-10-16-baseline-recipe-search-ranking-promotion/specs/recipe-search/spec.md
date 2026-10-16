# Spec Delta

## Purpose

Find existing household recipes through Search, with evidenced retrieval, selection and recovery boundaries.

## ADDED Requirements

### Requirement: Keep browse rediscovery eligibility on the server

Browse promotion eligibility SHALL require positive saved affinity, a saved last-cooked event date at or before the configured rediscovery cutoff, and no calendar guard. The cutoff SHALL use server UTC today and the configured interval. Active Planned, Locked or AwaitingConsensus entries dated today or later, and Cooked entries in the selected server week, SHALL block promotion without removing ordinary result membership.

#### Scenario: No cooked evidence

- **WHEN** a candidate has positive affinity but no saved last-cooked event date
- **THEN** it is not browse-promotion eligible

#### Scenario: Active future calendar entry

- **WHEN** an otherwise eligible candidate has an active future assignment
- **THEN** it remains an ordinary candidate but is not promotion eligible

#### Scenario: Skipped entry only

- **WHEN** an otherwise eligible candidate has only a Skipped entry and no blocking event
- **THEN** that entry does not block browse promotion

### Requirement: Order browse promotion before ordinary rediscovery

Browse SHALL rank promotion-eligible candidates first by affinity descending and saved cooked-event date ascending. Remaining ordering SHALL use never-cooked recipes first, recipe last-cooked date ascending, creation descending and identity. With no active review filter, its initial bounded candidate window SHALL select the first promotion-eligible report-free candidate as Top Pick, removing it from alternatives.

#### Scenario: Two eligible favorites

- **WHEN** eligible candidates differ in saved affinity
- **THEN** the larger affinity ranks first

#### Scenario: No promotable candidate in initial window

- **WHEN** the initial candidate window has no eligible report-free candidate
- **THEN** Top Pick is absent and ordinary alternatives remain

#### Scenario: Equal ordinary cooking dates

- **WHEN** ordinary candidates share a last-cooked date
- **THEN** creation descending then identity break the remaining ties

### Requirement: Apply family signals only to retrieved standard ranked candidates

Standard ranked search SHALL add household rating and stored like-vote modifiers only to retrieved candidates. Love and Like SHALL increase scores, Dislike SHALL decrease them, and the like-count boost SHALL be capped. Like totals SHALL follow recipe-discovery Count likes separately from passes. These signals SHALL NOT establish consensus, suggestion acceptance or assignment.

#### Scenario: Equivalent candidates

- **WHEN** otherwise equivalent standard candidates have Love and no rating
- **THEN** Love increases the rated candidate score

#### Scenario: More likes than cap

- **WHEN** a standard candidate has enough likes to reach the vote cap
- **THEN** further likes do not increase its vote modifier

#### Scenario: Similar mode

- **WHEN** the request is Similar
- **THEN** standard rating and vote modifiers do not apply

### Requirement: Demote ranked candidates already shown in the target week

When both weekOffset and dayIndex are supplied, ranked Search SHALL demote candidates whose identities appear as recipe content in the selected schedule and add an Already planned for this week explanation. It SHALL retain those candidates rather than exclude them. This check SHALL use persisted schedule recipe content; browser-composed voting suggestions alone SHALL not establish that content or a persisted assignment.

#### Scenario: Candidate appears in selected schedule

- **WHEN** ranked Search has both target parameters and a candidate appears in the returned week recipe content
- **THEN** that candidate receives the demotion and explanation while remaining eligible for ordinary results

#### Scenario: Context incomplete

- **WHEN** a ranked request omits weekOffset or dayIndex
- **THEN** this planner demotion does not apply

### Requirement: Select ranked Top Pick separately from browse promotion flags

Ranked Search SHALL order candidates by score descending, creation descending and identity. For standard ranked search with It's Been a While, last-cooked date SHALL replace the creation tie-breaker. Outside review-filter mode, Top Pick SHALL be the first candidate without an active import report and SHALL be omitted from alternatives. Browse-only promotion flags SHALL NOT be required for this ranked Top Pick.

#### Scenario: Highest ranked has a report

- **WHEN** a reported candidate ranks first and an ordinary report-free candidate follows
- **THEN** the report-free candidate is Top Pick and the reported candidate remains an alternative

#### Scenario: All candidates reported

- **WHEN** every ranked candidate has an active report
- **THEN** Top Pick is absent without discarding ordinary results

#### Scenario: Review mode

- **WHEN** a review filter is active
- **THEN** recipe-quality Present review matches as ordinary results applies and no Top Pick is selected

### Requirement: Use server eligibility for local Surprise Me

Surprise Me SHALL choose only a loaded alternative carrying true server promotion eligibility, without import issue status and different from the current Top Pick. It SHALL replace the displayed Top Pick locally, remove the chosen alternative and return the previous Top Pick to alternatives when present. It SHALL NOT request search or persist a meal assignment.

#### Scenario: Eligible alternate exists

- **WHEN** the person activates Surprise Me with eligible loaded alternatives
- **THEN** one eligible alternative becomes the displayed Top Pick without a search or assignment request

#### Scenario: No eligible alternate

- **WHEN** all loaded alternatives are unflagged or have issue status
- **THEN** Surprise Me is disabled with an unavailable explanation and retains the result set

#### Scenario: Obsolete promotion generation

- **WHEN** loaded data belongs to a prior promotion generation
- **THEN** it cannot be used by Surprise Me

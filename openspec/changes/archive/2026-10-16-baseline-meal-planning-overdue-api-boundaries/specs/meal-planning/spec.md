# Spec Delta

## ADDED Requirements

### Requirement: Finalize only overdue planned or locked recipe assignments

When overdue finalization is invoked, it SHALL select recipe-backed calendar entries dated strictly before the server UTC current date with day status Planned or Locked. It SHALL set those entries Cooked. Today's entries, recipe-free dates, Skipped entries and AwaitingConsensus entries SHALL not enter this selection. Weekly plan status SHALL remain unchanged through finalization.

#### Scenario: Past planned recipe exists
- **WHEN** finalization runs with a recipe-backed Planned entry dated before server UTC today
- **THEN** successful persistence marks that entry Cooked

#### Scenario: Date or state is outside the selection
- **WHEN** an entry is dated today or later, lacks a recipe, or is Skipped or AwaitingConsensus
- **THEN** this invocation does not select it for overdue completion

### Requirement: Recalculate cooking consequence before overdue publication

Overdue finalization SHALL save its changed day statuses and recalculate each affected recipe's last-cooked value from the latest Cooked calendar date before committing its persistence work. The derived non-null value SHALL use that date at midnight UTC. This planning consequence SHALL not define the separate cooking-history journey or prove actual cooking occurred.

#### Scenario: Newly completed date is latest
- **WHEN** a finalized date becomes the recipe's latest Cooked calendar date
- **THEN** the derived last-cooked value is that date at midnight UTC after successful persistence

#### Scenario: Later cooked date already exists
- **WHEN** another Cooked calendar entry for that recipe has a later date
- **THEN** recalculation uses the latest Cooked date rather than finalization's current invocation time

### Requirement: Attempt affected-week snapshots after overdue persistence

After overdue persistence completes, finalization SHALL read and attempt a snapshot for each distinct affected Monday using its server-relative offset and no request exclusion identity. It SHALL not recompute groceries through this path. With no matching overdue entries it SHALL return without saves or publications through this invocation. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Multiple overdue entries share a week
- **WHEN** successful finalization changes multiple entries in one week
- **THEN** that week's snapshot is attempted once after persistence, without a request exclusion identity

#### Scenario: Nothing remains overdue
- **WHEN** no entries match the overdue selection
- **THEN** the invocation returns without performing finalization saves or snapshot publication

#### Scenario: Publication fails after completion save
- **WHEN** an affected-week read or publication throws after persistence
- **THEN** the invocation fails without establishing reversal of saved Cooked states or publication of remaining weeks

### Requirement: Expose direct fill-the-gap reads without assigning recipes

Protected GET /api/schedule/fill-the-gap SHALL accept optional weekOffset defaulting to zero and return successful suggestion reads under data as a recipe list. The read SHALL not create calendar assignments or transition weekly plans. Suggestion selection, ranking, eligibility and recipe vote meanings SHALL remain discovery-owned.

#### Scenario: Direct suggestion read completes
- **WHEN** an authorized fill-the-gap read completes for a supported offset
- **THEN** 200 data contains its returned recipe list without persisting any returned recipe onto a planner date

#### Scenario: No suggestions are returned
- **WHEN** selection returns no recipes
- **THEN** the successful response contains an empty list rather than creating a fallback assignment

### Requirement: Expose direct smart-default reads without locking a plan

Protected GET /api/schedule/{weekOffset}/smart-defaults SHALL return successful data identifying the requested offset, family size, consensus threshold, preselected recipe/day metadata, open slots and consensus recipe count. Reading these suggestions SHALL not persist assignments or change week/day status, including when a returned suggestion carries isLocked. Discovery SHALL retain threshold and ranking policy ownership.

#### Scenario: Suggestions are represented as locked
- **WHEN** a successful smart-default read includes a suggestion with isLocked true
- **THEN** that metadata remains a suggestion and does not by itself persist a Locked calendar entry or weekly plan

#### Scenario: Direct read has no preselected recipe
- **WHEN** a successful smart-default read has no preselected recipes
- **THEN** the response still carries its offset and available open-slot/context fields without creating assignments

# Spec Delta

## ADDED Requirements

### Requirement: Localize Planner recipe-row state labels

Planner SHALL render its existing chosen and vote-count recipe-row labels in the selected English or French locale. A row using the chosen label SHALL show “Chosen” in English and “Choisie” in French. Translation SHALL preserve existing badge-selection rules, row actions and pending-suggestion state; a vote label SHALL NOT establish a saved assignment.

#### Scenario: Assigned row without positive votes in French
- **WHEN** French Planner displays an assigned recipe whose displayed vote count is zero or absent
- **THEN** its existing recipe-row badge reads “Choisie” rather than “Chosen”
- **AND** its saved assignment and available actions remain unchanged

#### Scenario: Assigned row without positive votes in English
- **WHEN** English Planner displays an assigned recipe whose displayed vote count is zero or absent
- **THEN** its badge continues to read “Chosen”

#### Scenario: Voting suggestion is still pending
- **WHEN** French Planner displays an unassigned pending suggestion with two votes
- **THEN** its badge reads “2 votes” without the English text “2 voted”
- **AND** the suggestion remains pending and no assignment is submitted by rendering the label

#### Scenario: Saved assignment also has votes
- **WHEN** Planner displays an assigned recipe with a positive displayed vote count
- **THEN** it retains the existing vote-count badge in the selected locale
- **AND** the vote label neither removes its assignment nor implies that every recipe with votes is assigned

#### Scenario: Zero or missing count preserves existing handling
- **WHEN** a displayed recipe row has a zero or absent vote count
- **THEN** the existing chosen-label branch uses the localized chosen text instead of inventing a zero-vote label
- **AND** that text does not change whether the row is pending or assigned

### Requirement: Localize Planner vote-count forms

For positive displayed vote counts, Planner SHALL use localized singular and plural forms with the actual count. French SHALL show “1 vote” for one and “{{count}} votes” for larger counts. English SHALL retain “{{count}} voted” for both forms. These labels SHALL describe vote interest without implying a saved assignment, locked week or cooked meal.

#### Scenario: Singular vote
- **WHEN** the displayed recipe-row vote count is one
- **THEN** French shows “1 vote” and English shows “1 voted”

#### Scenario: Plural votes
- **WHEN** the displayed recipe-row vote count is two or twelve
- **THEN** French shows “2 votes” or “12 votes” respectively
- **AND** English shows “2 voted” or “12 voted” respectively
- **AND** no interpolation token or translation key appears in the badge

#### Scenario: Labels fit the existing row
- **WHEN** Planner displays the localized chosen, singular-vote and plural-vote labels at a narrow phone viewport with enlarged text
- **THEN** the labels remain readable without overlapping recipe content or controls
- **AND** existing touch targets and row actions remain available

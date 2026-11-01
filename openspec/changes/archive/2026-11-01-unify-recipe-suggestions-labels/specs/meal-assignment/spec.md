## ADDED Requirements

### Requirement: Name the in-app recipe suggestion flow consistently

Existing in-app actions that open the Quick Find recipe deck and the deck heading SHALL display “Suggestions” in English and French. This public label SHALL apply to empty-day planning, occupied-day replacement and retained Home Mystery entry points. Quick Find and Quick Replace in existing requirements SHALL continue to identify these flows. Actions that open Search SHALL retain their existing labels and destinations.

#### Scenario: Plan an empty day
- **WHEN** a person opens an empty planner day's options in English or French
- **THEN** the suggestion action is labelled “Suggestions”
- **AND** opening it displays a deck headed “Suggestions” with the selected day and week retained
- **AND** the existing “Plan supper” context and separate localized Search library action remain available

#### Scenario: Find an alternative for an occupied day
- **WHEN** a person opens a recipe-backed planner day's options in English or French
- **THEN** the suggestion action is labelled “Suggestions” within the existing localized change-recipe context
- **AND** opening or dismissing the deck does not replace the meal
- **AND** selecting a replacement follows Enter recovery before replacing an occupied Planner day

#### Scenario: Open suggestions for a saved Mystery night
- **WHEN** a person activates the retained Home Mystery suggestion action in English or French
- **THEN** its label and the opened deck heading are “Suggestions”
- **AND** dismissal preserves the saved Mystery plan under tonight-meal-decisions requirements

#### Scenario: Keep Home Search distinct
- **WHEN** the ordinary unplanned Home pivot offers Search
- **THEN** it retains its existing localized Search label and targeted Search navigation
- **AND** it is not relabelled “Suggestions” or redirected to the suggestion deck

### Requirement: Describe the suggestion limit truthfully in both languages

The planner suggestion action SHALL display “Browse up to 5 recipe suggestions” in English and “Parcourez jusqu’à 5 suggestions de recettes” in French. The supporting text SHALL describe a maximum rather than promise five results. Existing ordering, eligibility, loading, empty, exhaustion, error and Search Library behavior SHALL remain governed by their existing requirements.

#### Scenario: Display localized supporting text
- **WHEN** the planner suggestion action is displayed in English or French
- **THEN** its supporting text matches the exact sentence specified for that language
- **AND** it does not display the former English-only “Swipe through 5 tailored picks”

#### Scenario: Fewer than five eligible recipes
- **WHEN** the suggestion request returns zero, one or fewer than five recipes
- **THEN** the existing deck handles the returned count without fabricating additional suggestions
- **AND** the planner supporting text continues to describe up to five recipes

# Spec Delta

## ADDED Requirements

### Requirement: Merge contextual issue reasons with loaded saved feedback

When opened with a contextual reason, the shared issue form SHALL initialize with the saved issue reasons and note and add that reason only if absent. Context initialization SHALL NOT discard a saved Duplicate reason. Subsequent reason toggling and server manual-only Duplicate policy SHALL retain their existing recipe-quality meanings. Cooking entry, return and acknowledgement SHALL remain cooking-owned.

#### Scenario: Initialize a new contextual report
- **WHEN** the form opens without a saved issue and with Ingredients context
- **THEN** Ingredients is selected and the note starts empty

#### Scenario: Extend saved content feedback
- **WHEN** the form opens with saved Ingredients feedback and a note using Steps context
- **THEN** Ingredients and Steps are selected once each and the saved note remains

#### Scenario: Context overlaps a saved Duplicate reason
- **WHEN** the form opens with saved Duplicate feedback and Steps context
- **THEN** Duplicate and Steps initialize together, and an unchanged submission remains subject to the existing manual-only Duplicate policy

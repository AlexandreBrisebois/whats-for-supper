# Spec Delta

## ADDED Requirements

### Requirement: Extract servings for the selected ingredient basis

Image extraction SHALL request the existing `recipeYield` matching the extracted ingredient quantities. A single explicit serving count SHALL be retained. Multiple labelled serving columns SHALL use the smallest count, keeping every ingredient on that column's basis. Extraction SHALL NOT rescale quantities to a fixed serving count or introduce a second provider-output count field.

#### Scenario: Single four-portion card
- **WHEN** extraction reads the supplied radiatore card with “Portions: 4”, 510 g beef and 340 g pasta
- **THEN** its normalized result has recipeYield “4 portions”, retaining those ingredient quantities

#### Scenario: Columns labelled with serving symbols
- **WHEN** extraction reads the supplied Cook it card with two- and three-utensil column headings
- **THEN** it uses the two-serving column, records a two-serving recipeYield, and retains 360 g chicken and 500 g potatoes rather than the three-serving quantities

#### Scenario: Smaller column is not leftmost
- **WHEN** a card has clearly labelled serving columns of 4 and 2 in that order
- **THEN** extraction selects the column labelled 2, without mixing quantities from the column labelled 4

### Requirement: Resolve an explicit base without treating alternatives as a range

When a card states alternative serving counts and explicitly identifies the ingredient base, extraction SHALL retain that base and its printed quantities. Alternative counts SHALL NOT be interpreted as an interval, added together, or used to scale the extracted ingredients.

#### Scenario: Two or four with doubling note
- **WHEN** extraction reads the supplied zaatar card with “Portions: 2 ou 4” and “Double pour 4 portions” above the ingredients
- **THEN** it records recipeYield “2 portions” with 2 chicken breasts and 225 g Brussels sprouts, without doubling the ingredients

### Requirement: Keep unresolved serving counts unknown

Missing or unreadable serving evidence SHALL produce null recipeYield without inventing a count from food photographs, ingredient amounts, calories, time or household size. Visible unresolved alternatives SHALL remain yield text without claiming a selected count. A missing yield alone SHALL NOT make an otherwise valid recipe semantically incomplete.

#### Scenario: Unresolved alternatives
- **WHEN** a card says “2 or 4” but supplies no identifiable base or labelled ingredient columns
- **THEN** extraction retains the visible ingredients and yield text without claiming a single serving count

#### Scenario: Unreadable symbols
- **WHEN** ingredient headings cannot reliably be read as serving counts
- **THEN** extraction does not infer a count from the number of plates pictured

#### Scenario: Missing optional yield
- **WHEN** otherwise valid extraction has no visible serving-yield evidence
- **THEN** recipeYield is null and the missing yield alone does not fail extraction

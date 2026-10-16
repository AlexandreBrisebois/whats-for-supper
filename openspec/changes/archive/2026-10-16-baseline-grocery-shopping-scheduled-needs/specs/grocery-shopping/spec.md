# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Derive grocery needs from recipe-bearing entries in the selected week

On successful recomputation, grocery needs SHALL include the supplies of recipe-bearing calendar entries within the selected Monday-through-Sunday interval. Repeated assignments SHALL contribute repeated supplies.

#### Scenario: Recipe is scheduled twice
- **WHEN** the same recipe with two eggs is assigned to two dates in the interval
- **THEN** the recomputed count bucket contains four eggs with that recipe listed once as a contributor

#### Scenario: Recipe-free date
- **WHEN** a calendar entry has no recipe association
- **THEN** it contributes no supplies

### Requirement: Prefer usable structured supply over ingredient text

A recipe with at least one named structured supply entry SHALL use its structured entries for grocery derivation. Blank names SHALL be skipped. Ingredient text SHALL be used only when extraction produces no supply entries.

#### Scenario: Structured supply exists
- **WHEN** a recipe supplies named structured flour and also ingredient text
- **THEN** the structured flour contributes without additionally appending the ingredient text

#### Scenario: No named structured entry
- **WHEN** structured supply is absent or empty, or all its names are blank, and ingredient strings exist
- **THEN** each ingredient string contributes a name without an extracted numeric quantity or unit

### Requirement: Read supported structured quantity representations

Structured supply extraction SHALL prefer a numeric quantity and nonblank unitText, falling back independently to requiredQuantity.value and requiredQuantity.unitText when needed. Unreadable numeric quantity values SHALL leave the quantity unknown when no numeric fallback exists.

#### Scenario: Nested quantity
- **WHEN** garlic supply has requiredQuantity value four and unitText piece without top-level values
- **THEN** the line contributes four pieces

#### Scenario: Top-level values
- **WHEN** supply has numeric quantity two and unitText g plus different nested values
- **THEN** two grams contribute

#### Scenario: Unknown amount
- **WHEN** a named supply has a nonnumeric quantity and no numeric fallback
- **THEN** its name remains with unknown quantity

### Requirement: Use ingredient text after invalid JSON syntax

When raw recipe metadata has invalid JSON syntax and stored ingredient strings are available, successful grocery derivation SHALL use those ingredient strings as its fallback.

#### Scenario: Invalid syntax with ingredients
- **WHEN** metadata cannot be parsed as JSON and ingredients include onion
- **THEN** onion contributes through text fallback

#### Scenario: No usable source
- **WHEN** there are no extracted supplies and no ingredient strings
- **THEN** the recipe contributes no grocery needs

### Requirement: Persist the recomputed list for subsequent schedule reads

Successful recomputation SHALL replace the week's persisted grocery lines, including an empty list when no supplies remain. If necessary it SHALL create a Draft weekly plan for that week. A schedule read SHALL return stored grocery adjuncts under the meal-planning owner read requirements.

#### Scenario: Remove only recipe
- **WHEN** the sole contributing recipe assignment is removed and recomputation succeeds
- **THEN** subsequent schedule reading has no grocery lines

#### Scenario: First recomputation
- **WHEN** recomputation succeeds for a week without a weekly plan
- **THEN** a Draft plan stores the derived list

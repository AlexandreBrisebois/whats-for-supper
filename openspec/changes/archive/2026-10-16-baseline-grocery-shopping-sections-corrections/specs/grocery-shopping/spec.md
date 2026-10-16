# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Choose stored category before keyword fallback

Grocery derivation SHALL prefer a category at the current normalized key, then a matching legacy key, before using keyword fallback. In a merged group, a current-key category SHALL outrank a legacy-key category.

#### Scenario: Stored correction
- **WHEN** garlic has a stored Deli category
- **THEN** its grocery section is Deli even though keyword fallback would choose Produce

#### Scenario: Legacy correction
- **WHEN** basil® has a legacy Deli category and basil has no current-key category
- **THEN** the normalized basil line uses Deli without rewriting the category key

### Requirement: Use supported keyword section defaults

When no stored category matches, grocery section fallback SHALL choose the longest matching configured keyword, using the mapper section priority for ties and Grocery when nothing matches.

#### Scenario: Known ingredient
- **WHEN** lettuce has no stored category
- **THEN** its default section is Produce

#### Scenario: No keyword
- **WHEN** a normalized ingredient has no matching keyword
- **THEN** its default section is Grocery

### Requirement: Group returned grocery rows using the configured aisle order

The grocery view SHALL group by returned section using the configured aisle order, without deriving sections from row names. With default configuration it SHALL order Produce, Deli, Bakery, Meat, Seafood, Dairy & Eggs, Frozen, Pantry, Beverages, Grocery. Absent, blank or invalid section-order configuration SHALL use that default.

#### Scenario: Server section
- **WHEN** a garlic row is returned as Deli
- **THEN** the view places it in Deli

#### Scenario: Invalid configuration
- **WHEN** the section-order setting contains an unrecognized section
- **THEN** the default order is used

#### Scenario: Missing row section at defaults
- **WHEN** a row has an absent or unrecognized section under the default order
- **THEN** it is displayed in Grocery

### Requirement: Open and cancel an ingredient section picker

Each grocery row SHALL offer a labeled change-section control opening the choices in the configured aisle order. Activating the same control again SHALL close its picker. Choosing its existing section SHALL close without issuing a category update.

#### Scenario: Open picker
- **WHEN** the member activates Change section for Tomato
- **THEN** section choices are displayed for its normalized key

#### Scenario: No change
- **WHEN** the current section is selected
- **THEN** the picker closes without a category PATCH

### Requirement: Persist a supported category correction before success

A valid category PATCH SHALL save a category override for the supplied normalized key and recompute affected stored weekly grocery lists before returning 204. An absent, blank or unsupported grocerySection SHALL return 400.

#### Scenario: Valid correction
- **WHEN** a valid Produce correction completes its save and affected recomputations
- **THEN** the operation returns 204 and future derived lines use the override

#### Scenario: Invalid correction
- **WHEN** grocerySection is NotARealSection
- **THEN** the operation returns 400 without applying that correction

### Requirement: Update matching loaded grocery rows after correction success

After a successful category response, the grocery view SHALL update rows matching the normalized key to the chosen section only if the loaded offset still equals the initiating offset. Other fields and check-state SHALL remain unchanged, and the picker SHALL close.

#### Scenario: Matching rows
- **WHEN** a correction succeeds in the still-loaded week for a key with several unit buckets
- **THEN** all loaded rows with that key move section without duplication or check-state change

#### Scenario: Navigation during request
- **WHEN** the loaded week offset changes before the correction response
- **THEN** that success does not move rows in the newly loaded week

### Requirement: Bound correction pending and failure feedback to the ingredient

While a correction is pending, that key's picker SHALL expose busy state and disable repeat section selection. A rejected correction SHALL retain its original local section and retryable picker, with an error indicator cleared after three seconds.

#### Scenario: Pending correction
- **WHEN** the PATCH remains unresolved
- **THEN** the picker is busy and its choices are disabled

#### Scenario: Rejected then retry
- **WHEN** the PATCH rejects and a later retry succeeds
- **THEN** the original section remains until the successful response and then changes

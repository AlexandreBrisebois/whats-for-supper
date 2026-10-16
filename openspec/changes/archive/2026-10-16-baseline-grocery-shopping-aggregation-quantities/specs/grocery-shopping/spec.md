# Grocery shopping delta

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## ADDED Requirements

### Requirement: Normalize grocery names through supported mechanical transformations

Grocery names SHALL be lowercased, stripped of decomposed nonspacing accents, trimmed and whitespace-collapsed, with supported apostrophe/dash typography, comma/semicolon/colon separators and registered-mark removal normalized. Empty normalized names SHALL be omitted.

#### Scenario: Accent and whitespace
- **WHEN** a supply name is padded mixed-case Café with repeated whitespace
- **THEN** its normalized key and emitted display name use cafe with collapsed whitespace

#### Scenario: Apostrophe and separator
- **WHEN** supply uses a curly apostrophe in huile d’olive or comma-separated tomato, paste
- **THEN** keys use huile d'olive and tomato paste respectively

### Requirement: Merge supported optional plurals while retaining descriptors

Names SHALL normalize parenthesized optional s/es and the supported pita, tomato, zucchini and garlic-clove forms. Other written plurals and meaningful descriptors SHALL remain part of the key.

#### Scenario: Mechanical plural
- **WHEN** supplies use zucchini(s) and zucchinis with compatible units
- **THEN** both contribute to zucchini

#### Scenario: Protected descriptors
- **WHEN** supplies use salted butter and unsalted butter
- **THEN** they remain separate keys

#### Scenario: No translation identity
- **WHEN** supplies use ground beef and bœuf haché
- **THEN** the names do not merge through translation

### Requirement: Aggregate only matching normalized names and unit buckets

Grocery aggregation SHALL group a normalized name by recognized canonical unit family, with unknown units in separate raw-unit buckets. Different canonical families SHALL remain separate lines.

#### Scenario: Compatible weight
- **WHEN** potato contributes 500 g and 1 kg
- **THEN** one potato line has 1500 g

#### Scenario: Incompatible families
- **WHEN** flour contributes grams and cups
- **THEN** weight and volume remain separate lines

#### Scenario: Unknown unit
- **WHEN** flour contributes a recognized weight and raw unit bag
- **THEN** bag remains a separate bucket

### Requirement: Convert supported quantities and retain unknown amounts

Known units SHALL convert to g for weight, ml for volume and piece for count; null or blank units SHALL use piece. Each group SHALL sum numeric contributions after conversion and use null quantity if none are numeric.

#### Scenario: Culinary volume
- **WHEN** the same name contributes one cup and one tablespoon
- **THEN** the volume bucket totals 255 ml

#### Scenario: Count and unknown amount
- **WHEN** one contribution has quantity two with no unit and another has no quantity with unit piece
- **THEN** the piece bucket totals two

#### Scenario: All amounts unknown
- **WHEN** all contributions to a bucket have unknown amounts
- **THEN** the line has null quantity

### Requirement: Return deterministic grocery lines and contributors

Recomputed grocery lines SHALL emit the normalized name as displayName and normalizedKey, the selected section, aggregate quantity, emitted unit and distinct sorted recipe IDs. Lines SHALL be ordered by normalized key then unit bucket.

#### Scenario: Repeat source ordering
- **WHEN** equivalent supplies are recomputed after source order changes
- **THEN** display, section, unit, contributors and persisted line order remain the same

#### Scenario: Repeated recipe
- **WHEN** one recipe contributes repeatedly to one bucket
- **THEN** its ID appears once in recipeIds while quantities include each contribution

### Requirement: Show an amount hint only with quantity and unit

A displayed grocery row SHALL show a parenthesized amount hint only when quantity is non-null and unitText is nonempty. Noninteger amounts SHALL round to at most three decimal places with trailing zeros removed.

#### Scenario: Amount shown
- **WHEN** a row has quantity 1.23456 and unitText kg
- **THEN** its hint is (1.235 kg)

#### Scenario: Missing amount or unit
- **WHEN** a row lacks quantity or has no unitText
- **THEN** no amount hint is shown

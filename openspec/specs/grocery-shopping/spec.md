# Grocery shopping Specification

## Purpose

Describe existing household grocery derivation and shopping progress, with explicit compatibility and recovery boundaries.

## Planning dependencies (non-normative)

References in preserved requirements to the former combined meal-planning owner resolve through the current capability links below. The referenced behavior and each existing requirement body remain unchanged.

- [Read week status and stored adjuncts without creating a plan](../meal-planning/spec.md#requirement-read-week-status-and-stored-adjuncts-without-creating-a-plan)
- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Complete defer after affected-week follow-ups](../meal-rescheduling/spec.md#requirement-complete-defer-after-affected-week-follow-ups)

## Requirements

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

### Requirement: Use display name as the shared check identity

Grocery rows SHALL read and toggle checks by displayName within the loaded map. Rows sharing that display name SHALL share their checked state even when normalized keys or unit buckets differ. Rendered rows SHALL retain their supplied cardinality.

#### Scenario: Duplicate names
- **WHEN** three rendered Eau rows have different unit buckets and one is checked
- **THEN** all three show checked while three rows remain

#### Scenario: Uncheck duplicate
- **WHEN** one checked Eau row is unchecked
- **THEN** all rows sharing Eau show unchecked without deleting a row

### Requirement: Initialize an empty loaded check map from displayed names

When rows exist and the loaded check map has no keys, the grocery view SHALL initialize their display names as unchecked. A nonempty map SHALL be retained; a missing key SHALL display as unchecked.

#### Scenario: Empty map
- **WHEN** rows first render with an empty check map
- **THEN** their display names initialize to false

#### Scenario: Existing map
- **WHEN** the map contains Tomato true but lacks Lettuce
- **THEN** Tomato stays checked and Lettuce displays unchecked

### Requirement: Submit one optimistic grocery check at a time

A row activation SHALL immediately invert its local display-name check and submit only ingredientName and checked to the initiating week's item PATCH. Successful completion SHALL retain that optimistic check. The checkbox SHALL expose aria-checked and support click, Enter and Space activation.

#### Scenario: Check succeeds
- **WHEN** Tomato is unchecked and its activation request succeeds
- **THEN** Tomato becomes checked and the body contains ingredientName Tomato and checked true

#### Scenario: Uncheck succeeds
- **WHEN** Tomato is checked and its activation request succeeds
- **THEN** Tomato becomes unchecked with checked false

### Requirement: Persist a sequential single-key check update

For an existing weekly plan, a successful sequential item PATCH SHALL store the supplied check value while retaining other values read for that update, and return 204 after its save and publication attempt. Concurrent-update safety is outside this extracted guarantee.

#### Scenario: Set one key
- **WHEN** the stored map has Tomato false and Lettuce true and Tomato is set true without overlapping writes
- **THEN** both keys are true on a subsequent successful read

#### Scenario: Set false
- **WHEN** Tomato is set false in a sequential successful request
- **THEN** Tomato is retained with false

### Requirement: Recover a rejected individual check locally

When an item PATCH rejects, the view SHALL revert that display-name check to the inverse of the attempted value, retain other local keys, and show a per-item error indicator for three seconds. Other rows SHALL remain interactive.

#### Scenario: Failed check
- **WHEN** checking Tomato rejects while Lettuce is checked
- **THEN** Tomato reverts to unchecked, Lettuce stays checked and an error appears for Tomato

#### Scenario: Retry
- **WHEN** the member activates the reverted item again and that request succeeds
- **THEN** the new optimistic state remains after success

### Requirement: Order unchecked rows before checked rows within an aisle

Each displayed aisle SHALL place unchecked rows before checked rows, retaining supplied order within each group. Its count and completion indicator SHALL count rendered rows, including duplicate display names.

#### Scenario: Move down and back
- **WHEN** an unchecked row is checked and then unchecked
- **THEN** it moves after unchecked rows and returns to its source-relative unchecked position

#### Scenario: Duplicate completion
- **WHEN** every row shares one checked display name
- **THEN** the checked count includes every rendered row

### Requirement: Allow aisle collapse without immediately hiding a final checked item

Aisle headers SHALL expose expanded state and toggle only their own item region. Completed aisles SHALL initialize collapsed and re-collapse when the document returns visible. Checking the last item in an expanded aisle SHALL leave it expanded until another collapse trigger.

#### Scenario: Final item
- **WHEN** the last unchecked item in an expanded aisle is checked
- **THEN** completion is shown and the aisle stays expanded

#### Scenario: Return to app
- **WHEN** the document becomes visible with a completed aisle expanded
- **THEN** that completed aisle collapses

#### Scenario: Manual expand
- **WHEN** a collapsed aisle header is activated
- **THEN** its item region opens without changing checks

### Requirement: Present grocery shopping for the selected planner week

The Planner SHALL supply the selected week offset and loaded grocery lines to the grocery view. The narrow layout SHALL open shopping from the grocery tab with a return-to-planner action; the wide layout SHALL show an embedded checklist alongside Planner.

#### Scenario: Narrow shopping
- **WHEN** the grocery tab is selected in the narrow Planner layout
- **THEN** the checklist uses the selected offset and loaded lines

#### Scenario: Wide shopping
- **WHEN** Planner uses the wide layout
- **THEN** the embedded checklist receives the same week offset and loaded lines

### Requirement: Show the grocery empty state for no loaded lines

When no grocery rows are grouped for display, the checklist SHALL show its empty-list planning guidance. Where a close callback exists, Start Planning SHALL return through that callback.

#### Scenario: Empty list
- **WHEN** the grocery view has no loaded lines
- **THEN** empty-list guidance is displayed

#### Scenario: Start planning
- **WHEN** Start Planning is available and activated
- **THEN** the view invokes its return-to-planner callback

### Requirement: Restore available grocery adjuncts during week initialization

On a usable initialization result for the still-selected offset, the grocery view SHALL use returned lines or an empty list and apply an available generated dictionary check map. With no usable check map, it SHALL retain its loaded map. Meal-planning owns request eligibility and calendar interpretation.

#### Scenario: Generated check map
- **WHEN** a successful generated schedule result supplies additional-data checks and grocery lines
- **THEN** initialization replaces loaded checks and lines with those values

#### Scenario: Absent checks
- **WHEN** usable schedule data has no available check-map object
- **THEN** the loaded checks remain while lines use returned values or an empty list

### Requirement: Retain loaded grocery content on failed or superseded initialization

Failed or unusable initialization SHALL retain loaded grocery lines. A response whose requested offset differs from the currently selected offset SHALL not replace those lines. Pending initialization SHALL not itself clear loaded grocery content.

#### Scenario: Read fails
- **WHEN** a new week read rejects while grocery rows are already loaded
- **THEN** those rows remain available after loading ends

#### Scenario: Older offset
- **WHEN** a prior offset response arrives after a different offset is selected
- **THEN** that response does not replace the new week's lines

### Requirement: Refresh persisted needs after supported schedule changes

Successful assignment and removal recomputation SHALL update persisted needs for the affected week. A supported cross-week recipe move SHALL recompute both source and destination weeks. These consequences SHALL preserve unrelated check entries absent a supported merge or rename transition.

#### Scenario: Remove one of two recipes
- **WHEN** one of two distinct contributing recipes is removed and recomputation succeeds
- **THEN** only the remaining recipe contributes grocery needs and unrelated check keys remain

#### Scenario: Cross-week move
- **WHEN** a supported recipe move to another week completes both recomputations
- **THEN** source needs lose and destination needs gain that recipe's supplies while unrelated maps remain

### Requirement: Refresh scheduled recipe and ingredient affected weeks at connected service boundaries

Successful recipe synchronization SHALL recompute distinct weeks containing that recipe. A successful ingredient correction SHALL recompute stored weeks identified as containing that normalized key. No affected week SHALL require a grocery read to trigger this recalculation.

#### Scenario: Scheduled recipe sync
- **WHEN** recipe synchronization saves facts for a recipe assigned in two weeks
- **THEN** recomputation is invoked for each distinct affected week

#### Scenario: Unscheduled recipe sync
- **WHEN** a synchronized recipe has no calendar assignments
- **THEN** no week is recomputed for that recipe

### Requirement: Carry forward supported predecessor checks during mechanical normalization

When compatible previous grocery lines become one normalized line, recomputation SHALL mark it checked only when every matched predecessor was explicitly checked. A single renamed predecessor SHALL retain its prior check value or false if absent; obsolete predecessor display-name keys SHALL be replaced while unrelated keys remain.

#### Scenario: Mixed predecessor checks
- **WHEN** two compatible prior names merge and one check is absent or false
- **THEN** the merged name is unchecked and obsolete predecessor keys are removed

#### Scenario: All checked
- **WHEN** all matched predecessors are explicitly true
- **THEN** the merged normalized name is checked

#### Scenario: Single rename
- **WHEN** one prior display name is renamed mechanically and was checked
- **THEN** the normalized display-name key is true and the old name key is removed

### Requirement: Replace the weekly check map through the full-map API

For an existing weekly plan and supported dictionary body, successful PATCH /api/schedule/{weekOffset}/grocery SHALL replace its stored check map with the supplied string-to-boolean entries, preserving explicit false values and removing omitted prior entries.

#### Scenario: Replace populated map
- **WHEN** a successful request supplies Tomato false and the prior map also had Lettuce true
- **THEN** a subsequent successful read contains Tomato false without Lettuce

#### Scenario: Clear map
- **WHEN** a successful request supplies an empty dictionary
- **THEN** the stored check map is empty

### Requirement: Return the full-map result in the declared success envelope

After full-map persistence and its publication attempt complete, the bulk operation SHALL return 200 with the resulting dictionary under data. This operation SHALL leave the week's persisted grocery line items unchanged.

#### Scenario: Successful response
- **WHEN** a full-map replacement completes
- **THEN** the response is 200 with data equal to the submitted dictionary

#### Scenario: Checks without line mutation
- **WHEN** a full-map replacement completes for a week with existing grocery lines
- **THEN** only its checks change and the grocery lines remain stored

### Requirement: Request category suggestions only for uncached structured names

Ingredient categorization SHALL use distinct normalized structured supply names and request suggestions only for names absent from its category cache. With no uncached names it SHALL make no category-provider request.

#### Scenario: All names cached
- **WHEN** all structured names have category entries
- **THEN** no category-provider call is made

#### Scenario: Partly cached
- **WHEN** tomato is cached but chicken breast and heavy cream are not
- **THEN** one batch asks for chicken breast and heavy cream without tomato

### Requirement: Store valid category suggestions while preserving manual corrections

For supported returned ingredient keys, category processing SHALL persist suggestions with recognized section values in their canonical section spelling, discard blank keys or invalid sections, and retain existing manual corrections.

#### Scenario: Mixed validity
- **WHEN** suggestions include chicken breast in Meat and a name in NotARealSection
- **THEN** the valid category is stored and the invalid section entry is discarded

#### Scenario: Manual category exists
- **WHEN** a returned suggestion targets an existing manually corrected key
- **THEN** the manual correction is retained

#### Scenario: Legacy alias
- **WHEN** a supported suggestion uses section Uncategorized
- **THEN** its stored section is Grocery

### Requirement: Keep category-provider failure from blocking the processor completion path

For a valid recipe task payload, category-provider errors or unusable response JSON SHALL leave those suggestions unapplied and allow the categorization processor to return completion. Missing recipes or absent structured supply SHALL require no provider request.

#### Scenario: Provider failure
- **WHEN** the category provider throws during a valid task
- **THEN** the processor returns completion without saving a suggestion from that response

#### Scenario: Missing recipe
- **WHEN** the valid task names a recipe that is not stored
- **THEN** no category request is made

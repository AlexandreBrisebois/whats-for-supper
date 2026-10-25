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

Recipe-derived grocery rows SHALL read and toggle checks by displayName within the loaded map. Recipe-derived rows sharing that display name SHALL share their checked state even when normalized keys or unit buckets differ. Extra rows SHALL use their stable occurrence identity instead, and all rendered rows SHALL retain their supplied cardinality.

#### Scenario: Duplicate names
- **WHEN** three recipe-derived Eau rows have different unit buckets and one is checked
- **THEN** all three show checked while three rows remain

#### Scenario: Uncheck duplicate
- **WHEN** one checked recipe-derived Eau row is unchecked
- **THEN** all recipe-derived rows sharing Eau show unchecked without deleting a row

#### Scenario: Extra shares the display name
- **WHEN** a recipe-derived Eau row and an extra Eau row coexist and the extra is checked
- **THEN** the recipe-derived Eau check map is unchanged

### Requirement: Initialize an empty loaded check map from displayed names

When recipe-derived rows exist and the loaded check map has no keys, the grocery view SHALL initialize their display names as unchecked. A nonempty map SHALL be retained; a missing recipe-derived key SHALL display as unchecked. Extra checked state SHALL come from each extra occurrence and SHALL NOT be added to the display-name map.

#### Scenario: Empty map
- **WHEN** recipe-derived rows first render with an empty check map
- **THEN** their display names initialize to false

#### Scenario: Existing map
- **WHEN** the map contains Tomato true but lacks Lettuce
- **THEN** Tomato stays checked and Lettuce displays unchecked

#### Scenario: Extra row
- **WHEN** an extra Coffee row renders beside recipe-derived rows
- **THEN** Coffee's occurrence checked state is used without creating a Coffee key in the recipe check map

### Requirement: Submit one optimistic grocery check at a time

A recipe-derived row activation SHALL immediately invert its local display-name check and submit only ingredientName and checked to the initiating week's item PATCH. Successful completion SHALL retain that optimistic check. Recipe-derived checkboxes SHALL expose aria-checked and support click, Enter and Space activation; extras SHALL use their identity-specific check requirement.

#### Scenario: Check succeeds
- **WHEN** recipe-derived Tomato is unchecked and its activation request succeeds
- **THEN** Tomato becomes checked and the body contains ingredientName Tomato and checked true

#### Scenario: Uncheck succeeds
- **WHEN** recipe-derived Tomato is checked and its activation request succeeds
- **THEN** Tomato becomes unchecked with checked false

### Requirement: Persist a sequential single-key check update

For an existing weekly plan on a single-instance deployment, a successful item PATCH SHALL store the supplied check value while retaining other current persisted values, and return 204 after its save and publication attempt. Sequential and overlapping requests SHALL follow the shared check-map processing requirements below.

#### Scenario: Set one key
- **WHEN** the stored map has Tomato false and Lettuce true and Tomato is set true without overlapping writes
- **THEN** both keys are true on a subsequent successful read

#### Scenario: Set false
- **WHEN** Tomato is set false in a sequential successful request
- **THEN** Tomato is retained with false

#### Scenario: Two members check different items
- **WHEN** Tomato and Lettuce begin unchecked and overlapping successful item PATCH requests set each true with no intervening replacement or supported rename
- **THEN** a fresh successful read after both requests contains both keys true

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

When no recipe-derived or extra rows are grouped for display, the checklist SHALL show empty-list guidance and the current-week bottom extra composer. Where a close callback exists, Start Planning SHALL return through that callback. The composer SHALL remain independent of planning guidance.

#### Scenario: Empty list
- **WHEN** the current grocery view has no loaded recipe-derived or extra rows
- **THEN** empty-list guidance and the extra composer are displayed

#### Scenario: Start planning
- **WHEN** Start Planning is available and activated
- **THEN** the view invokes its return-to-planner callback

#### Scenario: Add without planning
- **WHEN** the current week is empty and a member adds an extra successfully
- **THEN** the extra appears without requiring Start Planning or a supper assignment

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

### Requirement: Add a name-only extra to the current grocery week

The grocery view SHALL accept a trimmed nonblank extra name for the deployment-calendar current week. A successful add SHALL return and display one distinct unchecked extra with server-owned identity, `Extra` source label, default section, and current-week editability. It SHALL also announce a brief confirmation naming the server-selected section so the member does not need to find the inserted row. Name SHALL be the only household-entered field.

#### Scenario: Add one extra
- **WHEN** a member adds `Coffee` while the current deployment week is displayed
- **THEN** one unchecked Coffee row marked `Extra` appears in its server-selected section for that week

#### Scenario: Confirm the selected section
- **WHEN** an extra is added successfully outside the member's current scroll position
- **THEN** a temporary success message identifies the section where it was saved within the visible visual viewport, including keyboard panning, without requiring scrolling, navigating, or moving focus away from the composer

#### Scenario: Blank name
- **WHEN** a member submits a name containing only whitespace
- **THEN** no extra is created and the composer remains available with validation guidance

#### Scenario: Add while another week is displayed
- **WHEN** the grocery view displays a past or future week
- **THEN** it does not offer creation for that displayed week

### Requirement: Keep repeated and recipe-matching extras distinct

Each accepted add SHALL create a distinct extra identity. Extras SHALL NOT merge with another extra or a recipe-derived row merely because their names or normalized names match. Each extra SHALL retain independent check, category, edit, and delete behavior.

#### Scenario: Extra matches recipe milk
- **WHEN** the week contains recipe-derived Milk and a member adds an extra named Milk
- **THEN** two rows remain visible and only the manual row carries the `Extra` source label and extra actions

#### Scenario: Add the same extra twice
- **WHEN** a member successfully adds Coffee twice using two distinct submissions
- **THEN** two independently actionable Coffee extras are present

#### Scenario: Retry the same accepted submission
- **WHEN** an add response is lost and the identical creation identity is submitted again
- **THEN** the server returns the already-created extra without creating another occurrence

### Requirement: Enter extras from a persistent bottom composer

The current-week grocery view SHALL keep a compact name composer at the bottom of the shopping surface above navigation and the device safe area, including when no rows exist. Successful submission SHALL clear the field and keep the composer available. The icon-only Add action SHALL retain an accessible name and touch target. Tapping Add SHALL retain textbox focus throughout submission without closing and reopening the mobile keyboard.

#### Scenario: Empty meal plan
- **WHEN** the current week has neither recipe-derived rows nor extras
- **THEN** the empty grocery surface still offers the bottom extra composer without requiring planning first

#### Scenario: Add several items
- **WHEN** a member successfully adds an extra from the composer
- **THEN** the new row appears, the entered name clears, and another name can be entered without reopening a form

#### Scenario: Add is pending
- **WHEN** an add request has not completed
- **THEN** the composer identifies the pending save and prevents replay of that same submission while leaving existing rows usable

#### Scenario: Add fails
- **WHEN** an add request fails without an authoritative created result
- **THEN** the entered name remains available with retryable failure guidance and no saved row is implied

### Requirement: Suggest previously used extra names without replacing free text

While the current-week extra composer is focused and contains at least two non-whitespace characters, the system SHALL offer at most three matching names drawn only from that household's prior extra occurrences. Recipe-derived ingredient names SHALL NOT become autocomplete candidates merely because they appear in a grocery list.

#### Scenario: Two characters match household history
- **WHEN** a member types `mi` and the household previously used Milk, Milk bags, and Almond milk as extras
- **THEN** the composer offers those names in deterministic prefix-then-recency order with no more than three results

#### Scenario: Fewer than two characters
- **WHEN** the trimmed composer value contains fewer than two characters
- **THEN** no autocomplete tray is shown and ordinary name entry remains available

### Requirement: Rank and suppress household extra suggestions deterministically

The suggestion service SHALL group historical names by normalized match key and use each group's most recent occurrence for display spelling and removal state. It SHALL omit removed candidates and names matching a currently outstanding extra, then rank prefix matches before substring matches and more recently used candidates before older candidates.

#### Scenario: Current outstanding name is suppressed
- **WHEN** current-week Milk remains outstanding and the member types a query that matches Milk
- **THEN** Milk is omitted from suggestions without preventing the member from typing and adding another distinct Milk extra manually

#### Scenario: Matching recipe row does not suppress a suggestion
- **WHEN** recipe-derived Milk is present, no Milk extra is currently outstanding, and household extra history contains Milk
- **THEN** Milk may be suggested and selecting it does not merge the eventual extra with the recipe row

#### Scenario: Most recent matching history was removed
- **WHEN** the most recent occurrence for a normalized matching name was explicitly removed
- **THEN** that name is absent from suggestions until a later successful add makes it recent again

### Requirement: Keep free-text add authoritative when suggestions are used or unavailable

Selecting a suggestion SHALL only replace the composer text and SHALL NOT create an occurrence. The member SHALL remain able to submit any nonblank free-text name, including a deliberate duplicate. A failed, cancelled, or stale suggestion lookup SHALL NOT block submission or replace newer input.

#### Scenario: Select a suggestion
- **WHEN** a member selects a suggested name
- **THEN** it replaces the composer text, retains entry focus, and creates no item until the member activates Add or submits the completed composer

#### Scenario: Suggestion lookup fails
- **WHEN** name suggestions cannot be loaded
- **THEN** the tray closes or remains absent, the typed name is preserved, and free-text submission remains available without presenting the add as failed

#### Scenario: Older lookup completes last
- **WHEN** a response for an earlier query arrives after the composer value has changed
- **THEN** that response is ignored and cannot replace suggestions for the current value

### Requirement: Present bottom-composer suggestions accessibly above the field

The suggestion tray SHALL attach to the current-week bottom composer and grow upward within the visible viewport so neither the input nor primary Add action is covered by the tray or on-screen keyboard. The tray SHALL use compact text rows rather than pills, horizontal chips, or a full-screen sheet. The input and tray SHALL expose the standard combobox/listbox relationship, result count, active option, and expanded state to assistive technology.

#### Scenario: Phone keyboard is open
- **WHEN** matching suggestions appear while the on-screen keyboard is visible
- **THEN** at most three suggestion rows appear immediately above the composer while the input and Add action remain visible and reachable

#### Scenario: Touch selection
- **WHEN** a member taps a suggestion with one hand
- **THEN** the suggestion fills the composer without moving focus away from the entry workflow or submitting it

#### Scenario: Keyboard selection
- **WHEN** a keyboard user moves through suggestions and presses Enter on an active option
- **THEN** that option fills the composer, a subsequent submit adds it, and pressing Enter with no active option submits the current free text

#### Scenario: Mobile keyboard commits completed text
- **WHEN** an on-screen keyboard autocomplete replaces or completes the focused composer value
- **THEN** the resulting current value drives the same debounced household-history lookup as directly typed text

#### Scenario: Dismiss suggestions
- **WHEN** the member presses Escape, clears the text below the threshold, submits successfully, or leaves the composer
- **THEN** the suggestion tray closes without discarding unsaved text except after successful submission

### Requirement: Carry each outstanding extra through weekly snapshots

An unchecked extra SHALL occur in its creation week and in every later elapsed week through the deployment-calendar current week. Carry-forward SHALL preserve one read-only occurrence in each prior week and one editable occurrence in the current week, without manual transfer or early creation of an occurrence in an unelapsed future week.

#### Scenario: One rollover remains unchecked
- **WHEN** Coffee is added in week one, remains unchecked, and the deployment calendar reaches week two
- **THEN** week one retains its unchecked read-only Coffee snapshot and week two contains one editable unchecked Coffee occurrence

#### Scenario: Several rollovers are reconciled
- **WHEN** an unchecked extra was last materialized several Mondays before the current week
- **THEN** each elapsed intervening week has exactly one snapshot in that lineage and the current week has exactly one editable occurrence

#### Scenario: Browse any future week
- **WHEN** a member browses any future week before rollover
- **THEN** no next-week occurrence is created merely to present the current outstanding extra for shopping

#### Scenario: Browse farther ahead
- **WHEN** a member browses two or more weeks ahead
- **THEN** outstanding current extras remain visible and actionable until checked or deleted, without materializing future occurrences

#### Scenario: Meal plan changes
- **WHEN** meals are added, replaced, moved, removed, regenerated, or re-imported
- **THEN** extra occurrences and their history remain unchanged by recipe grocery recomputation

### Requirement: Stop carry-forward after current completion or deletion

Checking a current extra SHALL retain it as checked in that week and prevent a later occurrence while it remains checked. Deleting a current extra SHALL remove that occurrence from every shopping view presenting it and prevent later carry-forward. Neither action SHALL rewrite earlier-week snapshots.

#### Scenario: Checked before rollover
- **WHEN** Coffee is checked in the current week before the next Monday
- **THEN** it remains checked in that week and no Coffee successor is carried into the new current week

#### Scenario: Check then uncheck before rollover
- **WHEN** a current extra is checked and then unchecked before rollover
- **THEN** its current occurrence is unchecked and remains eligible for the next carry-forward

#### Scenario: Delete a carried occurrence
- **WHEN** a current occurrence carried from an earlier week is deleted
- **THEN** it disappears from the current week, no later occurrence is created, and its earlier snapshots remain visible

### Requirement: Include current outstanding extras when shopping any future week

Before rollover, the grocery view for any future week SHALL show its recipe-derived rows together with visible unchecked current-week extras. Those extras SHALL retain their current occurrence identity and ordinary `Extra` source label without an added week label. Checked or removed current extras and extras from any other week SHALL be absent.

#### Scenario: Shop next week's suppers on Saturday
- **WHEN** a member opens the grocery view for any future week while current-week Toilet paper remains unchecked
- **THEN** next week's supper groceries and the editable Toilet paper extra appear together without creating a next-week Toilet paper occurrence

#### Scenario: Check while viewing next week
- **WHEN** the member checks that Toilet paper extra before rollover
- **THEN** the current-week occurrence becomes checked, disappears from the next-week shopping view, remains checked in current-week history, and does not carry forward

#### Scenario: Current extra is edited from next-week view
- **WHEN** a current extra is renamed, recategorized, or deleted while any future week is displayed
- **THEN** the action targets the current occurrence and preserves all earlier snapshots

#### Scenario: No additional week label
- **WHEN** a current outstanding extra is presented with future-week groceries
- **THEN** it uses the ordinary compact `Extra` source label without `This week` or another week-origin label

### Requirement: Identify extras with a compact text source label

Every visible extra SHALL show the word `Extra` as compact, non-interactive accent-colored text adjacent to its item name. The source label SHALL use the existing Solar Earth ochre highlight family with sufficient contrast on the actual grocery-row surface. It SHALL NOT add a pill background, border, icon, icon-only substitute, hover treatment, or week-origin wording. The visible word SHALL carry the meaning so color is not the sole identifier.

#### Scenario: Extra appears in a compact grocery row
- **WHEN** an extra row is shown in a current, future-week, or historical grocery view
- **THEN** `Extra` appears as compact accent-colored text beside the item name without adding a pill or action-like control

#### Scenario: Item name needs more room
- **WHEN** the item name and source label do not fit on one line
- **THEN** the source label may wrap with the name without reducing the tag or edit controls below their supported touch targets

#### Scenario: Checked or historical extra
- **WHEN** an extra is checked or displayed as read-only history
- **THEN** its text source label remains legible and continues to identify the row as an extra

### Requirement: Make historical extra occurrences read-only

An extra occurrence for a week earlier than the deployment-calendar current week SHALL expose its snapshotted name, category, and checked state as shopping history, without controls that check, uncheck, rename, recategorize, or delete it. Recipe-derived rows in past weeks SHALL retain their existing interaction behavior.

#### Scenario: View an earlier extra
- **WHEN** a member opens a past week containing an extra snapshot
- **THEN** the row is visible as an extra without checkbox, tag-change, edit, or delete actions

#### Scenario: Recall whether an item was bought
- **WHEN** a member opens last week's grocery view to check whether Toilet paper was purchased
- **THEN** its historical extra row visibly retains the checked or unchecked state recorded for that week

#### Scenario: Past recipe grocery remains interactive
- **WHEN** that past week also contains a recipe-derived grocery row
- **THEN** the recipe-derived row retains the previously supported grocery interactions

### Requirement: Check an extra by stable identity

Activating an editable extra checkbox SHALL optimistically invert only that occurrence and submit its identity, intended checked value, week identity, and concurrency version. Success SHALL retain the state; a rejection SHALL restore the authoritative state and show a retryable item error.

#### Scenario: Check one duplicate
- **WHEN** two current extras share the name Coffee and one is checked successfully
- **THEN** only the selected extra becomes checked

#### Scenario: Check request rejects
- **WHEN** a current extra is optimistically checked and the request rejects
- **THEN** that row returns to its authoritative state with retry guidance while unrelated rows remain usable

#### Scenario: Stale version
- **WHEN** an extra was changed by another household member before a check using an older version arrives
- **THEN** the stale mutation is not applied and the caller receives authoritative current state for reconciliation

### Requirement: Rename the current extra inline

Activating an editable extra's edit icon SHALL replace that row's name display with an inline name editor and accessible icon-only Save and Delete actions, without a Cancel action. A successful nonblank rename SHALL preserve that occurrence's identity, category, and checked state and SHALL affect only that week and later carry-forward.

#### Scenario: Rename current occurrence
- **WHEN** a member renames current-week Milk to Oat milk and saves
- **THEN** that row keeps its identity, category, and checked state while displaying Oat milk

#### Scenario: Earlier snapshot retains its name
- **WHEN** a carried Milk occurrence is renamed Oat milk in the current week
- **THEN** earlier weeks continue to display Milk and a later successor inherits Oat milk

#### Scenario: Rename fails
- **WHEN** an inline rename is rejected
- **THEN** the authoritative name remains available in the row with retryable guidance and no saved rename is implied

### Requirement: Recategorize only the selected extra occurrence

The existing tag interaction SHALL let a member change an editable extra's section by stable identity. A successful change SHALL preserve its name and check state, affect later carry-forward, and leave matching extras, recipe-derived rows, global ingredient-category rules, and earlier snapshots unchanged.

#### Scenario: Change an extra category
- **WHEN** a member moves an extra named Batteries from Grocery to Pantry through its tag control
- **THEN** only that extra occurrence moves section and a later successor inherits Pantry

#### Scenario: Matching recipe row
- **WHEN** a recipe-derived Milk row and an extra Milk row coexist and the extra is recategorized
- **THEN** the recipe-derived Milk category and ingredient-category rule remain unchanged

#### Scenario: Category save fails
- **WHEN** an extra category change rejects
- **THEN** the extra retains its authoritative section with retryable per-item feedback

### Requirement: Delete the current extra optimistically

Activating Delete in an editable extra's inline controls SHALL immediately remove that row from the displayed shopping view and submit deletion of its current occurrence by stable identity, occurrence week, and version. A failed or stale deletion SHALL restore authoritative state with retryable feedback; a successful deletion SHALL not imply removal from historical weeks.

#### Scenario: Delete succeeds
- **WHEN** a member deletes a mistaken current extra and the request succeeds
- **THEN** the row remains absent from the current week and does not carry forward

#### Scenario: Delete fails
- **WHEN** an optimistically removed extra cannot be deleted
- **THEN** the authoritative row returns to its section with clear retryable failure feedback

#### Scenario: Delete after another update
- **WHEN** deletion uses a stale version after another member changed the extra
- **THEN** the newer authoritative row is restored rather than silently deleting that update

### Requirement: Return extras with the selected weekly grocery view

A successful grocery-bearing schedule read SHALL return recipe-derived lines for the requested absolute week and the extra occurrences eligible for that shopping view. Extra rows SHALL identify their own absolute occurrence week, source, stable occurrence, checked state, concurrency version, and whether current-week mutation is allowed.

#### Scenario: Mixed grocery list
- **WHEN** a requested week contains recipe-derived tomatoes and two extras
- **THEN** the response preserves all three rows with enough identity to check each supported row correctly

#### Scenario: Historical extra
- **WHEN** a requested past week contains an extra snapshot
- **THEN** its returned representation marks it as read-only

#### Scenario: Future-week shopping extras
- **WHEN** the requested week is any future week
- **THEN** its response includes visible unchecked current-week extras with their current occurrence week and editable state

#### Scenario: No recipe groceries
- **WHEN** a week contains extras but no recipe-derived lines
- **THEN** the grocery view shows the extras rather than the no-items planning-only state

### Requirement: Reconcile extra mutations against absolute week and version

An extra mutation response or household update SHALL affect a loaded row only when occurrence identity and the row's absolute occurrence week match and its version is not older than loaded state. The selected grocery week MAY differ when it is any future week. Missing or conflicting identity SHALL trigger authoritative refresh rather than name-based guessing.

#### Scenario: Navigate during rename
- **WHEN** a rename response arrives after the member navigates to another week
- **THEN** it updates only the matching occurrence if that view is eligible to present it and does not rename a same-name row by inference

#### Scenario: Older household update
- **WHEN** a loaded extra has version five and a household update supplies version four
- **THEN** version five remains displayed

#### Scenario: Uncertain mutation outcome
- **WHEN** a mutation response is lost after the server may have committed it
- **THEN** the client rereads authoritative week state before offering a retry that could repeat the action

### Requirement: Keep extra controls accessible and interruption-safe

The composer combobox, suggestion options, checkbox, tag button, edit icon, inline editor, save and delete controls SHALL have accessible names, keyboard operation, visible focus, and stable touch targets where they are interactive. Pending and error state SHALL not move the primary controls or rely on color alone.

#### Scenario: Keyboard add and edit
- **WHEN** a keyboard user enters a name, adds it, opens inline edit, renames it, and saves
- **THEN** each action is reachable in a logical focus order with its purpose and state announced

#### Scenario: Return after interruption
- **WHEN** the document becomes visible after an add or edit was left pending
- **THEN** the visible row or composer still communicates whether the action is pending, saved, or failed and exposes the appropriate next action

### Requirement: Process normal check-map writes against current persisted state

On one application instance, item updates, full-map replacements and recomputation transitions for a weekly recipe-derived check map SHALL take effect in one server processing order. Each operation SHALL use the persisted map resulting from its predecessors. Processing order SHALL NOT imply user-click order or FIFO request arrival.

#### Scenario: Conflicting values for one item
- **WHEN** overlapping requests set Tomato true and false and the false request is processed last
- **THEN** a fresh read contains Tomato false and unrelated keys retain their values

#### Scenario: Repeat intended state
- **WHEN** two successful item requests both set Tomato true
- **THEN** Tomato remains true rather than being inverted twice

#### Scenario: Stale whole-map replacement remains replacement
- **WHEN** an item update saves Lettuce true and a later-processed full-map request supplies only Tomato false
- **THEN** the stored map contains only Tomato false, even if the replacement body was prepared before the item update

#### Scenario: Item update follows replacement
- **WHEN** a full-map replacement supplying Tomato false is processed before an item update setting Lettuce true
- **THEN** a fresh read contains Tomato false and Lettuce true

#### Scenario: Clear and later check
- **WHEN** an empty full-map replacement is processed before an item request setting Lettuce true
- **THEN** the resulting map contains Lettuce true and no keys retained solely from before the clear

### Requirement: Preserve current checks during overlapping recomputation

Successful recomputation overlapping a recipe-derived check mutation SHALL preserve unrelated persisted check entries. Supported predecessor merge and rename transitions SHALL use the check state current at recomputation's processing position, without changing the existing mechanical-normalization rules.

#### Scenario: Check and unchanged-name recomputation
- **WHEN** Tomato is checked while a recomputation retains its display name and neither operation intentionally replaces that key
- **THEN** after both succeed a fresh read contains Tomato true and the recomputed grocery lines

#### Scenario: Earlier request state is stale
- **WHEN** a recomputation request previously observed Tomato false and another request commits Tomato true before recomputation processes its check-map transition
- **THEN** recomputation uses Tomato true rather than restoring its earlier observed false

#### Scenario: Supported predecessor merge
- **WHEN** a check request commits one predecessor as true before two compatible predecessors merge and the other predecessor remains false
- **THEN** the merged name is false under the existing all-predecessors-checked rule, obsolete predecessor keys are removed and unrelated checks remain

### Requirement: Acknowledge check mutations only after persistence

A check mutation SHALL NOT report success merely because in-memory work was accepted. A failed or canceled operation before commit SHALL NOT acknowledge a saved check or prevent subsequent requests from proceeding. A committed write SHALL remain recoverable by a fresh read even if its acknowledgement or publication fails; no all-or-nothing save and delivery guarantee is implied.

#### Scenario: Waiting request is canceled
- **WHEN** a request is canceled before processing its mutation
- **THEN** it does not change the stored map or return success and a later request can complete

#### Scenario: Save fails before commit
- **WHEN** the mutation's database save fails before commit
- **THEN** no saved success is returned, the previously committed map remains readable and a subsequent valid request can proceed

#### Scenario: Process stops before commit
- **WHEN** the single instance stops with an uncommitted check request pending
- **THEN** restart does not imply that request was saved and a fresh read exposes only committed state

#### Scenario: Commit succeeds but acknowledgement is lost
- **WHEN** the database commits a check and the process stops or the response fails before the caller receives success
- **THEN** a fresh read after recovery contains the committed check unless a later successful operation changed it

#### Scenario: Publication fails after commit
- **WHEN** a check is committed but its notification attempt fails
- **THEN** the committed map remains readable and subsequent check mutations are not blocked indefinitely by the failed operation

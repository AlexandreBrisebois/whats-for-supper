# Spec Delta

## MODIFIED Requirements

### Requirement: Derive grocery needs from recipe-bearing entries in the selected week

On successful recomputation, grocery needs SHALL include the canonical current ingredients of recipe-bearing calendar entries within the selected Monday-through-Sunday interval. Each occurrence SHALL apply supper-servings scaling for its own date before aggregation. Repeated assignments SHALL contribute separately; contexts without an effective positive serving count SHALL retain original quantities.

#### Scenario: Recipe is scheduled twice
- **WHEN** the same recipe with two eggs is assigned to two dates in the interval without an effective positive serving count
- **THEN** the recomputed count bucket contains four eggs with that recipe listed once as a contributor

#### Scenario: Recipe-free date
- **WHEN** a calendar entry has no recipe association
- **THEN** it contributes no supplies

### Requirement: Prefer usable structured supply over ingredient text

Grocery derivation SHALL use each canonical current ingredient once, with its saved amount and description or original-text fallback with honest quantity completeness. Retained metadata SHALL NOT supply a competing live list. Legacy structured/text precedence SHALL apply only at ingestion or conversion boundaries. Incomplete contributions SHALL retain the established subtotal, source and prior-check behavior without claiming complete scaled quantities.

#### Scenario: Structured supply exists
- **WHEN** a canonical flour line has coherent trusted structured facts and original ingredient text
- **THEN** the canonical flour contributes once without additionally appending its ingredient text

#### Scenario: No named structured entry
- **WHEN** a legacy input has absent, empty or blank-name supply and ingredient strings exist
- **THEN** ingestion or conversion retains each string as a canonical text line with unknown numeric facts, and grocery derivation reads those lines without parsing quantities

#### Scenario: Metadata disagrees after canonical cutover
- **WHEN** retained metadata supply differs from a current canonical correction
- **THEN** groceries use the current canonical facts and do not merge in or prefer the retained metadata supply


### Requirement: Read supported structured quantity representations

Legacy ingestion and deterministic conversion SHALL prefer a numeric quantity and nonblank unitText, falling back independently to requiredQuantity.value and requiredQuantity.unitText when needed. Unreadable numeric quantity values SHALL leave the quantity unknown when no numeric fallback exists. After conversion, groceries SHALL read trusted finite nonnegative canonical amounts directly; zero and unitless counts SHALL remain valid. Grocery display SHALL preserve trusted known amounts without inventing units under the [dependable grocery display amendment](../../../restore-dependable-grocery-interactions/specs/grocery-shopping/spec.md); a missing unit SHALL NOT hide a trusted amount or change derivation, grouping or checks.

#### Scenario: Nested quantity
- **WHEN** legacy garlic supply has requiredQuantity value four and unitText piece without top-level values
- **THEN** the line contributes four pieces

#### Scenario: Top-level values
- **WHEN** legacy supply has numeric quantity two and unitText g plus different nested values
- **THEN** two grams contribute

#### Scenario: Unknown amount
- **WHEN** a named legacy supply has a nonnumeric quantity and no numeric fallback
- **THEN** its description remains with unknown quantity

#### Scenario: Zero or unitless canonical amount
- **WHEN** a canonical line has a trusted zero amount or a trusted count without a display unit
- **THEN** derivation retains that amount without inventing a unit or treating zero as missing, and display shows the trusted amount with no unit suffix under the grocery display rule; missing amounts remain hidden


### Requirement: Use ingredient text after invalid JSON syntax

Legacy ingestion or conversion SHALL retain stored ingredient strings as canonical unknown-amount lines when raw metadata has invalid JSON syntax. Once canonical current lines exist, grocery derivation SHALL use them independently of retained metadata syntax; malformed evidence SHALL NOT erase trusted current facts.

#### Scenario: Invalid syntax with ingredients
- **WHEN** legacy metadata cannot be parsed as JSON and ingredients include onion
- **THEN** onion is retained as a canonical text fallback and contributes without an invented numeric amount

#### Scenario: No usable source
- **WHEN** there are no canonical lines and legacy conversion has no usable supplies or ingredient strings
- **THEN** the recipe contributes no grocery needs

### Requirement: Request category suggestions only for uncached structured names

Ingredient categorization SHALL use distinct normalized names derived by the saved shopping identities and conservative fallback names and request suggestions only for names absent from its category cache. With no uncached names it SHALL make no category-provider request.

#### Scenario: All names cached
- **WHEN** all usable canonical ingredient names have category entries
- **THEN** no category-provider call is made

#### Scenario: Partly cached
- **WHEN** tomato is cached but chicken breast and heavy cream are not
- **THEN** one batch asks for chicken breast and heavy cream without tomato

#### Scenario: Retained supply has an obsolete name
- **WHEN** a human changes the canonical ingredient description while retained extraction still has its prior name
- **THEN** categorization uses the saved current shopping name/identity rather than independently reading obsolete supply


### Requirement: Keep category-provider failure from blocking the processor completion path

For a valid recipe task payload, category-provider errors or unusable response JSON SHALL leave those suggestions unapplied and allow the categorization processor to return completion. Missing recipes or no usable canonical ingredient names SHALL require no provider request.

#### Scenario: Provider failure
- **WHEN** the category provider throws during a valid task
- **THEN** the processor returns completion without saving a suggestion from that response

#### Scenario: Missing recipe
- **WHEN** the valid task names a recipe that is not stored
- **THEN** no category request is made

### Requirement: Normalize grocery names through supported mechanical transformations

Grocery identity SHALL use saved validated food associations or conservative source-name fallback keys. Display labels SHALL preserve validated language spelling independently of grouping keys. Mechanical normalization SHALL NOT establish semantic equivalence or erase purchase qualifiers.

#### Scenario: Accent and whitespace
- **WHEN** a saved validated label contains Café and repeated whitespace
- **THEN** deterministic matching may normalize allowed whitespace but display preserves validated spelling and accents

#### Scenario: Apostrophe and separator
- **WHEN** a saved source name includes huile d’olive or tomato, paste
- **THEN** approved typography normalization does not by itself prove equivalent food identity

### Requirement: Merge supported optional plurals while retaining descriptors

Only approved exact aliases and validated same-food mappings SHALL merge language/preparation variants. Broader or ambiguous concepts SHALL remain separate. Purchase distinctions SHALL survive spelling/plural normalization.

#### Scenario: Mechanical plural
- **WHEN** zucchini(s) and zucchinis have an approved same-food association and compatible units
- **THEN** they aggregate deterministically

#### Scenario: Protected descriptors
- **WHEN** foods are salted/unsalted butter or fresh/canned tomato
- **THEN** they retain separate purchase identities

#### Scenario: No translation identity
- **WHEN** ground beef and bœuf haché have validated exact mappings
- **THEN** they may group; without that evidence they remain separate

### Requirement: Aggregate only matching normalized names and unit buckets

Only matching saved shopping identities, purchase qualifiers and compatible explicit unit buckets SHALL aggregate. Incompatible dimensions, unsupported units and unverified mappings SHALL stay separate. Step uses SHALL never add demand.

#### Scenario: Compatible weight
- **WHEN** the same food contributes 500 g and 1 kg
- **THEN** the exact aggregate is 1500 g

#### Scenario: Incompatible families
- **WHEN** flour contributes grams and cups without ingredient-specific conversion evidence
- **THEN** they stay separate rows

#### Scenario: Unknown unit
- **WHEN** flour contributes weight and a raw bag unit
- **THEN** bag stays separate

#### Scenario: Step repetition
- **WHEN** an ingredient is referenced in multiple steps
- **THEN** only its canonical recipe demand contributes once per scheduled occurrence

### Requirement: Convert supported quantities and retain unknown amounts

Exact quantities SHALL convert only under validated compatible unit definitions. Scalar/range totals SHALL add exactly; unknown contributions SHALL retain honest completeness. Undeclared culinary standards, null units and packages SHALL not gain invented conversions.

#### Scenario: Culinary volume
- **WHEN** cup and tablespoon have no evidenced regional standard
- **THEN** they remain separate raw buckets rather than silently becoming 255 ml

#### Scenario: Count and unknown amount
- **WHEN** two compatible explicit pieces combine with unknown piece quantity
- **THEN** two is a known subtotal, not a complete total; null-unit quantities are not silently asserted as pieces

#### Scenario: All amounts unknown
- **WHEN** all amounts in one bucket are unknown
- **THEN** quantity stays null

#### Scenario: Range aggregation
- **WHEN** compatible 2–3 and 1–2 contributions aggregate
- **THEN** total is exact 3–5 and incomplete only if other contributions are unknown

### Requirement: Return deterministic grocery lines and contributors

Grocery lines SHALL expose stable row identity, exact scalar/range or null total, completeness, unit, current-language label, section and distinct sorted contributor recipe IDs. Source order and locale changes SHALL NOT alter saved identity, check state or totals.

#### Scenario: Repeat source ordering
- **WHEN** equivalent inputs arrive in another source order
- **THEN** aggregation, stable identity and source-independent ordering remain deterministic

#### Scenario: Repeated recipe
- **WHEN** a recipe contributes on two dates
- **THEN** totals include both occurrences and its contributor ID is listed once

#### Scenario: Locale change
- **WHEN** a member changes EN to FR
- **THEN** validated label changes only, with source-language fallback when unavailable

### Requirement: Choose stored category before keyword fallback

Category resolution SHALL prefer protected household food/fallback-key corrections before deterministic defaults. Equivalent food remapping SHALL preserve a proven prior manual override; conflicting prior overrides SHALL remain unresolved rather than choosing by source order.

#### Scenario: Stored correction
- **WHEN** garlic has a human Deli override
- **THEN** it remains Deli

#### Scenario: Legacy correction
- **WHEN** a uniquely mapped old category key has a human Deli override
- **THEN** that correction survives with provenance; ambiguous mappings retain conflicts

### Requirement: Persist a supported category correction before success

A valid category PATCH SHALL save a category override for the supplied saved food identity or conservative fallback key and recompute affected stored weekly grocery lists before returning 204. An absent, blank or unsupported grocerySection SHALL return 400.

#### Scenario: Valid correction
- **WHEN** a valid Produce correction completes its save and affected recomputations
- **THEN** the operation returns 204 and future derived lines use the override

#### Scenario: Invalid correction
- **WHEN** grocerySection is NotARealSection
- **THEN** the operation returns 400 without applying that correction

### Requirement: Update matching loaded grocery rows after correction success

After a successful category response, the grocery view SHALL update rows matching the saved food identity or conservative fallback key to the chosen section only if the loaded offset still equals the initiating offset. Other fields and check-state SHALL remain unchanged, and the picker SHALL close.

#### Scenario: Matching rows
- **WHEN** a correction succeeds in the still-loaded week for a key with several unit buckets
- **THEN** all loaded rows with that identity move section without duplication or check-state change

#### Scenario: Navigation during request
- **WHEN** the loaded week offset changes before the correction response
- **THEN** that success does not move rows in the newly loaded week

### Requirement: Bound correction pending and failure feedback to the ingredient

While a correction is pending, that identity's picker SHALL expose busy state and disable repeat section selection. A rejected correction SHALL retain its original local section and retryable picker, with an error indicator cleared after three seconds.

#### Scenario: Pending correction
- **WHEN** the PATCH remains unresolved
- **THEN** the picker is busy and its choices are disabled

#### Scenario: Rejected then retry
- **WHEN** the PATCH rejects and a later retry succeeds
- **THEN** the original section remains until the successful response and then changes

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

## ADDED Requirements

### Requirement: Refresh derived groceries after canonical publication

A committed canonical ingredient or basis correction SHALL retain the existing affected-week refresh obligation and freshness/retry behavior. Recalculation SHALL use unrounded current canonical quantities before normalization, conversion and aggregation, preserving manual extras and coordinated check transitions. Unsaved ingredient drafts and source inspection SHALL NOT publish grocery changes.

#### Scenario: Correct a checked recipe requirement
- **WHEN** a confirmed canonical Save raises a known weekly requirement
- **THEN** its affected weeks follow the existing updating/current/failed journey and proven-increase-only row policy without changing unrelated checks or manual extras

#### Scenario: Ingredient draft is not saved
- **WHEN** a person changes an ingredient draft but no guarded Save publishes it
- **THEN** current grocery quantities, freshness and checks remain derived from saved canonical facts

#### Scenario: Repeat unchanged recomputation
- **WHEN** current canonical facts and dated portions are recomputed again
- **THEN** quantities do not compound and an already acknowledged increase does not reset checks again

### Requirement: Preserve grocery uncertainty independently of repair flags

Grocery completeness SHALL describe usable contributions rather than household report membership. Valid intentionally unquantified content SHALL remain ordinary; incomplete known subtotals, wholly unknown amounts, ordinary row checks and original-source inspection SHALL retain their established distinct behavior. Source consultation SHALL NOT clear validation or shopping state.

#### Scenario: Incomplete contribution without a repair defect
- **WHEN** a contribution is honestly unknown without an evidenced actionable recipe defect
- **THEN** its grocery completeness remains honest without automatically flagging the recipe for human repair or adding a reading warning cue

#### Scenario: Inspect a source after canonical correction
- **WHEN** a shopper opens a contributor recipe
- **THEN** it shows canonical original-basis evidence under the existing original-review context, not the dated subtotal
- **AND** closing or entering Plan does not acknowledge checks, change ordinary checks or resolve household reports
### Requirement: Keep bilingual grocery generation deterministic

Grocery reads and recomputation SHALL use saved validated associations, labels, quantities and approved deterministic rules without AI or translation/provider calls. AI proposals SHALL be confined to import or explicitly requested reprocessing and SHALL not override protected corrections.

#### Scenario: Provider unavailable
- **WHEN** providers are unavailable after associations were saved
- **THEN** groceries still compute and display deterministically

#### Scenario: Uncertain alias
- **WHEN** an ingestion proposal has ambiguous food or purchase meaning
- **THEN** it remains unmapped with source spelling rather than merging speculatively

### Requirement: Govern saved bilingual identity updates

Published food labels and exact aliases SHALL carry source/version provenance and validated EN/FR meaning. External catalogue changes SHALL NOT silently rewrite saved mappings, private corrections or row checks. Adoption SHALL require licence and affected-corpus review.

#### Scenario: Upstream rename
- **WHEN** a source renames or retires a food code
- **THEN** the app-owned ID and saved corrections survive pending reviewed migration

#### Scenario: Private correction
- **WHEN** one household corrects shopping name or category
- **THEN** no global alias is automatically published

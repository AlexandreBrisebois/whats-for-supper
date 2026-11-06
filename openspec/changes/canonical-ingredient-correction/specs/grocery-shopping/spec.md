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

Legacy ingestion and deterministic conversion SHALL prefer a numeric quantity and nonblank unitText, falling back independently to requiredQuantity.value and requiredQuantity.unitText when needed. Unreadable numeric quantity values SHALL leave the quantity unknown when no numeric fallback exists. After conversion, groceries SHALL read trusted finite nonnegative canonical amounts directly; zero and unitless counts SHALL remain valid, with existing amount-display rules unchanged.

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
- **THEN** derivation retains that amount without inventing a unit, treating zero as missing or changing the existing quantity-and-unit hint rule


### Requirement: Use ingredient text after invalid JSON syntax

Legacy ingestion or conversion SHALL retain stored ingredient strings as canonical unknown-amount lines when raw metadata has invalid JSON syntax. Once canonical current lines exist, grocery derivation SHALL use them independently of retained metadata syntax; malformed evidence SHALL NOT erase trusted current facts.

#### Scenario: Invalid syntax with ingredients
- **WHEN** legacy metadata cannot be parsed as JSON and ingredients include onion
- **THEN** onion is retained as a canonical text fallback and contributes without an invented numeric amount

#### Scenario: No usable source
- **WHEN** there are no canonical lines and legacy conversion has no usable supplies or ingredient strings
- **THEN** the recipe contributes no grocery needs

### Requirement: Request category suggestions only for uncached structured names

Ingredient categorization SHALL use distinct normalized names derived by the existing category normalization owner from canonical current descriptions and request suggestions only for names absent from its category cache. With no uncached names it SHALL make no category-provider request.

#### Scenario: All names cached
- **WHEN** all usable canonical ingredient names have category entries
- **THEN** no category-provider call is made

#### Scenario: Partly cached
- **WHEN** tomato is cached but chicken breast and heavy cream are not
- **THEN** one batch asks for chicken breast and heavy cream without tomato

#### Scenario: Retained supply has an obsolete name
- **WHEN** a human changes the canonical ingredient description while retained extraction still has its prior name
- **THEN** categorization uses the name derived from its current canonical description rather than independently reading obsolete supply


### Requirement: Keep category-provider failure from blocking the processor completion path

For a valid recipe task payload, category-provider errors or unusable response JSON SHALL leave those suggestions unapplied and allow the categorization processor to return completion. Missing recipes or no usable canonical ingredient names SHALL require no provider request.

#### Scenario: Provider failure
- **WHEN** the category provider throws during a valid task
- **THEN** the processor returns completion without saving a suggestion from that response

#### Scenario: Missing recipe
- **WHEN** the valid task names a recipe that is not stored
- **THEN** no category request is made

## ADDED Requirements

### Requirement: Refresh derived groceries after canonical publication

A committed canonical ingredient or basis correction SHALL retain the existing affected-week refresh obligation and freshness/retry behavior. Recalculation SHALL use unrounded current canonical quantities before normalization, conversion and aggregation, preserving manual extras and coordinated check transitions. Unsaved ingredient drafts and source inspection SHALL NOT publish grocery changes.

#### Scenario: Correct a checked recipe requirement
- **WHEN** a confirmed canonical Save raises a known weekly requirement
- **THEN** its affected weeks follow the existing updating/current/failed journey and increased-needs uncheck policy without changing unrelated checks or manual extras

#### Scenario: Ingredient draft is not saved
- **WHEN** a person changes an ingredient draft but no guarded Save publishes it
- **THEN** current grocery quantities, freshness and checks remain derived from saved canonical facts

#### Scenario: Repeat unchanged recomputation
- **WHEN** current canonical facts and dated portions are recomputed again
- **THEN** quantities do not compound and an already acknowledged increase does not reset checks again

### Requirement: Preserve grocery uncertainty independently of repair flags

Grocery completeness SHALL describe usable contributions rather than household report membership. Valid intentionally unquantified content SHALL remain ordinary; incomplete known subtotals, wholly unknown amounts, prior-unknown checks and original-source inspection SHALL retain their established distinct behavior. Source consultation SHALL NOT clear validation or shopping state.

#### Scenario: Incomplete contribution without a repair defect
- **WHEN** a contribution is honestly unknown without an evidenced actionable recipe defect
- **THEN** its grocery completeness remains honest without automatically flagging the recipe for human repair or adding a reading warning cue

#### Scenario: Inspect a source after canonical correction
- **WHEN** a shopper opens a contributor recipe
- **THEN** it shows canonical original-basis evidence under the existing original-review context, not the dated subtotal
- **AND** closing or entering Plan does not acknowledge checks, clear prior-unknown warnings or resolve household reports

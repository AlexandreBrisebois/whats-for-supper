## ADDED Requirements

### Requirement: Aggregate dated scaled contributions without mutating recipes

For configured serving context each scheduled supper occurrence SHALL contribute its usable scaled amount using that date's count and recipe basis. Existing ingredient identity, unit-family separation and conversion SHALL apply after scaling. Recipe-free non-cooking dates SHALL contribute nothing. Recalculation SHALL use original quantities, preserve manual extras and produce the same totals on repeated execution.

#### Scenario: Same recipe for four and six
- **WHEN** a two-serving recipe with 200 g pasta is scheduled for four on Wednesday and six on Friday
- **THEN** the contributions are 400 g and 600 g, the compatible weekly pasta total is 1000 g and recomputation does not multiply the previous total again

#### Scenario: Count changes without changing meals
- **WHEN** Wednesday changes from four to six
- **THEN** only its serving contribution changes before weekly aggregation and the saved recipe, other date counts and manual extras remain unchanged

### Requirement: Uncheck increased serving-driven grocery requirements

After portions/default changes, assignment, replacement, movement or recipe corrections, recomputation SHALL compare requirements in the same normalized ingredient/unit bucket. A checked item whose known total increases SHALL become unchecked and show its updated total. Unchanged or decreased requirements SHALL retain their checks; a decrease SHALL NOT check an unchecked item. This transition SHALL be coordinated with concurrent grocery writes.

#### Scenario: More pasta is needed
- **WHEN** checked pasta requires 400 g and a count increase raises the weekly requirement to 600 g
- **THEN** pasta becomes unchecked with only the 600 g total on its row; unrelated checks remain and one brief list-level explanation says Shopping list updated. Items needing more are unchecked.

#### Scenario: Move to a larger-portion date
- **WHEN** a move or replacement raises a checked ingredient requirement without changing any date count
- **THEN** the same increase rule unchecks only the affected item and shows its new total

#### Scenario: Recompute or decrease after the increase
- **WHEN** the same saved counts are recomputed, or the count later decreases
- **THEN** unchanged requirements do not trigger another check reset and decreases do not automatically mark anything purchased

#### Scenario: Shopper checks after the increase is applied
- **WHEN** the increased requirement has been persisted and another member subsequently checks that updated ingredient
- **THEN** the later check remains authoritative without a later unchanged recomputation clearing it or repeating the explanation

### Requirement: Keep incomplete grocery scaling visible

An ingredient with unreliable basis, amount or source coherence SHALL remain represented with concise review feedback. Intentionally unquantified directions SHALL remain ordinary text without a warning. Known compatible scaled contributions can be summed, but a partial subtotal SHALL be identified as incomplete and SHALL NOT hide unresolved contributors. No mass-to-volume inference, invented amount or package-purchase rounding SHALL be added. Ingredient review SHALL NOT imply pantry knowledge.

#### Scenario: Known pasta plus unresolved pasta contribution
- **WHEN** one planned recipe contributes known scaled pasta and another has an unresolved pasta amount
- **THEN** the grocery line retains review feedback and labels any numeric subtotal as incomplete rather than presenting it as the full requirement

### Requirement: Keep grocery increase feedback quiet

An update that unchecks increased requirements SHALL give one brief localized list-level explanation. Rows SHALL show their updated totals without extra delta amounts or persistent more-needed labels. Unchanged recomputation or repeated reading SHALL not repeat the explanation. Existing freshness and error feedback SHALL remain separate from successful-update feedback.

#### Scenario: Several requirements increase together
- **WHEN** one plan update increases pasta and tomatoes
- **THEN** both updated totals are displayed with affected checks cleared, and one explanation covers the update rather than separate row notices

## MODIFIED Requirements

### Requirement: Derive grocery needs from recipe-bearing entries in the selected week

On successful recomputation, grocery needs SHALL include the supplies of recipe-bearing calendar entries within the selected Monday-through-Sunday interval. Each occurrence SHALL apply supper-servings scaling for its own date before aggregation. Repeated assignments SHALL contribute separately; unconfigured legacy contexts SHALL retain original quantities.

#### Scenario: Recipe is scheduled twice
- **WHEN** the same recipe with two eggs is assigned to two dates in the interval without configured scaling
- **THEN** the recomputed count bucket contains four eggs with that recipe listed once as a contributor

#### Scenario: Recipe-free date
- **WHEN** a calendar entry has no recipe association
- **THEN** it contributes no supplies

### Requirement: Prefer usable structured supply over ingredient text

A recipe with named structured supplies coherent with its current ingredient basis SHALL use those entries for grocery derivation. Blank names SHALL be skipped. Ingredient text SHALL be used when there are no usable coherent supplies. Stale or unresolved contributions SHALL retain visible review feedback instead of claiming complete scaled quantities.

#### Scenario: Structured supply exists
- **WHEN** a recipe supplies named structured flour coherent with its current ingredient basis and also ingredient text
- **THEN** the structured flour contributes without additionally appending the ingredient text

#### Scenario: No named structured entry
- **WHEN** structured supply is absent or empty, or all its names are blank, and ingredient strings exist
- **THEN** each ingredient string contributes a name without an extracted numeric quantity or unit

### Requirement: Preserve current checks during overlapping recomputation

Successful recomputation overlapping a recipe-derived check mutation SHALL preserve unrelated persisted check entries. The serving-driven increased-needs rule SHALL intentionally uncheck only affected increased requirements at that same processing position. Supported predecessor merge and rename transitions SHALL use the check state current at recomputation's processing position, without changing the existing mechanical-normalization rules.

#### Scenario: Check and unchanged-name recomputation
- **WHEN** Tomato is checked while a recomputation retains its display name and neither operation intentionally replaces that key
- **THEN** after both succeed a fresh read contains Tomato true and the recomputed grocery lines

#### Scenario: Earlier request state is stale
- **WHEN** a recomputation request previously observed Tomato false and another request commits Tomato true before recomputation processes its check-map transition
- **THEN** recomputation uses Tomato true rather than restoring its earlier observed false

#### Scenario: Supported predecessor merge
- **WHEN** a check request commits one predecessor as true before two compatible predecessors merge and the other predecessor remains false
- **THEN** the merged name is false under the existing all-predecessors-checked rule, obsolete predecessor keys are removed and unrelated checks remain

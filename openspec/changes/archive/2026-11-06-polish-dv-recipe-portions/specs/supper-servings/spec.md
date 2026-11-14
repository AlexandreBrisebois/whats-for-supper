## MODIFIED Requirements

### Requirement: Distinguish recipe basis from dated portions

Saved recipe servings SHALL remain the positive basis of stored amounts. Usual and override counts SHALL be total portions including leftovers, not attendance. An unset usual count SHALL derive from family membership as specified below. Effective counts SHALL be whole integers from one through the supported range. No separate extras count SHALL be introduced; changing a count SHALL NOT assign, remove or complete a meal.

#### Scenario: Six portions from a two-serving recipe
- **WHEN** Wednesday's effective count is six and its recipe's saved basis is two
- **THEN** six is the dated target and two remains the recipe basis without rewriting original quantities

#### Scenario: Include leftovers in one number
- **WHEN** four people want supper and two portions for later
- **THEN** setting six portions supplies the entire target without separate people or leftovers controls

#### Scenario: Invalid count or night away
- **WHEN** zero, a negative, fractional, nonnumeric or out-of-range count is submitted
- **THEN** validation rejects it without changing a count or meal and retains a correctable draft
- **AND** existing non-cooking choices remain available for a night away

### Requirement: Apply an explicit household default with dated exceptions

Settings SHALL configure usual portions. A positive human-set count SHALL remain effective until explicitly changed or reset to automatic, regardless of membership changes. Without an explicit choice, the current positive family-member count SHALL supply usual portions. Current/future dates SHALL use usual unless overridden. Past, Cooked and prepared snapshots and saved date overrides SHALL remain protected.

#### Scenario: Change the usual portion count
- **WHEN** usual changes from four to five and future Wednesday has override six
- **THEN** future inherited dates use five, Wednesday retains six and past/Cooked/prepared snapshots do not change

#### Scenario: Set portions before choosing food
- **WHEN** an empty future Saturday receives override six and later receives a recipe
- **THEN** the date retains six and its new recipe uses that count

#### Scenario: Automatic family size then human choice
- **WHEN** usual is unset for four family members, a member is added, and later a person explicitly sets seven
- **THEN** inherited editable dates first use four, then five, then seven
- **AND** a subsequent membership change leaves seven in effect

#### Scenario: Reset explicit usual to automatic
- **WHEN** a person deliberately selects automatic family size in Settings and confirms the save
- **THEN** inherited editable dates use the current positive member count, overrides remain, and the setting identifies its automatic source

## ADDED Requirements

### Requirement: Scale independently aligned ingredient amounts

A reliable structured amount SHALL scale only for its verified original ingredient line. Omitted or uncertain lines SHALL NOT invalidate independently verified amounts or shift quantities to another line. Ambiguous, stale or unbound amounts SHALL remain unresolved with original text available. Reads SHALL NOT invent quantities, parse arbitrary text numbers as authoritative amounts, call AI or repair saved data.

#### Scenario: Four-portion shells recipe with omitted seasonings
- **WHEN** verified original yield is four, retained/current lines agree, and structured amounts bind uniquely to 12 shells, 1 onion, 450 g beef and 500 ml marinara while salt and pepper lack reliable amounts
- **THEN** preview two shows 6 shells, 0.5 onion, 225 g beef and 250 ml marinara; preview four shows 12, 1, 450 g and 500 ml; preview six shows 18, 1.5, 675 g and 750 ml
- **AND** seasonings retain their original text and honest completeness state, other verified lines scale, and the recipe is not described as completely quantified

#### Scenario: Missing middle ingredient
- **WHEN** a lime line has no structured amount between verified garlic and honey, followed by known salmon and sesame amounts
- **THEN** garlic, honey, salmon and sesame retain their own amounts and scale independently; lime is not given honey's quantity

#### Scenario: Ambiguous duplicate or changed source
- **WHEN** an amount could belong to two same-named lines, the retained source differs from current ingredient text, or an old binding no longer matches
- **THEN** affected amounts are unresolved instead of guessed, and unrelated verified bindings remain usable

#### Scenario: Intentional unquantified text and packages
- **WHEN** an ingredient says salt to taste or oil for frying, or a verified quantity is two 400 g cans
- **THEN** the direction remains ordinary unquantified text and scaling changes the can count without multiplying its package size or instruction numbers

#### Scenario: Shared consumers and unknown basis
- **WHEN** the same aligned recipe/count is read through preview, proposed or assigned detail, cooking and grocery contribution
- **THEN** reliable numeric amounts and completeness agree across consumers before display rounding
- **AND** an unknown original yield prevents a scaling factor, offers original evidence/correction, and is never replaced by family size

### Requirement: Migrate usual portions without erasing human choices

Every existing positive saved usual count SHALL be preserved as explicit. Missing or null usual SHALL adopt automatic family count for editable current/future dates only. Migration SHALL preserve overrides and historical/prepared snapshots, including original-quantity snapshots. Settings SHALL distinguish automatic from explicit and acknowledge saves only after persistence. Unknown or zero family count SHALL not become an invented positive count.

#### Scenario: Upgrade with explicit and unset households
- **WHEN** one household has saved usual seven and another has no usual with four members
- **THEN** the first remains explicit seven and the second shows automatic four without storing four as a human choice
- **AND** existing historical original-quantity and prepared snapshots remain unchanged

#### Scenario: Empty or unavailable family roster
- **WHEN** an automatic household has zero members or its roster cannot be established
- **THEN** no fake one/four count is supplied; original quantities remain the honest unavailable fallback and Settings offers appropriate empty/retry feedback
- **AND** an existing explicit count remains usable independently of the roster

#### Scenario: Membership changes with inherited dates
- **WHEN** automatic usual changes from four to five following a confirmed membership addition
- **THEN** editable inherited dates and their quantity versions change together, affected groceries use the existing updating/failed/current journey, and overrides/prepared/history remain intact
- **AND** a draft based on the prior version cannot silently overwrite that change

#### Scenario: Existing null needs no historical backfill
- **WHEN** a past or prepared occurrence was recorded with original-quantity context before automatic fallback was introduced
- **THEN** reading or migrating it does not infer family size as its former cooking count

### Requirement: Recover Settings portions saves explicitly

Settings SHALL expose a labeled positive whole-number usual field and an explicit automatic-family option. Saving SHALL preserve concurrent changes through the existing conflict/reconciliation rules. Failure or uncertain acknowledgement SHALL retain the draft without claiming success or blindly replaying a write. Default changes SHALL retain ordinary quiet grocery freshness and warning semantics.

#### Scenario: Save explicit five then reopen
- **WHEN** a person saves five and receives confirmed persistence
- **THEN** Settings and inherited editable Planner dates show five, a fresh read agrees, and member changes do not alter it

#### Scenario: Save fails or competes with another update
- **WHEN** usual validation fails, another member changes the baseline, or persistence cannot be confirmed
- **THEN** a correctable/reviewable draft remains with explicit recovery and no false Saved or partially applied default

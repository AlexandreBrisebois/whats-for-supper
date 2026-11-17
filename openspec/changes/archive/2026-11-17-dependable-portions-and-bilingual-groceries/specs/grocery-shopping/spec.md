# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Show an amount hint only with quantity and unit`
- TO: `### Requirement: Show trusted grocery amounts without inventing units`

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

Legacy ingestion and deterministic conversion SHALL prefer a numeric quantity and nonblank unitText, falling back independently to requiredQuantity.value and requiredQuantity.unitText when needed. Unreadable numeric quantity values SHALL leave the quantity unknown when no numeric fallback exists. After conversion, groceries SHALL read trusted finite nonnegative canonical amounts directly; zero and unitless counts SHALL remain valid. Grocery display SHALL preserve trusted known amounts without inventing units; a missing unit SHALL NOT hide a trusted amount or change derivation, grouping or checks.

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
- **THEN** the reviewed label changes only, with saved source shopping spelling when unavailable
- **AND** saved quantities, recipe originals/contentRevision, purchase identity, rowId, checks and checked baselines remain unchanged

#### Scenario: Two members use different languages
- **WHEN** two members read the same persisted list in EN and FR concurrently
- **THEN** each sees the reviewed label for that locale or source fallback without rewriting the shared row or the other member's view

#### Scenario: Label-only vocabulary revision
- **WHEN** an accepted release changes only a label for the same saved food/purchase identity
- **THEN** its display updates without remapping saved associations or resetting row/check/baseline identity

### Requirement: Choose stored category before keyword fallback

Category resolution SHALL prefer protected household food/fallback-key corrections before deterministic defaults. Equivalent food remapping SHALL preserve a proven prior manual override; conflicting prior overrides SHALL remain unresolved rather than choosing by source order.

#### Scenario: Stored correction
- **WHEN** garlic has a human Deli override
- **THEN** it remains Deli

#### Scenario: Legacy correction
- **WHEN** a uniquely mapped old category key has a human Deli override
- **THEN** that correction survives with provenance; ambiguous mappings retain conflicts

### Requirement: Persist a supported category correction before success

A valid revision-guarded category PATCH SHALL save a household override for the supplied saved food identity or conservative fallback key and recompute affected stored weekly grocery lists before returning 204. An absent, blank or unsupported grocerySection SHALL return 400. Stale category revisions SHALL return 409 without mutation; normal food/fallback corrections SHALL NOT mutate extra occurrences or publish global aliases.

#### Scenario: Valid correction
- **WHEN** a valid Produce correction completes its save and affected recomputations
- **THEN** the operation returns 204 and future derived lines use the override

#### Scenario: Invalid correction
- **WHEN** grocerySection is NotARealSection
- **THEN** the operation returns 400 without applying that correction

#### Scenario: Stale category correction
- **WHEN** a correction supplies a stale expected category revision
- **THEN** it returns 409 without changing the saved category, rows or checks

#### Scenario: Category scope remains household-owned
- **WHEN** a food or unresolved fallback category correction succeeds
- **THEN** it affects that household scope only, without modifying extra occurrences or adding a global alias

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

### Requirement: Show trusted grocery amounts without inventing units

A displayed grocery row SHALL show its trusted nonnegative scalar or range amount even when its display unit is null, empty or whitespace-only. Zero SHALL remain a known amount. Complete amounts SHALL retain the parenthesized hint; a usable supplied unit SHALL retain its existing suffix, while an absent/blank unit SHALL add no suffix or fabricated unit. Noninteger amounts SHALL retain rounding to at most three decimal places with trailing zeros removed. Genuinely missing or unreadable amounts SHALL show no invented number. Incomplete known subtotals SHALL retain the existing localized wording once in the amount position.

Rendering SHALL NOT change demand arithmetic, completeness, row grouping/identity, shopping checks/baselines, recipe contributors or source disclosure, or trigger a mutation or recomputation. Showing a bare value SHALL NOT assert an inferred clove, head, piece, mass, volume or package unit.

#### Scenario: Known scalar without a unit
- **WHEN** a row has trusted scalar amount two with a null, empty or whitespace-only display unit
- **THEN** its complete hint is `(2)`, with no fabricated unit or trailing unit space

#### Scenario: Known zero without a unit
- **WHEN** a row has trusted scalar amount zero and no display unit
- **THEN** its complete hint is `(0)` rather than an omitted or unknown amount

#### Scenario: Fraction and range without a unit
- **WHEN** complete rows have trusted amount one half or range two through three with no display unit
- **THEN** their hints are `(0.5)` and `(2–3)` under the existing display convention, without changing the exact supplied amounts

#### Scenario: Amount shown
- **WHEN** a complete row has amount 1.23456 and display unit kg
- **THEN** its hint remains `(1.235 kg)` with the existing rounding and unit presentation

#### Scenario: Missing amount or unit
- **WHEN** a row lacks a known amount or has no usable display unit
- **THEN** a genuinely missing amount has no numeric hint, while a trusted amount with only its unit missing remains visible without a unit suffix
- **AND** neither case gains a guessed count/unit, replacement warning or reserved warning space

#### Scenario: One honest incomplete subtotal in either locale
- **WHEN** an incomplete row has known subtotal two and no unit, in English or French
- **THEN** the amount position shows `2 known` or `2 connus` once using the existing localized subtotal wording, without claiming the full requirement or adding a duplicate hint/warning

#### Scenario: Display preserves the shopping row and its sources
- **WHEN** a checked row with a trusted unitless amount is rendered, reread or has its recipe sources expanded
- **THEN** its amount, group, row identity, check/baseline and contributor identities remain unchanged, source disclosure remains usable, and no mutation or recomputation is sent merely to display or inspect it

### Requirement: Use display name as the shared check identity

Recipe-derived grocery rows SHALL use stable displayed-row identity within the absolute week, independently of display name, locale, ingredient name or unit labels. Extra rows SHALL retain stable occurrence identity. An intentionally aggregated compatible demand row SHALL have one checkbox.

#### Scenario: Duplicate names
- **WHEN** three recipe-derived Eau rows have different unit buckets and one is checked
- **THEN** only that row becomes checked and all three remain

#### Scenario: Uncheck duplicate
- **WHEN** one checked Eau row is unchecked
- **THEN** other same-name rows retain their independent checks

#### Scenario: Extra shares the display name
- **WHEN** a recipe-derived Eau row and an extra Eau coexist and the extra is checked
- **THEN** only its occurrence check changes

### Requirement: Initialize an empty loaded check map from displayed names

Missing recipe-row check state SHALL display unchecked by row ID in its absolute week. A nonempty map SHALL retain other current row values. Extra checked state SHALL come from its occurrence and SHALL NOT enter the recipe-row map.

#### Scenario: Empty map
- **WHEN** recipe rows render with no row checks
- **THEN** each displays unchecked without creating name-level acknowledgements

#### Scenario: Existing map
- **WHEN** one Tomato row ID is true but Lettuce ID is absent
- **THEN** Tomato stays checked and Lettuce is unchecked

#### Scenario: Extra row
- **WHEN** extra Coffee renders beside recipe rows
- **THEN** its occurrence state is used independently

### Requirement: Submit one optimistic grocery check at a time

A check SHALL optimistically change only the selected row and submit intended checked state with its stable identity, absolute week and current version. Same-row intentions SHALL reconcile in order. Checkboxes SHALL expose checked state and click, Enter and Space behavior; extras SHALL retain their occurrence contract.

#### Scenario: Check succeeds
- **WHEN** an unchecked Tomato row is activated successfully
- **THEN** only its row ID becomes checked and its request carries the captured week/version

#### Scenario: Uncheck succeeds
- **WHEN** a checked Tomato row is activated successfully
- **THEN** only its row becomes unchecked

#### Scenario: Rapid intents
- **WHEN** a row is toggled quickly while its first write is pending
- **THEN** the final acknowledged intent agrees with a fresh read and late replies cannot invert another row or newer intent

### Requirement: Persist a sequential single-key check update

A successful item mutation SHALL persist the intended value for an existing current row and retain other persisted checks. It SHALL return authoritative identity/version after commit and publication attempt. Stale or absent row/version SHALL conflict without creating phantom rows.

#### Scenario: Set one key
- **WHEN** Tomato false and Lettuce true are stored and a current Tomato mutation sets true
- **THEN** both are true on a fresh read

#### Scenario: Set false
- **WHEN** a current row is set false
- **THEN** its explicit false is retained

#### Scenario: Two members check different items
- **WHEN** two members concurrently check different current rows
- **THEN** a fresh read after both successful mutations contains both true

#### Scenario: Unknown row
- **WHEN** a stale removed row ID or wrong absolute week is submitted
- **THEN** conflict applies no check and creates no new row

### Requirement: Recover a rejected individual check locally

A known rejected check SHALL restore authoritative state only for the matching row/intention, retain other rows and show bounded retryable item error. An uncertain result SHALL be reread before replay. A late failure SHALL NOT overwrite newer acknowledged state.

#### Scenario: Failed check
- **WHEN** checking Tomato fails before commit while Lettuce is checked
- **THEN** Tomato returns unchecked and Lettuce stays checked with error bounded to Tomato

#### Scenario: Retry
- **WHEN** a safe retry succeeds after reconciliation
- **THEN** the authoritative intended row state remains

#### Scenario: Lost reply
- **WHEN** a check may have committed before its reply was lost
- **THEN** the client rereads that absolute week before replaying and does not blindly invert it

### Requirement: Order unchecked rows before checked rows within an aisle

Each aisle SHALL sort unchecked before checked rows, retaining supplied order within groups and counting displayed rows independently. Within a group extras SHALL precede recipe rows in their respective supplied order. Reordering SHALL retain stable controls and SHALL NOT cause unsolicited viewport or focus movement.

#### Scenario: Move down and back
- **WHEN** an unchecked row is checked and then unchecked
- **THEN** it moves after unchecked rows and returns to its source-relative unchecked position

#### Scenario: Duplicate completion
- **WHEN** several rows share a display name and have independent checked states
- **THEN** the checked count includes only independently checked rendered rows

#### Scenario: Mixed rows in one aisle
- **WHEN** one aisle receives checked and unchecked extras and checked and unchecked recipe-derived rows
- **THEN** all unchecked extras appear in supplied order, followed by all unchecked recipe-derived rows in supplied order, then checked extras in supplied order, then checked recipe-derived rows in supplied order
- **AND** the aisle count and completion indicator include every row

#### Scenario: Extra check and uncheck
- **WHEN** one of two same-name unchecked extras in an aisle is checked and later unchecked while an unchecked recipe-derived row is also present
- **THEN** only that extra moves below every unchecked row when checked and returns to its source-relative position when unchecked
- **AND** the other extra and recipe-derived row retain their check states

#### Scenario: Authoritative check state arrives
- **WHEN** a successful schedule read or eligible household update changes an extra's loaded check state in a displayed aisle
- **THEN** the aisle places that extra in the group matching its authoritative check state while retaining the order of other rows

#### Scenario: Failed extra check restores order
- **WHEN** an extra moves after an optimistic check and the mutation is rejected
- **THEN** its authoritative unchecked state and source-relative position are restored while other rows retain their states and positions

### Requirement: Open and cancel an ingredient section picker

Regular grocery category controls SHALL match extra tag interaction and icon placement while retaining normal ingredient category scope. The labeled control SHALL open configured choices, toggle closed on repeat activation and close without mutation for the current section. It SHALL remain distinct from check and source controls.

#### Scenario: Open picker
- **WHEN** the member activates Change section for Tomato
- **THEN** section choices are displayed for its normalized key

#### Scenario: No change
- **WHEN** the current section is selected
- **THEN** the picker closes without a category PATCH

### Requirement: Carry forward supported predecessor checks during mechanical normalization

A proven one-to-one row continuation SHALL preserve its check across equivalent spelling, label, locale or compatible unit changes. Structural split, merge or semantic replacement SHALL receive new row identities and start unchecked without claiming purchase intent. Unrelated rows SHALL retain checks.

#### Scenario: Mixed predecessor checks
- **WHEN** two formerly separate checked/unchecked rows merge structurally
- **THEN** a new unchecked row replaces them and unrelated checks remain

#### Scenario: All checked
- **WHEN** two checked separate rows merge without a proven one-to-one continuation
- **THEN** the new row starts unchecked rather than asserting they were one acknowledged purchase

#### Scenario: Single rename
- **WHEN** only a display label changes for a proven continuing row
- **THEN** its identity/version continuity and check survive without name-key migration

### Requirement: Replace the weekly check map through the full-map API

A supported full-map replacement SHALL require the captured absolute week and current list version and address stable row IDs. It SHALL retain explicit false and clear omitted row checks. A stale list, old name dictionary or unknown row ID SHALL conflict atomically.

#### Scenario: Replace populated map
- **WHEN** a current list replacement supplies only Tomato-ID false
- **THEN** its prior Lettuce-ID check is removed

#### Scenario: Clear map
- **WHEN** a current-version replacement supplies empty checks
- **THEN** recipe-row checks clear without changing rows or extras

#### Scenario: Stale map
- **WHEN** an old name-level or stale-version dictionary is submitted
- **THEN** no check changes and refresh is required

### Requirement: Return the full-map result in the declared success envelope

After supported full-map persistence and publication attempt, the operation SHALL return 200 with authoritative checks, absolute week and list version under data. It SHALL leave persisted grocery demand and extra occurrences unchanged.

#### Scenario: Successful response
- **WHEN** current-version replacement completes
- **THEN** data identifies the saved week, list version and row-ID dictionary

#### Scenario: Checks without line mutation
- **WHEN** replacement completes with existing lines
- **THEN** amounts, identities and extras remain unchanged

### Requirement: Process normal check-map writes against current persisted state

On the supported single application instance, item writes, version-guarded full-map replacements and recomputation SHALL use current persisted row checks in one server processing order. This SHALL NOT promise user-click or request-arrival order.

#### Scenario: Conflicting values for one item
- **WHEN** true and false requests compete for the same row version
- **THEN** a stale intent conflicts and a fresh read exposes the committed version; unrelated rows retain their values

#### Scenario: Repeat intended state
- **WHEN** an identical accepted mutation ID and body are replayed
- **THEN** the saved outcome is returned without applying twice

#### Scenario: Stale whole-map replacement remains replacement
- **WHEN** a list changes after a bulk baseline was captured
- **THEN** the stale full-map write conflicts rather than erasing later checks

#### Scenario: Item update follows replacement
- **WHEN** a valid item update follows a committed bulk replacement and uses current row state
- **THEN** the item changes and other replacement checks remain

#### Scenario: Clear and later check
- **WHEN** a current empty replacement is followed by a valid row check
- **THEN** only that row is checked

### Requirement: Preserve current checks during overlapping recomputation

Recomputation SHALL compare demand and transition checks at the same coordinated position using current persisted row state. Only proven increases on continuing comparable rows SHALL clear their checks. Unrelated checks and extras SHALL remain; unchanged retries SHALL NOT undo later checks.

#### Scenario: Check and unchanged-name recomputation
- **WHEN** a row is checked while its unchanged demand is recomputed
- **THEN** fresh state retains that check and recomputed lines

#### Scenario: Earlier request state is stale
- **WHEN** a check commits after recompute inspection but before its transition processes
- **THEN** recompute uses current checked state rather than its earlier observed map

#### Scenario: Supported predecessor merge
- **WHEN** structural merge follows a predecessor check
- **THEN** the new row starts unchecked under structural identity policy and unrelated current checks survive

### Requirement: Uncheck increased serving-driven grocery requirements

Recomputation SHALL compare current demand with the requirement saved on the row’s unchecked-to-checked transition. It SHALL uncheck only when both requirements are complete/comparable and current minimum exceeds the baseline maximum; scalars are single-point intervals. Equivalent, decreased or unprovable changes SHALL preserve both check and baseline. Comparison SHALL precede rounding and coordinate with check writes.

#### Scenario: More pasta is needed
- **WHEN** complete checked 400 g becomes complete 600 g on the same demand row
- **THEN** only pasta unchecks and shows 600 g, with the existing one brief list-level increase explanation

#### Scenario: Move to a larger-portion date
- **WHEN** a move or correction provably increases continuing demand
- **THEN** only that row resets regardless of the trigger

#### Scenario: Recompute or decrease after the increase
- **WHEN** saved demand is repeated or decreased
- **THEN** no repeated reset or automatic purchase acknowledgement occurs

#### Scenario: Shopper checks after the increase is applied
- **WHEN** an increase was applied then the shopper checks it
- **THEN** unchanged recomputation preserves that later check

#### Scenario: Equivalent units and unknown changes
- **WHEN** 500 g becomes 0.5 kg, or unknown becomes known, or incompatible units cannot be compared
- **THEN** a proven continuing row keeps its check with no prior-unknown warning

#### Scenario: Incompatible unit with stable contributor lineage
- **WHEN** one continuing row changes from grams to an incompatible measure but retains a unique unchanged food/purchase and ingredient-occurrence lineage
- **THEN** its identity/check are preserved because no demand increase is provable; a split/merge remains a separate structural transition

#### Scenario: Ranges
- **WHEN** complete 2–3 becomes 4–5 in a compatible continuing row
- **THEN** the approved disjoint-interval proof resets it, while overlap 3–4 is unprovable and keeps its check

#### Scenario: Cumulative overlaps do not advance baseline
- **WHEN** a row checked at 2–3 changes to 3–4 and then 4–5 without a new unchecked-to-checked transition
- **THEN** it stays checked at 3–4 with baseline 2–3 and unchecks at 4–5 because 4 exceeds original maximum 3

#### Scenario: Redundant true and bulk writes do not acknowledge new demand
- **WHEN** recomputation, repeated checked=true, retry or a full-map entry leaves an already checked row true
- **THEN** its original checked-demand baseline remains unchanged; no overlapping update silently rebaselines it

#### Scenario: Recheck captures a fresh requirement
- **WHEN** a row is unchecked and then checked successfully at current 4–5
- **THEN** its new baseline is 4–5 and repeated identical demand does not reset it

#### Scenario: Unknown or decreased baseline journey
- **WHEN** a checked demand decreases before rising again, or was unknown/incomplete when checked
- **THEN** decreases do not lower its saved baseline and unknown baselines never become silently known from later demand; only a provable increase against the acknowledged baseline resets the check

### Requirement: Keep incomplete grocery scaling visible

Known compatible partial totals SHALL appear once as known/incomplete subtotals in the amount position. Wholly unknown amounts SHALL show no invented number or new visible warning cue. Review amounts text, its separators and empty row space SHALL be removed. Unresolved state and original-source inspection SHALL remain. Intentional unquantified directions stay ordinary text; no invented amount, mass/volume inference, package rounding or pantry knowledge is implied.

#### Scenario: Known pasta plus unresolved pasta contribution
- **WHEN** one planned recipe contributes known pasta and another has an unresolved amount
- **THEN** the row shows the numeric subtotal once as known/incomplete rather than the full requirement, without Review amounts or a replacement icon
- **AND** recipe contributors remain accessible through the separate recipe-book disclosure

#### Scenario: Entirely unknown current amount
- **WHEN** a row is incomplete and has no known numeric amount
- **THEN** it shows its ingredient without an invented amount, Review amounts, replacement icon/copy or empty warning panel
- **AND** unresolved state remains unchanged and available source recipes still lead to original quantity evidence

#### Scenario: Avoid a duplicate subtotal and its reserved space
- **WHEN** an incomplete row has known 400 g and no prior-check warning
- **THEN** 400 g known appears once in the amount position, without a repeated subtotal, dot separator or separate warning row/margin

#### Scenario: Quantity exists without a usable display unit
- **WHEN** a trusted numeric amount or known incomplete subtotal has no usable display unit
- **THEN** that known amount appears once under the trusted-amount display rule, without a fabricated unit or claim that an incomplete subtotal is the full requirement
- **AND** genuinely missing amounts remain without an invented number, Review amounts or replacement cue

#### Scenario: Complete and intentionally unquantified rows
- **WHEN** an amount is complete or content is intentionally unquantified such as salt to taste
- **THEN** complete amounts keep their existing presentation and intentionally unquantified text gains no warning or invented numeric amount

### Requirement: Distinguish incomplete totals from prior unknown checked amounts

Current completeness SHALL identify known subtotals independently of shopping checks. Prior-unknown checked-amount warnings and their special acknowledgement workflow SHALL be removed in both locales with no replacement cue. Unknown-to-known demand without a provable increase SHALL preserve a continuing row check.

#### Scenario: Prior unknown amount is now complete
- **WHEN** a checked continuing row changes from unknown to complete 600 g
- **THEN** it remains checked, shows the full total and has no prior-check warning or acknowledgement

#### Scenario: Both warning conditions occur
- **WHEN** legacy data contains prior_amount_unknown and an incomplete current subtotal
- **THEN** only the known subtotal appears once with no prior-check marker/copy or reserved warning space

#### Scenario: Explicit shopping acknowledgement
- **WHEN** a shopper checks a row
- **THEN** it is an ordinary check, with no additional acknowledgement state or claim that unknown quantities are resolved

#### Scenario: Unknown current amount with prior-check warning
- **WHEN** current amount is unknown and legacy prior_amount_unknown exists
- **THEN** no numeric amount, warning, badge or replacement cue is shown

### Requirement: Keep quantity warnings outside collapsed sources

Known-subtotal feedback SHALL remain outside collapsed sources when numeric partial totals exist. Wholly unknown amounts and prior-unknown check history SHALL add no warning or replacement clutter. Source consultation and Plan SHALL NOT acknowledge checks or change quantities. Groceries SHALL gain no usual-portions setting.

#### Scenario: Incomplete and prior unknown together
- **WHEN** a collapsed row has incomplete quantity and old prior-unknown state
- **THEN** its known subtotal appears once, while prior-check feedback is absent

#### Scenario: Complete amount with prior warning
- **WHEN** current 600 g is complete and the old checked amount was unknown
- **THEN** only the complete 600 g amount appears, and source consultation preserves checks

### Requirement: Disclose contributor recipe titles independently of shopping actions

Recipe-derived rows with contributors SHALL show a compact recipe-book control. Both Used in heading and source titles SHALL remain hidden until expansion. Expanded content SHALL show Used in and real contributor titles without repeated Review recipe wording. Checks and aisle tags SHALL remain separate. Duplicate occurrences SHALL not duplicate titles; absent contributors SHALL not invent sources.

#### Scenario: Inspect ordinary complete ingredient sources
- **WHEN** a complete pasta row has two contributors
- **THEN** its collapsed row exposes neither Used in heading nor names; activating the book reveals both with no grocery write, check change or aisle change
- **AND** collapsing hides the heading and names again

#### Scenario: Source recipe repeated or missing title
- **WHEN** a recipe contributes twice or its title cannot be resolved
- **THEN** expanded sources list it once or use localized Recipe title unavailable, not a fabricated title or Review recipe number
- **AND** a known identity retains its source link; no identity means no invented link

#### Scenario: No recipe contributors
- **WHEN** an extra or legacy row has no contributor identity
- **THEN** no book control, Used in heading, source title or fictitious link is shown, while any known-subtotal feedback and ordinary shopping state remain, without adding a cue for a wholly unknown current amount

### Requirement: Reuse loaded titles and resolve missing contributors lazily

Source disclosure SHALL use loaded Planner names first and resolve missing titles through the existing recipe GET only when needed for an open disclosure. Duplicate contributor IDs SHALL share an in-flight read. Loading and unavailable states SHALL remain honest and nonblocking. Results SHALL belong to the selected absolute week/session and current contributors, without new grocery-response title fields.

#### Scenario: Loaded supper titles need no extra lookup
- **WHEN** the selected week's contributor recipes already have nonblank names in Planner
- **THEN** expanding sources shows those names immediately without extra recipe-detail requests

#### Scenario: Lunch-only contributor is absent from supper cards
- **WHEN** a grocery contributor has a recipe-bearing other-meal entry but no supper card in the loaded week
- **THEN** expanding its sources resolves the missing name through the existing recipe GET while retaining the ingredient's quantity and check state
- **AND** duplicate references to that ID across rows or occurrences share one in-flight request

#### Scenario: Grocery live refresh introduces another contributor
- **WHEN** an independent grocery refresh updates source IDs while loaded Planner cards remain unchanged
- **THEN** an open disclosure uses loaded names for matching IDs and lazily resolves newly missing IDs
- **AND** results for contributors no longer present cannot reappear in that disclosure

#### Scenario: Change week or session during title resolution
- **WHEN** a missing-title read remains pending and the selected absolute week or household/demo session changes
- **THEN** the old result cannot populate the new disclosure or replace its names, checks or quantities

#### Scenario: Lookup fails or returns no usable title
- **WHEN** a missing-title read fails, returns not found or has a blank title
- **THEN** the disclosure shows the localized unavailable-title fallback, retains any known-ID original-review link and does not block shopping
- **AND** requests do not loop automatically; a later deliberate reopen can retry

#### Scenario: Authoritative Planner names change
- **WHEN** a subsequent schedule read supplies a current nonblank name for a contributor already resolved lazily
- **THEN** the current Planner name takes precedence over that disclosure session's cached name without grocery recomputation

### Requirement: Preserve original quantity inspection from grocery sources

Each source link SHALL initially open original-quantity review independently of planned portions or previews. Consultation SHALL not change shopping or plan state. A separate explicit Plan transition SHALL enter normal guarded planning without assigning by itself, while original evidence remains accessible. Missing/deleted access SHALL fail honestly. Closing without assignment SHALL restore the source week and shopping state.

#### Scenario: Planned recipe for six opens original basis two
- **WHEN** its title is activated from groceries
- **THEN** original two-serving evidence and source access appear, with no automatically applied dated quantities or assignment
- **AND** Plan is available as a deliberate transition rather than an immediate planning write

#### Scenario: Return after source consultation
- **WHEN** a person closes original review and returns to groceries
- **THEN** the selected week, checks and available list state remain without read-triggered recomputation

#### Scenario: Choose Plan deliberately
- **WHEN** Plan is activated in source review
- **THEN** normal dated target checks and assignment/recovery protections apply before a subsequent assignment can be requested
- **AND** merely transitioning neither clears quantity state nor acknowledges shopping checks

### Requirement: Make source disclosure accessible and quiet

The book control SHALL have a localized ingredient-specific name, expanded state and associated region, keyboard operation, visible focus and a 48 CSS px target. Collapsed source content SHALL be absent from reading/focus order. It SHALL stay distinct from checkboxes and aisle tags. Expanded titles and known subtotals SHALL wrap legibly at 320 CSS px, 200% text and English/French phone/tablet sizes.

#### Scenario: Keyboard and long French titles
- **WHEN** a person expands sources by keyboard in a narrow French layout
- **THEN** focus stays on the control, expanded state updates, Used in's French equivalent and links enter reading order, and long titles do not obscure checks, totals or aisle actions
- **AND** collapse removes those links from focus order

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

Accepted food labels and exact aliases SHALL reference app-owned release/food revisions and local model-authoring/review provenance. Model confidence SHALL NOT establish exact equivalence. A global release SHALL bind reviewed affected-set and reversal evidence; it SHALL NOT silently rewrite private corrections, saved meaning or checks.

#### Scenario: Reviewed model-authored label revision
- **WHEN** a proposed app-owned release renames a label without changing the reviewed food/purchase meaning
- **THEN** stable IDs and saved corrections survive and only presentation changes

#### Scenario: Private correction
- **WHEN** one household corrects shopping name or category
- **THEN** no global alias is automatically published

#### Scenario: Release changes meaning
- **WHEN** a proposed release changes an alias target or purchase qualifier
- **THEN** the affected mappings, rows and manual-category conflicts are explicit in its reviewed transition/reversal evidence rather than silently migrated as labels

### Requirement: Qualify a bounded model-authored vocabulary

The app SHALL use a bounded model-authored vocabulary whose reviewed UTF-8 JSON format, release revision and raw hash are pinned. Accepted entries SHALL have stable app IDs, labels, exact aliases, purchase qualifiers and local provenance. No imported external dataset, licence/attribution package or download SHALL be required for this vocabulary.

#### Scenario: Reviewed exact bilingual aliases
- **WHEN** onion and oignon have individually reviewed exact aliases for the same fresh bulb-onion purchase
- **THEN** qualified ingestion saves that food/release association rather than guessing from viewer locale

#### Scenario: Active alias collision
- **WHEN** a proposed release maps one exact match key to two different active purchase identities
- **THEN** adoption rejects that collision before publishing the release or changing saved mappings

#### Scenario: Model confidence without exact evidence
- **WHEN** a model proposes a confident alias for an ambiguous term such as échalote
- **THEN** it remains unmapped with source shopping spelling until its exact purchase meaning is reviewed

#### Scenario: Purchase and unit distinctions
- **WHEN** fresh/canned tomato or 400g/800g packages share a food name and a language alias
- **THEN** purchase qualifiers/package facts remain separate and no capacity, regional-unit or mass-volume conversion is inferred

### Requirement: Reload persisted vocabulary without inference

The vocabulary SHALL persist as versioned UTF-8 JSON on disk with stable IDs, EN/FR labels or explicit missing labels, aliases, qualifiers, provenance and every referenced release. Reads, recomputation, restart and restore SHALL use persisted/restored bytes without AI, translation, external lookup, implicit reseed or regeneration.

#### Scenario: Restart with providers unavailable
- **WHEN** the app restarts with a valid persisted vocabulary and providers unavailable
- **THEN** the same saved associations/labels load from disk without model/network calls or changed revision/hash

#### Scenario: Missing referenced vocabulary
- **WHEN** saved mappings require a missing or corrupt vocabulary file/release
- **THEN** loading fails explicitly instead of substituting a seed, inventing labels or rewriting those mappings

#### Scenario: Ordinary unmapped source
- **WHEN** a source term has no accepted exact alias in the captured vocabulary
- **THEN** it retains source shopping spelling and conservative fallback without a runtime translation request

### Requirement: Guard vocabulary replacement by expected revision

A vocabulary replacement SHALL validate its complete document and expected current revision/hash before publication. Stale or different valid existing data SHALL NOT be overwritten implicitly. Referenced prior releases SHALL remain available; interruption recovery SHALL retain the accepted operation/bytes rather than generate a new vocabulary.

#### Scenario: Stale replacement
- **WHEN** an update supplies an old expected revision/hash after another release commits
- **THEN** it conflicts without replacing the current file or saved references

#### Scenario: Existing valid vocabulary on installation
- **WHEN** initial-install input encounters a different valid persisted/restored vocabulary
- **THEN** it does not reseed or overwrite that file

#### Scenario: Interrupted publication
- **WHEN** publication commits accepted vocabulary bytes but delivery is interrupted
- **THEN** recovery completes that retained operation without model regeneration or a new unreviewed revision

### Requirement: Preserve protected shopping corrections

Qualified mapping changes SHALL keep private human shopping names, explicit association clears and household category decisions protected. A changed or ambiguous purchase meaning SHALL clear or explicitly requalify its association, never retain an unrelated FoodId. Conflicting prior manual categories SHALL remain unresolved; private corrections SHALL NOT become global aliases.

#### Scenario: Name changes purchase meaning
- **WHEN** a person changes onion shopping meaning to canned tomato without a qualified same-food association
- **THEN** the onion FoodId is cleared or explicitly requalified rather than retained behind the new name

#### Scenario: Explicit mapping clear
- **WHEN** a person saves a cleared mapping and delayed provider or reimport work completes
- **THEN** the clear/protection survives and that work cannot revive the earlier association

#### Scenario: Conflicting manual categories
- **WHEN** aliases proposed for one food carry conflicting prior household aisle corrections
- **THEN** all prior human decisions remain retained and the conflict is not resolved by source order, newest suggestion or model confidence

### Requirement: Include vocabulary identities in full recovery

Full backup SHALL retain exact vocabulary JSON and all referenced revisions, saved mapping/content links and protected household overrides/clears in one coherent captured set. Full restore SHALL validate format, hashes and complete reference membership before writes and restore those facts without network/model calls or bundled-seed substitution.

#### Scenario: Full offline recovery round trip
- **WHEN** a full backup is restored into an isolated destination and exported again offline
- **THEN** IDs, JSON bytes/revisions, labels, aliases, qualifiers, provenance, saved references and private corrections remain exact

#### Scenario: Invalid required identity artifact
- **WHEN** restore encounters missing required JSON, unsupported format, checksum mismatch or unknown food/release reference
- **THEN** it rejects before any destination write rather than partially restoring or replacing identity with fallback guesses

#### Scenario: Vocabulary changes during capture
- **WHEN** dictionary bytes and saved mapping/content revisions change during a backup capture
- **THEN** capture either retains one coherent versioned set or rejects/retries under its existing fence; it cannot publish a valid-looking archive with dangling references

### Requirement: Preserve check focus and viewport across sorting

Checking or unchecking any row SHALL NOT focus Edit/category controls, open another action or scroll the viewport to the sorted destination. Keyboard focus SHALL remain useful on the same stable checkbox; if its row disappears, focus SHALL use a stable nearby list control without jumping.

#### Scenario: Pointer and touch
- **WHEN** an extra or normal row is checked by pointer/touch and moves in sort order
- **THEN** scroll position is retained and Edit does not receive focus

#### Scenario: Keyboard
- **WHEN** Enter or Space toggles a row
- **THEN** only that action fires and focus remains usable without scrolling to Edit

#### Scenario: Projected extra disappears
- **WHEN** checking a current extra removes it from a future-week shopping view
- **THEN** focus moves to a stable adjacent list control only if needed without viewport jump

### Requirement: Preserve culinary units without automatic metric conversion

Cups, teaspoons and tablespoons SHALL remain independent quantity families. Equivalent English and French aliases SHALL normalize within each family; quantities SHALL NOT automatically convert to millilitres or between those families.

#### Scenario: Bilingual cup and spoon aliases
- **WHEN** current coherent ingredients declare cup/cups/tasse, tsp/teaspoon/c. à thé or tbsp/tablespoon/c. à soupe
- **THEN** aliases aggregate within their own family with exact quantities preserved, independently of millilitres and the other families

### Requirement: Preserve plans and rebuild every grocery list during migration

Migration SHALL preserve every planned meal/calendar event and all protected household facts while recalculating grocery lists for every persisted list week and assignment-implied week. It SHALL preserve manual extras, corrections and history. An active list SHALL NOT require plan/event deletion or an empty-list gate.

#### Scenario: Populated calendar at upgrade
- **WHEN** migration starts with planned meals and cooking/non-cooking events in past, current and future weeks
- **THEN** their IDs, dates, status, recipe links and serving/preparation facts remain unchanged
- **AND** every persisted or assignment-implied grocery week is included in the rebuild inventory, without deleting events to obtain an empty-list state

#### Scenario: Stored week has no current assignment
- **WHEN** a persisted grocery-list week has no current recipe-bearing assignment
- **THEN** migration still recalculates that week's recipe demand under the new model and preserves its manual extras and history

#### Scenario: Assignment week has no stored grocery list
- **WHEN** a preserved assignment implies a week without a persisted grocery list
- **THEN** migration includes that week in the rebuild and creates its required derived list without duplicating the assignment or event

#### Scenario: Bilingual identities in rebuilt lists
- **WHEN** startup migration upgrades recipes and recomputes affected weeks using the persisted baseline vocabulary
- **THEN** equivalent English and French ingredients resolve to unified `FoodId` buckets while retaining exact package/unit distinctions, saved overrides and conservative fallback for unmapped lines
- **AND** recomputation performs no runtime AI or external translation calls

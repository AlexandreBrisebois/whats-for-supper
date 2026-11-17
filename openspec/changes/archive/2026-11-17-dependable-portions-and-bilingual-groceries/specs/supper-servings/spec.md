# Spec Delta

## MODIFIED Requirements

### Requirement: Share one authoritative projection across consumers

Home dated ingredients, proposed/assigned detail, cooking and groceries SHALL share canonical original facts and server-owned dated scaling. Temporary previews use that owner with an independent count. Assigned reads reject stale occurrence identity; original reads remain compatible through the common adapter. Reads SHALL NOT assign, save portions, call providers or materialize preparation.

#### Scenario: Plan and cook for six
- **WHEN** a recipe with basis two and 200 g pasta is planned for six
- **THEN** dated detail and cooking show 600 g and its grocery contribution is 600 g

#### Scenario: Proposed date before assignment
- **WHEN** an unassigned candidate is read for a date configured for four
- **THEN** its default dated projection uses four without requiring assignment or changing saved state

#### Scenario: No selected or proposed date
- **WHEN** recipe reading has no date context
- **THEN** its default is original quantities and an explicitly selected 2/4/6 preview remains a separate read-only projection

#### Scenario: Converted and edited canonical record
- **WHEN** a canonical content revision replaces legacy live supply reads
- **THEN** all quantity consumers use that revision and its original amounts, with grocery normalization/aggregation after projection rather than another recipe ingredient parser

#### Scenario: Home ingredients and dated Cook agree
- **WHEN** Home Tonight and Cook refer to the same captured assigned recipe, date and effective portions
- **THEN** Home uses the shared dated projection with the same reliable amounts and completeness before display rounding, including frozen prepared portions
- **AND** late results from an earlier recipe/date/occurrence cannot replace the current list; pending, failure or changed-plan state is explicit rather than labeling original strings as scaled
- **AND** opening the ingredient list performs no assignment, portions, grocery, preparation or completion write

### Requirement: Scale independently aligned ingredient amounts

Known canonical amounts SHALL scale only for their stable original-basis line identities. Missing/uncertain lines do not invalidate other known lines. Legacy name/source matching is a conservative conversion/import boundary, not a second live quantity owner. Unknown/conflicting facts retain text. Reads SHALL NOT guess text numbers, call AI or repair saved data.

#### Scenario: Four-portion shells recipe with omitted seasonings
- **WHEN** original yield is four and canonical lines converted from coherent unambiguous source facts retain 12 shells, 1 onion, 450 g beef and 500 ml marinara while salt and pepper lack reliable amounts
- **THEN** preview two shows 6 shells, 0.5 onion, 225 g beef and 250 ml marinara; preview four shows 12, 1, 450 g and 500 ml; preview six shows 18, 1.5, 675 g and 750 ml
- **AND** seasonings retain their original text and honest completeness state, other verified lines scale, and the recipe is not described as completely quantified

#### Scenario: Missing middle ingredient
- **WHEN** a lime line has no structured amount between verified garlic and honey, followed by known salmon and sesame amounts
- **THEN** garlic, honey, salmon and sesame retain their own amounts and scale independently; lime is not given honey's quantity

#### Scenario: Ambiguous duplicate or changed source
- **WHEN** legacy conversion cannot associate an amount unambiguously, source/current strings conflict or an association has become invalid without an explicit accepted correction
- **THEN** affected amounts are unresolved instead of guessed, and unrelated verified bindings remain usable

#### Scenario: Intentional unquantified text and packages
- **WHEN** an ingredient says salt to taste or oil for frying, or a verified quantity is two 400 g cans
- **THEN** the direction remains ordinary unquantified text and scaling changes the can count without multiplying its package size or instruction numbers

#### Scenario: Legacy garlic count exposes a placeholder unit when scaled
- **WHEN** original wording is `2 Gousses d'ail`, basis is two, and coherently associated legacy supply records amount 2, name `Gousses d'ail` and the generic placeholder unit `unit`
- **THEN** detail at four portions displays `4 Gousses d'ail`, never `4 unit Gousses d'ail`; returning to original displays `2 Gousses d'ail`
- **AND** the equivalent canonical amount-2, null-unit count has the same display, while genuine measurement units remain visible
- **AND** preview/read does not rewrite saved ingredients, units, extraction evidence or revisions, perform implicit conversion, or call a provider
- **AND** grocery demand includes each recipe contribution once; a companion recipe recorded with unit `Gousses` remains conservatively separate unless equivalence is independently established, rather than merging because detail suppresses the placeholder
- **AND** this display regression does not authorize generic count conversion, bilingual garlic/ail merging or bulk repair of existing recipes

#### Scenario: Shared consumers and unknown basis
- **WHEN** the same aligned recipe/count is read through preview, proposed or assigned detail, cooking and grocery contribution
- **THEN** reliable numeric amounts and completeness agree across consumers before display rounding
- **AND** an unknown original yield prevents a scaling factor, offers original evidence/correction, and is never replaced by family size

#### Scenario: Explicit canonical identities distinguish duplicate names
- **WHEN** distinct canonical lines have the same descriptive name but their own accepted amounts and stable identities
- **THEN** scaling retains each association without re-matching names or inventing identity from grocery grouping keys

#### Scenario: Valid unquantified lines and correction flags
- **WHEN** a canonical collection includes legitimate unquantified directions beside numeric amounts
- **THEN** the directions remain ordinary text without a correction flag solely for missing numbers; technical completeness and saved household report membership retain their separate meanings

### Requirement: Scale each usable ingredient from its saved basis

With known positive recipe basis B and target T, a usable exact scalar or each range endpoint Q SHALL contribute Q times T divided by B under its declared proportional policy; explicitly fixed facts SHALL remain fixed. Scaling SHALL use the original amount on every calculation, not a prior projection. It SHALL precede display rounding and weekly unit aggregation. Package capacities, names, notes and unrelated instruction numbers SHALL NOT be multiplied. Eligible step quantities SHALL use validated revision-bound ingredient allocations (`instructionProjection`) under the cooking contract in both cooking and recipe-detail reading (2/4/6 preview and dated contexts), hiding the original-quantities instruction limitation notice whenever `instructionProjection` is present and never using generic text replacement.

#### Scenario: Double then triple a recipe
- **WHEN** a two-serving recipe contains 200 g pasta and is viewed for four, then six
- **THEN** projections show 400 g, then 600 g, while the saved amount remains 200 g

#### Scenario: Package quantity
- **WHEN** a usable structured ingredient represents two cans with a descriptive 400 g package size and the multiplier is three
- **THEN** the count becomes six cans and the descriptive 400 g size remains unchanged

#### Scenario: Original exact fractions and fixed values
- **WHEN** an original 1/3-cup proportional ingredient is repeatedly projected and an explicit fixed quantity is present
- **THEN** calculation always starts from exact original facts and the fixed quantity does not change

#### Scenario: Recipe detail projects validated step quantities in preview and dated contexts
- **WHEN** `RecipeDetailSheet` renders a 2/4/6 preview or a proposed/assigned dated context whose projection includes `instructionProjection`
- **THEN** the Instructions section renders the projected `instructionProjection` step quantities while preserving section headings, fixed metrics and uncertain or unquantified spans in their original wording, hides the original-quantities instruction limitation notice whenever `instructionProjection` is present, and restores original instruction wording when viewing original recipe quantities

### Requirement: Report incomplete scaling without invented quantities

Missing basis, unreliable amounts and stale source SHALL remain truthful in authoritative projections, without invented quantities or complete partial totals. Recipe detail SHALL retain original text and missing-basis correction but omit generic review warnings and replacement cues. Other consumers retain their feedback. Intentional unquantified directions remain normal text; usable contributions scale independently. Reads/calculation SHALL NOT call AI.

#### Scenario: Salt to taste is normal recipe content
- **WHEN** an ingredient says salt to taste or oil for frying
- **THEN** its original direction remains normal text without a correction warning or invented number

#### Scenario: Yield is missing
- **WHEN** a dated recipe has no reliable original serving basis
- **THEN** original quantities remain visible and no complete scaled amount is claimed; recipe detail offers Set recipe portions with its saved-change explanation in the editor, while other consumers retain their existing correction/original feedback

#### Scenario: Ingredient text was edited independently
- **WHEN** current ingredient text no longer agrees with the structured supply's source basis
- **THEN** stale supply quantities are not presented as current scaled needs and the response remains unresolved; recipe detail retains original text/inspection without a generic review warning or replacement cue, while other consumers retain their existing correction/re-import feedback

#### Scenario: Remove generic detail review without changing completeness
- **WHEN** a recipe-detail preview has usable numeric lines and unreliable lines
- **THEN** verified lines scale and other lines retain original text, with no generic amounts-review row, reserved warning space, icon, badge, tooltip or color substitute
- **AND** authoritative partial/completeness data and grocery known-subtotal semantics remain honest under the dependable-check contract, without prior-unknown check warnings; no all-amounts-adjusted claim is added

### Requirement: Preserve confirmed prepared portions

Explicit preparation SHALL freeze the occurrence's effective portions or its unconfigured original-basis context. Later usual-portion changes SHALL not rescale that prepared meal. Prepared dates SHALL be read-only in Portions. No separate leftovers amount SHALL travel with a meal; unprepared movement continues to use the destination date's portions.

#### Scenario: Default changes after preparation
- **WHEN** Friday lasagna was prepared Tuesday for six and the household default later changes to four
- **THEN** Friday retains six prepared portions and its ingredient/grocery contribution is not reduced by that default edit

#### Scenario: Read current recipe after preparation
- **WHEN** a meal prepared for six is consulted after recipe content or basis changes
- **THEN** ingredients and eligible steps use the current recipe at recorded six, without changing that count, actual preparation date or occurrence/history
- **AND** no historical recipe snapshot is implied; recorded original-context preparation without a count stays unknown/original rather than gaining a count

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

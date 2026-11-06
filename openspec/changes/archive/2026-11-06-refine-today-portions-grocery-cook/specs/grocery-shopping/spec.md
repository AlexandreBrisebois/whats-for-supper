## MODIFIED Requirements

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
- **WHEN** a numeric quantity lacks the usable unit needed by the existing amount-hint rule
- **THEN** that display rule still applies, with no fabricated unit, total, Review amounts or replacement cue

#### Scenario: Complete and intentionally unquantified rows
- **WHEN** an amount is complete or content is intentionally unquantified such as salt to taste
- **THEN** complete amounts keep their existing presentation and intentionally unquantified text gains no warning or invented numeric amount

### Requirement: Distinguish incomplete totals from prior unknown checked amounts

A displayable numeric amount with quantityComplete=false SHALL remain a known subtotal; without a number no visible current-amount cue SHALL be added. prior_amount_unknown SHALL retain its distinct visible prior-check warning independently of completeness. A complete current amount remains a full total. Opening sources or recipes SHALL not acknowledge or clear either underlying state.

#### Scenario: Prior unknown amount is now complete
- **WHEN** a checked row has prior_amount_unknown and a complete current 600 g total
- **THEN** the row retains prior-check review feedback and displays 600 g as the full current amount rather than an incomplete subtotal
- **AND** opening/closing sources or following a recipe link does not clear that marker

#### Scenario: Both warning conditions occur
- **WHEN** a row is incomplete and also has prior_amount_unknown
- **THEN** the known subtotal, when present, appears once and the existing prior-check warning remains visible without Review amounts or duplicate generic calls to review

#### Scenario: Explicit shopping acknowledgement
- **WHEN** the person explicitly submits a positive check for the affected name
- **THEN** the existing check acknowledgement policy can clear its prior-unknown marker without falsely claiming incomplete quantities are resolved
- **AND** unrelated checks and warnings retain their existing state

#### Scenario: Unknown current amount with prior-check warning
- **WHEN** current quantity is unknown and prior_amount_unknown is present
- **THEN** no current total or replacement cue is invented, while the existing prior-check row/list feedback remains and source consultation clears neither state

### Requirement: Keep quantity warnings outside collapsed sources

Known-subtotal feedback and prior-unknown checked-amount review SHALL remain visible outside collapsed sources. A wholly unknown current amount SHALL carry no new visible cue after Review amounts is removed. Source expansion or Plan SHALL not clear quantity state or acknowledge checks. A complete total with prior_amount_unknown remains a full total plus its separate prior-check warning. Groceries SHALL gain no usual-portions setting/reset.

#### Scenario: Incomplete and prior unknown together
- **WHEN** a collapsed row has both incomplete quantities and prior_amount_unknown
- **THEN** the known subtotal, if any, and prior-check warning remain outside expansion, independently of book and aisle controls; wholly unknown current amounts receive no replacement cue

#### Scenario: Complete amount with prior warning
- **WHEN** current 600 g is complete but prior checked amount was unknown
- **THEN** 600 g remains the full current amount with prior-check feedback, including after source consultation and Plan transition

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
- **THEN** no book control, Used in heading, source title or fictitious link is shown, while any known-subtotal feedback and prior-check warning remain, without adding a cue for a wholly unknown current amount

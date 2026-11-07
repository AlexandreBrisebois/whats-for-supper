# Spec Delta

## MODIFIED Requirements

### Requirement: Scale each usable ingredient from its saved basis

With known positive recipe basis B and target T, a usable exact scalar or each range endpoint Q SHALL contribute Q times T divided by B under its declared proportional policy; explicitly fixed facts SHALL remain fixed. Scaling SHALL use the original amount on every calculation, not a prior projection. It SHALL precede display rounding and weekly unit aggregation. Package capacities, names, notes and unrelated instruction numbers SHALL NOT be multiplied. Eligible step quantities SHALL use validated revision-bound ingredient allocations under the cooking contract, never generic text replacement.

#### Scenario: Double then triple a recipe
- **WHEN** a two-serving recipe contains 200 g pasta and is viewed for four, then six
- **THEN** projections show 400 g, then 600 g, while the saved amount remains 200 g

#### Scenario: Package quantity
- **WHEN** a usable structured ingredient represents two cans with a descriptive 400 g package size and the multiplier is three
- **THEN** the count becomes six cans and the descriptive 400 g size remains unchanged

#### Scenario: Original exact fractions and fixed values
- **WHEN** an original 1/3-cup proportional ingredient is repeatedly projected and an explicit fixed quantity is present
- **THEN** calculation always starts from exact original facts and the fixed quantity does not change

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

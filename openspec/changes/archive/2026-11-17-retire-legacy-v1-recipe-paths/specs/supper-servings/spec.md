## MODIFIED Requirements

### Requirement: Report incomplete scaling without invented quantities

Authoritative projections SHALL read structured canonical ingredient lines exclusively, keeping missing basis and unreliable amounts truthful without invented quantities or complete partial totals, and failing closed when populated recipes lack canonical content. Recipe detail SHALL retain original text and missing-basis correction without generic review warnings. Intentional unquantified directions remain normal text; reads SHALL NOT call AI.

#### Scenario: Salt to taste is normal recipe content

- **WHEN** an ingredient says salt to taste or oil for frying
- **THEN** its original direction remains normal text without a correction warning or invented number

#### Scenario: Yield is missing

- **WHEN** a dated recipe has no reliable original serving basis
- **THEN** original quantities remain visible and no complete scaled amount is claimed; recipe detail offers Set recipe portions with its saved-change explanation in the editor, while other consumers retain their existing correction/original feedback

#### Scenario: Ingredient text was edited independently

- **WHEN** saved canonical ingredient lines were edited independently of retained raw metadata supply
- **THEN** projections read only the saved canonical ingredient lines without consulting retained supply or deriving a `stale_source` fallback, and recipe detail retains current canonical text without a generic review warning or replacement cue

#### Scenario: Populated recipe without structured canonical content fails closed

- **WHEN** a projection or weekly grocery derivation reads an unready empty capture placeholder with no canonical or legacy ingredient content, or reads a populated recipe lacking structured v2 canonical content
- **THEN** the empty capture placeholder projects zero lines without error, whereas the populated non-canonical recipe fails closed instead of scraping legacy `ingredients` strings, binding `rawMetadata.supply`, or silently returning an empty list

#### Scenario: Remove generic detail review without changing completeness

- **WHEN** a recipe-detail preview has usable numeric lines and unreliable lines
- **THEN** verified lines scale and other lines retain original text, with no generic amounts-review row, reserved warning space, icon, badge, tooltip or color substitute
- **AND** authoritative partial/completeness data and grocery known-subtotal semantics remain honest under the dependable-check contract, without prior-unknown check warnings; no all-amounts-adjusted claim is added

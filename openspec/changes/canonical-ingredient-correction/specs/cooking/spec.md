# Spec Delta

## MODIFIED Requirements

### Requirement: Load recipe content for the cooking view

On cooking entry the view SHALL display loading feedback while requesting detail for the entry recipe. On a successful detail read it SHALL use returned canonical current ingredient lines and supported instructions. Dated entry SHALL use those canonical lines through the matching supper-servings ingredient projection; entry without a date SHALL retain canonical original-basis text and quantities without a preview calculator. Missing/conflicting projection SHALL be visible rather than silently presenting base amounts as scaled.

#### Scenario: Detail request pending
- **WHEN** cooking detail has not finished loading
- **THEN** the cooking loading surface is displayed

#### Scenario: Recipe detail available
- **WHEN** the detail request succeeds with ingredients and parseable instructions
- **THEN** the preparation checklist uses the canonical original or matching dated ingredient context and subsequent steps use those returned instructions

#### Scenario: Same recipe has retained legacy supply
- **WHEN** canonical current ingredients differ from retained legacy metadata
- **THEN** cooking uses the canonical current ingredients and does not independently rebuild quantities from metadata supply or legacy strings

#### Scenario: Valid unquantified ingredient
- **WHEN** a canonical line is intentionally unquantified or has an honestly unknown amount
- **THEN** preparation retains its original wording without inventing a number or requiring numeric completion before cooking
- **AND** missing numeric data alone creates no ingredient-repair flag or new reading warning cue


### Requirement: Carry the planned supper date into cooking ingredients

Home, Planner and dated recipe detail SHALL carry the absolute supper date when entering cooking. Cooking SHALL identify its effective target and show the shared canonical ingredient projection for that recipe/date and captured occurrence. Reading SHALL NOT mark cooked, change the recipe basis or update dated portions. Home’s dated ingredient list and cooking SHALL agree for the same captured context before display rounding. Instructions, edits and bookmarks SHALL retain their owners; dated completion SHALL follow the captured occurrence rather than silently target today.

#### Scenario: Cook the planned six-serving supper
- **WHEN** a two-serving recipe is opened from a date configured for six
- **THEN** preparation shows three times each usable original amount with the six-serving context and no completion request is sent merely by opening it

#### Scenario: Home ingredients and Cook agree
- **WHEN** Home Tonight and its Cook entry refer to the same saved occurrence and effective portions
- **THEN** they use the same canonical line identities, original facts, reliable amounts and completeness for that assigned context rather than Home showing an independent original string list

#### Scenario: Prepared occurrence with a later recipe correction
- **WHEN** a prepared occurrence is consulted after a canonical recipe correction
- **THEN** its frozen portions, original preparation basis and receipt facts retain their existing meanings while ingredient reading uses the current canonical recipe projection
- **AND** no historical ingredient snapshot or new preparation authority is inferred


## ADDED Requirements

### Requirement: Keep cooking independent of ingredient correction publication

Cooking reads and source consultation SHALL NOT publish ingredient corrections or change household report membership. Recipe corrections SHALL use the existing guarded Edit and Save flow. Current checks, instruction position, drafts, captured occurrence and completion SHALL retain their existing owners across consultation and existing household reporting.

#### Scenario: Inspect evidence while cooking
- **WHEN** the cook opens an available original source or recipe detail
- **THEN** source consultation alone neither changes canonical amounts nor acknowledges household reports or completes the occurrence
- **AND** returning retains mounted preparation checks and reading position under the existing consultation requirements

#### Scenario: Canonical correction becomes available remotely
- **WHEN** another member saves changed canonical ingredients or basis for the active dated cooking context
- **THEN** the existing changed-quantities refresh path offers an explicit refresh with honest pending/failure behavior
- **AND** late prior-revision responses cannot silently install obsolete quantities or discard unrelated cooking work

#### Scenario: Temporary detail preview before returning to cooking
- **WHEN** the person selects a temporary ingredient preview in detail and returns to cooking
- **THEN** cooking retains its original or captured dated context instead of adopting the temporary count or any ingredient draft not saved

### Requirement: Preserve original instructions while projecting canonical ingredients

Canonical ingredient projection SHALL NOT multiply numbers inside instruction prose, change cooking times/equipment or publish instruction edits. Existing instruction editing and original-amount explanation SHALL remain independently available. Manual ingredient correction SHALL not replace unrelated instructions or source assets.

#### Scenario: Ingredient amount doubles but instruction names a package size
- **WHEN** canonical ingredient amounts are projected for twice the original basis while a step contains a package size or a fixed amount
- **THEN** that step text remains unchanged and the existing instruction-amount limitation remains available

#### Scenario: Save ingredient-only correction
- **WHEN** a guarded ingredient correction is saved and cooking subsequently refreshes
- **THEN** preparation uses its current canonical projection while instruction text, supported sections and source order remain unchanged unless separately edited

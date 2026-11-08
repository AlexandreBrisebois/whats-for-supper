# Spec Delta

## MODIFIED Requirements

### Requirement: Load recipe content for the cooking view

On cooking entry the view SHALL display loading feedback while requesting detail for the entry recipe. On a successful detail read it SHALL use returned canonical current ingredient lines and supported instructions. Dated entry SHALL use those canonical lines through the matching supper-servings ingredient projection; entry without a date SHALL retain canonical original-basis text and quantities without a preview calculator. Missing/conflicting projection SHALL be visible rather than silently presenting base amounts as scaled.

#### Scenario: Detail request pending
- **WHEN** cooking detail has not finished loading
- **THEN** the cooking loading surface is displayed

#### Scenario: Recipe detail available
- **WHEN** the detail request succeeds with ingredients and parseable instructions
- **THEN** the preparation checklist uses the canonical original or matching dated ingredient context and subsequent steps use that same revision’s original or validated projected instructions

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
- **THEN** its recorded prepared portion count, preparation date and receipt facts remain unchanged while ingredients and eligible steps use the current recipe projected to that recorded count
- **AND** no historical ingredient snapshot or new preparation authority is inferred


### Requirement: Explain original instruction amounts during scaling

Cooking SHALL show projected validated step quantities and original wording for uncertain spans. One concise contextual notice SHALL explain relevant uncertainty only when needed. Ingredients SHALL remain easy to consult without per-step warnings or confirmation prompts; time/equipment SHALL never be implied to scale.

#### Scenario: Step text contains half a cup
- **WHEN** a whole-ingredient half-cup span is validated and portions double
- **THEN** the rendered use becomes one cup; if its binding is uncertain, original wording remains with quiet contextual notice instead of a blanket original-step limitation

### Requirement: Edit a supported cooking instruction explicitly

From a focused instruction or single-page row, cooking SHALL offer editing of that step’s source instruction without adding section context to the editable value. Save SHALL submit original-basis instruction content with the captured content revision, retaining stable unaffected IDs, entries and section structure. Scaled rendered text SHALL NOT initialize the stored draft.

#### Scenario: Edit a legacy instruction
- **WHEN** a person edits the second supported string instruction and activates Save
- **THEN** the viewed recipe update contains the changed second string and the other instruction entries

#### Scenario: Edit a section child
- **WHEN** a person saves a child instruction in a supported section
- **THEN** the corresponding child text or name is replaced while the section and its other children remain

#### Scenario: Edit section content
- **WHEN** a section supplies a non-generic display prefix
- **THEN** the editor contains the source instruction without that added prefix

#### Scenario: Edit while scaled
- **WHEN** a rendered step shows 300 g from original 200 g
- **THEN** Edit initializes original 200 g wording and Save uses the coherent content revision

### Requirement: Apply a successful step edit locally

After a changed step update resolves successfully, cooking SHALL install the authoritative returned coherent content revision, ingredients and instruction bindings, reparse supported steps, close the editor and announce Step saved. Saving an unchanged supported instruction SHALL close the editor without sending an update.

#### Scenario: Save a changed step
- **WHEN** the instruction update request resolves successfully
- **THEN** the authoritative edited instruction and its coherent projection appear locally, the editor closes and a polite Step saved announcement is supplied

#### Scenario: Save unchanged text
- **WHEN** the editor value equals the supported step’s original editable instruction
- **THEN** the editor closes without an update request

### Requirement: Preserve cooking work when serving context changes remotely

A newer dated serving state or semantic recipe content revision SHALL NOT silently replace ingredient/step content or quantities in an active cooking session or discard checks, position or drafts. Cooking SHALL identify that updated quantities are available and offer an explicit refresh. Accepted refresh SHALL use the current coherent server ingredient/step projection with honest pending/failure feedback and retain unrelated cooking work.

#### Scenario: Portions increase while cooking is open
- **WHEN** another household member changes that supper from four to six
- **THEN** the cook can recognise the changed serving context and refresh it without losing the current instruction or unsaved edit

### Requirement: Return from quality reporting to the mounted cooking context

Dismissing the cooking report form SHALL retain the mounted ingredient checks and reading bookmark. After a successful report submission or resolution, cooking SHALL apply returned report metadata and close the form; changed semantic recipe content SHALL use the explicit coherent refresh path. A submission that reports a re-import launch failure SHALL leave the form open through its existing quality error handling.

#### Scenario: Dismiss a report draft
- **WHEN** a person closes the quality form during cooking
- **THEN** the cooking checks and reading bookmark remain

#### Scenario: Report or resolve succeeds
- **WHEN** the cooking report or resolution request returns successfully without a launch failure
- **THEN** report metadata is applied and any changed content revision is offered through explicit refresh and the quality form closes

#### Scenario: Launch fails after report save
- **WHEN** report submission returns its recipe with re-import launch failure
- **THEN** cooking applies that recipe but leaves the quality form open for its saved-report/launch-failure feedback

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

### Requirement: Project validated ingredient uses without changing unrelated instruction text

Cooking SHALL project only validated ingredient-use spans from the same original content revision and serving context as its ingredient list. Time, temperature, equipment, package capacities and unrelated numbers SHALL stay unchanged. Uses SHALL allocate existing demand without adding grocery requirements.

#### Scenario: Ingredient and fixed numbers together
- **WHEN** a doubled recipe step has verified 50 g partial use, 400 g package capacity, 20 minutes and 180 °C
- **THEN** only the use becomes 100 g; capacity, time and temperature remain unchanged

#### Scenario: Save ingredient-only correction
- **WHEN** a guarded ingredient correction is saved
- **THEN** original instruction text/order/sections stay retained and dependent quantity bindings revalidate before projected replacement

#### Scenario: Split oil
- **WHEN** total oil is 2 tbsp with two validated 1 tbsp allocations and portions double
- **THEN** steps show 2 tbsp each and groceries count 4 tbsp total, never 8 tbsp

### Requirement: Keep uncertain step scaling quiet and nonblocking

A stale, overlapping, missing, contradictory or unverified binding SHALL leave its affected source text unchanged without disabling cooking or eligible completion. Other valid bindings SHALL project. At most one contextual uncertainty notice SHALL appear for relevant scaled step wording, with correction/source access and no per-step warning clutter.

#### Scenario: Mixed coverage
- **WHEN** one step amount is valid and another binding is uncertain
- **THEN** the valid amount scales, uncertain text remains readable and one contextual notice is available

#### Scenario: Span mismatch
- **WHEN** a repeated ingredient phrase or Unicode edit no longer matches a validated span
- **THEN** no arbitrary occurrence is replaced and unaffected bindings remain usable

#### Scenario: Unknown basis
- **WHEN** recipe basis is unknown
- **THEN** trusted original measurements and step wording remain available without an invented multiplier or cooking block

### Requirement: Represent bounded ingredient-use allocation roles

Validated uses SHALL distinguish mention, whole total, original absolute partial, relative fraction, remainder, fixed and per-item meaning. Numeric remainder SHALL require a defined compatible exhaustive allocation sequence. Ambiguous alternatives, over-allocation and unknown or incompatible uses SHALL not yield fabricated exact amounts.

#### Scenario: Absolute partial and fraction
- **WHEN** total is 200 g with absolute 50 g use and a separate explicit half use at factor 1.5
- **THEN** absolute use renders 75 g, half stays half and any numeric half display agrees with projected demand

#### Scenario: Remainder
- **WHEN** known total 2 tbsp has a validated 1 tbsp prior use and explicit final remainder
- **THEN** double portions yields a provable 2 tbsp remainder; unknown or incompatible prior use keeps remainder wording without an invented number

#### Scenario: Per item
- **WHEN** a verified step says 1/2 tsp on each of 4 pieces and portions double
- **THEN** the linked count becomes 8 and the per-item dose remains 1/2 tsp

#### Scenario: Over-allocation and alternatives
- **WHEN** explicit exhaustive uses exceed the total or alternative branches cannot be identified
- **THEN** contradictory numeric bindings/remainders remain uncertain rather than increasing grocery demand

### Requirement: Preserve explicit partial uses after ingredient-total correction

An ingredient-total correction SHALL preserve saved original absolute partial-use amounts; those amounts SHALL still scale with portions. Relative fractions SHALL remain relative to the corrected total and proven whole uses SHALL track it. Inconsistent allocations SHALL receive quiet review without blocking cooking or silently redistributing amounts.

#### Scenario: Correct total without rewriting partial use
- **WHEN** total pasta changes from 200 g to 250 g while a validated step explicitly uses 50 g
- **THEN** its saved use stays 50 g and a portion factor of 1.5 renders 75 g, not 93.75 g or the whole total

#### Scenario: Relative half follows corrected total
- **WHEN** a step says add half and total changes from 200 g to 250 g
- **THEN** it remains half; any numeric original-basis annotation is 125 g and portion scaling uses that relationship

#### Scenario: Corrected total makes allocations inconsistent
- **WHEN** a total is reduced below its exhaustive explicit uses or a remainder becomes unprovable
- **THEN** affected numeric bindings/remainders revalidate or become uncertain with readable wording and quiet review, while cooking and eligible completion remain available

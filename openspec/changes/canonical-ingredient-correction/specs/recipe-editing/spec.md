# Spec Delta

## MODIFIED Requirements

### Requirement: Open initialized recipe-detail field drafts

For successfully loaded library detail, Settings SHALL offer Edit initialized from the authoritative saved detail: name, description, canonical ingredient rows, serving basis, cuisine and meal types. Ingredient drafts SHALL retain line identities and the captured content revision. Absent optional text and ingredients SHALL initialize empty; unknown basis SHALL remain unknown.

#### Scenario: Edit loaded detail
- **WHEN** a person opens Settings and activates Edit on successfully loaded library detail
- **THEN** the sheet offers initialized name, description, ingredient and cuisine fields, meal-type choices, Save changes and Cancel

#### Scenario: Initialize meal-type choices
- **WHEN** the person opens Edit
- **THEN** nonempty loaded meal types supply the draft choices
- **AND** if none are loaded, a trimmed category matching an offered choice supplies one choice, otherwise Supper supplies the draft default
- **AND** the offered choices are Breakfast, Brunch, Snack, Lunch, Supper, Sides, Dessert, Appetizer and Beverage

#### Scenario: Enter ordinary editing from Search
- **WHEN** a person opens an ordinary Search result and activates Edit
- **THEN** the existing editor initializes original saved ingredient facts and preserves its existing return navigation and household feedback semantics

### Requirement: Edit ingredient rows in the detail draft

The editor SHALL provide three separately labeled inputs per ingredient: amount, unit and free-text description. Amount and unit SHALL be independently optional, with no required quantity-state selector. It SHALL allow adding and removing rows. Changes SHALL affect only the draft before Save. Existing rows SHALL retain stable identities and relative order unless explicitly reordered; new rows SHALL receive new identities on save.

#### Scenario: Change and add ingredients
- **WHEN** a person changes an ingredient row and activates Add ingredient
- **THEN** the draft contains the changed row and an additional empty row

#### Scenario: Remove an ingredient
- **WHEN** a person removes a draft ingredient row
- **THEN** that row is removed while the other rows retain their relative order

#### Scenario: Correct a numeric amount or unit
- **WHEN** a person corrects an ingredient amount or unit in Edit
- **THEN** the draft permits the complete current description, amount and unit representation without silently retaining a conflicting old amount

#### Scenario: Independently blank quantity fields
- **WHEN** a person leaves amount blank, unit blank or both blank on a row with a description
- **THEN** the draft accepts those fields independently without requiring a confirmation choice or a recognized phrase

#### Scenario: Edit from a scaled view
- **WHEN** dated or preview reading shows 400 g for a recipe whose saved original line is 200 g pasta
- **THEN** Edit initializes amount 200, unit g and description pasta rather than 400
- **AND** an untouched measured row retains its own original facts when this row changes

### Requirement: Restrict local detail Save eligibility

The editor SHALL disable Save changes when the trimmed draft name is empty or no meal types are selected. Description, cuisine and ingredients SHALL be allowed to be empty in the local draft. Save SHALL also require valid supplied ingredient facts and a nonblank description on every nonempty row and a valid supplied positive serving basis; unknown omitted basis SHALL remain permitted.

#### Scenario: Name is blank
- **WHEN** the draft name is empty or whitespace-only
- **THEN** Save changes is disabled

#### Scenario: No meal type is selected
- **WHEN** the person deselects all draft meal types
- **THEN** Save changes is disabled until at least one is selected and the name is nonblank

#### Scenario: Reject invalid ingredient numeric input
- **WHEN** a supplied ingredient amount is negative, non-finite or nonnumeric
- **THEN** Save is unavailable with correction feedback in the editor and the draft is retained
- **AND** valid zero amounts, unitless counts and intentionally unquantified ingredients are not rejected solely for those forms

#### Scenario: Description required on a partial row
- **WHEN** a row contains an amount or unit but its description is blank
- **THEN** Save is disabled with row-associated feedback and the draft is retained rather than silently discarding that row

### Requirement: Submit normalized detail fields for the loaded recipe

Enabled Save SHALL PATCH the loaded recipe with normalized name, description, final ordered canonical ingredient lines, cuisine and meal types plus the captured content revision. Description/unit text SHALL be trimmed, blank optional amount/unit fields mapped independently to null and wholly blank ingredient rows removed in order; a row containing only amount or unit SHALL require a description rather than being silently dropped; blank cuisine SHALL remain null. A basis edit SHALL use the same revision. Canonical lines and legacy ingredient arrays SHALL NOT be submitted together.

#### Scenario: Submit edited fields
- **WHEN** enabled Save changes is activated for loaded recipe R
- **THEN** PATCH targets R with normalized name, description, ingredientLines, expectedContentRevision, cuisineType and mealTypes rather than a different recipe or only the changed field

#### Scenario: Submit blank optional drafts
- **WHEN** Save changes is activated with blank description, blank cuisine and only blank ingredient rows, with a valid name and meal selection
- **THEN** the submission contains description as an empty string, cuisineType as null and ingredientLines as an empty array

### Requirement: Apply supplied non-null recipe-detail update fields

Authorized PATCH SHALL retain existing top-level non-null/omission and empty-value semantics for detail fields. Within a supplied canonical row, explicit null amount or unit SHALL clear that optional fact; it SHALL NOT be interpreted as an omitted top-level field. Ingredient, basis, instruction and shopping-association mutations SHALL require the current content revision at write cutover; canonical lines SHALL replace the current ordered collection and derive legacy strings. Successful updates SHALL retain recipe identity and advance its timestamp. Other field-only requests SHALL remain compatible.

#### Scenario: Store supplied detail fields
- **WHEN** an authorized PATCH supplies valid non-null detail fields and a current revision for any ingredient, basis, instruction or shopping-association mutation for an existing recipe and the update succeeds
- **THEN** those values are stored for that ID and its update timestamp is assigned

#### Scenario: Preserve omitted or null values
- **WHEN** an authorized PATCH omits a detail field or supplies null and the update succeeds
- **THEN** that stored field is unchanged, including an existing cuisine receiving null

#### Scenario: Replace with empty values
- **WHEN** an authorized PATCH supplies an empty description, an empty cuisine string, empty canonical ingredients or empty meal types with the required current content revision and succeeds
- **THEN** each supplied empty value replaces its stored value
- **AND** supplying empty meal types sets category to Supper without adding Supper to the stored meal-type array

### Requirement: Display the submitted snapshot after successful detail Save

After successful detail Save, the client SHALL display the authoritative returned saved recipe, its content revision and saved original ingredient facts, then leave editing. It SHALL NOT reconstruct quantities from submitted strings alone. Unrelated saved facts and existing departure behavior SHALL remain governed by their owners.

#### Scenario: Save resolves successfully
- **WHEN** a submitted detail-field update resolves successfully while the sheet remains mounted
- **THEN** the sheet displays returned authoritative name, description, canonical ingredients, cuisine, meal types, content revision and original facts through its existing detail presentation and exits editing

### Requirement: Mark search-derived recipe state pending with supported updates

When an authorized recipe PATCH supplies a non-null supported fact, the successful database save SHALL persist its recipe update and pending search/embedding states together. Existing derived state SHALL have its embedding fingerprint cleared; absent derived state SHALL be initialized pending. This SHALL NOT establish completed indexing.

#### Scenario: Invalidate existing derived recipe state
- **WHEN** an existing recipe with search-derived state receives a supported non-null PATCH and database save succeeds
- **THEN** the changed recipe is saved with search and embedding states pending and cleared embedding fingerprint

#### Scenario: Initialize absent derived recipe state
- **WHEN** a supported non-null PATCH succeeds for a recipe without search-derived state
- **THEN** pending derived state is created in the same database save as the recipe update

#### Scenario: Persist canonical correction and derived obligations
- **WHEN** a valid current-revision ingredient or basis correction is saved
- **THEN** its canonical facts, protection, content revision and existing durable affected grocery/search refresh obligations are saved together
- **AND** a later dispatch failure does not make the saved correction disappear or establish completed derived refresh

### Requirement: Retain editing and offer another attempt after detail Save failure

When the detail-field update request rejects while the sheet remains open, the editor SHALL remain open with its current drafts and display “Could not save changes. Try again.” Saving SHALL end and Save and Cancel SHALL become available subject to local Save eligibility. Starting another Save SHALL clear the prior error after any required revision reconciliation. Failure feedback SHALL NOT assert that stored data is unchanged or authorize blind replay of a possibly committed ingredient mutation.

#### Scenario: Save rejects
- **WHEN** a detail-field Save request rejects while the editor remains open
- **THEN** the current drafts remain editable, the failure message appears and Saving ends with Cancel and any locally eligible Save available

#### Scenario: Retry after failure
- **WHEN** a person activates an enabled Save after a detail-field Save failure and any required content revision reconciliation
- **THEN** the prior error clears and the current normalized drafts and required captured revision are submitted in another PATCH for the loaded recipe ID

## ADDED Requirements

### Requirement: Guard ingredient and basis edits with the captured revision
At canonical write cutover, ingredient, basis, instruction or shopping-association mutation SHALL require the captured current content revision. Stale or missing revisions SHALL return 409 and apply none of that PATCH. A request containing both canonical lines and legacy ingredient arrays SHALL be rejected without mutation. Other recipe-field-only PATCH requests SHALL retain existing compatibility.

#### Scenario: Another client saved first
- **WHEN** a person saves ingredient or basis edits using a revision preceding another successful correction
- **THEN** the API returns 409 without applying any field in that request
- **AND** the editor retains the local draft and offers current-content reconciliation rather than silently replaying it

#### Scenario: Old client sends an unversioned ingredient update
- **WHEN** an old client submits ingredient strings or basis without the required revision after cutover
- **THEN** it receives 409 requiring refresh and no requested field is overwritten

#### Scenario: Update unrelated fields without an content revision
- **WHEN** a PATCH changes only non-ingredient, non-basis fields
- **THEN** existing omission, null, validation and response behavior remains applicable

### Requirement: Adapt supported legacy ingredient edits conservatively
A revision-guarded legacy string-only ingredient update SHALL derive canonical lines without guessing quantities. Only demonstrably unchanged unambiguous line associations SHALL retain structured facts. Changed, new or ambiguous lines SHALL retain text with unresolved quantity facts until explicitly corrected; positional matching SHALL NOT transfer amounts.

#### Scenario: Change a legacy string
- **WHEN** a supported current-revision legacy edit changes an ingredient text that previously carried a numeric amount
- **THEN** the changed line does not silently inherit that old amount and unchanged unambiguous lines retain their facts

#### Scenario: Remove or duplicate a legacy row
- **WHEN** a supported legacy edit removes a row or makes its association ambiguous
- **THEN** quantities are not shifted to adjacent rows or duplicated by positional matching


### Requirement: Distinguish failed saving from post-save delivery failure
The editor SHALL retain drafts after validation, conflict or save failure. If persistence succeeded but later response, export or dispatch completion failed, subsequent authoritative reads SHALL expose saved facts and truthful pending work. Retry SHALL reconcile the current content revision rather than blindly replaying a possibly committed mutation.

#### Scenario: Reply is lost after persistence
- **WHEN** a correction commits but its success reply does not reach the client
- **THEN** the draft remains recoverable and a fresh detail read can establish the saved revision before another mutation

#### Scenario: Derived refresh remains pending
- **WHEN** a saved correction has a later refresh dispatch failure
- **THEN** the correction remains saved with its durable pending obligation and the UI does not claim refresh completed

### Requirement: Save explicit manual corrections atomically
A current-revision Save SHALL persist coherent accepted description, independently nullable amount/unit and basis with human protection. It SHALL preserve source evidence and unrelated recipe content. Original numeric amounts SHALL NOT be rescaled when the person changes only the basis.

#### Scenario: Correct an amount and a basis
- **WHEN** a person explicitly corrects a line amount and supplies a positive serving basis using the current revision
- **THEN** Save publishes those draft facts together without rewriting raw yield, unrelated ingredients, instructions or media

#### Scenario: Preserve explicit clearing
- **WHEN** a person clears a previously saved amount or unit and saves using the current revision
- **THEN** that explicit null remains protected from stale extraction and conversion retries without inventing a replacement

#### Scenario: Correct one of several measured rows
- **WHEN** a recipe has 200 g pasta and 100 ml sauce and a person changes pasta to 250 g then saves
- **THEN** reopen shows 250 g pasta and 100 ml sauce from authoritative structured facts
- **AND** dated projections and groceries use those saved facts rather than making all rows stale
### Requirement: Retain all drafts through an incompatible client upgrade

An old editor that submits ingredient or instruction content without the new guard SHALL receive an atomic upgrade conflict. The supported refresh route SHALL retain every unsaved field in that browser tab and offer reconciliation against current original facts before resubmission.

#### Scenario: Apparently name-only old editor
- **WHEN** an old detail editor changes only name but submits its entire ingredient array without a content revision
- **THEN** no field is applied and its name, description, ingredients, basis, cuisine and meal-type drafts survive the supported upgrade route

#### Scenario: Step draft upgrade
- **WHEN** a step editor encounters an upgrade conflict while viewing scaled portions
- **THEN** the original-basis draft survives, and no projected number is silently saved

### Requirement: Accept fractions and ranges in the ordinary amount field

The existing amount input SHALL accept the supported exact fraction, decimal and closed-range grammar without a new mandatory quantity selector. Validation SHALL retain correctable input. Shopping-name and fixed-scaling corrections SHALL use progressive disclosure.

#### Scenario: English and French input
- **WHEN** a person saves 1 1/2, ½, 2–3 or an unambiguous French decimal amount
- **THEN** reopening retains equivalent exact original facts and no display portion overwrites them

#### Scenario: Ambiguous input
- **WHEN** input could be a grouped thousands value or decimal under the supported grammar
- **THEN** validation asks for an unambiguous amount in the editor without changing current facts

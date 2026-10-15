# Recipe library — detail-editing delta

## Evidence and status (non-normative)

Documentation-only draft under A52 and BSL-recipe-library-008–010 in the [durable plan](../../../../../docs/openspec-baseline-plan.md). Implementation-supported under A10; browser/API/database checks not-run under A34. Not accepted, promoted or archived. Main recipe-library remains 16 requirements/31 scenarios; household-identity remains 36/92.

Existing library requirements “Retrieve the selected library recipe for detail reading”, “Return persisted recipe detail for an available record”, “Display returned recipe text and image reference”, “Display available recipe metadata in detail” and “Display returned ingredient strings in detail” retain retrieval/fact/display ownership. These additions begin with successfully loaded detail. Household-identity retains “Gate protected page entry with household access”, “Apply member context after household access” and “Authenticate protected API requests independently”; no per-member ownership or tenant-isolation rule is added.

U35–U37 retain discrepancies and limits: blank cuisine becomes null in the submission and is ignored by the server even though successful local completion hides it; PATCH documents a data object while the actual response DTO bypasses wrapping; success uses a submitted local snapshot without response reconciliation or GET. Database save precedes a caught indexing-trigger attempt and an uncaught recipe.info write, so reported failure need not mean no persistence. No atomic save-and-refresh, rollback, transport cancellation, idempotency, concurrency, library refresh, freshness or synchronization guarantee is inferred. Pending Save/Cancel are disabled, but fields and sheet dismissal remain available. Draft meal-type defaults are not persisted facts until a successful update stores them.

Reuse BSL-recipe-library-001–007 and preserve U29–U34 non-normatively. BSL-018–025, U23–U28 and historical member-creation limitations remain unchanged and non-normative here. Historical BSL-015/U22 limitation retained:

> However, archived tasks claim completion while PostgreSQL qualification remains unresolved and later implementation/archive authorization is absent from the plan.

That sentence records the earlier review state. The user's report of later authorization remains recorded; its original reference is pending. It is not a recipe-library requirement, new lifecycle approval or runtime result.

Ratings/notes submission, reporting/re-import, sharing, original-photo browsing, hero generation, cooking mode/instruction editing, planning assignments, search ranking, capture processing, deletion/restore/purge, preference policy and demo/preview/deployment variants are excluded. Total time, instructions, images, source/provenance, readiness, deletion and attribution are not fields in this detail-fields draft; adjacent controls do not extend this extraction.

## ADDED Requirements

### Requirement: Open initialized recipe-detail field drafts

For successfully loaded library detail, the Settings menu SHALL offer Edit. Edit SHALL open drafts for name, description, ingredient strings, cuisine and meal types, initialized from the currently loaded detail. Absent description, ingredients and cuisine SHALL initialize as empty text, an empty list and empty text respectively.

#### Scenario: Edit loaded detail
- **WHEN** a person opens Settings and activates Edit on successfully loaded library detail
- **THEN** the sheet offers initialized name, description, ingredient and cuisine fields, meal-type choices, Save changes and Cancel

#### Scenario: Initialize meal-type choices
- **WHEN** the person opens Edit
- **THEN** nonempty loaded meal types supply the draft choices
- **AND** if none are loaded, a trimmed category matching an offered choice supplies one choice, otherwise Supper supplies the draft default
- **AND** the offered choices are Breakfast, Brunch, Snack, Lunch, Supper, Sides, Dessert, Appetizer and Beverage

### Requirement: Edit ingredient rows in the detail draft

The editor SHALL allow changing individual ingredient strings, adding an empty row and removing a row. These actions SHALL affect the draft before submission.

#### Scenario: Change and add ingredients
- **WHEN** a person changes an ingredient row and activates Add ingredient
- **THEN** the draft contains the changed row and an additional empty row

#### Scenario: Remove an ingredient
- **WHEN** a person removes a draft ingredient row
- **THEN** that row is removed while the other rows retain their relative order

### Requirement: Restrict local detail Save eligibility

The editor SHALL disable Save changes when the trimmed draft name is empty or no meal types are selected. Description, cuisine and ingredients SHALL be allowed to be empty in the local draft.

#### Scenario: Name is blank
- **WHEN** the draft name is empty or whitespace-only
- **THEN** Save changes is disabled

#### Scenario: No meal type is selected
- **WHEN** the person deselects all draft meal types
- **THEN** Save changes is disabled until at least one is selected and the name is nonblank

### Requirement: Submit normalized detail fields for the loaded recipe

Activating enabled Save changes SHALL request PATCH `/api/recipes/{id}` for the loaded recipe's ID with all five draft fields. Name, description and ingredient strings SHALL be trimmed; empty ingredient strings SHALL be removed in order. Cuisine SHALL be trimmed and represented as null when blank. Selected meal types SHALL be submitted as an array.

#### Scenario: Submit edited fields
- **WHEN** enabled Save changes is activated for loaded recipe R
- **THEN** PATCH targets R with normalized name, description, ingredients, cuisineType and mealTypes rather than a different recipe or only the changed field

#### Scenario: Submit blank optional drafts
- **WHEN** Save changes is activated with blank description, blank cuisine and only blank ingredient rows, with a valid name and meal selection
- **THEN** the submission contains description as an empty string, cuisineType as null and ingredients as an empty array

### Requirement: Apply supplied non-null recipe-detail update fields

For an authorized PATCH of an existing recipe, when persistence and response completion succeed, the API SHALL store supplied non-null name, description, ingredient strings, cuisine and meal types and update the recipe timestamp, retaining its ID. Omitted or null values for these fields SHALL leave their stored values unchanged. Supplied empty strings or arrays SHALL replace those values.

#### Scenario: Store supplied detail fields
- **WHEN** an authorized PATCH supplies non-null detail fields for an existing recipe and the update succeeds
- **THEN** those values are stored for that ID and its update timestamp is assigned

#### Scenario: Preserve omitted or null values
- **WHEN** an authorized PATCH omits a detail field or supplies null and the update succeeds
- **THEN** that stored field is unchanged, including an existing cuisine receiving null

#### Scenario: Replace with empty values
- **WHEN** an authorized PATCH supplies an empty description, an empty cuisine string, empty ingredients or empty meal types and succeeds
- **THEN** each supplied empty value replaces its stored value
- **AND** supplying empty meal types sets category to Supper without adding Supper to the stored meal-type array

### Requirement: Show pending detail-save feedback

While the detail Save request is pending, the sheet SHALL show Saving on the Save control and disable Save and Cancel. This SHALL NOT imply that draft fields or sheet dismissal are disabled.

#### Scenario: Save is pending
- **WHEN** a detail-field Save has started and its request has not completed
- **THEN** Save displays Saving and both Save and Cancel are disabled

### Requirement: Discard unsubmitted recipe-detail drafts with Cancel

Before Save submission, Cancel SHALL leave editing, discard the draft in favor of the currently loaded detail and issue no detail-field PATCH. Reopening Edit SHALL initialize again from that loaded detail.

#### Scenario: Cancel before submission
- **WHEN** a person changes detail-field drafts and activates Cancel before submitting
- **THEN** the sheet returns to its loaded detail without requesting a detail-field update

#### Scenario: Reopen after Cancel
- **WHEN** the person reopens Edit after cancelling unsubmitted changes
- **THEN** the drafts reflect the currently loaded detail and its draft defaults rather than the discarded changes

### Requirement: Display the submitted snapshot after successful detail Save

When the detail-field update request resolves successfully while the sheet remains mounted, the sheet SHALL leave editing and use the normalized snapshot captured at submission for its displayed detail state. This completion SHALL NOT require applying the PATCH response or performing another detail GET.

#### Scenario: Save resolves successfully
- **WHEN** a submitted detail-field update resolves successfully while the sheet remains mounted
- **THEN** the sheet displays the submitted name, description, ingredient strings, cuisine and meal types through its existing detail presentation and exits editing

### Requirement: Retain editing and offer another attempt after detail Save failure

When the detail-field update request rejects while the sheet remains open, the editor SHALL remain open with its current drafts and display “Could not save changes. Try again.” Saving SHALL end and Save and Cancel SHALL become available subject to local Save eligibility. Starting another Save SHALL clear the prior error. Failure feedback SHALL NOT assert that stored data is unchanged.

#### Scenario: Save rejects
- **WHEN** a detail-field Save request rejects while the editor remains open
- **THEN** the current drafts remain editable, the failure message appears and Saving ends with Cancel and any locally eligible Save available

#### Scenario: Retry after failure
- **WHEN** a person activates an enabled Save after a detail-field Save failure
- **THEN** the prior error clears and the current normalized drafts are submitted in another PATCH for the loaded recipe ID

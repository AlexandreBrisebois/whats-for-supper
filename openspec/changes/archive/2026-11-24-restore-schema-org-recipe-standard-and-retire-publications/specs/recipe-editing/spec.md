# Spec Delta

## ADDED Requirements

### Requirement: Synchronize edited recipe portions and content to Schema.org Recipe on disk

Saving edited servings, structured ingredient lines, or instruction sections in recipe detail SHALL synchronize `{id}/recipe.json` on disk as a valid top-level `https://schema.org/Recipe` JSON document reflecting the updated `recipeYield`, rendered `recipeIngredient` lines, and `recipeInstructions` sections and steps without creating `.publications` staging directories.

#### Scenario: Editing servings and ingredients updates Schema.org Recipe file

- **WHEN** a person updates servings to 6 and edits an ingredient line or instruction step via `PATCH /api/recipes/{id}`
- **THEN** the database persists the structured portion revision and `{id}/recipe.json` is atomically updated as a top-level `https://schema.org/Recipe` document with `recipeYield` `"6 portions"`, the updated `recipeIngredient` array, and the updated `HowToSection` / `HowToStep` instructions

## MODIFIED Requirements

### Requirement: Initialize section header and step content drafts in detail edit mode

When a person opens Edit on loaded recipe detail, the editor SHALL initialize editable instruction sections with each section's header and its ordered step contents from the loaded recipe. Unheaded recipes SHALL initialize with an empty header.

#### Scenario: Open edit on a sectioned canonical recipe

- **WHEN** a person opens Edit on a recipe whose `instructionSections` include a named section "Sauce" with two steps
- **THEN** the editor displays an editable section header initialized to "Sauce" and two editable step content fields initialized to those step texts

#### Scenario: Open edit on an unheaded or empty-instruction recipe

- **WHEN** a person opens Edit on a recipe with unheaded steps or no instructions
- **THEN** any existing steps appear with an empty section header field, and a recipe with no instructions allows adding a step or section

### Requirement: Submit edited step headers and step content on detail Save

Activating enabled Save changes SHALL submit the draft's instruction sections (for structured recipes) or instruction entries (for legacy recipes) with trimmed section headers (represented as null when blank) and step content, and Cancel SHALL discard unsubmitted instruction edits.

#### Scenario: Save edited section headers and steps

- **WHEN** a person edits a section header and step content and activates Save changes
- **THEN** `PATCH /api/recipes/{id}` submits the updated sections and steps, and on success the sheet exits edit mode and displays the updated headers and steps

#### Scenario: Cancel discards instruction header and step edits

- **WHEN** a person edits a section header or step content and activates Cancel
- **THEN** the sheet exits edit mode without issuing a PATCH and displays the previously loaded headers and steps

# Spec Delta

## ADDED Requirements

### Requirement: Initialize section header and step content drafts in detail edit mode
When a person opens Edit on loaded recipe detail, the editor SHALL initialize editable instruction sections with each section's header and its ordered step contents from the loaded recipe. Unheaded recipes SHALL initialize with an empty header.

#### Scenario: Open edit on a sectioned canonical recipe
- **WHEN** a person opens Edit on a recipe whose `instructionSections` include a named section "Sauce" with two steps
- **THEN** the editor displays an editable section header initialized to "Sauce" and two editable step content fields initialized to those step texts

#### Scenario: Open edit on an unheaded or empty-instruction recipe
- **WHEN** a person opens Edit on a recipe with unheaded steps or no instructions
- **THEN** any existing steps appear with an empty section header field, and a recipe with no instructions allows adding a step or section

### Requirement: Edit step headers and step content in the detail draft
In detail edit mode, a person SHALL be able to edit each section's header text, edit each step's content, add or remove steps within a section, and add or remove sections without submitting until Save changes is activated.

#### Scenario: Rename a section header and edit step content
- **WHEN** a person changes a section header from "Prep" to "Marinade" and edits a step's text in that section
- **THEN** the draft reflects "Marinade" and the updated step text while leaving the saved recipe unchanged until Save changes is activated

#### Scenario: Clear a section header
- **WHEN** a person clears a section header to empty or whitespace-only text
- **THEN** the draft retains the section's steps as unheaded rather than deleting the steps

#### Scenario: Add and remove steps and sections
- **WHEN** a person adds a new section, adds a step to a section, or removes a step or section from the draft
- **THEN** the draft updates immediately in order, preserving the remaining sections and steps

### Requirement: Submit edited step headers and step content on detail Save
Activating enabled Save changes SHALL submit the draft's instruction sections (for canonical recipes) or instruction entries (for legacy recipes) with trimmed section headers (represented as null when blank) and step content, and Cancel SHALL discard unsubmitted instruction edits.

#### Scenario: Save edited section headers and steps
- **WHEN** a person edits a section header and step content and activates Save changes
- **THEN** `PATCH /api/recipes/{id}` submits the updated sections and steps, and on success the sheet exits edit mode and displays the updated headers and steps

#### Scenario: Cancel discards instruction header and step edits
- **WHEN** a person edits a section header or step content and activates Cancel
- **THEN** the sheet exits edit mode without issuing a PATCH and displays the previously loaded headers and steps

### Requirement: Preserve and reconcile instruction header drafts across reload and conflicts
Unsaved section header and step content edits SHALL persist in the local editor draft for the current recipe and participate in conflict reconciliation when the saved recipe changes concurrently.

#### Scenario: Reconcile concurrent instruction changes
- **WHEN** a person has unsaved local edits to a section header or step content and the underlying recipe revision changes before Save
- **THEN** conflict reconciliation compares the full instruction structure including section headers and allows choosing between the local draft and the current saved instructions

## MODIFIED Requirements

### Requirement: Replace supplied array instructions while retaining other metadata

On a successful authorized PATCH for an existing recipe, a non-null instruction array SHALL replace the recipeInstructions member in persisted raw metadata and the recipe-info representation. Other raw metadata members SHALL be retained. Omitted/null instructions SHALL leave that member unchanged.

#### Scenario: Replace an instruction array
- **WHEN** an authorized PATCH supplies three instruction strings with first value Updated Step 1 and persistence completes
- **THEN** stored metadata and recipe-info instructions contain that three-element array with the first supplied value

#### Scenario: Retain unrelated instruction metadata
- **WHEN** a successful instruction PATCH updates valid object metadata containing other members
- **THEN** only its recipeInstructions member is replaced and the other raw members remain

#### Scenario: Preserve absent instruction updates
- **WHEN** a successful authorized PATCH omits instructions or supplies null
- **THEN** the existing recipeInstructions member remains unchanged

# Cooking draft delta

## Purpose

Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.

## ADDED Requirements

### Requirement: Read supported legacy and flat structured instructions

Cooking SHALL read a string-array recipe as ordered nonblank trimmed instructions with sequential step labels. For a flat object array it SHALL use nonblank trimmed text, falling back to name, omit empty entries and use a supplied name or sequential step label as the heading.

#### Scenario: Legacy strings
- **WHEN** supported string-array content contains a blank entry between two instructions
- **THEN** only the two nonblank instructions are presented in order with consecutive step labels

#### Scenario: Flat objects
- **WHEN** supported flat instructions contain a named text step and a nameless text step
- **THEN** both are presented in order with the supplied heading and a sequential heading respectively

#### Scenario: Name supplies instruction
- **WHEN** a supported flat step has a nonblank name but no nonblank text
- **THEN** the trimmed name supplies its instruction

### Requirement: Read supported section instructions in source order

For supported section arrays, cooking SHALL flatten nonblank child text or name in section order with consecutive step numbering. Non-generic section names SHALL supply reading context; generic preparation/instruction section names SHALL not prefix focused instruction text.

#### Scenario: Named sections
- **WHEN** a supported recipe has two named sections with nonblank children
- **THEN** children appear in section order and retain contextual section names

#### Scenario: Generic preparation
- **WHEN** a section is named Preparation or Préparation
- **THEN** focused instructions omit that generic section prefix

### Requirement: Navigate one focused instruction at a time

With the effective single-page flag disabled or unavailable, cooking SHALL display one active instruction and its heading. Next SHALL advance until the last step, where Cooked becomes the completion action. Back SHALL return to the preceding position, including preparation; it SHALL be disabled at preparation. Scrolling SHALL not change focused position.

#### Scenario: Read focused steps
- **WHEN** a person starts a two-step recipe with the flag disabled and activates Next
- **THEN** the second instruction is displayed and the action becomes Cooked

#### Scenario: Back to preparation
- **WHEN** a person activates Back from the first focused instruction
- **THEN** preparation is shown and Back is disabled

#### Scenario: Scroll focused content
- **WHEN** a person scrolls focused instructions
- **THEN** the held step position is unchanged

### Requirement: Read all instructions under the effective single-page flag

With single-page-recipe-steps effectively enabled, starting from preparation SHALL display every parsed step in one ordered reading list with a Cooked action. The list SHALL show meaningful supplied headings, suppress generic Step-number or instruction-identical headings, and show section context when it changes.

#### Scenario: Read the full recipe
- **WHEN** a person starts a recipe with the effective flag enabled
- **THEN** all parsed instructions appear together and Cooked is available

#### Scenario: Avoid redundant headings
- **WHEN** a step heading is Step 1 or equals its instruction
- **THEN** the list omits that redundant heading while preserving the instruction

### Requirement: Preserve instruction text when presenting paragraphs

Single-page reading SHALL retain instruction content and split paragraphs at explicit blank lines, keeping ordinary sentence punctuation, measurements and single line breaks together. Presentation SHALL not rewrite the editable instruction value.

#### Scenario: Measurements remain together
- **WHEN** an instruction includes decimal quantities and multiple sentences without blank lines
- **THEN** they remain together in one paragraph

#### Scenario: Explicit paragraphs
- **WHEN** an instruction contains a blank line between two text groups
- **THEN** the groups appear as separate paragraphs and editing receives the original instruction text

### Requirement: Hold recipe reading position within client memory

Cooking SHALL keep its current step by recipe identity in client memory. A newly mounted cooking view in the same client store SHALL use that held position. Single-page scrolling SHALL update the reading bookmark without remounting its rows, replacing an active editor or submitting completion.

#### Scenario: Reopen the same recipe
- **WHEN** a recipe has a held second-step bookmark and cooking mounts again using the same client store
- **THEN** its reading position is the second step

#### Scenario: Scroll during editing
- **WHEN** single-page reading moves to another visible step while an editor is open
- **THEN** the bookmark follows reading and the same editor and draft remain, without cooking completion

### Requirement: Return to ingredients and resume single-page reading

Single-page reading SHALL offer Ingredients when no step is being edited. Returning to ingredients SHALL retain the mounted checklist, recipe bookmark and reading offset. Resume steps SHALL restore that offset and bookmark instead of restarting the recipe.

#### Scenario: Consult ingredients mid-recipe
- **WHEN** a person returns to Ingredients from a later reading position
- **THEN** preparation opens with checks and bookmark retained

#### Scenario: Resume the list
- **WHEN** a person activates Resume steps from that preparation view
- **THEN** the reading list returns at its saved offset and bookmark

#### Scenario: Editor is active
- **WHEN** a single-page step editor is active
- **THEN** Ingredients is disabled until editing ends

### Requirement: Expose cooking reading and control semantics

Cooking SHALL expose the current position and step count through a progressbar and indicator, ingredient checked indications, a named close button, and a named Mark recipe as cooked action. Single-page instructions SHALL use an ordered list with named per-step edit controls.

#### Scenario: Reading position is exposed
- **WHEN** the single-page reading bookmark changes to step two
- **THEN** the indicator and progressbar expose position two

#### Scenario: Find step controls
- **WHEN** single-page instructions are displayed
- **THEN** the ordered list and named per-step edit controls are available

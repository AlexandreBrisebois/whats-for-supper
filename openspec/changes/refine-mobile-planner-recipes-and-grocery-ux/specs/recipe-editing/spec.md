## MODIFIED Requirements

### Requirement: Edit ingredient rows in the detail draft

In detail edit mode, the editor SHALL present mobile-friendly ingredient rows with inline add/remove controls, standardized unit dropdown selects (preserving any unrecognized legacy saved unit option until changed), and consistent readable section labels, affecting only the local draft before submission.

#### Scenario: Change and add ingredients
- **WHEN** a person changes an ingredient row (including selecting a standard unit in structured ingredient edit mode) and activates Add ingredient
- **THEN** the draft contains the changed row and an additional empty row (with its unit dropdown defaulted to empty in structured ingredient mode)

#### Scenario: Edit ingredient and package capacity units from standardized dropdowns
- **WHEN** a person edits a structured ingredient row or expands `Shopping and scaling` and enables Package details
- **THEN** both the ingredient unit control and package capacity unit control render as `<select>` dropdowns containing standard culinary units (`tsp`, `tbsp`, `cup`, `ml`, `cl`, `dl`, `l`, `mg`, `g`, `kg`, `piece`, `clove`, `pinch`, `slice`, `can`, `jar`, `pkg`, `bunch`, `head`, `sprig`, `stalk`, `leaf`) plus a blank/none option

#### Scenario: Preserve non-standard legacy unit until user changes it
- **WHEN** a saved recipe loads into edit mode with a non-standard unit string such as `dash` or `Gousses`
- **THEN** the unit `<select>` includes and retains that saved value as a temporary selectable option until the person chooses a standard unit or saves

#### Scenario: Mobile compact layout for structured ingredients and steps
- **WHEN** edit mode renders on a narrow phone screen
- **THEN** each structured ingredient card places `[Amount] [Unit] [Remove]` cleanly on one row above the full-width description input, while section headers and footer save controls omit cramped micro-uppercase captions and keep 48 CSS px touch targets

#### Scenario: Remove an ingredient
- **WHEN** a person removes a draft ingredient row
- **THEN** that row is removed while the other rows retain their relative order

### Requirement: Place the servings edit label to the left of its input

In recipe-detail edit mode, the visible servings label SHALL appear to the left of a right-aligned joined minus/value/plus stepper group on the same row, vertically centered. The numeric field inside the stepper SHALL remain programmatically associated with the label and directly editable at viewport widths of 320 CSS px and above without horizontal scrolling.

#### Scenario: Open the English servings editor
- **WHEN** a person opens Edit on loaded recipe detail in English
- **THEN** the visible label is “Servings” and appears to the left of the joined `-`, numeric input, and `+` stepper group on the same row
- **AND** the numeric input's accessible name is “Servings” and decrement/increment buttons have accessible labels

#### Scenario: Step servings up and down on a phone
- **WHEN** a person activates `+` or `-` on the servings stepper (starting from empty or a positive integer)
- **THEN** the numeric servings draft increments (from empty to `1`, or by `+1`) or decrements down to `1` without allowing values below `1` via `-`

#### Scenario: Open the French servings editor
- **WHEN** a person opens Edit on loaded recipe detail in French
- **THEN** the visible label is “Portions” and appears to the left of the joined stepper on the same row
- **AND** the numeric input's accessible name is “Portions”

#### Scenario: Use the editor on a narrow screen
- **WHEN** a person opens Edit in either supported language at a viewport width of 320 CSS pixels
- **THEN** the label remains to the left of the right-aligned stepper group on the same row
- **AND** both remain visible and the numeric input remains focusable and directly editable alongside `-` and `+` without overlap, clipping or horizontal scrolling caused by the row

### Requirement: Keep servings validation below the horizontal field row

When the servings draft is invalid, its existing localized validation message SHALL appear below the label-and-stepper row and remain programmatically associated with the numeric input. Showing or clearing the message SHALL preserve the label's position to the left of the stepper on the same row.

#### Scenario: Display and clear invalid servings feedback
- **WHEN** a person enters “0” in the servings input while editing loaded recipe detail
- **THEN** the input exposes its invalid state and existing localized validation message below the row
- **AND** Save changes is disabled and the label remains left of the stepper
- **WHEN** the person replaces “0” with “4”
- **THEN** the servings validation message and invalid state clear while the horizontal label-and-stepper arrangement remains

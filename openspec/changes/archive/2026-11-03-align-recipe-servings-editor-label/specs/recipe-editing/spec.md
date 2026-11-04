# Spec Delta

## ADDED Requirements

### Requirement: Place the servings edit label to the left of its input

In recipe-detail edit mode, the visible servings label SHALL appear to the left of its text box on the same row, vertically centered with the control. The label SHALL remain programmatically associated with the input. This arrangement SHALL remain readable and operable in English and French at viewport widths of 320 CSS pixels and above without clipping, overlap or horizontal scrolling caused by this row.

#### Scenario: Open the English servings editor
- **WHEN** a person opens Edit on loaded recipe detail in English
- **THEN** the visible label is “Servings” and appears to the left of its text box on the same row
- **AND** the input's accessible name is “Servings”

#### Scenario: Open the French servings editor
- **WHEN** a person opens Edit on loaded recipe detail in French
- **THEN** the visible label is “Portions” and appears to the left of its text box on the same row
- **AND** the input's accessible name is “Portions”

#### Scenario: Use the editor on a narrow screen
- **WHEN** a person opens Edit in either supported language at a viewport width of 320 CSS pixels
- **THEN** the label remains to the left of the text box on the same row
- **AND** both remain visible and the input remains focusable and editable without overlap, clipping or horizontal scrolling caused by the row

### Requirement: Keep servings validation below the horizontal field row

When the servings draft is invalid, its existing localized validation message SHALL appear below the label-and-input row and remain programmatically associated with the input. Showing or clearing the message SHALL preserve the label's position to the left of the input on the same row.

#### Scenario: Display and clear invalid servings feedback
- **WHEN** a person enters “0” in the servings text box while editing loaded recipe detail
- **THEN** the input exposes its invalid state and existing localized validation message below the row
- **AND** Save changes is disabled and the label remains left of the input
- **WHEN** the person replaces “0” with “4”
- **THEN** the servings validation message and invalid state clear while the horizontal label-and-input arrangement remains

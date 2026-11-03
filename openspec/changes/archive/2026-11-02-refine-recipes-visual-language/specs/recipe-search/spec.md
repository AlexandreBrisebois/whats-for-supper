# Recipe search delta

## ADDED Requirements

### Requirement: Make expanded Search recognizable and localized

When Search controls are expanded, the input SHALL show a magnifier, a localized example placeholder and a soft light surface with a visible terracotta focus state. The field SHALL retain its accessible Search name, current text and existing Enter, debounce, disclosure and focus-return behavior.

#### Scenario: Expand Search in either view
- **WHEN** a person expands Search in stack or list presentation in English or French
- **THEN** the field appears directly below the toolbar with its magnifier and localized example, and receives visible focus
- **AND** expansion alone does not submit or replace the current collection

#### Scenario: Return to a hidden active Search
- **WHEN** a current Search is active and its controls are hidden, then the person reopens them
- **THEN** the existing active marker disappears from the collapsed control, the field retains its criteria and focus returns to the input without changing results, position or pending work

### Requirement: Show applied Search selections and ordinary result context

Expanded Search SHALL show Filters with a visible count of applied selections and an accessible count description, counting shared scope choices once. A loaded nonempty Search list SHALL have a modest localized Results heading above its ordinary cards. Stack SHALL retain its compact position context. These cues SHALL not promote any result or change recovery actions.

#### Scenario: Applied filters in either presentation
- **WHEN** filters or scope selections are applied and Search controls are expanded in stack or list
- **THEN** Filters shows the applied count in text or digits as well as an accessible description
- **AND** draft selections dismissed without Apply do not change that count

#### Scenario: Ordinary list results
- **WHEN** a current Search returns one or more matches in list presentation
- **THEN** a localized Results heading introduces the compact ordinary cards in returned order
- **AND** the former Top Pick, when supplied, remains exactly one ordinary card without a spotlight, reason, Surprise Me or other promotion

#### Scenario: Empty or loading result state
- **WHEN** Search is loading or returns zero matches
- **THEN** the existing loading or empty recovery message remains the primary content instead of an empty Results section

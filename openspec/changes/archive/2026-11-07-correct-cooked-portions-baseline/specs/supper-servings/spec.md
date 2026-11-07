## ADDED Requirements

### Requirement: Preserve the saved baseline while correcting inherited Cooked portions

Today's editable Cooked supper without preparation SHALL display its saved effective count until edited. A deliberate different numeric count or existing reset SHALL persist its intended count even when the saved override is absent. Existing control visibility, copy, layout, date/preparation protections and grocery policy SHALL remain unchanged.

#### Scenario: Open a frozen inherited count
- **WHEN** today's Cooked supper has inherited five, no override or preparation, and current usual four
- **THEN** opening Portions shows five and leaving without edits writes nothing

#### Scenario: Correct to the current usual number
- **WHEN** that saved five is deliberately changed to four and saved
- **THEN** a fresh read returns four and existing ingredient/grocery consumers use four

#### Scenario: Existing reset after an intervening draft
- **WHEN** that saved five is changed to six, then the existing reset to usual four is selected and saved
- **THEN** four is persisted without an override and later usual changes preserve the completed count

#### Scenario: Preserve normal corrections and protections
- **WHEN** an explicit five is edited or reset, or a past, future Cooked, non-cooking or explicitly prepared date is inspected
- **THEN** ordinary editing/reset and existing read-only protections remain intact

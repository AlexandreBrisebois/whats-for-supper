## MODIFIED Requirements

### Requirement: Apply available snapshot adjuncts conditionally

An eligible nondeferred snapshot SHALL replace grocery items and any supplied raw or generated-client boolean check dictionary. Explicit false values and empty dictionaries SHALL be retained. Missing or null check-state SHALL retain loaded checks. Existing absolute-week, move-echo and optimistic deferral guards SHALL apply before replacement.

#### Scenario: Missing snapshot grocery items
- **WHEN** an eligible snapshot omits grocery items
- **THEN** the grocery item list SHALL become empty while check-state follows the supplied, missing or null map rules

#### Scenario: Additional-data check map is present
- **WHEN** an eligible snapshot contains groceryState.additionalData with checked and unchecked entries
- **THEN** its complete check map replaces the loaded map synchronously after the week state update

#### Scenario: Raw connected or week update reconciles grocery content
- **WHEN** an eligible connected or week_updated snapshot, including reconnect, supplies raw groceryState with checked and unchecked entries
- **THEN** its grocery items and complete check map replace the loaded content with explicit false values retained

#### Scenario: Explicit empty map clears checks
- **WHEN** an eligible snapshot supplies an empty raw or generated-client check dictionary
- **THEN** prior grocery checks are removed

#### Scenario: Raw or missing check map
- **WHEN** an eligible snapshot omits check-state or supplies null
- **THEN** loaded checks remain while grocery items use the supplied list or an empty list

#### Scenario: Another week or optimistic move guards adjuncts
- **WHEN** a snapshot identifies another absolute week or is deferred during an active or unconfirmed move
- **THEN** it does not replace loaded grocery items or checks until eligible reconciliation

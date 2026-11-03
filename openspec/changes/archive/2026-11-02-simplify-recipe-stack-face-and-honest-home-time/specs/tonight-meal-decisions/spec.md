# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve supplied Tonight total duration

The planned Tonight recipe card SHALL display a usable supplied ISO 8601 total duration with hours and minutes preserved, using the existing localized Ready In wrapper. This total duration SHALL NOT be interpreted as preparation-only time. Without a usable supplied total duration, the planned card SHALL omit its duration badge instead of estimating a time. Detail, list, Discovery and Quick Find duration behavior SHALL remain unchanged.

#### Scenario: Hour and minute durations
- **WHEN** a planned named recipe supplies PT6H, PT1H30M, PT45M or PT360M as total duration
- **THEN** Home displays respectively 6H, 1H 30 MINS, 45 MINS or 6H within its existing Ready In wrapper

#### Scenario: English and French wrappers
- **WHEN** that recipe is shown with English or French selected and a usable total duration
- **THEN** Home uses respectively READY IN or PRÊT EN without changing the duration's units

#### Scenario: No supplied duration
- **WHEN** the planned recipe's total duration is missing, null, empty, zero or unformattable
- **THEN** Home omits the Ready In badge and shows no default or estimated duration
- **AND** the recipe image, name and existing actions remain available

### Requirement: Explain the Tonight choice without claiming a saved outcome

The pivot SHALL distinguish an ordinary unplanned night, an unassigned ready family GOTO and saved Mystery context using localized text. It SHALL NOT describe a ready GOTO as tonight's saved meal before selection, or imply that Take Out places a delivery order. Existing optimistic assignment and staged recovery presentation SHALL retain their established persistence meanings.

#### Scenario: Unplanned night and ready family choice
- **WHEN** an ordinary empty night is shown with or without a ready GOTO
- **THEN** it identifies that nothing is planned for tonight
- **AND** a ready recipe is identified as the family's GOTO choice rather than a saved assignment

#### Scenario: Saved Mystery night
- **WHEN** supper choices are offered for a saved Mystery night
- **THEN** its saved non-cooking context remains visible without calling the day unplanned
- **AND** opening and cancelling Quick Find leaves that context unchanged

#### Scenario: English and French meaning
- **WHEN** either card is displayed in English or French
- **THEN** added or changed labels and feedback use the selected locale with equivalent state/action meaning and room to wrap
- **AND** a supplied total duration retains its localized wrapper and units, while a missing or unusable planned-recipe duration is omitted

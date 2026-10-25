# Spec Delta

## ADDED Requirements

### Requirement: Preserve supplied Tonight total duration

The planned Tonight recipe card SHALL display a supplied ISO 8601 total duration with hours and minutes preserved, using the existing localized Ready In wrapper. This total duration SHALL NOT be interpreted as preparation-only time. Existing missing-time behavior and other recipe surfaces SHALL remain unchanged.

#### Scenario: Hour and minute durations
- **WHEN** a planned named recipe supplies PT6H, PT1H30M, PT45M or PT360M as total duration
- **THEN** Home displays respectively 6H, 1H 30 MINS, 45 MINS or 6H within its existing Ready In wrapper

#### Scenario: English and French wrappers
- **WHEN** that recipe is shown with English or French selected
- **THEN** Home uses respectively READY IN or PRÊT EN without changing the duration's units

#### Scenario: No supplied duration
- **WHEN** the planned recipe's duration is missing or empty
- **THEN** Home retains its existing missing-duration presentation

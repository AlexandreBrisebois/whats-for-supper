## MODIFIED Requirements

### Requirement: Offer and load library stack presentation

In the Explore collection, the library SHALL default to list presentation (`limit 12`) when the selected member has no saved stack preference or current override. Selecting Show recipe stack SHALL select stack presentation and request explore order, `limit 20` and the active All/Discovery filter after summary succeeds.

#### Scenario: Load the default list presentation

- **WHEN** a member without a saved `stack` preference enters the library and summary retrieval succeeds
- **THEN** list presentation requests page 1 with order `explore`, `limit 12` and `discoverableOnly false`

#### Scenario: Load the default stack

- **WHEN** a member with a saved `stack` preference enters the library and summary retrieval succeeds
- **THEN** the stack requests page 1 with order `explore`, `limit 20` and `discoverableOnly false`

#### Scenario: Switch from list to stack

- **WHEN** a person selects Show recipe stack from list presentation and summary retrieval succeeds
- **THEN** stack presentation starts its page-1 load with `limit 20` and the selected collection filter

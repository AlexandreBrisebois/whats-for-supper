## MODIFIED Requirements

### Requirement: Enter Similar from loaded detail

Activating Find similar in Search detail SHALL dismiss detail, clear the visible query and submit the loaded recipe identity as the similar target while retaining active filters, preferences and planning context. Similar SHALL exclude the source recipe and return no candidates when that source is missing, deleted or not ready.

#### Scenario: Find similar action

- **WHEN** the person activates Find similar on a loaded recipe
- **THEN** detail closes and an empty-query request identifies that recipe as similar target

#### Scenario: Source unavailable

- **WHEN** the source is missing, deleted or not ready when Similar is evaluated
- **THEN** no similar candidates are returned


#### Scenario: Find Similar from Planner detail

- **WHEN** the person activates Find Similar on a loaded recipe opened from Planner
- **THEN** Search opens in Similar mode for that recipe with empty query, without reopening source detail or creating an assignment target

# Cooking delta

## MODIFIED Requirements

### Requirement: Submit completion for the viewed recipe and current local date

Cooked SHALL request recording the cooking entry recipe identity with status two for the deployment-local current date from meal-planning’s authoritative calendar context at submission time. Focused cooking SHALL offer this action at its last instruction; single-page cooking SHALL offer it from the reading list. The request SHALL not substitute tonight’s recipe or a planner target date.

#### Scenario: Cook another recipe
- **WHEN** a person finishes viewing a recipe different from the current supper
- **THEN** the submitted recipe identity is the viewed recipe with status two

#### Scenario: Finish from either reading mode
- **WHEN** Cooked is activated at the focused final step or in single-page reading
- **THEN** completion targets the deployment-local current date from meal-planning’s authoritative calendar context at that submission

#### Scenario: Browser and deployment dates differ
- **WHEN** Cooked is activated at 2026-10-12T01:30:00Z in a Tokyo browser for a Toronto deployment
- **THEN** completion submits the viewed recipe with status two for October 11, even if the response arrives on October 12

#### Scenario: Current date cannot be refreshed
- **WHEN** completion needs fresh deployment context and the refresh fails
- **THEN** no validation is submitted and the existing failed-completion retry presentation remains available

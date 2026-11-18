# Spec Delta

## MODIFIED Requirements

### Requirement: Display recipe card facts and vote controls

Cards SHALL display the recipe name, named-image alternative text, and concise supporting description (`<= 2` clamped lines) when a non-empty description is present, omitting the description block when blank. Formatted total time SHALL appear once in a high-contrast lower-left hero badge when usable; cuisine and meal-type pills SHALL remain absent. Right-drag like, left-drag pass, and accessible `Like recipe` / `Dislike recipe` controls SHALL remain operable with WCAG 2.2 AA contrast.

#### Scenario: Card loaded
- **WHEN** a front card has a non-empty description, cuisine, meal types, and usable total time
- **THEN** the name, named image, clamped supporting description, one readable Ready in badge, and `Like recipe` / `Dislike recipe` controls appear
- **AND** cuisine and meal-type pills remain absent

#### Scenario: No usable time
- **WHEN** the existing duration formatting yields an empty value or description is blank
- **THEN** no Ready in badge or empty description/time block appears, while the title and voting controls remain available

#### Scenario: Card loaded without description
- **WHEN** a front card has usable total time and an empty or whitespace-only description
- **THEN** no blank description block renders beneath the title while the hero image, Ready in badge, title, and voting controls remain intact

#### Scenario: Empty queue controls
- **WHEN** the queue is empty
- **THEN** like and dislike buttons are disabled

#### Scenario: Vote after presentation change
- **WHEN** the person performs a right-drag like or left-drag pass on the front card, or activates its corresponding vote button
- **THEN** the existing vote behavior targets the same front recipe identity
- **AND** touching the time badge adds no separate action or recipe-detail navigation

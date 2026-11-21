# Spec Delta

## MODIFIED Requirements

### Requirement: Display recipe card facts and vote controls

Cards SHALL display the recipe name, named-image alt text, and up to two clamped lines of non-empty description, omitted when blank. Usable formatted total time SHALL appear once in a solid warm-cream lower-left hero badge preserving localized Ready in copy; cuisine and meal-type pills SHALL remain absent. Right-drag like, left-drag pass, and WCAG AA `Like recipe` / `Dislike recipe` controls SHALL remain operable.

#### Scenario: Card loaded

- **WHEN** a front card has a non-empty description, cuisine, meal types, and usable total time
- **THEN** the name, named image, clamped supporting description, one readable warm-cream Ready in badge, and `Like recipe` / `Dislike recipe` controls appear
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

### Requirement: Celebrate confirmed convergence for the household

Discovery SHALL replace its voting arena with a static green success card when authoritative session state reports convergence, even with cards remaining. English copy SHALL be "Menu's in!" and "See your matches", with French equivalents. The localized description field SHALL be empty in both languages. The card SHALL reuse the cooked-success visual, centered above navigation, with a decorative circled check. Existing app navigation SHALL remain available; no sound or confetti SHALL occur.

#### Scenario: Another member completes the menu

- **WHEN** the client reconciles a converged active round after another member's vote
- **THEN** it shows the celebration without requiring another swipe, queue exhaustion or a local match counter

#### Scenario: Returning member

- **WHEN** a member opens Discovery during a still-open converged round
- **THEN** successful session hydration shows the same celebration without requiring previous participation

#### Scenario: Gesture in progress

- **WHEN** convergence arrives while a card is being dragged
- **THEN** the transition cancels any unsubmitted gesture without manufacturing a vote, leaves navigation usable and does not steal focus into a modal
- **AND** any already submitted vote continues through normal processing

#### Scenario: Asset fails to load

- **WHEN** decorative image resources are unavailable
- **THEN** accessible text still communicates "Menu's in!" and the matches action without dependence on image pixels or color

#### Scenario: Late session update

- **WHEN** a newer snapshot changes suggestions in the same converged round
- **THEN** the card remains stable and immediately visible, including with reduced motion, and performs no automatic navigation

#### Scenario: Usable screen area

- **WHEN** the card renders on a 320px phone, phone portrait, tablet portrait or desktop
- **THEN** it is centered in the usable area above the navigation dock without horizontal overflow, and the action remains reachable

#### Scenario: Empty description

- **WHEN** Discovery presents the success card in English or French
- **THEN** the description field is empty

#### Scenario: Readable action

- **WHEN** Discovery presents the matches action on the green card
- **THEN** its rendered foreground/background contrast is at least 4.5:1, including the translucent button hover background
- **AND** Home's cooked-success card shares the same accessible Deep Herb celebration contrast while preserving its existing cooked copy and dismiss behavior

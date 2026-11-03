# Spec Delta

## MODIFIED Requirements

### Requirement: Display recipe card facts and vote controls

Cards SHALL display the recipe name and named-image alternative text. Usable formatted total time SHALL appear once in a lower-left hero badge matching Recipes stack cards; absent time SHALL omit the badge. Cuisine and meal-type pills and the former time footer SHALL be absent. The front card SHALL retain right-drag like and left-drag pass; buttons named Like recipe and Dislike recipe SHALL remain alternatives and be disabled for an empty queue.

#### Scenario: Card loaded

- **WHEN** a front card has cuisine, meal types and total time
- **THEN** the name and named image appear with one formatted Ready in badge inside the hero and with Like recipe and Dislike recipe controls
- **AND** cuisine and meal-type pills and the former time footer are absent

#### Scenario: Empty queue controls

- **WHEN** the queue is empty
- **THEN** like and dislike buttons are disabled

#### Scenario: No usable time

- **WHEN** the existing duration formatting yields an empty value for a card
- **THEN** no Ready in badge or empty time footer appears, while the title and voting remain available

#### Scenario: Vote after presentation change

- **WHEN** the person performs a right-drag like or left-drag pass on the front card, or activates its corresponding vote button
- **THEN** the existing vote behavior targets the same front recipe identity
- **AND** touching the time badge adds no separate action or recipe-detail navigation

## ADDED Requirements

### Requirement: Keep on-image time readable and noninteractive

The Discovery time badge SHALL use readable text on an opaque contrasting surface, a decorative clock and localized Ready in copy. The badge SHALL add no focus stop or gesture obstruction. At narrow and wide viewports, its text SHALL stay within the hero, and the recipe title and existing vote controls SHALL remain usable.

#### Scenario: Narrow viewport and translated text

- **WHEN** Discovery renders at a 320px viewport width in English or French with a usable time
- **THEN** the complete time label stays inside the hero without horizontal overflow and has at least 4.5:1 text contrast
- **AND** the recipe title remains readable and vote controls reachable

#### Scenario: Wide viewport and long title

- **WHEN** Discovery renders on tablet or desktop with a multi-line recipe title
- **THEN** the badge remains anchored within the hero and does not overlap the title or vote controls

#### Scenario: Keyboard voting

- **WHEN** the person navigates Discovery's existing vote controls by keyboard
- **THEN** the time badge does not receive focus and the vote controls retain their accessible names and activation behavior

#### Scenario: Image request fails

- **WHEN** a recipe hero image fails to load
- **THEN** the title, named image alternative, usable time text and vote controls remain available without relying on image pixels

#### Scenario: Drag starts over the time badge

- **WHEN** the person starts a horizontal voting drag over the time badge
- **THEN** the existing card drag and vote rules apply without a separate badge action
- **AND** LOVE/PASS swipe feedback appears above the time badge during the drag, including where their bounds overlap
- **AND** the badge retains its lower-left position and passive interactions

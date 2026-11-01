# Recipe library gesture delta

## MODIFIED Requirements

### Requirement: Open front-card detail only for a tap

Tapping the front card without a tracked drag in that pointer session SHALL open that recipe detail. A horizontal drag exceeding 5 pixels SHALL suppress that session's tap. A later fresh tap SHALL be eligible independently. Closing detail SHALL retain the loaded card position under the existing detail dismissal requirement.

#### Scenario: Tap the front card
- **WHEN** the front card is tapped without a tracked drag
- **THEN** detail opens for that card ID

#### Scenario: Suppress a drag-induced tap
- **WHEN** the front card has tracked horizontal displacement greater than 5 pixels in the current pointer session before its tap handler runs
- **THEN** that handler does not open detail

#### Scenario: Tap after an incomplete drag
- **WHEN** a short drag returns the front card without navigation and a new stationary tap follows
- **THEN** the first new tap opens detail once without changing the card position

## ADDED Requirements

### Requirement: Track front-card horizontal movement directly

A front library stack card SHALL follow horizontal pointer movement with the same displacement response as the Discovery voting card. Existing directional release thresholds, browsing action meanings and detail activation rules SHALL continue to apply. Rear cards SHALL remain noninteractive.

#### Scenario: Grab at different visible card locations
- **WHEN** a horizontal pointer or touch drag begins on the front card's image, title or noninteractive body
- **THEN** the card follows the horizontal displacement directly without an added hold delay
- **AND** release requests navigation only under the existing directional thresholds

#### Scenario: Preserve small motion and release policy
- **WHEN** a recognized front-card drag is released below both navigation thresholds
- **THEN** it returns without navigation and without opening detail from that drag

### Requirement: Recover interrupted stack gestures

A cancelled front-card gesture SHALL return the card without navigation or detail activation. A subsequent fresh tap or drag SHALL work. Departing a card lifecycle SHALL invalidate its pending gesture action so a late animation completion cannot navigate the new view or collection.

#### Scenario: Pointer cancellation
- **WHEN** an active front-card drag receives pointer cancellation
- **THEN** it returns without previous, next or detail activation, even if displacement exceeds the release threshold
- **AND** the next fresh tap or drag is eligible

#### Scenario: Leave during departure animation
- **WHEN** a swipe departure animation is pending and the person changes filter or presentation, closes Browse or replaces the front-card lifecycle
- **THEN** the old completion does not navigate or open detail in the new lifecycle

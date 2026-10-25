# Spec Delta

## MODIFIED Requirements

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
- **AND** Home's existing cooked-card presentation remains unchanged

## ADDED Requirements

### Requirement: Open the completed round's meal plan on request

Activating "See your matches" SHALL open the meal-plan tab for the authoritative converged session's absolute week, including after a prior grocery-tab visit. Navigation SHALL use the existing anchored-week route. Rendering or activating the card SHALL NOT assign meals, close voting, lock the week, clear votes or suppress future convergence. Home's cooked confirmation SHALL retain its existing copy and dismiss behavior.

#### Scenario: Completed week differs from browser week
- **WHEN** a member activates the action for a converged round whose week differs from browser today
- **THEN** Planner opens with offset zero anchored to that round's week rather than browser today

#### Scenario: Prior grocery tab and keyboard activation
- **WHEN** Planner previously showed groceries and the member focuses the action and presses Enter or Space
- **THEN** navigation opens the completed week's meal-plan tab without issuing lifecycle or assignment mutations

#### Scenario: Returning to Discovery
- **WHEN** the member returns to Discovery while that round remains converged
- **THEN** the same card is available again

#### Scenario: Home confirmation
- **WHEN** Home shows its cooked-success card and the member dismisses it
- **THEN** existing cooked copy and local dismiss behavior remain unchanged

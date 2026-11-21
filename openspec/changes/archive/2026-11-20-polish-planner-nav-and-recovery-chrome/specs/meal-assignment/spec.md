# Spec Delta

## MODIFIED Requirements

### Requirement: Return targeted Search assignment to Planner

After confirmed recipe-detail assignment, Search SHALL return to the captured Planner week/day and reference Monday. Planner SHALL read that week, scroll the target day card into view, and apply a temporary highlight ring that removes itself after about 3 seconds, without a redundant confirmation toast. Existing inline banners SHALL be retained without adding a Refresh control.

#### Scenario: Search assignment resolves

- **WHEN** explicit-target Search assignment resolves for index two in week one
- **THEN** navigation targets Planner index two in week one with the captured reference, scrolls the day into view after authoritative reading, highlights the card, and emits no redundant success toast or persistent banner

#### Scenario: Planner receives success feedback parameters

- **WHEN** Planner receives a truthy success value and a dayIndex for an empty-slot assignment
- **THEN** it reads the captured week, clears the transient `success` URL parameter, scrolls the matching day card into view with reduced-motion support, and applies the temporary highlight ring without showing a toast

#### Scenario: Highlight ring fades after planning

- **WHEN** the highlight ring has been shown on the planned day card for about 3 seconds
- **THEN** the ring fades out and the card returns to its normal border without a layout shift
- **AND** under `prefers-reduced-motion: reduce` the ring is removed without animation

#### Scenario: Highlight is superseded or abandoned

- **WHEN** the person changes week, plans another meal, or leaves Planner before the ring fades
- **THEN** the earlier ring is cleared and no stale timer re-applies or clears a newer ring

#### Scenario: Replacement receipt outlives the ring

- **WHEN** a replacement or spillover receipt is shown with the highlighted card
- **THEN** the receipt stays under its existing rules after the ring has faded

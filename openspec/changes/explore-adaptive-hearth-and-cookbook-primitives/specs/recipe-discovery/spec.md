# Spec Delta

## ADDED Requirements

### Requirement: Display non-shaming Family Table progress during open voting

During an active `collecting` round, Discovery SHALL display a collective household progress cue comparing ready consensus matches against open weekly supper slots, without identifying, scoring, or shaming individual family members who have not voted. Once useful matches exist, the cue SHALL offer an effortless way to pause voting or review matches.

#### Scenario: Family member opens an active collecting round
- **WHEN** a member opens Discovery while `session.phase === 'collecting'` with open weekly supper slots
- **THEN** a warm progress cue displays collective match progress toward open nights without listing pending member names

#### Scenario: Household reaches useful matches before exhausting the stack
- **WHEN** consensus matches reach the open supper slot target or the member chooses to review early matches
- **THEN** the member can exit straight to Planner matches without completing the entire recipe catalog

### Requirement: Bridge converged family matches into weekly menu review

When family voting converges, the celebration card SHALL link directly to the converged week in Planner with matched recipes clearly labeled as household suggestions awaiting assignment rather than confirmed meals or stocked groceries.

#### Scenario: Member follows See your matches into Planner
- **WHEN** voting converges and a member activates `See your matches`
- **THEN** Planner opens that exact anchored week highlighting the matched candidates as proposed suggestions ready to confirm or adjust, leaving committed meal status false until saved

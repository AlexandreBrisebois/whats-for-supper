# Spec Delta

## MODIFIED Requirements

### Requirement: Display read week status without implying a transition

The planner SHALL derive voting-open and locked display from loaded week status. Collecting VotingOpen SHALL show the collecting signal, Nudge family, and Close Voting. Confirmed converged VotingOpen for the loaded round SHALL show a steady Garden-green signal, hide Nudge family, and promote closing to primary Garden green (Save menu & close voting with pending suggestions, else Close Voting). Non-past Draft or Locked weeks SHALL offer Ask the Family.

#### Scenario: Voting status is loaded

- **WHEN** the displayed week status is one and confirmed convergence is absent or does not match the loaded round and week
- **THEN** the planner shows its collecting voting signal, `Nudge family`, and `Close Voting` without a separate voting-status badge

#### Scenario: Draft or locked non-past week

- **WHEN** the loaded status is zero or two and its week is not past
- **THEN** the planner offers `Ask the Family`

#### Scenario: Past week

- **WHEN** seven loaded dates have Sunday before the deployment-local current date and status is zero or two
- **THEN** the planner omits `Ask the Family`

#### Scenario: Converged week with pending suggestions

- **WHEN** the displayed week status is one and the session is confirmed `converged` for the loaded round and Monday with one or more pending suggestions
- **THEN** the planner shows a steady Garden-green voting indicator, hides `Nudge family`, and promotes the close control to primary Garden green (`bg-garden-fill` with white `Check` icon and `Save menu & close voting` in English or `Enregistrer et fermer le vote` in French) without mutating until activated
- **AND** the promoted control keeps a minimum `48 x 48 CSS px` target and wraps legibly without horizontal clipping at `320px` width and `200%` text scaling

#### Scenario: Converged week with no pending suggestions

- **WHEN** the displayed week status is one and the session is confirmed `converged` for the loaded round and Monday with zero pending suggestions
- **THEN** the planner shows a steady Garden-green voting indicator, hides `Nudge family`, and promotes the close control to primary Garden green (`Check` icon) labeled `Close Voting` in English or `Fermer le vote` in French

### Requirement: Preserve visible Swipe Match Cook voting controls

Ask the Family, Nudge family, and the close-voting action SHALL retain their state-dependent visible actions in their own row in ordinary Planner and Portions (with Nudge family omitted when the loaded week is confirmed converged). Portions SHALL not consolidate them into overflow or alter votes. Starting a voting action SHALL preserve portions drafts under existing navigation/recovery boundaries.

#### Scenario: Voting is open while portions is edited

- **WHEN** collecting `VotingOpen` is displayed (including when session convergence is unconfirmed for that round) and Portions opens
- **THEN** `Nudge family` and `Close Voting` remain visible and operable under ordinary rules
- **AND** returning to normal recipe rows preserves voting state

#### Scenario: Voting is available but not open

- **WHEN** `Ask the Family` would ordinarily be available
- **THEN** it remains a visible action rather than being replaced by the count editor or a menu

#### Scenario: Converged week while portions is edited

- **WHEN** confirmed converged `VotingOpen` is displayed for the loaded round and Portions opens
- **THEN** `Nudge family` remains hidden while the primary Garden-green save-and-close action stays visible and operable in its own row without overflow
- **AND** activating it preserves portions drafts under existing departure and recovery boundaries

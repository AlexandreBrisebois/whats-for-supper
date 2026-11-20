# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve visible Swipe Match Cook voting controls

Ask the Family, Nudge family, and the close-voting action SHALL retain their state-dependent visible actions in their own row in ordinary Planner and Portions, with Nudge family omitted when the loaded week is confirmed converged. When both Nudge family and the close-voting action are shown, they SHALL share one line at every supported phone width. Portions SHALL NOT consolidate them into overflow or alter votes, and starting a voting action SHALL preserve portions drafts.

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

#### Scenario: Collecting week shows both voting actions on one line

- **WHEN** collecting `VotingOpen` is displayed on a 390 CSS px phone with Portions available
- **THEN** `Nudge family` and `Close Voting` share one horizontal line, neither label wraps, neither button sits below the other, and each target is at least 48 CSS px
- **AND** the same holds at 320 CSS px, in French (`Fermer le vote`), and while Portions is being edited

#### Scenario: Enlarged text reflows instead of overflowing

- **WHEN** collecting `VotingOpen` is displayed at 320 CSS px with 200% text
- **THEN** `Nudge family` and `Close Voting` may stack on two lines but neither overflows the viewport or is clipped

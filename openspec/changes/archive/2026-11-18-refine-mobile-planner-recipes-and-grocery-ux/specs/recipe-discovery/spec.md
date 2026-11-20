## ADDED Requirements

### Requirement: Pulse navigation Discover control only during an open collecting session

The primary bottom-navigation Discover control SHALL apply its pulsing pending-cards animation only when the authoritative voting session phase is `collecting` and unvoted discovery categories or cards exist, and SHALL NOT pulse when no voting session is open (`unowned`), session state is unavailable, or convergence is confirmed (`converged`).

#### Scenario: No voting session open on Home or Planner

- **WHEN** the household has unvoted discoverable recipes in the catalog and the voting session phase is `unowned` or absent
- **THEN** the navigation Discover button renders statically without the pulsing animation class on Home and all other non-discovery routes

#### Scenario: Open collecting voting session with unvoted cards

- **WHEN** the authoritative voting session phase is `collecting` and discovery categories remain to vote on
- **THEN** the navigation Discover button pulses while on Home, Planner, Recipes, or Profile, and stops pulsing when active on `/discovery` or when the session becomes `converged` or `unowned`

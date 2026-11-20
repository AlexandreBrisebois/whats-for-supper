## ADDED Requirements

### Requirement: Keep Home focused on Tonight and library navigation without voting handoffs

Home SHALL NOT render a below-the-fold voting card, voting invitation, or voting status/retry section in any voting session phase; global voting state and entry SHALL live on the primary bottom-navigation control in recipe discovery. Capture a Recipe SHALL remain available on Home, and ordinary library entry SHALL use bottom Recipes without a Home Browse tile.

#### Scenario: Active collecting or converged round while on Home

- **WHEN** Home loads or receives live updates during an active `collecting` or `converged` voting round
- **THEN** Home renders no below-the-fold voting card, `Vote Now` action, or `See your matches` action
- **AND** Home retains `Capture a Recipe`, Tonight supper cards, and bottom `Recipes` navigation

#### Scenario: Closed or unowned round on Home

- **WHEN** confirmed household state has no active open voting round, including after closing voting
- **THEN** Home displays no voting invitation while retaining `Capture a Recipe` and bottom `Recipes` navigation without a Browse Library handoff

#### Scenario: Voting session check is pending or unavailable on Home

- **WHEN** the voting session read is loading, fails, or returns an unusable response while Home is mounted
- **THEN** Home displays no voting-status banner or voting `Retry` button beneath Tonight content
- **AND** Tonight supper decisions and navigation remain operable

## REMOVED Requirements

### Requirement: Offer Home voting and library handoffs

**Reason**: Home no longer renders a below-the-fold voting card, `Vote Now` action, or `See your matches` invitation; global voting entry and converged handoffs move to the primary bottom-navigation control in `recipe-discovery`, while Home library and capture continuity moves under `Keep Home focused on Tonight and library navigation without voting handoffs`.
**Migration**: Use the global bottom-navigation control (`Discovery` / `Menu's in` / `Menu prêt`) to enter active voting or open converged matches, use `Capture a Recipe` on Home, and use bottom `Recipes` for library entry without a Home Browse tile.

### Requirement: Present trustworthy Home voting status and recovery

**Reason**: Home no longer renders a below-the-fold voting section or voting-status banner; voting reads, live updates, and failure recovery belong on Discovery and Planner while bottom navigation reflects confirmed voting state across routes.
**Migration**: Use the global bottom-navigation control (`Discovery` / `Menu's in`) to enter active voting or open converged matches, and use Discovery or Planner for session reconciliation and recovery.

### Requirement: Navigate Home matches to the absolute round week without mutation

**Reason**: Replaced by direct converged navigation from the bottom-navigation `Menu's in` / `Menu prêt` control in `recipe-discovery`, which preserves non-mutating absolute-week handoff semantics across all routes rather than only below the fold on Home.
**Migration**: Activate the converged bottom-navigation `Menu's in` / `Menu prêt` control on any route, or activate `See your matches` on the Discovery celebration card.

# Spec Delta

## MODIFIED Requirements

### Requirement: Pulse navigation Discover control only during an open collecting session

The primary bottom-navigation control SHALL show quiet Sunlight ochre (`Compass`, localized Discovery) when `unowned` or unavailable; add a reduced-motion-safe pulse when `collecting` with unvoted cards off `/discovery`; and show steady Garden green (`Check`, localized Menu's in / Menu prêt) persistently when `converged` until closed or superseded, opening that round's Planner meal-plan tab without mutation. The control SHALL NOT render any badge, dot or pip overlay in any state.

#### Scenario: No voting session open on Home or Planner

- **WHEN** the household has unvoted discoverable recipes in the catalog and the voting session phase is `unowned`, absent, or unavailable
- **THEN** the primary bottom-navigation control renders statically in Sunlight ochre (`Compass`, localized `Discovery` / `Découverte`) without the pulsing animation, linking to `/discovery` for optional preemptive voting
- **AND** no badge, dot or pip is rendered on the control

#### Scenario: Open collecting voting session with unvoted cards

- **WHEN** the authoritative voting session phase is `collecting` and unvoted discovery categories or cards remain
- **THEN** while on Home, Planner, Recipes, or Profile, the bottom-navigation control displays Sunlight ochre with `Compass`, the pulsing animation (suppressed under `prefers-reduced-motion: reduce`), and a localized accessible label indicating active voting
- **AND** no badge, dot or pip is rendered on the control, including when `prefers-reduced-motion: reduce` suppresses the pulse
- **AND** it stops pulsing when active on `/discovery` or when the member has no remaining cards

#### Scenario: Converged voting session displays persistent green Menu's in signal across routes

- **WHEN** the authoritative voting session phase is `converged` with a valid round identity and absolute Monday
- **THEN** on every route in both Standard AA and High Contrast AAA modes, the bottom-navigation medallion displays cooled-herb Garden green (`bg-garden-fill` with white `Check` icon and `text-garden-ink` label, without an infinite looping pulse), sets the visible label to `Menu's in` in English or `Menu prêt` in French, and exposes a localized accessible name indicating meal-plan matches are ready
- **AND** that steady Garden green `Check` presentation persists across navigation and reloads until explicit voting closure returns the session to `unowned` or a new `collecting` round supersedes it

#### Scenario: Activating converged bottom navigation opens the converged Planner week without mutation

- **WHEN** a person activates the converged `Menu's in` / `Menu prêt` bottom-navigation link (by pointer or keyboard), including after a prior Grocery-tab visit, across a deployment week rollover, or while editing Portions
- **THEN** navigation honors Planner's unsaved Portions departure guard when active and opens Planner's meal-plan tab for the converged round's absolute Monday (`/planner?weekOffset=0&referenceWeekStartDate=<monday>`) without assigning recipes, closing voting, or locking the week

#### Scenario: Direct Discovery entry still shows the celebration card during convergence

- **WHEN** a voter is already on `/discovery` when convergence arrives or navigates directly to `/discovery` (such as from a shared nudge link) while converged
- **THEN** `/discovery` continues displaying the green `Menu's in!` celebration card with `See your matches` without auto-redirecting away from `/discovery`

#### Scenario: Converged round with unavailable week identity falls back safely

- **WHEN** the session phase reads `converged` without a valid absolute Monday week identity
- **THEN** activating the primary bottom-navigation link falls back to `/discovery` rather than navigating to a guessed week

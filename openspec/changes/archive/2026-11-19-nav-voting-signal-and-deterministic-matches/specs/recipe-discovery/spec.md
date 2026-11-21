# Spec Delta

## MODIFIED Requirements

### Requirement: Distinguish unanimity metadata from persisted locks

Suggestions SHALL rank unanimous candidates before other consensus candidates, then by last-cooked date descending, then by ascending recipe identity for deterministic selection and placement. Each suggestion SHALL carry its recipe display facts, like count, family size, day index and unanimity flag. It SHALL return suggestion isLocked metadata without that metadata establishing a persisted calendar lock.

#### Scenario: Unanimous suggestion

- **WHEN** a candidate has a like from every stored member
- **THEN** unanimousVote is true on its suggestion without a write; suggestion lock metadata does not establish persistence

#### Scenario: Majority suggestion

- **WHEN** a candidate meets consensus without unanimity
- **THEN** its unanimousVote flag is false without establishing a persisted lock

#### Scenario: Tied never-cooked consensus recipes

- **WHEN** multiple eligible consensus recipes share the same unanimity status and null or equal last-cooked date, including when more tied candidates qualify than open slots
- **THEN** every read selects the same candidates ordered by ascending recipe identity and assigns them to the same open day indices across all household members

### Requirement: Pulse navigation Discover control only during an open collecting session

The primary bottom-navigation control SHALL show quiet Sunlight ochre (`Compass`, localized Discovery) when `unowned` or unavailable; add a reduced-motion-safe pulse and static non-motion cue when `collecting` with unvoted cards off `/discovery`; and show steady Garden green (`Check`, localized Menu's in / Menu prêt) persistently when `converged` until closed or superseded, opening that round's Planner meal-plan tab without mutation.

#### Scenario: No voting session open on Home or Planner

- **WHEN** the household has unvoted discoverable recipes in the catalog and the voting session phase is `unowned`, absent, or unavailable
- **THEN** the primary bottom-navigation control renders statically in Sunlight ochre (`Compass`, localized `Discovery` / `Découverte`) without the pulsing animation or active status pip, linking to `/discovery` for optional preemptive voting

#### Scenario: Open collecting voting session with unvoted cards

- **WHEN** the authoritative voting session phase is `collecting` and unvoted discovery categories or cards remain
- **THEN** while on Home, Planner, Recipes, or Profile, the bottom-navigation control displays Sunlight ochre with `Compass`, the pulsing animation (suppressed under `prefers-reduced-motion: reduce`), a static high-contrast non-motion status pip, and a localized accessible label indicating active voting
- **AND** it stops pulsing and hides the status pip when active on `/discovery` or when the member has no remaining cards

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

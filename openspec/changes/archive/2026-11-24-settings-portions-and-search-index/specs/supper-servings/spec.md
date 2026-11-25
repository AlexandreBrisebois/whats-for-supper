# Spec Delta

## MODIFIED Requirements

### Requirement: Apply an explicit household default with dated exceptions

Settings SHALL configure usual portions. Explicit counts SHALL persist until changed or reset to automatic; otherwise positive family size supplies usual. Current/future uncompleted dates inherit usual unless overridden. Default/member changes SHALL preserve overrides and past/Cooked/prepared snapshots. A deliberate correction of today's Cooked supper without a preparation receipt SHALL follow the current-day correction requirement; explicit preparation remains protected.

#### Scenario: Change the usual portion count

- **WHEN** usual auto-saves from four to five and future Wednesday has override six
- **THEN** future inherited dates use five, Wednesday retains six and past/Cooked/prepared snapshots do not change

#### Scenario: Set portions before choosing food

- **WHEN** an empty future Saturday receives override six and later receives a recipe
- **THEN** the date retains six and its new recipe uses that count

#### Scenario: Automatic family size then human choice

- **WHEN** usual is unset for four family members, a member is added, and later a person unchecks `Use family size` and enters seven
- **THEN** inherited editable dates first use four, then five, then seven
- **AND** a subsequent membership change leaves seven in effect

#### Scenario: Reset explicit usual to automatic

- **WHEN** a person checks `Use family size` in Settings
- **THEN** Settings auto-saves `defaultServings: null`, inherited editable dates use the current positive member count, overrides remain, and the left-side readout displays `<count> portions`

### Requirement: Recover Settings portions saves explicitly

Settings SHALL expose `Usual portions` as a single compact row without a `Save` button or routine saved banner: when `Use family size` (right) is checked, the left side displays `<count> portions` as plain text and auto-saves automatic family mode immediately; when unchecked, the left side renders a `72 × 48 CSS px` positive whole-number input followed by the `portions` unit label (`<input> portions`) so the unit remains visible in both states, auto-saving valid integers silently on change/blur. On save conflict or uncertain acknowledgement, Settings SHALL automatically read current saved portions, keep an unapplied draft intact, and allow retrying without a manual Review gate.

#### Scenario: Save explicit five then reopen

- **WHEN** a person unchecks `Use family size`, enters five in the left-side numeric box, and receives confirmed silent persistence (with no `Save` button or routine `"Saved"` notice)
- **THEN** Settings and inherited editable Planner dates use five, a fresh read agrees, and member changes do not alter it

#### Scenario: Save fails or competes with another update

- **WHEN** usual validation fails, another member changes the baseline, or persistence cannot be confirmed
- **THEN** invalid input stays local with an inline `role="alert"` message without sending a PUT, while a conflict or persistence failure automatically reads current saved portions (offering a single Era 3 `Retry portions` `<Button>` only if that read fails) and recovers inline without a manual `Review current portions` gate

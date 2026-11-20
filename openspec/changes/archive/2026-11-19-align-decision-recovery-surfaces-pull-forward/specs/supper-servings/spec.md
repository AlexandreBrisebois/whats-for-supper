# Spec Delta

## MODIFIED Requirements

### Requirement: Separate saved counts from grocery refresh completion

Committed portions SHALL remain saved if grocery refresh fails; confirmed persistence returns to Recipes while groceries update. Grocery status SHALL distinguish updating, updated (auto-clearing on grocery interaction), and Era 3 Hearth Retry failure without replaying writes or re-unchecking unchanged items; unknown replies SHALL read saved portions first.

#### Scenario: Reply lost after commit

- **WHEN** Done's reply is lost after serving state commits
- **THEN** the editor automatically checks saved state, recognises its confirmed result when possible and avoids a duplicate write

#### Scenario: Groceries cannot refresh

- **WHEN** counts commit but grocery follow-up fails
- **THEN** the editor returns to Recipes with saved portions and visible grocery retry feedback; entering groceries displays an Era 3 Hearth alert with an accessible Retry `<Button>` rather than presenting stale amounts as current

#### Scenario: Save finishes before grocery work

- **WHEN** portion persistence is acknowledged while recomputation remains pending
- **THEN** Done returns to Recipes and entering groceries shows an Era 3 updating status notice (`Updating your shopping list…`) until current data is available

#### Scenario: Updated shopping list notice clears automatically on grocery interaction

- **WHEN** refreshed groceries display the calm Garden `Shopping list updated` notice and the person interacts with a grocery item, extra, or aisle control
- **THEN** the notice clears automatically without requiring a manual dismiss tap while retaining a `>= 48 CSS px` close control for assistive or explicit dismissal

### Requirement: Recover Settings portions saves explicitly

Settings SHALL expose a labeled positive whole-number usual field and automatic-family toggle. Saving SHALL preserve concurrent changes cleanly: on conflict or uncertain acknowledgement, Settings SHALL automatically read current saved portions, keep the user's draft intact without claiming success, show the updated saved baseline inline without a manual Review gate, and keep ordinary grocery freshness semantics.

#### Scenario: Save explicit five then reopen

- **WHEN** a person saves five and receives confirmed persistence
- **THEN** Settings and inherited editable Planner dates show five, a fresh read agrees, and member changes do not alter it

#### Scenario: Save fails or competes with another update

- **WHEN** usual validation fails, another member changes the baseline, or persistence cannot be confirmed
- **THEN** Settings automatically reads current saved portions (offering a single Era 3 `Retry portions` `<Button>` only if that read fails) and displays the updated baseline inline inside a Hearth recovery card without a separate `Review current portions` gate so a valid draft can save directly via `Save usual portions`

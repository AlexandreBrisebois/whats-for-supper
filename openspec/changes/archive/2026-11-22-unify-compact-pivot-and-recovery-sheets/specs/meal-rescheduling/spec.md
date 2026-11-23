## MODIFIED Requirements

### Requirement: Preserve non-cooking source disposition with Tomorrow

An explicit Tomorrow non-cooking source disposition (`sourceNonCooking` or legacy `sourceDisposition: 'order_in'`) SHALL leave a recipe-free Skipped source with that normalized plan and place its recipe at tomorrow as Planned, retaining votes. Invalid `sourceNonCooking` SHALL return `400` without mutation. Legacy recipe-backed and displaced Skipped entries SHALL retain existing behavior, and rejection SHALL leave the source unchanged.

#### Scenario: Order In and Tomorrow succeeds

- **WHEN** a planned source requests Tomorrow with legacy `sourceDisposition: 'order_in'` or `sourceNonCooking` (`order_in`, `eating_out`, or `custom` with `"Supper at Grandma's"`) and the chain can move
- **THEN** the source becomes recipe-free Skipped carrying that normalized non-cooking plan in the same commit as the chain, with one Planned occurrence of its original recipe tomorrow

#### Scenario: Invalid sourceNonCooking payload is rejected before mutation

- **WHEN** a Tomorrow request supplies `sourceNonCooking` with `kind: 'custom'` and a blank or `> 80`-character label, or `kind: 'mystery'`
- **THEN** the API returns `400` with unwrapped status and message and leaves the calendar unchanged

#### Scenario: Order In and Tomorrow is blocked

- **WHEN** a Tomorrow move with `sourceDisposition: 'order_in'` or `sourceNonCooking` encounters a Cooked displaced entry
- **THEN** the original source remains unchanged and no non-cooking disposition is saved

### Requirement: Identify the original dated meal in disposition choices

Disposition choices SHALL show the original recipe and full source date on warm cream beside a terracotta bar above a divider, never boxed like a clickable card. Following-day movement SHALL show the concise localized next date with Hearth emphasis and explain forward shifting. Next Week SHALL describe first next-week availability; removal SHALL show the concise source date and keep the recipe. The subtitle SHALL name the active backup intent without claiming owned ingredients.

#### Scenario: Change a future Wednesday meal

- **WHEN** a person replaces a meal planned for a future Wednesday (e.g., `Wednesday, September 23`)
- **THEN** the non-clickable terracotta-accented header names that recipe and `Wednesday, September 23`, the Hearth-emphasized following-day choice offers `Move to Thu, Sep 24` (`Déplacer au jeu. 24 sept.`), removal offers `Remove from Wed, Sep 23` (`Retirer du mer. 23 sept.`), and neither calls the source Tonight

#### Scenario: Non-cooking intent updates the Step 2 prompt subtitle

- **WHEN** a person reaches Plan B Step 2 after selecting `Eating out` or `Made plans` (`"Supper at Grandma's"`)
- **THEN** the Step 2 subtitle references `Eating out` or `"Supper at Grandma's"` rather than saying `"before saving your new recipe"`

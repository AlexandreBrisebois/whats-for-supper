## MODIFIED Requirements

### Requirement: Switch Planner rows into At the table inline

Planner SHALL expose Portions with a plate/cutlery icon and visible label below week dates and above voting actions. The adjacent Recipes heading SHALL be removed; bottom Recipes navigation SHALL remain. Portions SHALL reuse the ordered dates, showing date, recipe photo and joined minus/value/plus without recipe names or another window. Week and Planner/Grocery navigation retain their roles, independent of voting state.

#### Scenario: Enter portions mode on a phone
- **WHEN** Portions is activated for the loaded week
- **THEN** the same ordered dates show effective counts and permitted editing while saved recipes remain unchanged
- **AND** no adjacent Recipes heading competes with Portions

#### Scenario: Long recipe name or missing photo
- **WHEN** a recipe has a long name or unavailable hero
- **THEN** the editor omits its name and uses its photo or neutral fallback without shrinking controls

#### Scenario: Empty and non-cooking nights
- **WHEN** a date is empty or non-cooking
- **THEN** an empty date uses a neutral fallback and permits portions editing; a non-cooking date retains its recognizable icon and accessible description without an active stepper
- **AND** dormant saved portions remain available for a future recipe

#### Scenario: Large text and tablet
- **WHEN** English/French labels, 320 CSS px or 200% text require reflow
- **THEN** dates, joined controls, week navigation and voting actions remain readable with visible focus and 48 CSS px targets

### Requirement: Preserve visible Swipe Match Cook voting controls

Ask the Family, Nudge family and Close voting SHALL retain their existing state-dependent visible actions in their own row in ordinary Planner and Portions. Portions SHALL not consolidate them into overflow or alter votes. Starting a voting action SHALL preserve portions drafts under existing navigation/recovery boundaries.

#### Scenario: Voting is open while portions is edited
- **WHEN** VotingOpen is displayed and Portions opens
- **THEN** Nudge family and Close voting remain visible and operable under ordinary rules
- **AND** returning to normal recipe rows preserves voting state

#### Scenario: Voting is available but not open
- **WHEN** Ask the Family would ordinarily be available
- **THEN** it remains a visible action rather than being replaced by the count editor or a menu

### Requirement: Finish or cancel a week portions draft explicitly

Portions SHALL retain Cancel/Done, draft-only minus/plus, direct numeric entry, usual portions and reset-to-usual. Done saves one changed batch and returns to recipe rows after confirmed portions persistence without waiting for groceries. Cancel restores saved values. Invalid, failed or uncertain saves SHALL retain correctable drafts and existing reconciliation behavior.

#### Scenario: Include leftovers
- **WHEN** Portions opens
- **THEN** concise How many portions? and Include extra for leftovers guidance describe one total per date without attendance or separate leftovers controls

#### Scenario: Edit two dates and finish
- **WHEN** Wednesday is directly entered as five and Saturday as seven, then Done is activated
- **THEN** one batch persists those integer counts and confirmed values appear on return
- **AND** ordinary recipe cards gain no permanent stepper or repeated default controls

#### Scenario: Leave with a draft
- **WHEN** the person changes week, opens Groceries or leaves Planner with unsaved counts
- **THEN** the inline choices are Save and continue as primary, Keep editing as secondary and Discard changes as quiet text
- **AND** Save continues only after confirmed persistence; failure retains the draft and destination, Keep editing stays, and Discard restores saved state before leaving

#### Scenario: Past or completed supper
- **WHEN** a past date, Cooked or explicitly prepared supper appears
- **THEN** its stored/frozen portions remain read-only and historical plans remain unchanged

#### Scenario: Blank usual portions
- **WHEN** usual portions is blank and a date has no override
- **THEN** that date uses original recipe quantities without an invented default
- **AND** existing explicit overrides remain effective until explicitly reset

#### Scenario: Invalid entry or concurrent saved change
- **WHEN** a count is zero, negative, fractional, nonnumeric or out of range, or another member changes the saved baseline
- **THEN** existing validation/conflict review retains the draft without a partial batch, hidden overwrite or premature navigation

### Requirement: Render day content and planned count from displayed state

In the normal recipe view the planner SHALL render displayed days in their supplied order. Status-three days SHALL use non-cooking presentation before recipe presentation. Other days with recipe IDs SHALL display recipe names; ordinary days without them SHALL offer Plan supper. The planner SHALL NOT display a weekly recipe-count badge or a replacement aggregate progress indicator. Portions mode SHALL use the same ordered dates for portion controls without altering saved recipes or suggestion state.

#### Scenario: Empty persisted week
- **WHEN** a successful read returns seven ordinary empty dates and no suggestions apply
- **THEN** the planner renders seven Plan supper day cards
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Recipe and non-cooking presentation
- **WHEN** a day has status three or an ordinary day has a recipe ID
- **THEN** status three selects non-cooking presentation; an ordinary recipe displays its name
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Pending recipe contributes to count
- **WHEN** a displayed suggestion has a recipe ID and pending marker
- **THEN** the suggestion remains pending without proving a persisted assignment
- **AND** it displays no weekly recipe-count badge or replacement aggregate progress indicator

#### Scenario: Planner status or viewport changes
- **WHEN** the planner displays a Draft, VotingOpen or Locked week at a narrow or wide viewport
- **THEN** no weekly recipe-count badge or replacement aggregate progress indicator is displayed
- **AND** the existing week-status rules still determine the available voting actions

#### Scenario: Actions remain after badge removal
- **WHEN** the planner displays available voting actions
- **THEN** the actions remain reachable without a layout slot reserved for the removed badge

## ADDED Requirements

### Requirement: Label joined portions controls by date

Each joined minus/value/plus group SHALL provide accessible date-specific names, a labeled directly editable numeric field and associated errors. Photo presentation SHALL not require visible recipe names or duplicate announcements. Compact styling SHALL preserve normal keyboard input, focus and target size rather than shrinking interaction areas.

#### Scenario: Enter an odd count with a screen reader
- **WHEN** a person focuses Friday's numeric field and enters seven
- **THEN** its name identifies Friday and portions, seven remains editable, and minus/plus have distinct date-specific names

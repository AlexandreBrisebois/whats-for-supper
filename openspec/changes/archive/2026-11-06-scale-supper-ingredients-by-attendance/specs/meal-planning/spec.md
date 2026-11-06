## ADDED Requirements

### Requirement: Switch Planner rows into At the table inline

Planner SHALL offer a Recipes / At the table strip below week dates and above the existing voting-action row. At the table SHALL show the date at the side, the recipe hero photo and minus/portions/plus controls in place, without recipe names or another window. Dates, selected week and Planner/Grocery navigation SHALL retain their roles. The new strip SHALL remain independent of voting state and reflow without overlapping other controls.

#### Scenario: Enter portions mode on a phone
- **WHEN** a person activates At the table for the loaded week
- **THEN** those same ordered dates display their effective counts with editable controls where permitted and the saved recipes remain unchanged underneath

#### Scenario: Long recipe name or missing photo
- **WHEN** a planned recipe has a long name or unavailable hero image
- **THEN** the editor omits its name and uses its existing hero or a neutral image fallback without shrinking controls

#### Scenario: Empty and non-cooking nights
- **WHEN** a date is empty or has a non-cooking plan
- **THEN** an empty date uses a neutral fallback and permits portions editing; a non-cooking date uses its recognizable icon and accessible description without an active portions stepper
- **AND** the non-cooking date retains its dormant saved count for a future recipe

#### Scenario: Large text and tablet
- **WHEN** English/French labels, 320 CSS px width or 200% text require reflow
- **THEN** the strip, dates, count controls, week navigation and voting actions remain readable and reachable with visible focus and at least 48 CSS px targets

### Requirement: Preserve visible Swipe Match Cook voting controls

Ask the Family, Nudge family and Close voting SHALL retain their existing state-dependent availability and visible actions in their own row in both modes. At the table SHALL NOT hide, replace or consolidate them into an overflow menu. Entering, editing or cancelling counts SHALL NOT open/close voting or change votes. Starting a voting action SHALL preserve any portions draft under the existing navigation/recovery boundary.

#### Scenario: Voting is open while portions is edited
- **WHEN** VotingOpen is displayed and the person enters At the table
- **THEN** Nudge family and Close voting remain directly visible and operable under their ordinary rules
- **AND** returning to Recipes preserves the voting round and vote state

#### Scenario: Voting is available but not open
- **WHEN** Ask the Family would ordinarily be available
- **THEN** it remains a visible action rather than being replaced by a count editor or menu

### Requirement: Finish or cancel a week portions draft explicitly

At the table SHALL offer Cancel/Done, draft-only minus/plus and numeric entry, usual portions and reset-to-usual controls. Done SHALL save one changed batch and return to Recipes on confirmed portion persistence, without waiting for groceries. Cancel SHALL restore saved values. Unconfirmed or failed portion saves SHALL retain drafts and clear recovery feedback.

#### Scenario: Include leftovers
- **WHEN** At the table opens
- **THEN** How many portions? and brief Include extra for leftovers guidance describe one number per date, with no attendance or separate leftovers control

#### Scenario: Edit two dates and finish
- **WHEN** Wednesday changes to six and Saturday to two, then Done is activated
- **THEN** one batched serving save is submitted and confirmed counts are used after return to Recipes
- **AND** the usual recipe cards gain no permanent stepper or repeated default-status controls

#### Scenario: Leave with a draft
- **WHEN** the person tries to change week, open Groceries or leave Planner with unsaved counts
- **THEN** an inline choice offers save-and-continue, discard or keep editing without silently losing edits or applying them to another week

#### Scenario: Past or completed supper
- **WHEN** a past date or Cooked supper is displayed in At the table
- **THEN** its stored serving context is read-only and ordinary historical plans are not changed by portions editing

### Requirement: Recognise a supper already prepared ahead

A dated supper explicitly prepared before its supper date SHALL remain on that date and show Already prepared with its actual preparation date. Planner, Home and dated detail SHALL not present it as waiting to be cooked again. Instructions SHALL remain readable. Legacy Cooked state alone SHALL not invent an actual preparation date.

#### Scenario: Tuesday cooking for Friday
- **WHEN** Friday lasagna is prepared on Tuesday and Friday is viewed later
- **THEN** Friday retains lasagna, shows Already prepared and Prepared Tuesday, and offers reading without another cooking-completion prompt

## MODIFIED Requirements

### Requirement: Render day content and planned count from displayed state

In Recipes mode the planner SHALL render displayed days in their supplied order. Status-three days SHALL use non-cooking presentation before recipe presentation. Other days with recipe IDs SHALL display recipe names; ordinary days without them SHALL offer Plan supper. The planner SHALL NOT display a weekly recipe-count badge or a replacement aggregate progress indicator. At the table mode SHALL use the same ordered dates for portion controls without altering saved recipes or suggestion state.

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

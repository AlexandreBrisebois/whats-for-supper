# Spec Delta

## Purpose

Help ordinary households understand tonight’s supper and choose or recover a meal using existing planning, recipe and cooking capabilities.

## ADDED Requirements

### Requirement: Seed Home only for the matching browser date

Home SHALL use returned schedule content to seed Tonight only when its supplied server date matches browser-local today. A different supplied date SHALL leave seeding to client reconciliation. Page reading SHALL consume meal-planning’s protected schedule read and date projection requirements.

#### Scenario: Matching date
- **WHEN** Home receives a server date equal to browser-local today
- **THEN** the returned recipe, status and non-cooking context are offered for Tonight initialization

#### Scenario: Different date
- **WHEN** the supplied server date differs from browser-local today
- **THEN** that initialization does not seed another date’s plan

### Requirement: Reconcile Tonight on Home entry

Home SHALL request a current-week schedule read on mount and show Aligning your day while Tonight synchronization is loading. If returned dates exclude browser-local today, it SHALL try the adjacent relative week in that date’s direction. Failed reads SHALL end loading and retain prior Tonight content without dedicated Retry feedback.

#### Scenario: Local date outside returned week
- **WHEN** browser-local today precedes the first returned date
- **THEN** Tonight requests the preceding relative week before selecting its date

#### Scenario: Read failure
- **WHEN** Tonight synchronization rejects
- **THEN** loading ends with prior content retained and the error logged

### Requirement: Retain recent Tonight assignment during ordinary synchronization

For an ordinary day read, Tonight SHALL retain an assignment made less than twenty seconds ago when the returned recipe differs. A matching recipe SHALL refresh its details. A returned Cooked status SHALL update status; a returned Skipped day SHALL apply its returned recipe and non-cooking content. Live updates SHALL remain governed by household-live-updates.

#### Scenario: Ordinary stale read
- **WHEN** an ordinary read differs from an assignment made less than twenty seconds ago
- **THEN** the recent recipe remains displayed

#### Scenario: Matching details
- **WHEN** an ordinary read returns the recently selected recipe identity
- **THEN** its returned details can populate Tonight

#### Scenario: Saved skipped plan
- **WHEN** synchronization returns today as Skipped
- **THEN** Tonight applies its returned recipe and non-cooking context

### Requirement: Present the active planned Tonight recipe

While Tonight is neither Cooked nor Skipped and its recipe has an ID and name, Home SHALL display that recipe’s menu card with available description, image, ingredients and formatted time. The card SHALL offer cooking entry and changed-plan recovery. Cooking itself SHALL remain cooking-owned.

#### Scenario: Planned recipe
- **WHEN** Tonight holds a named recipe with identity and ordinary status
- **THEN** its menu card offers Cook’s Mode and recovery

#### Scenario: Open cooking
- **WHEN** a person activates cooking entry for that displayed recipe
- **THEN** the cooking view opens with that recipe identity

### Requirement: Present and dismiss Tonight cooked feedback

When Tonight status is Cooked, Home SHALL show its cooked-success card until dismissed within the mounted Home view. Dismissal SHALL show compact Cooked tonight feedback; activating that feedback with a current recipe identity SHALL reopen cooking. This presentation SHALL NOT itself submit cooking completion.

#### Scenario: Cooked status
- **WHEN** Tonight becomes Cooked before the success card has been dismissed
- **THEN** Home displays cooked-success feedback without the planned menu card

#### Scenario: Dismiss cooked feedback
- **WHEN** a person dismisses the success card and a current recipe identity is available
- **THEN** compact cooked feedback offers cooking entry

### Requirement: Offer choices for an empty or Mystery night

With no current recipe and no Cooked status, Home SHALL offer supper choices for an ordinary unfinished night or a saved Mystery night. Opening Quick Find SHALL not itself clear the Mystery plan. Saved recipe-free non-Mystery plans SHALL use meal-planning’s Hand eligible Home plans back to Planner editing requirement.

#### Scenario: Ordinary empty night
- **WHEN** Tonight is ordinary and empty
- **THEN** Home offers Quick Find and Order In alongside the available GOTO choice or setup link

#### Scenario: Mystery night
- **WHEN** Tonight is recipe-free Skipped with Mystery kind and a person opens Quick Find
- **THEN** recipe choices open without submitting a plan-clear operation

### Requirement: Select or cancel Home Quick Find

Home Quick Find SHALL target week zero and the browser-local Monday-based weekday. Its deck, loading, exhaustion, inspection, dismissal and invalidation SHALL follow the accepted meal-planning Quick Find requirements. Ordinary selection SHALL close the modal and offer that recipe for Tonight assignment; dismissal SHALL not submit selection.

#### Scenario: Select from empty Tonight
- **WHEN** a person selects an available recipe through Home Quick Find without replacement intent
- **THEN** Quick Find closes and Tonight assignment receives its identity, name and image

#### Scenario: Dismiss before selection
- **WHEN** a person closes Home Quick Find before choosing a recipe
- **THEN** Tonight receives no assignment through that dismissal

#### Scenario: Continue to Search
- **WHEN** the targeted terminal library card is displayed
- **THEN** its Search link carries addToDay and weekOffset zero under the shared Quick Find requirement

### Requirement: Display Tonight assignment before server confirmation

Tonight choice SHALL immediately display the chosen recipe, clear non-cooking metadata and use ordinary status while dispatching the shared chosen-recipe assignment for week zero and the browser-local weekday in the background. Rejection SHALL be logged without automatic local rollback or dedicated assignment-error feedback. Display SHALL NOT establish persisted assignment.

#### Scenario: Assignment pending
- **WHEN** a person chooses a Tonight recipe and its assignment request remains pending
- **THEN** the chosen recipe is already displayed with non-cooking context cleared

#### Scenario: Assignment rejects
- **WHEN** the background Tonight assignment rejects
- **THEN** the error is logged without this handler restoring the prior choice

### Requirement: Hydrate only the still-selected Tonight recipe

After Tonight selection, a recipe-detail read SHALL request description, ingredients and time for display. Returned details SHALL apply only if the selected identity still matches. An unavailable or failed detail read SHALL leave the optimistic display available without dedicated hydration-error feedback.

#### Scenario: Selection changes during detail read
- **WHEN** recipe A’s details arrive after Tonight has switched to recipe B
- **THEN** A’s returned details do not replace B’s display

#### Scenario: Detail read fails
- **WHEN** the eager recipe-detail request rejects
- **THEN** the optimistic Tonight display remains and the failure is logged

### Requirement: Offer Home voting and library handoffs

Home SHALL read next-week schedule status on mount. A returned VotingOpen week with days SHALL offer a voting nudge counting recipe-bearing days; Vote SHALL navigate to Discovery and Dismiss SHALL hide the nudge in the mounted view. Read failure SHALL show no nudge through that read. Home SHALL also offer Capture a Recipe and Browse Library links.

#### Scenario: Next week open for voting
- **WHEN** the next-week read returns VotingOpen with days
- **THEN** the nudge displays its recipe-bearing-day count and offers Discovery navigation

#### Scenario: Read fails or nudge dismissed
- **WHEN** the next-week read rejects or the person dismisses a shown nudge
- **THEN** that nudge is absent without changing the plan

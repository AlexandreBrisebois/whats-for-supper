# Tonight meal decisions delta

## ADDED Requirements

### Requirement: Share authoritative Today context across Home rendering and actions

SSR and mounted Home SHALL consume meal-planning's authoritative calendar context. Today assignment, Quick Find, Order In and recovery SHALL use that context's date, weekday and captured reference Monday. A started recovery SHALL retain its date across awaits; a new action SHALL follow Refresh expired Today context before a new action. Browser timezone SHALL NOT select the supper slot.

#### Scenario: SSR and browser have different local dates
- **WHEN** Toronto deployment context identifies October 11 while the SSR host and Tokyo browser identify October 12 locally
- **THEN** both Home renderings identify October 11 as Tonight and a new selection targets that date

#### Scenario: Recovery crosses midnight
- **WHEN** recovery begins on deployment October 11 and an awaited disposition finishes on October 12
- **THEN** its subsequent replacement retains the captured October 11 target and reference Monday

#### Scenario: Returning after the deployment day changed
- **WHEN** Home resumes after its authoritative context expires
- **THEN** it refreshes Today before another date-dependent action and does not display yesterday's recipe as the newly resolved Tonight

## RENAMED Requirements

- FROM: `### Requirement: Seed Home only for the matching browser date`
- TO: `### Requirement: Seed Home only for the matching deployment date`

## MODIFIED Requirements

### Requirement: Seed Home only for the matching deployment date

Home SHALL use returned schedule content to seed Tonight only when its supplied authoritative deployment date matches deployment-local today. A different supplied date SHALL leave seeding to client reconciliation. Page reading SHALL consume meal-planning’s protected schedule read and date projection requirements.

#### Scenario: Matching date
- **WHEN** Home receives an authoritative deployment date equal to deployment-local today
- **THEN** the returned recipe, status and non-cooking context are offered for Tonight initialization

#### Scenario: Different date
- **WHEN** the supplied authoritative deployment date differs from deployment-local today
- **THEN** that initialization does not seed another date’s plan

### Requirement: Reconcile Tonight on Home entry

Home SHALL request a current-week schedule read on mount and show Aligning your day while Tonight synchronization is loading. If returned dates exclude deployment-local today, it SHALL try the adjacent relative week in that date’s direction. Failed reads SHALL end loading and retain prior Tonight content without dedicated Retry feedback.

#### Scenario: Local date outside returned week
- **WHEN** deployment-local today precedes the first returned date
- **THEN** Tonight requests the preceding relative week before selecting its date

#### Scenario: Read failure
- **WHEN** Tonight synchronization rejects
- **THEN** loading ends with prior content retained and the error logged

### Requirement: Select or cancel Home Quick Find

Home Quick Find SHALL target week zero and the deployment-local Monday-based weekday. Its deck, loading, exhaustion, inspection, dismissal and invalidation SHALL follow the accepted meal-planning Quick Find requirements. Ordinary selection SHALL close the modal and offer that recipe for Tonight assignment; dismissal SHALL not submit selection.

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

Tonight choice SHALL immediately display the chosen recipe, clear non-cooking metadata and use ordinary status while dispatching the shared chosen-recipe assignment for week zero and the deployment-local weekday in the background. Rejection SHALL be logged without automatic local rollback or dedicated assignment-error feedback. Display SHALL NOT establish persisted assignment.

#### Scenario: Assignment pending
- **WHEN** a person chooses a Tonight recipe and its assignment request remains pending
- **THEN** the chosen recipe is already displayed with non-cooking context cleared

#### Scenario: Assignment rejects
- **WHEN** the background Tonight assignment rejects
- **THEN** the error is logged without this handler restoring the prior choice

### Requirement: Order in from an empty Tonight choice

Activating Order In with no current Tonight recipe SHALL immediately set local Skipped status, preserve existing non-cooking metadata or supply Order In, and offer the same date as recipe-free Skipped to the loaded week. It SHALL dispatch status-only three validation for deployment-local today. Persistence and read fallback SHALL follow meal-planning’s Retain status-only day-validation compatibility requirement.

#### Scenario: Empty night
- **WHEN** a person activates Order In with no current Tonight recipe
- **THEN** local Tonight and the offered week slot show Skipped while date validation runs in the background

#### Scenario: Validation rejects
- **WHEN** the background status-only validation rejects
- **THEN** failure is logged without automatic local rollback through that handler

### Requirement: Mark Order In before planned-recipe disposition

When an Order In recovery disposition starts with a current recipe identity, Home SHALL first offer recipe-free Skipped state locally for deployment-local today and await status-only three validation. It SHALL perform the selected move or defer only after that request resolves. Order In Drop SHALL use that validation without date deletion.

#### Scenario: Move after validation
- **WHEN** Order In recovery chooses Tomorrow and validation remains pending
- **THEN** the move has not started through that invocation

#### Scenario: Drop original cooking plan
- **WHEN** a person chooses Drop in Order In recovery and validation resolves
- **THEN** no DELETE is sent through that branch

### Requirement: Request tomorrow for the current Tonight recipe

Home Tomorrow recovery SHALL submit push movement for the current Tonight recipe, week zero and the Monday-based source index of deployment-local today. Monday through Saturday SHALL target the following index in week zero; Sunday SHALL target index zero in week one. Destination and skipped-source semantics SHALL follow the accepted meal-planning movement requirements.

#### Scenario: Weekday request
- **WHEN** Tomorrow disposition starts on Thursday with a current recipe identity
- **THEN** the move uses source index three and target index four in week zero

#### Scenario: Sunday request
- **WHEN** Tomorrow disposition starts on Sunday with a current recipe identity
- **THEN** the move uses source index six and target index zero in week one

### Requirement: Defer Tonight through the explicit-date operation

Home Save for Next Week SHALL submit deployment-local today as sourceDate and the current Tonight recipe ID to the shared defer operation, without substituting a client-selected destination. A returned message SHALL be shown as a toast. Destination choice, conflicts and persisted consequences SHALL remain meal-planning-owned.

#### Scenario: Defer returns a destination message
- **WHEN** Save for Next Week resolves with a message
- **THEN** Home shows that returned message without posting a separate movement request

#### Scenario: Source is missing or awaiting consensus
- **WHEN** the shared defer operation rejects a missing exact source or an awaiting-consensus source
- **THEN** Home does not proceed to replacement through that rejected invocation

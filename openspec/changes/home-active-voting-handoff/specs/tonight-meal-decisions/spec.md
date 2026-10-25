## MODIFIED Requirements

### Requirement: Offer Home voting and library handoffs

Home SHALL offer the active open household voting round regardless of its target week or the selected Planner week. Collecting SHALL offer "Vote Now" to Discovery; converged SHALL show exactly "Menu's In" and "See your matches" to that round's meal plan. The invitation SHALL remain visible while open without dismissal. Copy SHALL NOT assume next week or claim a recipe count from scheduled days. Capture a Recipe and Browse Library links SHALL remain available.

#### Scenario: This week open while next week is closed
- **WHEN** Home receives a confirmed collecting round for this week and next week is not open
- **THEN** Home offers Vote Now leading to Discovery for the active round without requiring a reload

#### Scenario: Next week open for voting
- **WHEN** the confirmed collecting round targets next week
- **THEN** Home offers Vote Now without requiring recipe-bearing scheduled days or claiming their count represents voting candidates

#### Scenario: Later week differs from Planner selection
- **WHEN** the confirmed open round targets a later week while Planner has another week selected
- **THEN** Home presents that active round's collecting or converged action independently of Planner selection

#### Scenario: Open round converges
- **WHEN** a collecting round becomes confirmed converged while Home is mounted
- **THEN** Home replaces Vote Now with the exact headline "Menu's In" and button "See your matches"
- **AND** voting remains open until an explicit existing close action

#### Scenario: Closed or unowned round
- **WHEN** confirmed household state has no active open round, including after closing voting
- **THEN** Home removes the voting invitation while retaining Capture a Recipe and Browse Library links

#### Scenario: Invitation cannot be dismissed
- **WHEN** an open round remains active through Home interaction, leaving Home or returning to Home
- **THEN** its invitation remains available without a dismiss control or suppression inherited from another round

#### Scenario: Read fails or nudge dismissed
- **WHEN** a voting-status read fails or a person seeks the former nudge dismissal while voting is open
- **THEN** failure follows Present trustworthy Home voting status and recovery, and the open-round invitation has no dismiss control
- **AND** neither circumstance changes the plan or closes voting

#### Scenario: Live open and reopen
- **WHEN** voting opens or a closed week is reopened as a new round while Home is mounted
- **THEN** Home presents the new round's authoritative phase without retaining the prior round's completion state

## ADDED Requirements

### Requirement: Present trustworthy Home voting status and recovery

Home SHALL distinguish confirmed voting status from initial loading, rechecking and failed reads. It SHALL withhold unconfirmed voting actions, retain any last-known invitation with clear checking or unavailable feedback, and offer Retry after failure. Successful shared reconciliation SHALL restore the current action or remove a closed round. Older updates SHALL NOT restore superseded rounds or phases.

#### Scenario: Initial hydration
- **WHEN** Home has no confirmed voting snapshot and the initial status read is pending
- **THEN** it shows a compact checking status without Vote Now, See your matches or a claim that voting is closed
- **AND** Tonight and other Home navigation remain usable

#### Scenario: Read fails or status is stale
- **WHEN** initial status fails, or a recheck of a previously known open round is pending or fails
- **THEN** Home displays checking or unavailable feedback and withholds the voting action rather than offering its last-known state as current
- **AND** failure offers Retry without dismissing the invitation or changing the plan

#### Scenario: Retry reconciles a closed round
- **WHEN** Retry succeeds after an unavailable open-round snapshot and confirms no open round
- **THEN** Home removes the invitation and unavailable feedback

#### Scenario: Reconnect or mobile resume
- **WHEN** the existing household live connection reconnects, or the app resumes through visible or pageshow events after a missed open, close or convergence update
- **THEN** Home follows the reconciled current round and phase without requiring reload

#### Scenario: Delayed or different-host update
- **WHEN** an older update arrives after a newer round state, or an update from an unconfirmed server incarnation arrives
- **THEN** Home does not regress to the older state or treat the different host's update as confirmed before authoritative reconciliation

### Requirement: Navigate Home matches to the absolute round week without mutation

Activating See your matches SHALL open the displayed confirmed round's absolute target week in Planner's meal-plan tab. Navigation SHALL preserve suggestions as suggestions awaiting explicit saving and voting closure; it SHALL NOT assign meals or close voting. A missing usable round identity or week SHALL withhold the action and provide status recovery rather than navigate to a guessed week.

#### Scenario: Previously selected grocery tab and different week
- **WHEN** a person activates See your matches while Planner previously showed groceries for another week
- **THEN** Planner opens the converged round's meal-plan tab and absolute week with existing suggestions and saved meals retaining their distinct states
- **AND** the handoff submits no assignment or voting-close mutation

#### Scenario: Date rolls over before activation
- **WHEN** the deployment week changes between showing the converged invitation and activating See your matches
- **THEN** navigation still opens the displayed round's absolute week rather than interpreting its old relative offset against the new date

#### Scenario: Round closes or changes around activation
- **WHEN** an authoritative close or replacement round is accepted before activation
- **THEN** Home removes or updates the action to match the accepted round
- **AND** a close accepted after navigation leaves the captured week as the destination while existing Planner reconciliation presents its current state, without a handoff mutation

#### Scenario: Missing navigation identity
- **WHEN** a purported open-round status lacks a usable round identity or absolute target week
- **THEN** Home withholds its action, indicates unavailable voting status and offers Retry instead of routing to the selected or next week

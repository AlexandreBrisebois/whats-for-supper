## MODIFIED Requirements

### Requirement: Present the targeted recipe-detail planning action

Search with valid addToDay, weekOffset and captured reference SHALL retain its dated target while detail opens. An unassigned target action SHALL name that destination and use the loaded recipe without another day prompt. A confirmed identical dated meal SHALL use Planned navigation instead of assignment. Invalid/incomplete context SHALL show correction feedback rather than assign Tonight. Changing a proposed day SHALL be explicit and preserve the recipe.

#### Scenario: Open detail in planning context
- **WHEN** a recipe detail is opened from Search targeting a specific planner day
- **THEN** detail offers the planning action for that target rather than requiring selection of another day

#### Scenario: Use the loaded recipe
- **WHEN** a person activates that planning action with a loaded recipe
- **THEN** the chosen recipe and parsed target are passed into assignment

#### Scenario: Another occurrence does not replace an explicit target
- **WHEN** a recipe is saved on Wednesday and Search explicitly targets an unassigned Friday
- **THEN** Friday remains the visible planning destination; Wednesday does not silently retarget or label Friday Planned

### Requirement: Avoid reassigning an identical dated meal

A confirmed identical recipe at the selected ordinary supper SHALL show Planned for that date and navigate to its Planner destination without assignment. The Planned state SHALL have no change arrows or direct plan-changing controls. Cooked or AwaitingConsensus targets SHALL retain review in Planner rather than reset completion or consensus. A missing, failed or changed target read SHALL not establish Planned.

#### Scenario: Same recipe or completed target
- **WHEN** the target already has the chosen recipe, or is Cooked or AwaitingConsensus
- **THEN** an ordinary confirmed match offers Planned navigation; completed or consensus state offers its existing applicable review without mutation
- **AND** no change arrow is attached to a confirmed saved occurrence or repurposed as movement/navigation


#### Scenario: Navigate to the captured planned date
- **WHEN** Planned is activated for a confirmed saved occurrence
- **THEN** Planner opens the exact captured absolute date/reference week and makes that day identifiable, including across Sunday, later weeks or deployment-calendar rollover
- **AND** navigation does not assign, move, delete, complete, change portions or claim a new save

#### Scenario: Saved Planner entry and changed occurrence
- **WHEN** detail was entered from a saved Planner occurrence
- **THEN** Planned navigation returns to that source date rather than recommending another target
- **AND** if the occurrence changed or cannot be confirmed, review/error state replaces the stale Planned claim without silently choosing another date or overwriting the plan

#### Scenario: Date arrows retain their original meaning
- **WHEN** an unplanned recipe's target-date arrows are activated
- **THEN** the existing chooser changes only its proposed destination; opening, choosing or cancelling does not navigate to Planner or move a saved occurrence
- **AND** a separate permitted dated Plan activation is required before assignment

### Requirement: Offer an explicit change of planning day

For an unplanned target, recipe selection SHALL show the proposed destination with a Change day action. The chooser SHALL retain the recipe and display dated current plans so empty, recipe-backed and non-cooking days are distinguishable. Opening, changing or cancelling the chooser SHALL NOT mutate the schedule. Cancellation SHALL restore the previous destination; choosing another day SHALL update it before saving.

#### Scenario: Choose another date without searching again
- **WHEN** a person changes a suggested Thursday to Saturday
- **THEN** the same recipe is retained, Saturday becomes the visible destination and no assignment occurs until the dated primary action is activated

#### Scenario: Non-cooking date is chosen explicitly
- **WHEN** a person chooses a date with Take Out, Eating Out or another saved non-cooking plan
- **THEN** the flow explains that plan and asks before removing it and saving the recipe
- **AND** declining retains both the existing plan and selected recipe

# Tonight meal decisions delta

## MODIFIED Requirements

### Requirement: Offer Home voting and library handoffs

Home SHALL offer the active open household voting round regardless of target or Planner week. Collecting SHALL offer "Vote Now" to Discovery; converged SHALL show "Menu's In", "Your matches are ready to review and save." and "See your matches" to that round's meal plan, exactly in English with equivalent French intent. The invitation SHALL remain without dismissal while open. Copy SHALL NOT assume next week or claim recipe counts from days. Capture SHALL remain available. Home SHALL NOT show a Browse Library button or tile; the bottom Recipes destination SHALL provide ordinary library entry.

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
- **THEN** Home replaces Vote Now with the exact English headline "Menu's In", supporting copy "Your matches are ready to review and save." and button "See your matches"
- **AND** voting remains open until an explicit existing close action

#### Scenario: French matched-state copy
- **WHEN** Home presents the converged invitation in French
- **THEN** its localized headline, supporting sentence and action convey that matches are ready to review and save, without claiming saved meals or closed voting
- **AND** this Home copy does not change Discovery copy

#### Scenario: Closed or unowned round
- **WHEN** confirmed household state has no active open round, including after closing voting
- **THEN** Home removes the voting invitation while retaining Capture a Recipe and bottom Recipes navigation without a Browse Library handoff

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

### Requirement: Reveal lower Home handoffs with the collapsed planned meal

The collapsed planned Tonight card and complete Capture a Recipe handoff SHALL remain readable and reachable through normal page scrolling. The Browse your library handoff SHALL be removed; ordinary library access SHALL use bottom Recipes navigation. Taller photography SHALL take priority over fitting all content above bottom navigation in the initial viewport.

#### Scenario: Initial ordinary Home view
- **WHEN** Home settles at the top of the page at 412 by 915 CSS px with a usable photo, a title occupying at most two lines, ordinary text, collapsed ingredients and no intervening status cards or banners
- **THEN** the complete planned card and the complete label of the Capture handoff remain reachable above bottom navigation through normal page scrolling
- **AND** Cook, Change plan and View ingredients remain directly available with the existing action meanings and touch targets

#### Scenario: Expanded ingredients or exceptional content
- **WHEN** ingredients are expanded, the title exceeds two lines, text is enlarged, additional Home notices or voting content appears, or the viewport is smaller than the primary acceptance viewport
- **THEN** the page can grow vertically and Capture and bottom Recipes navigation remain reachable through normal page scrolling
- **AND** Home does not hide status content, shrink usable photography below its width-driven 5:4 proportions, truncate essential text or reduce action targets to force everything into one screen

#### Scenario: Wide viewport
- **WHEN** the same planned meal is displayed on a tablet or wider screen
- **THEN** its composition remains centred with capped width rather than stretching the photograph across the screen
- **AND** content remains readable and actions reachable in portrait and landscape

### Requirement: Retire separate GOTO management without losing saved work

Users SHALL manage Go-To membership through recipe stars. Browse and Search SHALL NOT expose separate management, pending-management lists or Add a Go-To acquisition. Search SHALL retain its Go-To filter and Settings SHALL keep management absent. Retirement SHALL NOT delete recipes, memberships or accepted background work, or change backend membership filtering.

#### Scenario: Existing saved membership
- **WHEN** a household opens Browse, Search or recipe detail after management retirement
- **THEN** saved Go-To membership remains available to filtering and recipe stars, with no management disclosure or acquisition entry

#### Scenario: Legacy management URL
- **WHEN** `/browse-all-stack?gotoOnly=true&manageGoto=true` opens
- **THEN** the route redirects to `/recipes?gotoOnly=true`, opening normal GOTO-filtered Explore with collapsed search controls, the toolbar star pressed and no management/flyout
- **AND** an empty result offers Clear Go-To without mutating membership or assigning a meal

#### Scenario: Fresh legacy capture entry
- **WHEN** a newly loaded legacy capture URL contains intent=goto and a description or photo mode
- **THEN** ordinary recipe capture opens in that mode without automatic Go-To registration or creation on navigation
- **AND** adding/removing Go-To membership remains a recipe-star action

### Requirement: Offer today through the existing planner Search flow

Search on Home’s unplanned pivot SHALL open the existing planner day-specific recipe selection flow at `/recipes` with search controls expanded and today selected using authoritative calendar context. It SHALL replace that pivot’s Quick Find action without creating another search mode. Unavailable calendar context SHALL use existing retry before navigation; selection, cancellation and occupied-slot recovery SHALL retain their planner meanings.

#### Scenario: Select Search on an unplanned night
- **WHEN** a person activates Search on the unplanned pivot, including one with a ready Go-To suggestion
- **THEN** Recipes opens with expanded Search controls and today’s day index, weekOffset zero and reference week through the existing planning flow
- **AND** opening it makes no assignment and does not launch the Home Quick Find modal

#### Scenario: No usable calendar
- **WHEN** authoritative Today context cannot be resolved
- **THEN** existing calendar retry is available without guessing the target day or committing a plan

#### Scenario: Concurrent occupancy or cancellation
- **WHEN** the target becomes occupied before selection, or a person cancels without selecting
- **THEN** existing planner recovery handles occupancy and cancellation commits no new meal

#### Scenario: Hide Search during planning
- **WHEN** a person hides and reopens Search after Home’s contextual entry
- **THEN** the target day, reference week, planning banner and cancellation/assignment meanings remain
- **AND** hiding, reopening, changing presentation or clearing criteria commits no meal

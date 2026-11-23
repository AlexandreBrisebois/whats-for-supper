## MODIFIED Requirements

### Requirement: Choose a backup before resolving the planned Tonight recipe

Planned Tonight recovery SHALL present two Step 1 lanes without an extra menu: Not cooking tonight (`Take Out`, `Eating out`, `Made plans`) and Cook something else (`Suggestions`, `Search`). `Take Out` and `Eating out` SHALL advance in one tap without premature validation. `Made plans` SHALL expand an inline `1–80` char input with `Next` inside Step 1, focusing it with validation on invalid submit. `Suggestions` and `Search` SHALL preserve Quick Find and targeted Recipes search.

#### Scenario: Order In selected

- **WHEN** a person chooses `Take Out` in planned-recipe recovery Step 1
- **THEN** the disposition step opens immediately with `order_in` retained and without yet marking Tonight skipped

#### Scenario: Eating out selected in one tap

- **WHEN** a person chooses `Eating out` in planned-recipe recovery Step 1
- **THEN** the disposition step opens immediately with `eating_out` retained and without yet marking Tonight skipped

#### Scenario: Made plans expands inline without an extra menu

- **WHEN** a person activates `Made plans` in planned-recipe recovery Step 1
- **THEN** Step 1 marks `Made plans` pressed with tonal Garden styling and reveals an inline family-plan input and `Next` control directly inside the same sheet
- **AND** submitting a valid trimmed `1–80` character plan advances to Step 2 with that custom plan retained
- **AND** submitting a blank or `> 80` character plan focuses the input, shows inline validation, and remains on Step 1

#### Scenario: Replacement selected

- **WHEN** a person chooses `Suggestions`, then selects a recipe from Quick Find
- **THEN** Quick Find closes and the disposition step retains the replacement without posting it
- **AND** the choice is labeled `Suggestions` in English and French consistently with Planner

#### Scenario: Search selected

- **WHEN** a person chooses `Search` from a planned meal's Change plan sheet with authoritative today context available
- **THEN** Recipes opens with its Search controls revealed and today’s Monday-based day index, weekOffset zero and reference Monday carried as the target
- **AND** opening `Search` submits no plan mutation or Home Quick Find request

#### Scenario: Search target is occupied or selection is cancelled

- **WHEN** a recipe is chosen after `Search` and the target meal is still occupied
- **THEN** the existing Recipes occupied-slot recovery resolves the prior meal before replacement and retains its established failure and partial-completion behavior
- **WHEN** `Search` is left without choosing a recipe
- **THEN** the original plan remains unchanged

#### Scenario: Calendar context unavailable or source changed

- **WHEN** the captured authoritative calendar cannot be resolved before `Search` navigation
- **THEN** the existing calendar retry is available and no target is guessed or plan mutation submitted
- **WHEN** the displayed meal or date has changed since Change plan opened
- **THEN** `Search` does not silently target the new slot; Home refreshes the choice before navigation

### Requirement: Cancel Home recovery before mutation

Before disposition starts, Close, backdrop dismissal and Back SHALL cancel without mutation; closing Quick Find before selection SHALL cancel its choice. Pending mutations SHALL disable dismissal and Back. After partial completion, dismissal SHALL require confirmation and explain completed work remains. Back SHALL NOT restart completed disposition, SHALL sit beside top-right Close without title shift in multi-step Plan B, and SHALL be omitted on direct Step 2 entry.

#### Scenario: Abort order-in recovery

- **WHEN** a person closes the disposition step before acting after choosing `Take Out`, `Eating out`, or `Made plans`
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice

- **WHEN** a person activates `Back` from multi-step Plan B Step 2 before disposition starts
- **THEN** Step 1 returns without a mutation and preserves any in-progress `Made plans` text draft

#### Scenario: Back is presented as a secondary control

- **WHEN** multi-step Plan B transitions from Step 1 to Step 2 on a `412 × 915 CSS px` phone viewport
- **THEN** the left-aligned `Plan B` title stays at the same horizontal and vertical coordinates while a localized `Back` (`Retour`) pill button with a leading back arrow appears beside the top-right Close (`X`) control
- **AND** its text is at least `14 CSS px`, it is at least `48 CSS px` tall, shows a visible focus indicator when focused by keyboard, meets AA/AAA contrast, and remains reachable without scrolling

#### Scenario: Direct-to-Step-2 replacement omits duplicate Back

- **WHEN** occupied-slot disposition opens directly from Planner or Recipes after choosing a replacement recipe
- **THEN** the header displays the locked title and top-right Close (`X`) without a duplicate `Back` control

#### Scenario: Back is unavailable while saving

- **WHEN** a disposition mutation is pending
- **THEN** Back and Close are disabled

#### Scenario: Leave after partial completion

- **WHEN** disposition succeeded, replacement is unsaved and the person closes recovery
- **THEN** Home requires confirmation to abandon the pending replacement and explains that the original meal's completed disposition is retained

### Requirement: Mark Order In before planned-recipe disposition

For any non-cooking Plan B backup (`order_in`, `eating_out`, or validated `custom`) plus Tomorrow or `Save for Next Week`, Home SHALL send `sourceNonCooking` atomically inside `POST /api/schedule/move` or `POST /api/schedule/defer` without prior validation or optimistic mutation. For `Drop`, Home SHALL atomically replace the planned recipe via day validation (`status: 3`, `nonCooking`, `replaceRecipe: true`) without a separate `DELETE` and display the saved non-cooking card on Tonight.

#### Scenario: Move after validation

- **WHEN** non-cooking Plan B recovery (`Take Out`, `Eating out`, or `Made plans`) chooses `Save for Next Week`
- **THEN** one atomic deferral request carries `sourceNonCooking` without requiring a separate pre-defer day validation, moving the original recipe to the following week while Tonight retains the chosen recipe-free non-cooking kind and label

#### Scenario: Move with source disposition

- **WHEN** non-cooking Plan B recovery (`Take Out`, `Eating out`, or `Made plans`) chooses Tomorrow and movement remains pending
- **THEN** one Tomorrow request carries `sourceNonCooking` while the displayed and persisted source remain unchanged until commit

#### Scenario: Drop original cooking plan

- **WHEN** a person chooses Drop in non-cooking Plan B recovery (`Take Out`, `Eating out`, or `Made plans`) and replacement validation resolves
- **THEN** no DELETE is sent through that branch and Tonight displays the saved recipe-free non-cooking plan card

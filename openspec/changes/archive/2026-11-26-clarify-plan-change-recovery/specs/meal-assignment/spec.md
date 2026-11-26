# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve completed replacement stages across callers

Home, Planner, and recipe-selection recovery SHALL retain captured context, suppress pending duplicates, avoid repeating completed movement/removal, and reconcile unknown outcomes before writes. Recovery and non-cooking confirmation dialogs SHALL use Era 3 `<Button>` actions presenting at most one primary pull-forward action plus Cancel without a nested abandon prompt before any irreversible step. When a replacement conflict occurs before any disposition or save has committed, recovery SHALL name the affected date, state that nothing was saved and mark the pending recipe as unsaved rather than saved, and offer a meal-preserving primary action to choose a day for that recipe alongside a secondary dated action to open that day in Planner.

#### Scenario: Original moved but replacement rejected

- **WHEN** the original is confirmed moved and guarded replacement receives a known no-write rejection
- **THEN** the selected replacement remains and retry attempts only the safe unfinished assignment stage

#### Scenario: Reply is lost after saving

- **WHEN** replacement persistence may have succeeded but the reply is lost
- **THEN** the flow checks the captured date, recognises an already-saved replacement and does not move or assign it again

#### Scenario: Outcome cannot be checked

- **WHEN** an authoritative reconciliation read fails
- **THEN** the UI says the result is unconfirmed and offers Retry check or Review plan without enabling blind replay

#### Scenario: Leave partially completed recovery

- **WHEN** a person closes recovery after original disposition but before confirmed replacement
- **THEN** it explains completed changes and the unsaved or unknown replacement before allowing departure

#### Scenario: Pre-commit non-cooking confirmation stays single-step

- **WHEN** non-cooking replacement confirmation renders initially or encounters a retryable failure before any mutation commits
- **THEN** the Era 3 dialog presents at most one primary pull-forward `<Button>` (`Replace supper plan`, `Retry save`, or `Retry check`) plus `Cancel` without displaying a competing `Review plan` button during transient retry or a nested confirm-abandon step prior to any committed change

#### Scenario: Pre-commit changed-plan conflict preserves the chosen meal

- **WHEN** replacement recovery encounters a changed-plan conflict before any original disposition or new save has committed
- **THEN** recovery names the affected date, states that nothing was saved, labels the chosen recipe as unsaved rather than already saved, offers a primary action to choose a day for that recipe with a fresh week schedule while retaining the recipe, and offers a secondary dated action to open that day in Planner without a nested abandon prompt

### Requirement: Avoid reassigning an identical dated meal

A confirmed identical recipe at the selected ordinary supper SHALL show Planned for that date and navigate to its Planner destination without assignment. The Planned state SHALL have no change arrows or direct plan-changing controls. Cooked or AwaitingConsensus targets SHALL present distinct dated calm status guidance (distinguishing already cooked meals from meals still in household voting) rather than an error banner, offer both dated Planner review and choosing another day to plan the recipe via the read-only day chooser, and retain review in Planner without resetting completion or consensus. A missing, failed or changed target read SHALL not establish Planned.

#### Scenario: Same recipe or completed target

- **WHEN** the target already has the chosen recipe, or is Cooked or AwaitingConsensus
- **THEN** an ordinary confirmed match offers Planned navigation; Cooked presents dated already-cooked status with primary another-day planning and secondary dated Planner navigation, while AwaitingConsensus presents dated voting-open status with primary voting review in Planner and secondary another-day planning, both without mutation
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

## ADDED Requirements

### Requirement: Focus the targeted day when opening Planner for review

When Planner opens with a valid `dayIndex` matching its `weekOffset` and `referenceWeekStartDate` without a planning-success receipt, Planner SHALL scroll to and briefly focus and highlight that day card once the week renders without showing a save-success confirmation or mutating the schedule. Navigating from a Planner replacement conflict SHALL close recovery without reopening recipe detail.

#### Scenario: Open Planner for a conflicted or locked supper day

- **WHEN** Planner opens with `dayIndex`, `weekOffset`, and `referenceWeekStartDate` and no `success` receipt
- **THEN** Planner displays the matching week, scrolls `day-card-<dayIndex>` into view, focuses and briefly highlights it, and does not show a save-success confirmation banner

#### Scenario: Review from a Planner replacement conflict does not flash recipe detail

- **WHEN** a person activates the dated Planner review action from a changed-plan conflict opened inside Planner
- **THEN** replacement recovery closes without reopening recipe detail for that recipe and focuses the targeted day in Planner

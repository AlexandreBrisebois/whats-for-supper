# Spec Delta

## MODIFIED Requirements

### Requirement: Offer an explicit change of planning day

For an unplanned target, recipe selection SHALL show the proposed destination with a Change day action. The Family Cookbook chooser SHALL retain the recipe, switch weeks via a compact `<` / range / `>` header, dismiss via top-right close, backdrop, or Escape without a bottom Cancel button, display distinguishable dated plans, and update the destination cleanly on day selection without mutating the schedule.

#### Scenario: Choose another date without searching again

- **WHEN** a person changes a suggested Thursday to Saturday
- **THEN** the same recipe is retained, Saturday becomes the visible destination and no assignment occurs until the dated primary action is activated

#### Scenario: Non-cooking date is chosen explicitly

- **WHEN** a person chooses a date with Take Out, Eating Out or another saved non-cooking plan
- **THEN** the flow explains that plan and asks before removing it and saving the recipe
- **AND** declining retains both the existing plan and selected recipe

#### Scenario: Dismiss chooser or retry failed week read with compact Era 3 controls

- **WHEN** the planning day chooser opens on a phone or encounters a failed week read
- **THEN** it uses Era 3 `bg-cream` dialog chrome with `border-chrome-line` day rows, compact `<` / week range / `>` controls, a `>= 48 CSS px` top-right close control (plus backdrop/Escape dismissal without a redundant bottom Cancel button), and a Hearth `<Button>` `Retry` on week-read failure

### Requirement: Preserve completed replacement stages across callers

Home, Planner, and recipe-selection recovery SHALL retain captured context, suppress pending duplicates, avoid repeating completed movement/removal, and reconcile unknown outcomes before writes. Recovery and non-cooking confirmation dialogs SHALL use Era 3 `<Button>` actions presenting at most one primary pull-forward action plus Cancel without a nested abandon prompt before any irreversible step.

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

### Requirement: Confirm completed planning without inventing work

Ordinary single-day planning completion SHALL rely on Planner navigation, scroll-into-view, and card highlighting without a separate toast notification. Replacement/spillover receipts retain an accessible `>= 48 CSS px` close control, routine planning confirmations auto-dismiss gracefully in calm Garden styling without requiring a manual Close tap, and refresh-failed or changed-plan banners use Era 3 Hearth alert styling with `<Button>` recovery.

#### Scenario: Ordinary single-day completion omits toast

- **WHEN** Curry is saved to Wednesday without displacing another meal and Planner finishes refreshing Wednesday
- **THEN** Wednesday displays Curry in view with its highlight ring and no redundant confirmation toast appears

#### Scenario: Replacement and deferred original complete

- **WHEN** Curry is saved to Wednesday and Lasagna was deferred past a full next week to the following Monday
- **THEN** Planner confirms Curry's Wednesday date and Lasagna's actual Monday date in calm Garden styling, explains the full-week spillover, and provides an accessible close control

#### Scenario: Refresh failure uses Hearth alert styling rather than green confirmation styling

- **WHEN** Planner return reconciliation encounters a `refresh-failed` or `changed` plan outcome
- **THEN** the banner uses Era 3 Hearth alert tokens (`bg-terracotta-50 border-hearth-line`) with an Era 3 `<Button>` (`Refresh` or close) rather than calm sage confirmation styling

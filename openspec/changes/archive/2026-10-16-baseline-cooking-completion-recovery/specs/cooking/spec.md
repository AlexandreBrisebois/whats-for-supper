# Cooking draft delta

## Purpose

Let household members prepare and follow the viewed recipe, then request recording that recipe as cooked while keeping calendar matching with meal planning.

## ADDED Requirements

### Requirement: Submit completion for the viewed recipe and current local date

Cooked SHALL request recording the cooking entry recipe identity with status two for the browser-local current date at submission time. Focused cooking SHALL offer this action at its last instruction; single-page cooking SHALL offer it from the reading list. The request SHALL not substitute tonight’s recipe or a planner target date.

#### Scenario: Cook another recipe
- **WHEN** a person finishes viewing a recipe different from the current supper
- **THEN** the submitted recipe identity is the viewed recipe with status two

#### Scenario: Finish from either reading mode
- **WHEN** Cooked is activated at the focused final step or in single-page reading
- **THEN** completion targets the browser-local current date at that submission

### Requirement: Wait for cooking completion before success feedback

During a pending completion request, cooking SHALL disable its forward/completion action and suppress another completion submission from that mounted view. After the request resolves, cooking SHALL show its celebration, then invoke the optional cooked callback and close callback after the scheduled celebration delay without requesting route navigation.

#### Scenario: Request pending
- **WHEN** a completion request has started but has not resolved
- **THEN** the completion action is disabled and no celebration or success callback occurs

#### Scenario: Repeated activation during request
- **WHEN** completion is activated again while this view already has an in-flight completion
- **THEN** this view does not submit a second completion request

#### Scenario: Completion resolves
- **WHEN** the completion request resolves successfully and the view remains mounted through the delay
- **THEN** celebration appears, then the optional cooked callback and close callback are invoked without route navigation

### Requirement: Keep failed cooking completion open for retry

When the completion request rejects, cooking SHALL retain its mounted view and position, show an alert that completion could not be saved, re-enable the completion action and permit another attempt. A subsequent attempt SHALL clear the previous completion error before awaiting its result.

#### Scenario: Completion rejects
- **WHEN** recording cooking rejects
- **THEN** cooking remains open with its position and error alert and does not invoke success callbacks

#### Scenario: Retry completion
- **WHEN** a person activates Cooked after a rejected completion
- **THEN** another completion request starts and the previous error clears

### Requirement: Confirm local supper completion only for a matching confirmed result

After completion resolves, the local Today view SHALL become Cooked and clear its non-cooking metadata only when the response confirms mealMarkedCooked and its then-current recipe identity equals the submitted recipe. A false or absent confirmation SHALL leave local Today unchanged through this completion response path.

#### Scenario: Matching supper confirmed
- **WHEN** the server reports mealMarkedCooked true and the current local recipe matches the submitted recipe
- **THEN** local Today becomes Cooked and its non-cooking metadata clears

#### Scenario: Different or unconfirmed supper
- **WHEN** the server reports false or omits confirmation, or the then-current local recipe differs
- **THEN** this response path leaves local Today unchanged even though the cooking request resolved

### Requirement: Keep cooking feedback separate from calendar matching

A resolved recipe-specific completion SHALL allow cooking success feedback even when mealMarkedCooked is false. Calendar matching and unavailable-recipe rejection SHALL follow meal planning’s “Validate recipe-specific cooking without completing another assignment”; live-update receipt SHALL remain separate from this local success.

#### Scenario: Unscheduled recipe recorded
- **WHEN** recipe-specific completion resolves with mealMarkedCooked false
- **THEN** cooking succeeds locally without claiming that tonight’s assignment was completed

#### Scenario: Recipe unavailable
- **WHEN** the meal-planning validation operation rejects the viewed recipe as unavailable
- **THEN** the cooking completion request follows the failed-completion feedback path rather than confirming success

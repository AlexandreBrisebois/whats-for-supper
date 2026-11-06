## ADDED Requirements

### Requirement: Carry the planned supper date into cooking ingredients

Home, Planner and dated recipe detail SHALL carry the absolute supper date when entering cooking. Cooking SHALL identify its effective target and show the shared scaled ingredient projection for that recipe/date. Reading SHALL NOT mark cooked, change the recipe basis or update dated portions. Instructions, edits and bookmarks SHALL retain their owners; dated completion SHALL follow the captured occurrence rather than silently target today.

#### Scenario: Cook the planned six-serving supper
- **WHEN** a two-serving recipe is opened from a date configured for six
- **THEN** preparation shows three times each usable original amount with the six-serving context and no completion request is sent merely by opening it

### Requirement: Explain original instruction amounts during scaling

When scaling, cooking SHALL preserve step text and show one concise note that ingredients are adjusted while step amounts remain original. Adjusted ingredients SHALL remain easy to consult, without per-step warnings or confirmation prompts. Unreliable amounts SHALL retain review/source access; to-taste directions SHALL remain normal text. Scaling SHALL NOT imply adjusted cooking times or equipment.

#### Scenario: Step text contains half a cup
- **WHEN** scaling doubles the ingredient list while a step says add half a cup
- **THEN** the step remains unchanged and the original-text limitation is available with the scaled ingredient context

### Requirement: Preserve cooking work when serving context changes remotely

A newer dated serving state SHALL NOT silently replace quantities in an active cooking session or discard checks, position or drafts. Cooking SHALL identify that updated quantities are available and offer an explicit refresh. Accepted refresh SHALL use the current server projection with honest pending/failure feedback and retain unrelated cooking work.

#### Scenario: Portions increase while cooking is open
- **WHEN** another household member changes that supper from four to six
- **THEN** the cook can recognise the changed serving context and refresh it without losing the current instruction or unsaved edit

### Requirement: Finish cooking the captured planned occurrence

Completion from a saved dated supper SHALL prepare that occurrence on its existing supper date and record the actual preparation date. A future supper SHALL then show Already prepared and Prepared followed by that actual date. Reading an already prepared occurrence SHALL not offer completion again. Eating on another night requires an explicit plan move before cooking.

#### Scenario: Prepare Friday on Tuesday
- **WHEN** Friday lasagna for six portions is explicitly completed in cooking on Tuesday
- **THEN** Friday retains lasagna and its six-portion prepared context, shows Already prepared and Prepared Tuesday, and Tuesday's separate supper remains unchanged

#### Scenario: Eat on Tuesday instead
- **WHEN** the person explicitly moves Friday lasagna to Tuesday before cooking
- **THEN** existing guarded movement/replacement rules resolve Tuesday, its portions apply, and completion prepares that moved occurrence

#### Scenario: Same recipe on two dates
- **WHEN** Wednesday and Friday both contain lasagna and Friday's cooking is completed
- **THEN** only the captured Friday occurrence is marked prepared

#### Scenario: Consult an already prepared supper
- **WHEN** someone reopens Friday's prepared lasagna
- **THEN** ingredients and instructions remain readable with the prepared portions, without a second completion prompt or changed actual preparation date

## MODIFIED Requirements

### Requirement: Load recipe content for the cooking view

On cooking entry the view SHALL display loading feedback while requesting detail for the entry recipe. On a successful detail read it SHALL use returned ingredients and supported instructions. Dated entry SHALL additionally use the matching supper-servings ingredient projection; entry without a date SHALL retain original recipe quantities without a preview calculator. Missing/conflicting projection SHALL be visible rather than silently presenting base amounts as scaled.

#### Scenario: Detail request pending
- **WHEN** cooking detail has not finished loading
- **THEN** the cooking loading surface is displayed

#### Scenario: Recipe detail available
- **WHEN** the detail request succeeds with ingredients and parseable instructions
- **THEN** the preparation checklist and subsequent steps use that returned content


### Requirement: Submit completion for the viewed recipe and current local date

Without a saved occurrence, Cooked SHALL retain recipe-specific completion for deployment-local today at submission. With a saved occurrence, completion SHALL use guarded preparation for that captured identity/date and record the server-authoritative actual preparation date. Focused cooking SHALL offer this action at its last instruction; single-page cooking SHALL offer it from the reading list. The request SHALL not substitute tonight’s recipe or another occurrence. A proposed unsaved planning destination SHALL not become a saved cooking occurrence merely by opening Cook’s Mode.

#### Scenario: Cook another recipe
- **WHEN** a person finishes an undated recipe different from the current supper
- **THEN** the submitted recipe identity is the viewed recipe with status two

#### Scenario: Finish from either reading mode
- **WHEN** Cooked is activated at the focused final step or in single-page reading
- **THEN** undated completion targets deployment-local today; saved-occurrence completion targets the captured supper date and records actual preparation today

#### Scenario: Browser and deployment dates differ
- **WHEN** undated Cooked is activated at 2026-10-12T01:30:00Z in a Tokyo browser for a Toronto deployment
- **THEN** completion submits the viewed recipe with status two for October 11, even if the response arrives on October 12

#### Scenario: Current date cannot be refreshed
- **WHEN** completion needs fresh deployment context and the refresh fails
- **THEN** no validation is submitted and the existing failed-completion retry presentation remains available

### Requirement: Keep failed cooking completion open for retry

When the completion request rejects, cooking SHALL retain its mounted view and position, show an alert that completion could not be saved, and permit safe recovery. A known no-write rejection permits another attempt; an uncertain dated preparation SHALL first reread the occurrence and never blindly repeat completion. A subsequent attempt SHALL clear the previous completion error before awaiting its result.

#### Scenario: Completion rejects
- **WHEN** recording cooking rejects
- **THEN** cooking remains open with its position and error alert and does not invoke success callbacks

#### Scenario: Retry completion
- **WHEN** a person activates Cooked after a rejected completion
- **THEN** a known no-write rejection permits a fresh guarded completion; an uncertain dated result is checked first, and the previous error clears only for the selected recovery

#### Scenario: Prepared response is lost
- **WHEN** dated preparation commits but its reply is lost
- **THEN** a fresh occurrence read can confirm Already prepared and its original actual date without another completion or a change to today’s different supper

### Requirement: Confirm local supper completion only for a matching confirmed result

After completion resolves, the local Today view SHALL become Cooked and clear its non-cooking metadata only when the response confirms mealMarkedCooked and its then-current recipe identity equals the submitted recipe and the completed occurrence date is today. Dated preparation SHALL reconcile only its matching occurrence; a future occurrence of the same recipe SHALL not complete Today. A false or absent confirmation SHALL leave local Today unchanged through this completion response path.

#### Scenario: Matching supper confirmed
- **WHEN** the server reports mealMarkedCooked true and the current local recipe matches the submitted recipe and the completed occurrence date is today
- **THEN** local Today becomes Cooked and its non-cooking metadata clears

#### Scenario: Different or unconfirmed supper
- **WHEN** the server reports false or omits confirmation, or the then-current local recipe differs or the prepared occurrence belongs to another date
- **THEN** this response path leaves local Today unchanged even though the cooking request resolved

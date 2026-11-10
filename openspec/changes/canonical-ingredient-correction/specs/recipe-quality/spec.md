# Spec Delta

## MODIFIED Requirements

### Requirement: Expose guarded contextual processing outcomes

Connected processing SHALL use submitted feedback as source-examination guidance. A successful matching completion update SHALL expose readyToReview for content-only feedback and clear pending/failure feedback, retaining the report. A matching recorded fatal failure SHALL expose reported status, end pending state and provide saved-report retry guidance and its import ID. Stale attempt updates SHALL leave the current report unchanged.

#### Scenario: Matching content processing succeeds
- **WHEN** the linked content-only attempt reaches its report-completion update successfully
- **THEN** the issue becomes readyToReview with isReimporting false and no failure message, and remains present for review

#### Scenario: Matching fatal failure is recorded
- **WHEN** a fatal failure update is saved for the report's linked attempt
- **THEN** the issue remains reported with isReimporting false, saved-report guidance to add or change a detail, and the failed import ID

#### Scenario: Older processing finishes after another attempt is linked
- **WHEN** success or failure is recorded for an older import ID
- **THEN** it does not alter the report linked to the current import ID

#### Scenario: Retained incomplete content needs human correction
- **WHEN** an import's final content validation identifies missing ingredient or usable-step content and the retained recipe contains editable original content, with no existing report
- **THEN** a system flag enters the existing Ready for review queue with a short explanatory comment and no launched repair
- **AND** image, category, transport and other arbitrary failures do not create that flag; existing reports retain their reasons, comments, attribution and repair state

#### Scenario: Unchanged human-review flag remains manual
- **WHEN** a person saves the unchanged system flag with its unchanged explanatory comment
- **THEN** no repair is launched and the existing flag is retained unchanged

#### Scenario: A changed comment requests correction
- **WHEN** a person adds or changes a nonblank comment on eligible Ingredients or Steps feedback without Duplicate
- **THEN** the existing contextual correction rules apply, preserving their capture, repeated-feedback and stale-write safeguards


### Requirement: Display returned issue indicators

Detail and library surfaces that receive issue status SHALL display Reported for reported and Review for readyToReview, with accessible descriptions distinguishing a reported recipe from a recipe needing human review. Detail SHALL display returned re-import failure guidance. Indicator rendering SHALL NOT imply immediate refresh of every already loaded library surface.

#### Scenario: Render a returned report status
- **WHEN** detail or a supported library card receives reported status
- **THEN** it displays Reported with the accessible description Recipe reported

#### Scenario: Render a returned review status
- **WHEN** detail or a supported library card receives readyToReview status
- **THEN** it displays Review with the accessible description Recipe ready for review

#### Scenario: Review does not claim automatic completion
- **WHEN** an issue is readyToReview, whether raised by content validation or after contextual processing
- **THEN** review guidance says Ready for review and does not claim that re-import completed merely from that status


### Requirement: Offer explicit manual resolution for an existing issue

An existing issue's Review issue form SHALL offer Mark as resolved with an explanation that it removes the recipe from Needs review. A readyToReview issue SHALL give that action stronger visual emphasis and ask the person to check the recipe before resolving. A new report form SHALL omit resolution. Existing requirements govern opening and initializing the form, reason/note behavior and pending/failure guidance.

#### Scenario: Review a reported issue
- **WHEN** the Review issue form displays a reported issue
- **THEN** Mark as resolved and Removes this recipe from Needs review. are displayed

#### Scenario: Review an updated recipe
- **WHEN** the form displays a readyToReview issue
- **THEN** Mark as resolved has stronger emphasis and the form says to check the recipe and mark it resolved when it looks right

#### Scenario: No saved issue exists
- **WHEN** the new Report issue form is opened without a saved issue
- **THEN** Mark as resolved is absent

#### Scenario: Review without claiming a repair
- **WHEN** a system content flag is opened
- **THEN** the form explains that ingredients and steps need review and still offers a comment for eligible automatic correction
- **AND** Mark as resolved removes feedback without certifying content or changing readiness



### Requirement: Reuse active feedback and avoid unchanged terminal retries

Eligible contextual feedback matching a linked active attempt SHALL reuse its import ID. Changed feedback SHALL be rejected while that attempt is active. Matching feedback for a linked terminal attempt SHALL save without starting another attempt. Changed eligible feedback after a terminal attempt SHALL be considered for a new attempt rather than treated as the previous feedback.

#### Scenario: Repeat active feedback
- **WHEN** eligible contextual feedback has normalized reasons and trimmed note matching the linked pending or processing attempt
- **THEN** the response returns that same import ID with reimportStarted true without creating another attempt

#### Scenario: Change active feedback
- **WHEN** feedback changes while its linked attempt is pending or processing
- **THEN** submission returns 409 without replacing saved feedback

#### Scenario: Repeat terminal feedback
- **WHEN** normalized feedback matches the linked completed, failed or paused attempt
- **THEN** submission saves without starting another attempt or returning a new import ID

#### Scenario: Change terminal feedback
- **WHEN** feedback changes after the linked attempt is terminal and the new feedback is eligible
- **THEN** it is considered for a new contextual attempt, subject to launch success

Unchanged saved feedback without a retained original repair command SHALL be a no-op rather than inventing a new command from today's recipe. Existing captured-command retries/reconciliation and attributed active attempts SHALL retain their original behavior.

#### Scenario: Save an unchanged explanatory system comment
- **WHEN** a person saves the same reasons and explanatory comment on a system-created review flag without a retained repair command
- **THEN** its comment and report history remain unchanged and no automatic correction is launched

#### Scenario: Retry a retained original command
- **WHEN** unchanged feedback has an existing retained repair command whose acceptance needs reconciliation
- **THEN** existing retry/unknown-outcome rules use that command rather than a fresh capture

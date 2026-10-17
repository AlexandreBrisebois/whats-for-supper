# Spec Delta

## MODIFIED Requirements

### Requirement: Resolve the old Tonight meal before starting replacement

In Pick Something Else recovery, Home SHALL await confirmed Tomorrow movement, successful defer or successful date deletion before saving the retained replacement. Drop SHALL present the confirmed empty slot before saving. Replacement SHALL target the captured source date using meal-assignment's guarded empty-supper operation. The two stages SHALL remain separate operations without implied rollback.

#### Scenario: Move original then choose replacement
- **WHEN** Pick Something Else recovery chooses Tomorrow and movement confirms commit
- **THEN** the original is resolved before the retained replacement save starts against the captured source date

#### Scenario: Drop original then choose replacement
- **WHEN** Pick Something Else recovery chooses Drop and date deletion succeeds
- **THEN** Tonight presents the empty source slot and starts the guarded replacement save

#### Scenario: Save after deferral
- **WHEN** the original meal's defer succeeds
- **THEN** replacement saves to the original source date rather than the deferred destination

### Requirement: Finish Home recovery with its caller-specific follow-ups

Pick Something Else recovery SHALL close and perform success navigation only after replacement persistence is confirmed. Home SHALL refresh the captured week and Tonight; refresh failure after confirmed save SHALL show refresh feedback without repeating either mutation. Tomorrow and Drop SHALL navigate to the captured Planner target; defer SHALL remain on Home. Order In SHALL retain its existing disposition and recipe-free Skipped follow-ups.

#### Scenario: Tomorrow or Drop completes
- **WHEN** disposition and replacement save are confirmed for Tomorrow or Drop
- **THEN** recovery closes, affected views refresh and navigation targets the captured Planner week

#### Scenario: Defer completes
- **WHEN** defer and replacement save are confirmed for Save for Next Week
- **THEN** recovery closes and affected views refresh without navigation

#### Scenario: Replacement remains pending
- **WHEN** disposition succeeded but replacement persistence is not yet confirmed
- **THEN** recovery remains open with saving feedback and no success navigation

#### Scenario: Refresh fails after save
- **WHEN** replacement is confirmed saved but a subsequent view refresh fails
- **THEN** Home identifies a refresh failure and offers refresh without replaying disposition or assignment

### Requirement: Stop a rejected Home recovery invocation at its failing await

Home SHALL stop subsequent recovery steps after a rejected await and show the failed stage. Disposition rejection SHALL withhold replacement. Completed work SHALL NOT be represented as rolled back. An uncertain mutation outcome SHALL block replay until authoritative reconciliation; Tomorrow's committed-result rules SHALL remain authoritative. Replacement failure SHALL follow the retained-stage recovery requirements.

#### Scenario: Validation rejects first
- **WHEN** Order In validation rejects before Save for Next Week disposition
- **THEN** that invocation does not submit its defer

#### Scenario: Disposition rejects
- **WHEN** Pick Something Else movement, defer or deletion rejects before replacement
- **THEN** that invocation does not dispatch the retained replacement

#### Scenario: Disposition response is lost
- **WHEN** defer or deletion fails without an established outcome
- **THEN** Home shows uncertain disposition, retains the original and replacement choices, and does not replay disposition or start replacement merely because a read fails or shows an empty source

### Requirement: Cancel Home recovery before mutation

Before disposition starts, Close, backdrop dismissal and Back SHALL cancel without submitting a mutation; closing Quick Find before selection SHALL cancel its choice. While a mutation is pending, dismissal and Back SHALL be disabled. After partial completion, dismissal SHALL explain that completed work remains and offer explicit abandonment of the unsaved choice. Back SHALL NOT restart a completed disposition.

#### Scenario: Abort order-in recovery
- **WHEN** a person closes the disposition step before acting
- **THEN** no validation, move, defer, deletion or replacement is submitted by closing

#### Scenario: Return to backup choice
- **WHEN** a person activates Back before disposition starts
- **THEN** the initial Order In / Pick Something Else choice returns without a mutation

#### Scenario: Leave after partial completion
- **WHEN** disposition succeeded, replacement is unsaved and the person closes recovery
- **THEN** Home requires confirmation to abandon the pending replacement and explains that the original meal's completed disposition is retained

## ADDED Requirements

### Requirement: Retain acknowledged stages of Tonight replacement recovery

Home SHALL retain the original recipe identity, captured source date/reference Monday, chosen replacement and disposition outcome for the mounted recovery session. A failed replacement SHALL retain that choice and offer retry of assignment only. Pending actions SHALL suppress duplicate submissions; late responses from an abandoned session SHALL NOT change a newer session or its displayed date.

#### Scenario: Save rejects after a confirmed move
- **WHEN** Tomorrow commits and replacement is rejected before persistence
- **THEN** recovery identifies that the original moved but replacement was not saved, retains the choice and offers Retry save without another move

#### Scenario: Retry after defer or Drop
- **WHEN** defer or deletion succeeded and replacement failed
- **THEN** retry submits only guarded assignment to the captured source slot, without another defer or delete

#### Scenario: Repeated activation
- **WHEN** a disposition or replacement request is pending and the person activates recovery again
- **THEN** no second mutation is submitted by that recovery session

#### Scenario: Retry crosses deployment midnight
- **WHEN** recovery captured Sunday October 11 with reference Monday October 5 and retry starts after Monday October 12 begins
- **THEN** replacement still targets October 11, and the current Monday's Tonight state is not replaced by that response

#### Scenario: New recovery replaces an abandoned session
- **WHEN** an abandoned session's delayed read resolves after a new recovery starts
- **THEN** it does not clear the new choice, show success for it or navigate on its behalf

### Requirement: Reconcile uncertain replacement persistence before retry

An ambiguous replacement error SHALL trigger an authoritative read of the captured slot and retain the pending choice. The chosen recipe in Planned state SHALL confirm the desired saved outcome without another POST. A different recipe, non-cooking content or completed state SHALL block retry and show a changed-plan conflict. An ordinary empty slot SHALL permit explicit guarded Retry save. An unusable read SHALL leave the outcome unknown and retry blocked.

#### Scenario: Reply lost after persistence
- **WHEN** assignment commits but its reply or post-save follow-up fails and reread shows the chosen recipe Planned in the captured supper slot
- **THEN** recovery treats the desired replacement as saved and does not post it again

#### Scenario: Reply lost before persistence
- **WHEN** the assignment outcome is unknown and a successful reread shows the captured supper slot ordinary and empty
- **THEN** Home retains the choice and offers an explicit guarded Retry save without replaying disposition

#### Scenario: Another household action occupies the source
- **WHEN** reread shows different recipe or non-cooking content, or the guarded save returns conflict
- **THEN** Home preserves that persisted content and offers review of the changed plan rather than an overwrite or another move

#### Scenario: Reread fails
- **WHEN** the captured slot cannot be authoritatively read
- **THEN** Home shows an unknown outcome with Retry check and does not enable Retry save

### Requirement: Distinguish pending Tonight choice from saved Tonight

A recovery choice SHALL NOT be presented as a confirmed saved meal until assignment succeeds or authoritative reread confirms the desired outcome. Failure SHALL display persisted slot content alongside the retained unsaved choice. Feedback SHALL distinguish moving, saving, save failure, changed plan and uncertain outcome; retry controls SHALL identify whether they check or save.

#### Scenario: Optimistic choice fails to save
- **WHEN** the original was moved and the replacement save rejects before persistence
- **THEN** the source slot is shown as empty with the retained replacement marked unsaved rather than as a saved Tonight meal

#### Scenario: Failed check can be retried
- **WHEN** the outcome is unknown after a failed read
- **THEN** accessible feedback offers Retry check without describing the replacement as saved or offering another disposition

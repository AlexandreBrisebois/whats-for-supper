# Planning lifecycle Specification

## Purpose

Let household members open and close weekly voting, lock persisted plans and validate day status, and describe overdue finalization without treating stored completion as proof of actual cooking.

## Evidence and qualifications (non-normative)

These requirements were relocated unchanged from the combined meal-planning specification. Applicable [historical qualifications](../meal-planning/spec.md#evidence-and-qualifications-non-normative) and the [durable meal-planning evidence record](https://github.com/AlexandreBrisebois/whats-for-supper/blob/46234524072c1df2ca7f67b40d592559770bd440/docs/openspec-baseline/meal-planning.md) transfer with them, including BSL/U/A identifiers, partial-success limits and deferred runtime qualification. Relocation establishes no new API/browser/database/model guarantee.

## Related owners (non-normative)

Cross-capability requirement references resolve to the following authoritative owners:

- [Resolve supper dates through the deployment calendar](../deployment-calendar/spec.md#requirement-resolve-supper-dates-through-the-deployment-calendar)
- [Keep relative operations anchored to their intended calendar week](../deployment-calendar/spec.md#requirement-keep-relative-operations-anchored-to-their-intended-calendar-week)
- [Compose voting suggestions separately from persisted assignments](../meal-planning/spec.md#requirement-compose-voting-suggestions-separately-from-persisted-assignments)
- [Submit chosen-recipe assignment through the protected operation](../meal-assignment/spec.md#requirement-submit-chosen-recipe-assignment-through-the-protected-operation)
- [Project stored recipe and non-cooking read content](../meal-planning/spec.md#requirement-project-stored-recipe-and-non-cooking-read-content)


## Requirements

### Requirement: Open or reopen a protected planner week for voting

POST /api/schedule/voting/open SHALL accept optional weekOffset defaulting to zero and resolve its Monday by the accepted deployment calendar week rule. It SHALL create a missing plan as VotingOpen or set an existing plan VotingOpen without changing its calendar entries or discarding valid early votes. Only one week SHALL own the operational voting round at a time. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Missing weekly plan
- **WHEN** an authorized open request persists for a week with no plan
- **THEN** a VotingOpen plan is created for that Monday without assigning recipes

#### Scenario: Reopen a locked week
- **WHEN** an authorized open request persists for a Locked week
- **THEN** the week becomes VotingOpen while stored day states remain unchanged through this operation

### Requirement: Reconcile Planner after opening voting

Planner SHALL capture the loaded absolute week before opening voting and read that week's schedule and smart defaults after the open operation resolves. It SHALL publish VotingOpen status, the returned round identity and rebuilt days together only while the captured week remains loaded. Rejection SHALL restore captured local status and days only while that same week remains loaded and log failure through the page handler.

#### Scenario: Open completes
- **WHEN** open and its subsequent reads resolve with usable schedule data while the captured week remains loaded
- **THEN** displayed days are rebuilt using the accepted persisted-content and pending-suggestion composition rules, and the returned round identity accompanies VotingOpen status

#### Scenario: Open or its follow-up rejects
- **WHEN** the open operation or a rejecting follow-up throws while the captured week remains loaded
- **THEN** captured local status and days are restored without implying reversal of server voting state

#### Scenario: Open response arrives after navigation
- **WHEN** the household navigates to another week before the open response or failure arrives
- **THEN** that response does not replace the newly viewed week's status, identity or days

#### Scenario: Round identity is still loading
- **WHEN** opening has persisted but the confirming schedule has not returned
- **THEN** Planner does not expose the newly opened round as closable using the preceding round's identity

### Requirement: Promote displayed pending suggestions before closing voting

Planner Close Voting SHALL capture its loaded week and displayed pending recipe slots whose status is not Skipped, optimistically show Locked, and await assignment requests for those slots before posting lock with the captured round identity. Confirmed recipes and Skipped slots SHALL not be newly assigned by this promotion step. These separate requests SHALL NOT constitute an atomic close. A failure SHALL affect local status only while the captured absolute week remains loaded.

#### Scenario: One pending and one confirmed recipe
- **WHEN** Close Voting runs with one ordinary pending recipe and one confirmed recipe
- **THEN** only the pending recipe is submitted for assignment before lock

#### Scenario: Some assignments fail
- **WHEN** an assignment rejects while other promotion requests may have succeeded and the captured week remains loaded
- **THEN** lock is not started through that invocation and local week status is restored without rolling back successful assignments

### Requirement: Finish the Planner close-voting presentation

Planner SHALL clear pending markers and show voting-complete feedback after lock succeeds, without requiring a reread. On rejection it SHALL reread the captured week and recover Locked only for the captured round identity; otherwise it SHALL restore captured status and log failure without a dedicated retry panel. Presentation changes SHALL apply only while the captured offset and absolute week remain loaded.

#### Scenario: Lock completes in the same loaded week
- **WHEN** promotion and lock resolve with the captured offset and absolute week still loaded
- **THEN** displayed pending markers clear and temporary success feedback appears

#### Scenario: Lock rejects after promotion
- **WHEN** lock rejects after assignment requests have returned and rereading does not confirm the captured close
- **THEN** local status is restored only for the still-loaded captured week while completed server assignments are not compensated by this handler

#### Scenario: Committed close loses its response
- **WHEN** the close response fails but rereading confirms Locked for the captured round and the same week remains loaded
- **THEN** Planner recovers the confirmed closed schedule without reporting the week as open

#### Scenario: Failed close arrives after navigation
- **WHEN** close or direct week lock fails after the household navigates to another absolute week
- **THEN** recovery of the old request does not overwrite the newly viewed week's status

### Requirement: Persist a protected week lock independently of browser promotion

POST /api/schedule/lock SHALL accept optional weekOffset defaulting to zero, resolve its Monday by the accepted deployment calendar week rule and create a missing weekly plan or set an existing plan Locked. It SHALL not generate assignments for unpersisted suggestions. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Direct API lock with no entries
- **WHEN** an authorized direct lock request persists for an empty week
- **THEN** a Locked weekly plan is saved without creating suggested calendar entries

#### Scenario: Lock without household access
- **WHEN** a lock request has no accepted household credential
- **THEN** shared API authentication rejects it before the action's planning work

### Requirement: Lock persisted ordinary assignments while preserving recipe-free skips

Successful week locking SHALL change ordinary Planned entries in the selected Monday-through-Sunday range to day Locked while preserving all Cooked and Skipped statuses. Removed assignments SHALL NOT be recreated. Current Like counts SHALL be copied to matching recipes before vote clearing, and positive weekly history SHALL be captured under weekly-household-interest in the same consistent close boundary.

#### Scenario: Close preserves historical outcomes and open slots
- **WHEN** voting closes with removed assignments or legacy recipe-backed Skipped entries
- **THEN** removed recipes SHALL leave their slots available under existing planning behavior, legacy recipe-backed Skipped entries SHALL retain their representation, and Lock SHALL NOT record cooking completion or change recipe last-cooked values

#### Scenario: Planned recipe and non-cooking date
- **WHEN** locking succeeds with a Planned recipe and a recipe-free skipped plan
- **THEN** the recipe entry becomes Locked and the skipped plan retains its status and metadata

#### Scenario: Lock is not cooking
- **WHEN** a recipe is locked with no earlier last-cooked value
- **THEN** lock does not set its last-cooked value

#### Scenario: New round after meals were cooked
- **WHEN** a week reopens and a genuinely new round closes with past Cooked meals and future Planned meals
- **THEN** Cooked meals and their last-cooked values remain unchanged while Planned assignments become Locked
- **AND** completed-close replays preserve later votes and newer rounds under existing receipt rules

#### Scenario: Legacy recipe-backed skipped outcome
- **WHEN** a genuinely new round closes with an existing recipe-backed Skipped entry
- **THEN** that entry remains Skipped with its stored recipe association and is not converted back to a Locked meal

#### Scenario: Remove frees a slot before reopening
- **WHEN** a recipe assignment is explicitly removed and a genuinely new voting round closes
- **THEN** closing does not restore the removed recipe or create a calendar entry in its place

### Requirement: Attempt voting-state publication after persistence

Opening voting and locking SHALL save their week changes before reading and attempting a week snapshot with the request connection exclusion. Lock SHALL persist its lock, aggregate snapshot, close receipt and round vote clearing consistently before publication; a completed close retry SHALL NOT repeat clearing. Successful operations SHALL return 200 data.message Voting opened or Schedule locked respectively after publication returns.

#### Scenario: Lock completes
- **WHEN** lock persistence and its subsequent read/publication return
- **THEN** closure has cleared stored recipe votes and the response reports Schedule locked

#### Scenario: Publication rejects after save
- **WHEN** week snapshot publication throws after open or lock persistence
- **THEN** the request reports failure while saved week changes remain committed; retry or reload can recover a completed close without repeating vote clearing

### Requirement: Validate recipe-specific cooking without completing another assignment

POST /api/schedule/day/{date}/validate with status two and recipeId SHALL look up that available recipe and return 404 if absent. If the dated assignment does not match, it SHALL leave that assignment unchanged, attempt fill-the-gap invalidation after recording the recipe's cooking value, and return data.mealMarkedCooked false on completion. Matching assignment completion SHALL return true.

#### Scenario: Supper recipe matches
- **WHEN** recipe-specific Cooked validation matches the dated assignment and persistence/publication complete
- **THEN** that assignment becomes Cooked and the response reports mealMarkedCooked true

#### Scenario: Another recipe or no assignment
- **WHEN** the specified available recipe differs from the dated assignment or that assignment is absent
- **THEN** the dated assignment is not completed and successful response reports mealMarkedCooked false

#### Scenario: Recipe is unavailable
- **WHEN** recipe-specific Cooked validation cannot find the requested available recipe
- **THEN** the API returns 404 rather than completing another assignment

### Requirement: Retain status-only day-validation compatibility

Without nonCooking or recipeId, supported legacy validation SHALL identify the first entry for the explicit date. Status two SHALL mark an existing entry Cooked; status three SHALL mark it Skipped while retaining a recipe association. With no entry, status three SHALL create a recipe-free Skipped entry. These actions SHALL not transition the weekly plan.

#### Scenario: Legacy recipe-backed skip
- **WHEN** a status-only three request persists against a recipe-backed date
- **THEN** the entry remains recipe-backed with Skipped status rather than deleting its recipe assignment

#### Scenario: Legacy empty-date skip
- **WHEN** status-only three is submitted for a date without an entry
- **THEN** successful persistence creates a recipe-free Skipped entry using the accepted non-cooking read fallback

#### Scenario: Legacy Cooked date exists
- **WHEN** status-only two is submitted for an existing recipe-backed entry
- **THEN** successful persistence marks that entry Cooked without changing its weekly plan status

### Requirement: Publish supported changed-day validation after saving

After supported existing-entry validation saves, the operation SHALL attempt slot publication with date, represented recipe or null, status and applicable non-cooking data, then return 200 data.message Cooking status updated and mealMarkedCooked true only for status two. It SHALL not recompute groceries or publish a week snapshot through this path. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Recipe-backed validation completes
- **WHEN** status two or three saves against an existing recipe-backed entry and publication returns
- **THEN** the response reports its cooked flag after slot publication without grocery recomputation through this path

#### Scenario: Slot publication rejects
- **WHEN** slot publication throws after the validation save
- **THEN** successful completion is not reached without establishing server rollback

### Requirement: Share the generated voting destination from Planner

Nudge family SHALL open a link dialog, request a voting link for the current origin and use an empty result's /discovery fallback. Copy SHALL remain disabled without a link, then write it to the clipboard and show temporary copied feedback on success. Share SHALL be offered when native sharing is available. Close/backdrop SHALL dismiss the dialog without changing the plan.

#### Scenario: Link generation resolves
- **WHEN** a still-open nudge dialog receives its generated link or an empty result
- **THEN** it displays that link or the current-origin discovery fallback without appending the selected planner offset

#### Scenario: Copy or share
- **WHEN** a person activates an available Copy or Share action
- **THEN** the displayed URL is passed to the corresponding browser API; successful Copy shows temporary feedback

### Requirement: Finalize only overdue planned or locked recipe assignments

When overdue finalization is invoked, it SHALL select recipe-backed calendar entries dated strictly before the deployment-local current date with day status Planned or Locked. It SHALL set those entries Cooked. Today's entries, recipe-free dates, Skipped entries and AwaitingConsensus entries SHALL not enter this selection. Weekly plan status SHALL remain unchanged through finalization.

#### Scenario: Past planned recipe exists
- **WHEN** finalization runs with a recipe-backed Planned entry dated before deployment-local today
- **THEN** successful persistence marks that entry Cooked

#### Scenario: Date or state is outside the selection
- **WHEN** an entry is dated today or later, lacks a recipe, or is Skipped or AwaitingConsensus
- **THEN** this invocation does not select it for overdue completion

### Requirement: Recalculate cooking consequence before overdue publication

Overdue finalization SHALL save its changed day statuses and recalculate each affected recipe's last-cooked value from the latest Cooked calendar date before committing its persistence work. The derived non-null value SHALL use that date at midnight UTC. This planning consequence SHALL not define the separate cooking-history journey or prove actual cooking occurred.

#### Scenario: Newly completed date is latest
- **WHEN** a finalized date becomes the recipe's latest Cooked calendar date
- **THEN** the derived last-cooked value is that date at midnight UTC after successful persistence

#### Scenario: Later cooked date already exists
- **WHEN** another Cooked calendar entry for that recipe has a later date
- **THEN** recalculation uses the latest Cooked date rather than finalization's current invocation time

### Requirement: Attempt affected-week snapshots after overdue persistence

After overdue persistence completes, finalization SHALL read and attempt a snapshot for each distinct affected Monday using its deployment-calendar-relative offset and no request exclusion identity. It SHALL not recompute groceries through this path. With no matching overdue entries it SHALL return without saves or publications through this invocation. Delivery SHALL remain household-live-updates-owned.

#### Scenario: Multiple overdue entries share a week
- **WHEN** successful finalization changes multiple entries in one week
- **THEN** that week's snapshot is attempted once after persistence, without a request exclusion identity

#### Scenario: Nothing remains overdue
- **WHEN** no entries match the overdue selection
- **THEN** the invocation returns without performing finalization saves or snapshot publication

#### Scenario: Publication fails after completion save
- **WHEN** an affected-week read or publication throws after persistence
- **THEN** the invocation fails without establishing reversal of saved Cooked states or publication of remaining weeks

### Requirement: Close atomically with retry-safe round ownership

Close SHALL capture the intended round and persisted plan, commit its aggregate snapshot and lock, and clear that round once as one durable outcome. A failed persistence boundary SHALL leave the round votes available. A retry after committed close SHALL return or recover that outcome without clearing later votes.

#### Scenario: Snapshot failure
- **WHEN** snapshot persistence fails before close commit
- **THEN** no lock/history/clear partial outcome is committed; votes can be retried

#### Scenario: Lost response
- **WHEN** close commits but its response is lost; early votes arrive and the same close is retried
- **THEN** the retry recognizes completion and preserves every later vote

#### Scenario: Publication failure
- **WHEN** close commits but SSE publication fails
- **THEN** durable state remains closed; retry/reload can recover it without duplicate history or clearing

#### Scenario: Late vote
- **WHEN** a vote races the serialized close boundary
- **THEN** it is included in the closed snapshot and cleared, or retained as a next-round vote, never silently lost

#### Scenario: Concurrent closes
- **WHEN** two closes target the same round
- **THEN** one durable close outcome is produced; neither can replace history with an empty retry

#### Scenario: Reopen versus stale close
- **WHEN** a closed week reopens and a stale close request from the prior round arrives
- **THEN** the stale request cannot close or clear the new round

#### Scenario: Pending browser suggestion
- **WHEN** a displayed suggestion has not been persisted when close takes its plan snapshot
- **THEN** it is not selected in history; browser promotion remains its existing separate operation

### Requirement: Preserve one operational round across open and close

Opening a week SHALL preserve votes received since the previous completed close. Opening another week while a different week owns the active round SHALL fail without moving or clearing votes. These rules SHALL NOT make live vote rows persistent week-owned preferences.

#### Scenario: Early votes
- **WHEN** A closes, then two votes arrive before B opens
- **THEN** opening B retains both votes for that round

#### Scenario: Competing opens
- **WHEN** two different weeks are opened concurrently
- **THEN** only one obtains the round; the other request reports conflict without changing votes

#### Scenario: Same week open retry
- **WHEN** the active week receives the same open again
- **THEN** the operation is idempotent and retains votes

### Requirement: Distinguish an open converged round from a closed week

An owned round SHALL remain VotingOpen after convergence. Only existing explicit closing operations SHALL promote suggestions, lock the week and capture historical interest through their existing boundaries. Convergence SHALL NOT clear votes, create assignments, capture history or alter Other plans. Existing Close Voting and Ask the Family controls SHALL remain the lifecycle controls.

#### Scenario: Coverage reaches the target
- **WHEN** confirmed coverage meets the active week's required slots
- **THEN** Discovery stops while the week remains VotingOpen, pending recipes remain pending and existing Close Voting stays available

#### Scenario: Close after late votes
- **WHEN** the user invokes Close Voting after late votes have updated displayed suggestions
- **THEN** the existing promotion flow captures those displayed suggestions and existing close captures the votes present at its serialized boundary
- **AND** the change does not promise that browser promotion and history capture are one atomic operation

#### Scenario: Partial promotion fails
- **WHEN** some suggestion assignments persist and another fails during Close Voting
- **THEN** no lock is issued by that failed invocation, saved assignments remain, and reconciliation recovers actual occupancy without clearing votes or restarting Discovery within the same host round

#### Scenario: Another member occupies a pending destination
- **WHEN** another member saves an Other plan or recipe at a pending suggestion's destination before its close-time assignment commits
- **THEN** promotion preserves the newer occupied date, reports the conflict through existing failure handling and reconciles the captured week without issuing lock from that failed invocation

#### Scenario: Close response is lost
- **WHEN** closing commits but its response is lost
- **THEN** existing round-receipt recovery remains valid and retry cannot clear newer-round early votes or replace history with an empty snapshot

### Requirement: Reopen only for remaining meal capacity

The existing close-then-open flow SHALL retain saved meals and Other plans, preserve valid early votes, and evaluate the new round against its own remaining slots. Convergence from the previous round SHALL NOT stop a new round prematurely. Clearing a saved entry after close SHALL NOT itself reopen voting or automatically refill it.

#### Scenario: Replace one meal through a new round
- **WHEN** a user closes a full week, removes one saved meal and invokes Ask the Family for that week
- **THEN** the new round requires one distinct eligible match, leaves all other persisted dates unchanged, and stops Discovery when that match is confirmed

#### Scenario: Repeated rounds in a week
- **WHEN** the new round is closed
- **THEN** existing touched-row historical replacement and untouched-row preservation apply; no separate per-member history or new historical accumulator is introduced

#### Scenario: Clear without reopening
- **WHEN** a user clears a recipe or Other plan after close without opening voting
- **THEN** the slot stays empty for existing Quick Find or Search recovery and no voting obligation is started

#### Scenario: Early votes before opening
- **WHEN** votes arrive after a completed close but before another week opens
- **THEN** they are recorded normally and retained when the chosen week acquires the existing single operational round

### Requirement: Keep convergence latched during a host lifetime

On the supported single-host deployment, a converged round SHALL remain Discovery-stopped for that round throughout the host lifetime, even when later votes or plan edits change coverage. Explicit close and subsequent open SHALL establish the next round. Failed reads and repeated opens of the same round SHALL NOT reset convergence.

#### Scenario: Later plan edit frees capacity
- **WHEN** a date is freed after convergence while the same host and round remain active
- **THEN** informational capacity updates but Discovery remains stopped and the slot is not automatically assigned

#### Scenario: Match is withdrawn
- **WHEN** an otherwise valid replacement vote reduces consensus after convergence
- **THEN** current suggestions reconcile while Discovery remains stopped within that host round

#### Scenario: Same open request repeats
- **WHEN** opening the currently owned week is retried without closing
- **THEN** the round retains its stop decision and votes; the retry does not manufacture a new session

### Requirement: Rehydrate voting from existing persisted data

After host restart, session state SHALL be reconstructed from existing votes, round ownership and persisted schedule data without a new durable convergence marker. Coverage SHALL be recalculated. Discovery SHALL resume if the reconstructed owned round no longer has enough matches. With no week owner, ordinary early voting SHALL remain available without assuming week zero owns voting.

#### Scenario: Restart with sufficient coverage
- **WHEN** the host restarts and the stored owned round still has sufficient confirmed coverage
- **THEN** the hydrated session reports convergence without requiring another vote

#### Scenario: Restart after changed inputs
- **WHEN** an earlier converged round has insufficient current coverage after host restart
- **THEN** Discovery resumes for that round from current data, as the explicit exception to host-lifetime latching

#### Scenario: Hydration fails
- **WHEN** required database reads fail
- **THEN** the session is unavailable rather than fabricated as empty or converged, and later reads can retry hydration without discarding votes

#### Scenario: No week owns early votes
- **WHEN** hydration finds early votes and no active week owner
- **THEN** those votes remain available for a later open and no target or celebration is inferred from the currently viewed Planner week

### Requirement: Resolve a full week without unnecessary voting

An opened round with a confirmed zero-slot target SHALL stop Discovery immediately without votes, new assignments or automatic close. Zero capacity SHALL be established from persisted occupancy, not missing or failed reads. This rule SHALL NOT change the existing ability to close a week manually before convergence.

#### Scenario: All dates occupied
- **WHEN** an opened week has seven occupied dates across saved recipes and Other plans
- **THEN** it reports zero required slots and convergence, shows the normal celebration, and remains open until explicitly closed

#### Scenario: Manual close before enough matches
- **WHEN** the user chooses the existing Close Voting action with uncovered dates
- **THEN** existing manual-close behavior remains available; convergence is not a new prerequisite for closing

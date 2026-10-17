# Spec Delta

## Purpose

Let household members open and close weekly voting, lock persisted plans and validate day status, and describe overdue finalization without treating stored completion as proof of actual cooking.

## ADDED Requirements

### Requirement: Open or reopen a protected planner week for voting

POST /api/schedule/voting/open SHALL accept optional weekOffset defaulting to zero and resolve its Monday by the accepted deployment calendar week rule. It SHALL create a missing plan as VotingOpen or set an existing plan VotingOpen without changing its calendar entries. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Missing weekly plan
- **WHEN** an authorized open request persists for a week with no plan
- **THEN** a VotingOpen plan is created for that Monday without assigning recipes

#### Scenario: Reopen a locked week
- **WHEN** an authorized open request persists for a Locked week
- **THEN** the week becomes VotingOpen while stored day states remain unchanged through this operation

### Requirement: Reconcile Planner after opening voting

Planner SHALL optimistically show VotingOpen before awaiting the open operation. After it resolves, Planner SHALL read schedule and smart defaults for its then-loaded offset and rebuild displayed days when schedule data is usable. Rejection SHALL restore the captured local week status and schedule and log failure through the page handler.

#### Scenario: Open completes
- **WHEN** open and its subsequent reads resolve with usable schedule data
- **THEN** displayed days are rebuilt using the accepted persisted-content and pending-suggestion composition rules

#### Scenario: Open or its follow-up rejects
- **WHEN** the open operation or a rejecting follow-up throws
- **THEN** captured local status and days are restored without implying reversal of server voting state

### Requirement: Promote displayed pending suggestions before closing voting

Planner Close Voting SHALL capture its loaded week and displayed pending recipe slots whose status is not Skipped, optimistically show Locked, and await assignment requests for those slots before posting lock. Confirmed recipes and Skipped slots SHALL not be newly assigned by this promotion step. These separate requests SHALL NOT constitute an atomic close.

#### Scenario: One pending and one confirmed recipe
- **WHEN** Close Voting runs with one ordinary pending recipe and one confirmed recipe
- **THEN** only the pending recipe is submitted for assignment before lock

#### Scenario: Some assignments fail
- **WHEN** an assignment rejects while other promotion requests may have succeeded
- **THEN** lock is not started through that invocation and local week status is restored without rolling back successful assignments

### Requirement: Finish the Planner close-voting presentation

After lock returns, Planner SHALL clear displayed pending markers only while the captured offset remains loaded and show its temporary voting-complete feedback. On rejection it SHALL restore captured week status and log failure without a dedicated close-voting retry panel. It SHALL not require a schedule reread for this success presentation.

#### Scenario: Lock completes in the same loaded week
- **WHEN** promotion and lock resolve with the captured offset still loaded
- **THEN** displayed pending markers clear and temporary success feedback appears

#### Scenario: Lock rejects after promotion
- **WHEN** lock rejects after assignment requests have returned
- **THEN** local week status is restored while completed server assignments are not compensated by this handler

### Requirement: Persist a protected week lock independently of browser promotion

POST /api/schedule/lock SHALL accept optional weekOffset defaulting to zero, resolve its Monday by the accepted deployment calendar week rule and create a missing weekly plan or set an existing plan Locked. It SHALL not generate assignments for unpersisted suggestions. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Direct API lock with no entries
- **WHEN** an authorized direct lock request persists for an empty week
- **THEN** a Locked weekly plan is saved without creating suggested calendar entries

#### Scenario: Lock without household access
- **WHEN** a lock request has no accepted household credential
- **THEN** shared API authentication rejects it before the action's planning work

### Requirement: Lock persisted ordinary assignments while preserving recipe-free skips

On successful week locking, ordinary Planned entries in the selected Monday-through-Sunday range SHALL become day Locked while recipe-free Skipped entries SHALL remain Skipped. Available current Like counts SHALL be copied to matching recipe-backed entries before vote clearing. Lock SHALL not record cooking completion or change recipe last-cooked values through this action.

#### Scenario: Planned recipe and non-cooking date
- **WHEN** locking succeeds with a Planned recipe and a recipe-free skipped plan
- **THEN** the recipe entry becomes Locked and the skipped plan retains its status and metadata

#### Scenario: Lock is not cooking
- **WHEN** a recipe is locked with no earlier last-cooked value
- **THEN** lock does not set its last-cooked value

### Requirement: Attempt voting-state publication after persistence

Opening voting and locking SHALL save their week changes before reading and attempting a week snapshot with the request connection exclusion. Lock SHALL invoke clearing of stored recipe votes as a planning consequence of closure, without defining discovery vote eligibility or meaning. Successful operations SHALL return 200 data.message Voting opened or Schedule locked respectively after publication returns.

#### Scenario: Lock completes
- **WHEN** lock persistence and its subsequent read/publication return
- **THEN** closure has cleared stored recipe votes and the response reports Schedule locked

#### Scenario: Publication rejects after save
- **WHEN** week snapshot publication throws after open or lock persistence
- **THEN** the successful response is not reached without establishing reversal of saved week or vote changes

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

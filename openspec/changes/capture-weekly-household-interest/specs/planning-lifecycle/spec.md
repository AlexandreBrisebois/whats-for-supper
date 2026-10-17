# Spec Delta

## MODIFIED Requirements

### Requirement: Open or reopen a protected planner week for voting

POST /api/schedule/voting/open SHALL accept optional weekOffset defaulting to zero and resolve its Monday by the accepted deployment calendar week rule. It SHALL create a missing plan as VotingOpen or set an existing plan VotingOpen without changing its calendar entries or discarding valid early votes. Only one week SHALL own the operational voting round at a time. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Missing weekly plan
- **WHEN** an authorized open request persists for a week with no plan
- **THEN** a VotingOpen plan is created for that Monday without assigning recipes

#### Scenario: Reopen a locked week
- **WHEN** an authorized open request persists for a Locked week
- **THEN** the week becomes VotingOpen while stored day states remain unchanged through this operation

### Requirement: Lock persisted ordinary assignments while preserving recipe-free skips

On successful week locking, ordinary Planned entries in the selected Monday-through-Sunday range SHALL become day Locked while recipe-free Skipped entries SHALL remain Skipped. Available current Like counts SHALL be copied to matching recipe-backed entries before vote clearing. Positive weekly history SHALL be captured under weekly-household-interest in the same consistent close boundary. Lock SHALL not record cooking completion or change recipe last-cooked values through this action.

#### Scenario: Planned recipe and non-cooking date
- **WHEN** locking succeeds with a Planned recipe and a recipe-free skipped plan
- **THEN** the recipe entry becomes Locked and the skipped plan retains its status and metadata

#### Scenario: Lock is not cooking
- **WHEN** a recipe is locked with no earlier last-cooked value
- **THEN** lock does not set its last-cooked value

### Requirement: Attempt voting-state publication after persistence

Opening voting and locking SHALL save their week changes before reading and attempting a week snapshot with the request connection exclusion. Lock SHALL persist its lock, aggregate snapshot, close receipt and round vote clearing consistently before publication; a completed close retry SHALL NOT repeat clearing. Successful operations SHALL return 200 data.message Voting opened or Schedule locked respectively after publication returns.

#### Scenario: Lock completes
- **WHEN** lock persistence and its subsequent read/publication return
- **THEN** closure has cleared stored recipe votes and the response reports Schedule locked

#### Scenario: Publication rejects after save
- **WHEN** week snapshot publication throws after open or lock persistence
- **THEN** the successful response is not reached without establishing reversal of saved week or vote changes

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

After lock returns, Planner SHALL clear displayed pending markers only while the captured offset and absolute week remain loaded and show its temporary voting-complete feedback. On rejection it SHALL reread the captured week and recover a confirmed Locked outcome only when its round identity matches the captured request. Otherwise it SHALL restore captured status only while the captured week remains loaded and log failure without a dedicated close-voting retry panel. A successful lock response SHALL not require a schedule reread for this presentation.

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

## ADDED Requirements

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

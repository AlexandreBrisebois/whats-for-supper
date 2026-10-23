# Household live updates delta

## MODIFIED Requirements

### Requirement: Attempt publication of saved vote consequences

After a submitted vote saves and its resulting like count is read successfully, the server SHALL attempt a vote update with recipe identity and count. For an owned voting round, successful recalculation SHALL attempt smart-default and session updates for the owner's absolute week after every saved vote, including after convergence. Without an owner, existing early-vote publication behavior SHALL remain available without claiming session convergence. These event attempts SHALL NOT define vote eligibility, guarantee a threshold transition or establish consumer receipt.

#### Scenario: Saved vote reaches publication
- **WHEN** vote persistence and resulting like-count retrieval succeed and publication is reached
- **THEN** a vote update is attempted with that recipe identity and count without a request connection exclusion

#### Scenario: Discovery recalculation reaches publication
- **WHEN** an owned round's recalculation succeeds after a saved vote
- **THEN** a smart-default update is attempted carrying the owner's week and those defaults without a request connection exclusion

## ADDED Requirements

### Requirement: Expose authoritative voting session snapshots

An authorized session read SHALL identify the operational round, active absolute week if any, server incarnation, revision and session phase. Owned snapshots SHALL include required slots, covered slots, candidate count and matching smart defaults from one consistent calculation. Unowned snapshots SHALL distinguish absent capacity from confirmed zero capacity. Reads SHALL NOT assign recipes, close voting or capture history.

#### Scenario: Direct Discovery entry for next week
- **WHEN** next week owns voting but a fresh browser has initialized Planner at week zero
- **THEN** the session read identifies next week's round and coverage without navigating Planner or guessing its owner from local state

#### Scenario: Consistent progress and suggestions
- **WHEN** a saved vote or plan edit changes session coverage
- **THEN** a returned snapshot's counts and suggestions describe the same calculation, not a client merge of unrelated schedule and defaults reads

### Requirement: Reuse household transport for session updates

Session changes SHALL publish replacement state through the existing household stream, including changes caused by open, close, votes and relevant committed plan edits. Publication SHALL follow persistence; failure SHALL NOT imply rollback. The browser SHALL reconcile on Discovery entry, successful stream reconnect, foreground resume and successful local mutations affecting the session, without a second connection or polling loop.

#### Scenario: Member stops without another swipe
- **WHEN** a connected member receives a converged session snapshot
- **THEN** Discovery reflects it without requiring that member to vote again

#### Scenario: Missed event
- **WHEN** a disconnected member reconnects after another member converges
- **THEN** the browser reads current session state and adopts that result even when no subsequent vote occurs

#### Scenario: Echo excluded from ordinary schedule event
- **WHEN** a local plan mutation succeeds but its ordinary schedule event excludes the initiating connection
- **THEN** the local completion path still refreshes session state

#### Scenario: Publication fails after commit
- **WHEN** a vote or close persists but SSE publication fails
- **THEN** later successful session reads recover persisted truth; no duplicate close or compensating vote deletion is triggered by the notification failure

### Requirement: Reject stale session projections

Consumers SHALL reject older revisions within a server incarnation and prevent superseded requests, old rounds and old-week suggestions from replacing newer accepted state. A changed server incarnation SHALL require authoritative reconciliation before accepting its revision baseline. Duplicate state SHALL be idempotent. Session freshness SHALL NOT depend on browser wall clocks.

#### Scenario: Delayed old-round event
- **WHEN** a prior round's convergence arrives after the next round has been confirmed
- **THEN** it cannot stop the new round or restore its old suggestions

#### Scenario: Duplicate or reordered update
- **WHEN** revision eight is accepted before revisions seven and eight are received again
- **THEN** seven is ignored and duplicate eight adds no assignment, celebration replay or count increment

#### Scenario: Host restarts
- **WHEN** the client encounters a new server incarnation with a lower revision
- **THEN** it reconciles through the authoritative read and can accept restarted-host state without remaining stuck on the old revision

#### Scenario: Planner is viewing another week
- **WHEN** session state identifies a different absolute week than the displayed Planner
- **THEN** session state can update Discovery but its suggestions do not overwrite the displayed week's days

### Requirement: Keep convergence separate from live suggestion replacement

A newer authoritative session snapshot SHALL continue updating pending suggestions after convergence while preserving persisted recipes and Other plans. It SHALL not revive swiping in the same host round. Existing snapshot retention guards SHALL NOT restore obsolete suggestions after a newer confirmed session projection has withdrawn or reordered them.

#### Scenario: Late unanimity changes ordering
- **WHEN** a late saved vote changes existing suggestion order after convergence
- **THEN** the loaded owning Planner week receives the revised pending placement while Discovery retains its celebration

#### Scenario: Older defaults arrive after replacement
- **WHEN** an older smart-default event or pending read arrives after a newer session projection
- **THEN** it cannot restore superseded pending content; legacy payloads lacking freshness metadata trigger a read for an active session instead of overwriting it

#### Scenario: Occupied date wins
- **WHEN** a committed Other plan occupies a formerly pending date
- **THEN** refreshed suggestions respect the occupied date without overwriting its plan or persisting a replacement meal

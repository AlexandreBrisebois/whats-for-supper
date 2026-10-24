# Planning lifecycle delta

## ADDED Requirements

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

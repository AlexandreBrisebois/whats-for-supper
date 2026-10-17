# Spec Delta

## ADDED Requirements

### Requirement: Preserve the Tomorrow supper chain across weeks

Tomorrow SHALL move the exact source supper to the next deployment-calendar date. Each contiguous occupied supper date from that destination SHALL move one day forward until the first empty supper slot, across as many weeks as required. No two-week cap, swap fallback or silent no-op success SHALL apply. Other meal slots SHALL remain unchanged.

#### Scenario: Sunday and two following weeks are occupied
- **WHEN** Sunday contains A and every supper date in the next two weeks is occupied, with the following Monday empty
- **THEN** A moves to the first Monday, each displaced entry moves exactly one day and the last entry reaches the third Monday without loss

#### Scenario: First gap ends the chain
- **WHEN** Tomorrow encounters occupied Monday and Tuesday, empty Wednesday and occupied Thursday
- **THEN** Monday and Tuesday move one day forward and Thursday remains unchanged

### Requirement: Preserve movable Tomorrow entry content

Displaced Planned, Locked and Skipped entries SHALL retain identity, recipe association, status, saved votes, candidate identities, meal slot and non-cooking details while their dates advance. Existing weekly plan status SHALL remain unchanged; a missing affected plan SHALL be created as Draft. Recipe occurrences SHALL be conserved even when the same recipe occurs more than once.

#### Scenario: Mixed future entries
- **WHEN** the chain contains a Locked recipe, a recipe-free Order In entry with a label and a recipe-backed Skipped entry
- **THEN** all three move one day with their distinct saved content retained

#### Scenario: Repeated recipe
- **WHEN** two different supper entries contain the same recipe
- **THEN** both occurrences survive at their respective next dates

### Requirement: Reject unsafe Tomorrow movement before mutation

Tomorrow SHALL require an explicit source index and matching recipe at supper slot zero. Missing or changed sources, Cooked entries in the source or displaced chain, and AwaitingConsensus entries SHALL reject without calendar, weekly plan or grocery mutation. Invalid dates, indices or a destination other than the source's next day SHALL reject before work. A rejected operation SHALL NOT report Recipe moved.

#### Scenario: Cooked entry blocks the chain
- **WHEN** any entry that would move is Cooked
- **THEN** the entire push rejects with conflict and every original entry and adjunct remains unchanged

#### Scenario: Stale source cannot select another occurrence
- **WHEN** the source date no longer contains the requested recipe but another date does
- **THEN** Tomorrow rejects with conflict without moving the other occurrence

#### Scenario: Pending consensus or invalid destination
- **WHEN** a chain entry awaits consensus or the supplied target is not the next calendar day
- **THEN** consensus rejects with conflict and invalid targeting rejects as bad input, both without mutation

### Requirement: Persist Tomorrow as one calendar change

All date shifts and any requested Order In source disposition SHALL commit together or leave persisted calendar content unchanged. Concurrent Tomorrow submissions SHALL NOT move one source occurrence twice or overwrite another entry. The response SHALL distinguish rejected movement from committed movement whose follow-up refresh is incomplete. Unknown transport outcomes SHALL NOT authorize blind repetition.

#### Scenario: Persistence fails during a shift
- **WHEN** persistence fails after some date updates have been attempted
- **THEN** no partial chain or source disposition is persisted

#### Scenario: Duplicate requests overlap
- **WHEN** two requests concurrently target the same source occurrence
- **THEN** at most one moves that occurrence and the other cannot repeat the push from a different source

### Requirement: Preserve non-cooking source disposition with Tomorrow

An explicit Order In source disposition SHALL leave a recipe-free Skipped Order In source and place its original recipe at tomorrow as Planned, retaining saved votes. Moving a legacy recipe-backed Skipped source SHALL likewise retain its non-cooking source details and transfer its recipe as Planned. Displaced Skipped entries SHALL instead move intact. Rejection SHALL leave the source unchanged.

#### Scenario: Order In and Tomorrow succeeds
- **WHEN** a planned source requests Order In with Tomorrow and the chain can move
- **THEN** the source becomes recipe-free Skipped Order In in the same commit as the chain, with one Planned occurrence of its original recipe tomorrow

#### Scenario: Order In and Tomorrow is blocked
- **WHEN** Order In with Tomorrow encounters a Cooked displaced entry
- **THEN** the original source remains unchanged and no Order In disposition is saved

### Requirement: Refresh every week touched by Tomorrow

After a Tomorrow commit, the system SHALL recompute groceries and attempt authoritative week snapshots and suggestion invalidation for every changed week using the captured deployment-calendar reference. Unrelated weeks and grocery check state SHALL be preserved. Follow-up failure SHALL report committed movement with incomplete refresh rather than an uncommitted rejection; live delivery remains household-live-updates-owned.

#### Scenario: Three or more affected weeks
- **WHEN** a successful push changes three or more weeks
- **THEN** all changed weeks have recomputed groceries and publication attempts, including the final spill week

#### Scenario: Publication or recomputation fails after commit
- **WHEN** follow-up work fails after calendar persistence
- **THEN** the result identifies the committed move and incomplete refresh, and a read reveals the conserved chain without repeating the push

### Requirement: Gate every Tomorrow recovery caller on committed movement

Planner, Search and Browse Tomorrow recovery SHALL require a committed movement result before assigning a retained replacement. Rejection SHALL retain recovery context and display feedback without replacement. Pending actions SHALL suppress duplicate submission; unknown outcomes SHALL require rereading before retry. Known committed moves SHALL NOT repeat during refresh recovery.

#### Scenario: Shared recovery receives a rejected or unknown movement result
- **WHEN** Planner, Search or Browse receives a conflict or cannot establish whether Tomorrow committed
- **THEN** it retains the pending choice, does not assign replacement and requires reconciliation before another move

## MODIFIED Requirements

### Requirement: Resolve the previous Planner meal before replacement

Planner recovery SHALL await the selected prior-meal operation before assigning the chosen replacement. Tomorrow SHALL request Tomorrow movement to the next day, using next-week Monday from Sunday, and require committed movement before replacement. Save for Next Week SHALL submit exact source date, recipe ID and captured source offset plus one to defer, retaining the captured reference Monday. Drop SHALL request date deletion. These separate requests SHALL NOT imply an atomic replacement.

#### Scenario: Move to tomorrow
- **WHEN** recovery chooses Tomorrow for a day from Monday through Saturday
- **THEN** a same-week Tomorrow operation with explicit source index commits before replacement assignment starts

#### Scenario: Sunday or next-week choice
- **WHEN** recovery chooses Tomorrow on Sunday or Save for Next Week on any day
- **THEN** it respectively requests next-offset Monday movement or explicit-date defer starting at captured source offset plus one before replacement

#### Scenario: Quick Replace while planning next week
- **WHEN** the captured reference Monday is October 12, 2026, the occupied source is October 21 at offset one, and Quick Replace recovery chooses Save for Next Week
- **THEN** the prior recipe is deferred starting October 26 at offset two, followed by assignment of the selected replacement to October 21
- **AND** an earlier free slot in October 19–25 is not selected for the prior recipe

#### Scenario: Current-week recovery
- **WHEN** Quick Replace recovery chooses Save for Next Week for a source in captured offset zero
- **THEN** the prior recipe's destination search begins at offset one

#### Scenario: Captured recovery survives calendar rollover
- **WHEN** recovery captures reference Monday October 12 and source October 21 at offset one, but requests complete after deployment Monday October 19 begins
- **THEN** deferral still starts October 26 and replacement still targets October 21

#### Scenario: Drop prior assignment
- **WHEN** recovery chooses Drop
- **THEN** it awaits deletion for the captured date before assigning the replacement

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await the explicit Tomorrow operation, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, while Planner uses deferral starting at its captured offset plus one

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Place cross-week movement in the first available target-week date

For legacy swap and push intents only: With a different targetWeekOffset and an ordinary target index zero through six, movement SHALL search that target week from toIndex through Sunday for a date with no entry. A found destination SHALL receive the source and have a weekly plan ensured as Draft only if absent. If no destination exists, the source SHALL remain in place through this path.

#### Scenario: Target Monday is occupied
- **WHEN** cross-week movement starts at Monday and Tuesday is the first date without an entry
- **THEN** successful persistence moves the source to Tuesday without shifting Monday

#### Scenario: Target week has no free date
- **WHEN** every target date from the requested index through Sunday is occupied
- **THEN** this path leaves the source unchanged without extending its search into another week

### Requirement: Distinguish movement follow-ups from movement confirmation

For legacy swap and push intents only: Same-week saved movement SHALL attempt a source-week snapshot without grocery recomputation. Successful cross-week persistence SHALL await source then destination grocery recomputation before source-week publication. Completed move requests SHALL return 200 with data.message Recipe moved, including supported no-op returns. Publication receipt SHALL remain household-live-updates-owned.

#### Scenario: Same-week movement completes
- **WHEN** same-week movement saves and its schedule read and publication return
- **THEN** the success response follows source-week publication without requesting grocery recomputation through this path

#### Scenario: Cross-week movement completes
- **WHEN** cross-week persistence and both recomputations complete
- **THEN** source-week snapshot publication is attempted before success without a destination-week snapshot through this movement path

#### Scenario: Full target returns completion
- **WHEN** cross-week destination search finds no free date and the subsequent source read/publication complete
- **THEN** the response still says Recipe moved and does not confirm relocation

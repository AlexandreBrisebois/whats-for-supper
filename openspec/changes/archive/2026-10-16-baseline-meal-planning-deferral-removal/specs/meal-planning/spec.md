# Spec Delta

## ADDED Requirements

### Requirement: Defer the exact dated recipe through a protected operation

POST /api/schedule/defer SHALL identify the source by sourceDate and recipeId. No matching entry SHALL return 404; an AwaitingConsensus source SHALL return 409 before deferral. Access SHALL follow household-identity's Authenticate protected API requests independently requirement. Other supported day states SHALL not acquire a Locked-week prohibition through this action.

#### Scenario: Source does not match
- **WHEN** an authorized defer request has no entry matching both source date and recipe ID
- **THEN** it returns 404 without moving another occurrence of the recipe

#### Scenario: Source awaits consensus
- **WHEN** the exact source is AwaitingConsensus
- **THEN** it returns 409 without deferring that entry

#### Scenario: Household credentials are absent
- **WHEN** defer lacks accepted household credentials
- **THEN** the shared API authentication gate rejects the request

### Requirement: Find a defer destination from server-current next week

Deferral SHALL begin its destination search on Monday after the server UTC current week and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date for this search. It SHALL ensure a Draft plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free
- **WHEN** defer runs with no stored entry on server-current next Monday
- **THEN** that date is chosen regardless of the source's relative week offset

#### Scenario: Next week is full
- **WHEN** all seven dates of server-current next week are occupied
- **THEN** search continues into the following week until a date without an entry is found

### Requirement: Return deferred content to Planned state

Successful deferral of a non-Skipped source SHALL move that entry to the selected date, set it Planned and retain its saved vote count. For a recipe-backed Skipped source it SHALL instead leave a recipe-free Skipped entry at the source and create a separate Planned destination with the recipe and saved vote count. A Cooked source SHALL invoke last-cooked recalculation.

#### Scenario: Locked source is deferred
- **WHEN** a Locked recipe source defers successfully
- **THEN** the moved entry is Planned at the selected destination with its saved vote count retained

#### Scenario: Skipped source is deferred
- **WHEN** a recipe-backed Skipped source defers successfully
- **THEN** its original date remains recipe-free Skipped and the new destination contains the Planned recipe and saved vote count

#### Scenario: Cooked source is deferred
- **WHEN** a Cooked entry is moved back to Planned through defer
- **THEN** the persistence path recalculates that recipe's last-cooked value from remaining Cooked calendar entries

### Requirement: Complete defer after affected-week follow-ups

After defer persistence completes, the operation SHALL await grocery recomputation for each distinct source/destination Monday, then attempt a snapshot for each affected week with request exclusion and optional move sequence. Only after these steps return SHALL it return 200 data containing scheduledDate, scheduledWeekOffset and message. Live delivery SHALL remain household-live-updates-owned.

#### Scenario: Both affected weeks complete
- **WHEN** save, recomputation and publication calls all return
- **THEN** the completed response identifies the chosen destination date and its server-relative week offset

#### Scenario: Later work rejects
- **WHEN** a recomputation or publication throws after persistence
- **THEN** the successful defer response is not reached without establishing reversal of the moved entry

### Requirement: Remove a recipe-backed Planner assignment optimistically

Planner's recipe-backed pivot SHALL offer Remove recipe. Activation SHALL close the pivot, clear the indexed displayed recipe/non-cooking content to status zero, clear pending state and mark the date user-cleared while dispatching date deletion. It SHALL restore captured local schedule and grocery items on rejection without dedicated removal failure feedback or a server rollback guarantee.

#### Scenario: Removal is pending
- **WHEN** a person removes the recipe from a dated Planner pivot
- **THEN** the day becomes locally unplanned before DELETE completion and the accepted date-delete lifecycle is invoked

#### Scenario: Deletion rejects
- **WHEN** the asynchronous deletion rejects
- **THEN** captured local schedule and grocery items are restored without a removal toast through this handler

### Requirement: Apply the shared date-delete lifecycle to recipe-backed entries

Recipe-backed removal SHALL use the same protected date-only DELETE and persistence-before-follow-up lifecycle as the accepted Delete the recipe-free entry before clear follow-up work requirement. It SHALL remove the selected calendar entry rather than delete the recipe. It SHALL add no expected-recipe, day-status or week-status precondition.

#### Scenario: Recipe-backed date exists
- **WHEN** the selected date contains a recipe-backed entry and deletion persistence succeeds
- **THEN** that entry is removed, while the recipe remains available and the accepted recompute/publication sequence follows

#### Scenario: No calendar entry exists
- **WHEN** the date is already empty
- **THEN** deletion returns 204 without invoking the existing-entry follow-up sequence

### Requirement: Find first-open placement after browser-local today

Search and Browse Plan for Later SHALL start scanning after the browser-local current weekday, advancing to offset one/index zero on Sunday. They SHALL inspect returned weeks in order for a day at or after the starting index with status other than Skipped and no normalized recipe. The default scan SHALL stop after 520 relative weeks and return no target if none is found.

#### Scenario: Next date is non-cooking
- **WHEN** the first candidate date is recipe-free Skipped and a later ordinary empty date exists
- **THEN** placement skips the non-cooking date and chooses the later ordinary empty index

#### Scenario: Today is Sunday
- **WHEN** Plan for Later starts on browser-local Sunday
- **THEN** scanning begins at offset one, index zero rather than offset-zero Monday

#### Scenario: Scan finds no target
- **WHEN** all 520 inspected relative weeks contain no eligible returned date
- **THEN** the helper returns no target and the caller does not submit assignment through that result

### Requirement: Assign first-open placement through the shared assignment operation

After first-open scanning returns a target, Search and Browse SHALL assign the chosen recipe through the accepted assignment operation and navigate to that planner offset/index with success=1 after the request resolves. The separate read SHALL NOT reserve an empty date. Missing schedule data SHALL allow scanning to continue; request rejection SHALL interrupt the scan.

#### Scenario: First-open assignment resolves
- **WHEN** a target is returned and the assignment request resolves
- **THEN** navigation identifies that returned offset/index with planner success feedback parameters

#### Scenario: Week read is absent or rejects
- **WHEN** a scanned week has no usable days or its request rejects
- **THEN** absent data advances scanning while rejection stops that invocation without reserving a target

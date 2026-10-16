# Meal planning delta

## MODIFIED Requirements

### Requirement: Resolve the previous Planner meal before replacement

Planner recovery SHALL await the selected prior-meal operation before assigning the chosen replacement. Tomorrow SHALL request push to the following day, using next-week Monday from Sunday. Save for Next Week SHALL submit exact source date, recipe ID and captured source offset plus one to defer, retaining the captured reference Monday. Drop SHALL request date deletion. These separate requests SHALL NOT imply an atomic replacement.

#### Scenario: Move to tomorrow
- **WHEN** recovery chooses Tomorrow for a day from Monday through Saturday
- **THEN** a same-week push with explicit source index completes before replacement assignment starts

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

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await Tomorrow push, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, while Planner uses deferral starting at its captured offset plus one

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Find a defer destination from deployment-current next week

Deferral SHALL accept optional integer targetWeekOffset relative to the captured reference Monday, defaulting to one. Search SHALL start on that week's Monday and continue date by date until finding a date with no calendar entry. Any stored entry SHALL occupy its date. It SHALL ensure a Draft plan for the destination Monday only if absent, without changing an existing destination week's status.

#### Scenario: Next Monday is free
- **WHEN** defer omits targetWeekOffset with no stored entry on reference-next Monday
- **THEN** that date is chosen regardless of the source's relative week offset, retaining deployment-current next week when reference Monday is also omitted

#### Scenario: Next week is full
- **WHEN** all seven dates of the requested destination week are occupied
- **THEN** search continues into the following week until a date without an entry is found

#### Scenario: Explicit future destination
- **WHEN** reference Monday is October 12, targetWeekOffset is two, October 26 is occupied and October 27 has no entry
- **THEN** defer selects October 27 without moving or replacing October 26's entry or using an earlier free date

#### Scenario: Non-cooking entry occupies a date
- **WHEN** the requested destination Monday has a stored recipe-free non-cooking entry and Tuesday has no entry
- **THEN** defer preserves Monday and selects Tuesday

## ADDED Requirements

### Requirement: Report deferral relative to the requested destination

Successful deferral SHALL report the actual scheduled date and its offset relative to the captured reference Monday. Full-next-week feedback SHALL appear only when the destination lies after the requested search-start week, rather than whenever its offset exceeds one.

#### Scenario: Future destination has room
- **WHEN** deferral starts at offset two and finds a free date in offset two
- **THEN** feedback identifies that date without claiming next week is full

#### Scenario: Future destination spills over
- **WHEN** deferral starts at offset two and the first free date is in offset three
- **THEN** feedback identifies the actual date and indicates that the requested next week was full

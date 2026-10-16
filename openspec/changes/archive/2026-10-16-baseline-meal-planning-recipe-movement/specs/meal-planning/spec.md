# Spec Delta

## ADDED Requirements

### Requirement: Preview a drag as a swap of dated Planner content

During a supported recipe-card drag, Planner SHALL exchange source and destination content locally while retaining each date/day label. Intermediate drag updates SHALL submit no move request. A drop at a changed position with a recipe ID SHALL submit one movement request with the pre-drag source index and final destination index; an unchanged drop SHALL submit none.

#### Scenario: Drag crosses multiple days
- **WHEN** a recipe card crosses intermediate positions and is dropped at another date
- **THEN** local swap feedback precedes one request for the original source and final destination

#### Scenario: Return to the source
- **WHEN** a drag ends at its original position
- **THEN** no movement request is submitted

#### Scenario: Movement rejects
- **WHEN** the committed drag request rejects
- **THEN** Planner attempts restoration of the captured pre-drag schedule without establishing server rollback

### Requirement: Submit dated-source movement through the protected operation

POST /api/schedule/move SHALL accept weekOffset, recipeId and toIndex, with optional fromIndex, intent and targetWeekOffset. Its source and target week dates SHALL use the accepted server UTC-relative week interpretation. Access SHALL follow household-identity's Authenticate protected API requests independently requirement.

#### Scenario: Explicit drag source
- **WHEN** Planner commits a recipe drag
- **THEN** the request supplies source week, recipe ID, fromIndex and toIndex without an explicit cross-week target

#### Scenario: Protected movement lacks credentials
- **WHEN** movement lacks accepted household credentials
- **THEN** shared API authentication rejects it independently of page access

### Requirement: Prefer an explicit movement source with legacy fallback

Movement SHALL first inspect the supplied source date when fromIndex exists. If no entry is found there, or fromIndex is absent, it SHALL fall back to a stored entry matching recipeId. If the selected entry has a different recipe ID or no entry is found, movement SHALL return without relocating an entry.

#### Scenario: Repeated recipe has an explicit source
- **WHEN** the same recipe appears on multiple dates and the supplied source date contains it
- **THEN** movement selects that date rather than another occurrence

#### Scenario: Legacy source lookup
- **WHEN** fromIndex is omitted or its resolved date has no entry
- **THEN** lookup falls back to a stored matching recipe without guaranteeing which duplicate is selected

#### Scenario: Selected source differs
- **WHEN** the explicit source contains another recipe
- **THEN** movement does not relocate that selected entry

### Requirement: Swap stored content within a week

For ordinary same-week swap movement with a found source and successful persistence, an occupied destination SHALL exchange recipe ID, saved vote count, day status and non-cooking kind/label with the source. With no destination entry, the source SHALL move to that date. Weekly plan status SHALL remain distinct from the moved day status.

#### Scenario: Destination is occupied
- **WHEN** a recipe swaps onto another stored date
- **THEN** the two dates exchange their recipe/status/non-cooking content and saved vote counts

#### Scenario: Destination is empty
- **WHEN** the selected destination has no entry
- **THEN** the source entry moves to that date with its content retained

### Requirement: Push toward a later available date within the search window

Same-offset push SHALL seek an empty date from toIndex through index thirteen relative to that week's Monday. When found, it SHALL shift intervening stored entries one day forward and place the source at the requested destination. With no empty date in that window it SHALL fall back to swap. This SHALL NOT establish relational collision safety for every shift.

#### Scenario: Later date is empty
- **WHEN** an ordinary source pushes to index one, which is occupied, and index two is empty
- **THEN** the occupied destination shifts to index two and the source is placed at index one after successful persistence

#### Scenario: Search window is full
- **WHEN** no empty date exists from the requested destination through index thirteen
- **THEN** the operation takes the swap path rather than continuing an unbounded push

### Requirement: Place cross-week movement in the first available target-week date

With a different targetWeekOffset and an ordinary target index zero through six, movement SHALL search that target week from toIndex through Sunday for a date with no entry. A found destination SHALL receive the source and have a weekly plan ensured as Draft only if absent. If no destination exists, the source SHALL remain in place through this path.

#### Scenario: Target Monday is occupied
- **WHEN** cross-week movement starts at Monday and Tuesday is the first date without an entry
- **THEN** successful persistence moves the source to Tuesday without shifting Monday

#### Scenario: Target week has no free date
- **WHEN** every target date from the requested index through Sunday is occupied
- **THEN** this path leaves the source unchanged without extending its search into another week

### Requirement: Preserve a skipped source when moving its recipe forward

When a recipe-backed Skipped source is pushed into an available destination or moved cross-week into an available date, movement SHALL preserve a recipe-free source and create a separate Planned destination carrying the recipe and saved vote count. The source SHALL remain Skipped; this rule SHALL NOT apply to ordinary swap fallback.

#### Scenario: Push a skipped source
- **WHEN** a skipped recipe is pushed forward with an available destination and persistence succeeds
- **THEN** its source remains recipe-free Skipped and the destination contains the Planned recipe

#### Scenario: Move a skipped source cross-week
- **WHEN** cross-week placement succeeds for a skipped recipe
- **THEN** the original date remains recipe-free Skipped while a new Planned recipe entry is saved in the target week

### Requirement: Distinguish movement follow-ups from movement confirmation

Same-week saved movement SHALL attempt a source-week snapshot without grocery recomputation. Successful cross-week persistence SHALL await source then destination grocery recomputation before source-week publication. Completed move requests SHALL return 200 with data.message Recipe moved, including supported no-op returns. Publication receipt SHALL remain household-live-updates-owned.

#### Scenario: Same-week movement completes
- **WHEN** same-week movement saves and its schedule read and publication return
- **THEN** the success response follows source-week publication without requesting grocery recomputation through this path

#### Scenario: Cross-week movement completes
- **WHEN** cross-week persistence and both recomputations complete
- **THEN** source-week snapshot publication is attempted before success without a destination-week snapshot through this movement path

#### Scenario: Full target returns completion
- **WHEN** cross-week destination search finds no free date and the subsequent source read/publication complete
- **THEN** the response still says Recipe moved and does not confirm relocation

### Requirement: Request Plan later from the selected Planner week

Planner's recipe-backed Plan later action SHALL close its pivot and submit movement with explicit source index, target offset selected offset plus one, target index zero and push intent. On request completion it SHALL initialize the selected week and, for a week-zero source dated browser-local today, sync Today. Failure SHALL be logged without a dedicated Plan later error toast.

#### Scenario: Plan later for next selected week
- **WHEN** a person chooses Save for Next Week for a recipe in selected offset one
- **THEN** movement targets offset two starting at Monday rather than server-current next week

#### Scenario: Movement request resolves or rejects
- **WHEN** the Plan later request resolves, including a supported no-op, or rejects
- **THEN** resolution proceeds to initialization while rejection is logged without success confirmation of relocation

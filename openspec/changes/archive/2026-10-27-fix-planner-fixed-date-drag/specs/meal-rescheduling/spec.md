# Spec Delta

## MODIFIED Requirements

### Requirement: Preview a drag as a swap of dated Planner content

During a supported recipe-card drag, Planner SHALL exchange source and destination content locally while retaining each date/day label. Dates SHALL remain outside the moving surface; intermediate dates SHALL NOT shift. Intermediate drag updates SHALL submit no move request. A valid changed drop with a recipe ID SHALL submit one movement request with the pre-drag source index and final destination index; an unchanged drop SHALL submit none.

#### Scenario: Drag crosses multiple days
- **WHEN** a recipe card crosses intermediate positions and is dropped at another date
- **THEN** local swap feedback precedes one request for the original source and final destination
- **AND** only source and destination content change; all date labels retain their ordered slots

#### Scenario: Return to the source
- **WHEN** a drag ends at its original position
- **THEN** no movement request is submitted
- **AND** the original content arrangement is retained

#### Scenario: Movement rejects
- **WHEN** the committed drag request rejects
- **THEN** Planner attempts restoration of the captured pre-drag schedule only if no newer edit or active drag owns the displayed schedule, without establishing server rollback
- **AND** date labels remain outside the moving surface throughout preview and restoration

#### Scenario: Destination contains another recipe
- **WHEN** a recipe is dropped onto a date containing another recipe
- **THEN** the two dates exchange meal content without shifting intervening meals

#### Scenario: Destination is empty
- **WHEN** a recipe is dropped onto an ordinary empty date
- **THEN** the destination displays the moved recipe and the source displays its empty planning action

#### Scenario: Destination contains a non-cooking plan
- **WHEN** a supported recipe move targets a recipe-free non-cooking date
- **THEN** the source and destination exchange content under the existing same-week swap rules, retaining the non-cooking kind and label

### Requirement: Offer keyboard movement through the Planner handle

The Planner drag handle SHALL be keyboard focusable and expose its localized hold guidance as an accessible name. Arrow Up and Arrow Down SHALL move the selected Planner content one available slot through the same optimistic movement, persistence and recovery path used by pointer dragging, retaining fixed date order and focus on the moved recipe's handle. A boundary key press SHALL submit no movement.

#### Scenario: Keyboard movement within the week
- **WHEN** the focused recipe handle receives Arrow Up or Arrow Down with an in-bounds adjacent slot
- **THEN** Planner previews and commits exactly one movement
- **AND** focus follows the moved recipe's handle while date order stays unchanged

#### Scenario: Keyboard movement at a boundary
- **WHEN** the first handle receives Arrow Up or the last handle receives Arrow Down
- **THEN** Planner leaves the schedule unchanged and submits no movement

## ADDED Requirements

### Requirement: Present fixed dates beside movable meal content

Planner SHALL display each loaded date to the left of its meal content, outside the draggable surface. Dragging SHALL move recipe content without dragging or reordering date labels. Empty slots and recipe-free non-cooking plans SHALL remain visible destinations without presenting a recipe drag handle.

#### Scenario: Recipe is lifted
- **WHEN** an eligible recipe card begins a drag
- **THEN** its date label remains in the date column and its source slot remains identifiable
- **AND** the moving surface contains recipe content rather than the date

#### Scenario: Empty or non-cooking source
- **WHEN** a date has no recipe or displays a recipe-free non-cooking plan
- **THEN** its content remains usable through existing planning actions without a recipe drag handle

#### Scenario: Long content or narrow viewport
- **WHEN** recipe names or translated labels wrap on a narrow viewport
- **THEN** each date remains aligned with its own slot and essential content and actions remain reachable

### Requirement: Identify the candidate destination without implying insertion

During an active drag over a valid date slot, Planner SHALL visibly identify the candidate destination in addition to showing the moving card. Feedback SHALL distinguish an empty destination from an exchange with occupied content without suggesting that intermediate dates or meals will shift.

#### Scenario: Candidate changes
- **WHEN** the dragged card moves from one valid destination to another
- **THEN** destination feedback follows the current candidate and the preview is based on the original source arrangement
- **AND** previously crossed dates do not accumulate changes

### Requirement: Cancel uncommitted meal dragging without movement

An active drag cancelled by Escape, pointer cancellation, leaving Planner or changing the selected week SHALL end without a movement request. Dropping outside a valid date slot SHALL also cancel. Uncommitted preview SHALL be discarded without applying an old week's content to a newly selected week.

#### Scenario: Cancel or drop outside
- **WHEN** an active drag is cancelled or dropped outside a valid date slot
- **THEN** no movement request is submitted and the uncommitted swap preview is removed

#### Scenario: Week changes during drag
- **WHEN** the selected week changes during an active drag
- **THEN** the old drag cannot submit a movement request or overwrite the newly selected week's content

#### Scenario: Native scrolling before activation
- **WHEN** touch scrolling begins before the existing hold-to-move activation completes
- **THEN** the page scrolls without moving a meal or submitting a movement request
### Requirement: Keep destination feedback visible without layout movement

During a drag over a changed valid destination, Planner SHALL tint and outline the fixed destination date and show a decorative arrow in the existing gap without changing layout. The overlay SHALL retain the full recipe title and localized swap/move cue. Invalid or unchanged destinations SHALL clear these cues. The app shell SHALL own bottom navigation clearance without a second full-screen minimum or bottom reservation inside Planner.

#### Scenario: Long title covers the destination card
- **WHEN** a full recipe title wraps across several lines during dragging
- **THEN** the destination date and arrow remain visible outside the overlay without shifting rows
- **AND** swap/move text remains inside the overlay

### Requirement: Settle local moves without requiring a self SSE echo

Planner SHALL settle the captured movement sequence when its HTTP request completes, including rejection. Pending moves SHALL continue to guard snapshots. Successful moves SHALL reconcile a fresh schedule for the captured week; a later selected week SHALL NOT be overwritten. Later non-cooking saves and clears SHALL update the meal plan without navigation or refresh even when no self SSE echo arrives.

#### Scenario: Other plans after movement without an echo
- **WHEN** a movement completes without a self SSE echo and Other plans is saved or cleared
- **THEN** the dated content immediately reflects the successful save or clear without leaving Planner

### Requirement: Apply remote schedule events independently of move acknowledgement

Planner SHALL acknowledge local movement requests through their captured HTTP completions. An incoming schedule event SHALL NOT acknowledge local requests solely because it contains a move sequence. Remote schedules SHALL follow the same selected-week and pending-movement guards with or without sequence metadata.

#### Scenario: Another device moves a meal
- **WHEN** a selected-week schedule event contains another device's move sequence
- **THEN** Planner applies or defers the schedule under its ordinary guards
- **AND** the event does not settle this client's pending movements

### Requirement: Reconcile concurrent moves without stale replacement

After outstanding movements settle, Planner SHALL reconcile a fresh schedule for their captured week. A superseded read SHALL NOT overwrite newer movement, editing or authoritative-event state. Rejection recovery SHALL preserve newer independent edits and active drag previews. Failed refresh SHALL report that the plan could not be refreshed without claiming server confirmation or retrying movement.

#### Scenario: Movement reads finish out of order
- **WHEN** concurrent movements settle and their schedule reads finish in a different order
- **THEN** an older response cannot replace a newer result

#### Scenario: Earlier movement rejects after a later independent movement
- **WHEN** an earlier movement rejects after a later independent movement succeeds
- **THEN** Planner preserves the later movement through failure recovery and authoritative reconciliation

#### Scenario: Refresh fails during failure recovery
- **WHEN** movement recovery cannot obtain an authoritative schedule
- **THEN** Planner preserves newer local edits and reports that refresh failed

### Requirement: Accept an authoritative empty week

A valid selected-week authoritative schedule without saved recipes SHALL clear previously displayed saved recipes, including the last saved meal. Existing round-owned pending suggestions SHALL retain their separate supported reconciliation behavior.

#### Scenario: Final saved meal is removed elsewhere
- **WHEN** a schedule read or live snapshot confirms that the final saved meal was removed
- **THEN** its date displays the empty planning action without navigation or reload

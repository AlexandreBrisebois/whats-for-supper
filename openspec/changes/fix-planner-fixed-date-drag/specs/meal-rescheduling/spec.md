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
- **THEN** Planner attempts restoration of the captured pre-drag schedule without establishing server rollback
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
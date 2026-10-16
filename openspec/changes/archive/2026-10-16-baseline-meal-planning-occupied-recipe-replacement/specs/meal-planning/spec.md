# Spec Delta

## ADDED Requirements

### Requirement: Advance Quick Find suggestions without changing the plan

Quick Find SHALL use Skip to advance from a returned recipe to the next card, then offer Start Over on its terminal library card. Advancing SHALL reset the flipped view without submitting assignment, move, defer, removal or validation. With no returned recipes it SHALL disable advancement and show No more picks.

#### Scenario: Skip a suggestion
- **WHEN** a person activates Skip with a returned recipe displayed
- **THEN** the next card is displayed without changing the scheduled assignment

#### Scenario: Restart or exhaust the deck
- **WHEN** the terminal card is displayed with recipes available, or no recipes were returned
- **THEN** Start Over returns to the first card in the former case and advancement is disabled in the latter

### Requirement: Enter recovery before replacing an occupied Planner day

When a selected Quick Find recipe targets a displayed day with a recipe ID and date, Planner SHALL close Quick Find and retain the old slot and new recipe for recovery. Recovery SHALL offer Move to Tomorrow, Save for Next Week and Just Drop Tonight, plus Back and Close. Dismissal before action SHALL clear the pending choice without submitting replacement.

#### Scenario: Occupied Quick Find target
- **WHEN** a person selects a replacement for a displayed dated recipe-backed day
- **THEN** recovery opens without first posting that replacement

#### Scenario: Dismiss the recovery choice
- **WHEN** Back or Close is activated before an action starts
- **THEN** pending recovery clears without submitting a replacement through that dismissal

### Requirement: Resolve the previous Planner meal before replacement

Planner recovery SHALL await the selected prior-meal operation before assigning the chosen replacement. Tomorrow SHALL request push to the following day, using next-week Monday from Sunday. Save for Next Week SHALL submit exact source date and recipe ID to defer. Drop SHALL request date deletion. These separate requests SHALL NOT imply an atomic replacement.

#### Scenario: Move to tomorrow
- **WHEN** recovery chooses Tomorrow for a day from Monday through Saturday
- **THEN** a same-week push with explicit source index completes before replacement assignment starts

#### Scenario: Sunday or next-week choice
- **WHEN** recovery chooses Tomorrow on Sunday or Save for Next Week on any day
- **THEN** it respectively requests next-offset Monday movement or explicit-date defer before replacement

#### Scenario: Drop prior assignment
- **WHEN** recovery chooses Drop
- **THEN** it awaits deletion for the captured date before assigning the replacement

### Requirement: Retain completed Planner recovery work across replacement failure

Planner SHALL suppress additional recovery submissions while its handler is pending. Once prior-meal resolution returns, it SHALL remember that completion while recovery remains open. Rejection SHALL request week initialization and show distinct move-failed or replacement-failed feedback. Retrying after remembered resolution SHALL attempt replacement without repeating the prior-meal operation.

#### Scenario: Repeated activation while pending
- **WHEN** the recovery action is activated again before its handler settles
- **THEN** no second recovery submission starts through that mounted handler

#### Scenario: Prior-meal operation fails
- **WHEN** prior-meal resolution rejects before completion is remembered
- **THEN** replacement is not submitted, recovery remains available and refresh plus move-failed feedback are requested

#### Scenario: Replacement fails after prior resolution
- **WHEN** the replacement assignment rejects after prior-meal resolution returned
- **THEN** recovery remains available with refresh and replacement-failed feedback, and retry omits the remembered prior operation

### Requirement: Complete Planner recovery after awaited assignment

After replacement assignment and its store follow-up resolve, Planner SHALL clear recovery and pivot selection, then request selected-week initialization. For a captured week-zero slot whose date is browser-local today, it SHALL also invoke Today's assignment path. These follow-ups SHALL NOT establish a single request or combined-store transaction.

#### Scenario: Replacement is still pending
- **WHEN** the store assignment has not settled
- **THEN** the recovery-success initialization has not started

#### Scenario: Replacement resolves
- **WHEN** replacement and its store follow-up resolve
- **THEN** recovery closes and week initialization is requested after local selection state clears

### Requirement: Preserve caller-specific Search and Browse recovery routes

Search and Browse SHALL enter occupied-slot recovery after their target schedule read returns a normalized recipe. Their recovery SHALL await Tomorrow push, next-offset first-open movement or date deletion, then assign the new recipe. Successful completion SHALL navigate to the captured planner target; Search's Home-target variant SHALL return to Home.

#### Scenario: Search or Browse uses Save for Next Week
- **WHEN** one of these callers resolves an occupied slot with the next-week action
- **THEN** it uses movement to the captured offset plus one, rather than Planner's server-current-week defer operation

#### Scenario: Recovery completes
- **WHEN** the prior operation and replacement resolve
- **THEN** the caller clears pending recovery and navigates to its captured planner success target or Search Home target

### Requirement: Replace a stored assignment at the resolved date

For a supported occupied-date assignment whose persistence succeeds, the selected stored entry SHALL retain its identity/date, receive the chosen recipe ID, become Planned and clear non-cooking metadata. Existing week status SHALL remain unchanged. The accepted protected assignment and UTC-relative date requirements SHALL apply; no expected-recipe precondition is implied.

#### Scenario: Replace an ordinary recipe
- **WHEN** assignment saves against an occupied non-Sunday date
- **THEN** that stored entry contains the chosen recipe in Planned state without separately relocating the old recipe through assignment

#### Scenario: Replace skipped content
- **WHEN** assignment saves against a skipped entry
- **THEN** the selected entry becomes Planned with the chosen recipe and no non-cooking kind or label

### Requirement: Report Sunday carry-forward after replacement follow-ups

When assigning Sunday displaces a stored recipe, assignment SHALL ensure the following week's plan and place that prior recipe on its Monday as Planned. With no Monday entry it SHALL create one. The response SHALL report prior recipe identity/name and destination offset/index under data.displacedRecipe only after all awaited follow-ups complete. Destination collision policy remains qualified outside this draft.

#### Scenario: Following Monday is absent
- **WHEN** Sunday replacement persists with a prior recipe and no next-Monday entry
- **THEN** that prior recipe is added to next Monday and the completed response identifies the destination as next offset and index zero

#### Scenario: Additional follow-up fails
- **WHEN** destination recomputation or publication throws after source persistence and source follow-ups
- **THEN** successful assignment response is not reached without establishing rollback of either saved date

### Requirement: Present Quick Find reads and failed-read retention

Opening Quick Find or changing its week offset SHALL request suggestions for that offset. Initial loading SHALL show Curating your stack and disable selection/advancement. A rejected suggestion read SHALL be logged and end loading without clearing an existing deck or showing dedicated Retry feedback. With no retained recipes the modal SHALL show No recipes found.

#### Scenario: Initial request is pending
- **WHEN** Quick Find opens before its first suggestion request settles
- **THEN** loading feedback appears and selection/advancement are disabled

#### Scenario: Suggestion request rejects
- **WHEN** the current suggestion request rejects
- **THEN** loading ends with any existing deck retained, or the no-recipes view if no deck exists

### Requirement: Reconcile Quick Find after an eligible invalidation signal

After initial fetching completes, Quick Find SHALL refetch when its week's nonzero invalidation version exceeds the last handled version. Only its latest outstanding fetch SHALL update the deck or finish loading. Replacement data SHALL clamp the current index to the new terminal-card boundary. Signal delivery SHALL remain household-live-updates-owned.

#### Scenario: Another week is invalidated
- **WHEN** only another week's invalidation version advances
- **THEN** the open modal does not refetch for that signal

#### Scenario: Newer fetch finishes before an older one
- **WHEN** a newer invalidation fetch applies before an older request resolves
- **THEN** the older result does not replace that applied deck

#### Scenario: Refreshed deck shrinks
- **WHEN** replacement suggestions have fewer recipe cards than the current index
- **THEN** the displayed index is clamped to the new terminal card

### Requirement: Inspect and dismiss the Quick Find deck

A nonterminal recipe card SHALL toggle between name/image/time and description/ingredient views on activation. Quick Find SHALL display one progress indicator per returned recipe plus its terminal card. Close or backdrop activation SHALL dismiss the modal without selecting a recipe through that dismissal. Closing SHALL retire outstanding fetch results for that mount.

#### Scenario: Inspect recipe details
- **WHEN** a person activates a returned recipe card
- **THEN** its description/ingredients view toggles without submitting assignment

#### Scenario: Close before selection
- **WHEN** a person closes Quick Find with a suggestion request still outstanding
- **THEN** the modal dismisses without assignment and that mount's late fetch result is retired

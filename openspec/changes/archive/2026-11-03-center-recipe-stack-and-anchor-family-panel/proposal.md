# Proposal

## Why

The simplified recipe stack now leaves usable vertical room below Ask the Family on a normal phone. The card and panel start together at the top of a result region that already extends to the dock, so the panel reads as floating mid-screen. Alex wants Ask the Family at the bottom and the stack centered vertically when space permits.

## What changes

- Place the existing stack counter and Ask the Family panel at the bottom of the stack result area, directly above the dock's existing clearance, when the content fits.
- Center the current card stack within the remaining area between the toolbar/context and that bottom group. Keep the front/back card geometry, shallow peeks and current panel dimensions, text, style and behavior.
- On short or enlarged layouts, preserve DOM order and let the card, counter and panel scroll into view without clipping, overlaying the dock or shrinking touch targets.

## Capability

- Modify `recipe-library` stack placement. This is layout only: no Search or Explore collection logic, planner target, Discovery voting behavior, recipe detail, API, persistence, localization string or dock change.

## Evidence and limit

The local rendered 390×844 English stack capture at `.task/goto-revision/en-browse-after.png` shows the card at y=78–436 CSS px, a counter and panel below it, and unused space between the panel and dock. `.task/goto-revision/en-after.json` records a 643.5 px stack region starting at y=78. Source places the card, then `StackActionBar`, inside a `flex-1` stack without distribution of the remaining height. Alex's supplied Library PNG `libfile_9c456ae2373c81919ab97c1e1ac11697` could be resolved but its byte transfer returned `download failed`; its metadata describes the card image, not the panel geometry. No claim is made that its pixels were inspected.

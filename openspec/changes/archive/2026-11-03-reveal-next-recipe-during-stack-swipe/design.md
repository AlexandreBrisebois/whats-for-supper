# Design

## Cause and narrow correction

`RecipeStackCard` currently renders up to three backing recipes as absolutely positioned cards with `inset-0`, fixed front-matched outer bounds and `overflow-hidden`. That geometry solved the earlier long-title protrusion. The same correction also attached Tailwind `invisible` to the backing image wrapper and title wrapper. `visibility:hidden` blanks the real recipe throughout the front card's departure animation. The issue is presentation, not ordering, loading or the swipe controller.

Restore the immediate next card's visual content while retaining `aria-hidden` on nonfront content, `tabIndex=-1`, pointer-events protection, absolute bounds and clipping. Keep deeper cards as quiet depth peeks; a rendered mid-swipe check showed that exposing all deep titles crowds the shallow peeks. Constrain the next card's long name to one preview line; when promoted to front it gets its full normal intrinsic title height. Do not make a backing card independently focusable or tappable, add a button row, or change `AnimatePresence` timing. Preserve the existing hero URL/fallback path; an unavailable image must not hide the next card's name or show broken-image alt text.

## Test-first acceptance

Change the existing multi-card browser assertion that currently requires the backing `h2` to be invisible. Run it red against the deployed/current source. Capture a mid-drag frame with two real seeded preview recipes or representative route fixtures: the next image and name must be visually present behind the moving front, with bounded bottom peeks before and during drag. Verify rapid consecutive swipes finish on the correct identity without a blank frame or accidental detail opening. Use a long backing name and loaded/missing hero responses to assert the card remains within front geometry, text remains available when promoted and a missing image does not erase the name. Repeat phone, short screen, tablet, 200% text and reduced motion; keep existing Search cursor and Explore wrap tests. A screenshot/visual check is needed because DOM text alone would have passed while CSS hid it.

## Tradeoff

A backing title can be partially obscured by the front card or clipped to the fixed backing height. That is normal depth treatment. Its complete text is available when promoted to front and in details; increasing backing height to reveal it would reintroduce the protrusion Alex rejected.

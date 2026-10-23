# Design

## Context and Existing Ownership

DiscoveryToggleCard owns presentation shared by recipe detail and StackActionBar. Its fixed thumb moves inside a flex-shrinkable track. Search regular cards have nested padding plus an image bottom margin and flex gap; Browse list already owns the requested compact visual reference. Search state, ranking and interactions stay in their existing owners.

## Decisions and Tradeoffs

Restore the existing locale key and reserve the toggle track width with shrink-0; let the text column wrap with min-w-0 flex-1. Keep the existing dimensions, transitions and handler.

Align Search's existing regular-card markup with Browse's 4:3 image, small corners, content padding, name/time order and mobile grid gap. Do not extract a new shared component: the owners have different interaction and image-source contracts, and this change only needs a small presentation alignment. Keep the Top Pick subtree unchanged.

## First Observable Slice

Run recipe-detail and StackActionBar browser geometry tests against real components and CSS with synthetic mocked API responses, first observing the squeezed track. Assert false/true request values, pressed states, final thumb offsets and containment. Component tests exercise English/French text and loading behavior.

Then test Search at 360/390/430 pixels with Top Pick present and absent, long names and both issue badges. Compare measured layout with Browse and verify detail return without a new search. Retain existing Search state, continuation, recovery, Similar and planner tests. Browser evidence stops at the mocked API boundary; the repository harness supplies its separate API/static checks.

## User Experience

The toggle keeps concise familiar copy in both states; the user guide remains the detailed explanation. Ordinary Search cards prioritize a readable two-line name and time directly below the image. Synthetic screenshot captures wait for entrance opacity to settle; geometry assertions remain the primary regression evidence.

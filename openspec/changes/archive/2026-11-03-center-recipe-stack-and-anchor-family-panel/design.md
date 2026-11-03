# Design

## Current layout and ownership

`RecipesExperience` sizes `browse-all-stack-container` against the actual dock and visual viewport, then renders `browse-results-region` as the scrolling content area. Its `browse-stack-layout` fills the result height but places a front-card wrapper and `StackActionBar` consecutively at the top. `StackActionBar` owns the depth counter and `DiscoveryToggleCard`; it already has the desired surface, text, switch size and behavior. The detail, Explore GET and Search POST controllers are separate and do not need edits.

## Placement decision

Use normal flow within `browse-stack-layout`, not fixed or sticky positioning. Make a card slot consume free vertical space and center the card stack inside that slot. Keep the depth counter immediately above the existing Ask the Family panel; make this group the final normal-flow child so it rests near the result area's bottom edge when height is available. The existing viewport/dock measurement owns the bottom boundary once. Do not add a second safe-area or dock offset, and do not alter `StackActionBar` or `DiscoveryToggleCard` dimensions/behavior.

The card slot must have intrinsic minimum height sufficient for the current front card and shallow backing peeks. If toolbar, planning row, French text, 200% text, keyboard or landscape consumes the free area, allow the stack layout to grow and use the existing result scroller. The card remains before counter/panel in DOM and focus order. Error/retry and loading messages retain their existing positions and reachability; they must not be covered by a bottom overlay. List view remains unchanged.

## Acceptance geometry

In a fitting 390×844 phone and 820×1180 tablet, measure the result region, card, counter, panel and dock. The bottom group's outer edge should align with the usable result bottom within one spacing step (8 CSS px); the panel retains its existing 16 CSS px inset inside that group and remains above the dock; the card's center should be within one spacing step of the center of the area between result top and counter top. Maintain the card's previous width, height and backing peeks within 1 CSS px, apart from subpixel rounding. On 320×568, 390×667, 667×375 and 200% English/French layouts, require full reachability by scrolling, no horizontal overflow or dock overlap, and usable focus/tap targets rather than forced centering. Repeat with Search expanded/hidden, a planner context row, and a visual-viewport reduction; those layout changes must not reset collection or Search session state. Reduced motion retains placement without a required animation.

## Tradeoff

A bottom panel can appear lower than before on tall viewports. This uses otherwise empty space while preserving the panel's established design. On genuinely constrained screens, the panel may require scrolling; pinning it over content would hide the recipe or retry controls, so the normal-flow fallback is intentional.

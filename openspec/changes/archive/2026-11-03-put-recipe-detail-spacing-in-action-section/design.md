# Design

## Ownership correction

`RecipeDetailSheet` has three separate layers: the fixed overlay wrapper (`pb-4` on phone), the rounded max-height sheet, and its inner `overflow-y-auto` content scroller. The previous change increased the scroller's `pb-6` to `pb-8`. The Read button section is the final `border-t ... pt-5` group inside that scroller; the edit Save/Cancel section is a separate final `py-4 mb-5` group. Restore `pb-6` on the scroller and give the final action section 8 CSS px of its own bottom padding, without adding safe-area or dock padding. At a 16 px root, normal read-action last-button-to-panel-edge remains about 32 px: 8 inside actions plus 24 from the scroller. The edit group retains its existing margin and gains the same owner correction, so its total trailing space remains at the previous level rather than growing again.

Add stable action-section test IDs only if needed for the ownership geometry assertion. Keep the existing section backgrounds, borders, button styles and focus order. This is a DOM/CSS correction, not a new fixed footer, split scroll region, or change to the stack-level DiscoveryToggleCard.

## Test-first boundary

Before CSS edits, a real-route Playwright test should scroll the detail to the end and measure the scroller's computed bottom padding, the final action-section bottom padding, and the final control-to-panel edge. It must fail on the deployed 32/0 owner split despite its correct total gap. Then assert a 24/8 split within rendering tolerance and preserved total gap on phone/tablet. For the edit state, account for its existing 20 px bottom margin separately; do not falsely require the same total gap as Read. Existing detail, edit, Discovery toggle and close tests guard behavior. On 320×568, French 200% text and focus-ring navigation, the final controls must remain scrollable into view with no dock overlap or double safe-area clearance.

## Tradeoff

Moving 8 px from the scroller to the action section may look almost identical where both share the same cream background. It corrects the requested ownership and keeps the overall gap, without expanding the sheet or inventing a new visual surface. If Alex intended a visibly distinct action-footer surface, that would be a separate design decision; this proposal preserves the current surface.

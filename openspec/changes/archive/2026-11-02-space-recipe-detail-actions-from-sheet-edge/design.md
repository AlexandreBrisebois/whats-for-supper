# Design

## Owner and change

`RecipeDetailSheet.tsx` has a fixed overlay wrapper with `pb-4` and a max-height panel. Its recipe content is an `overflow-y-auto` scroller with `px-6 pb-6 pt-4`; the Read actions (primary action, Find Similar, Ask the Family) and edit Save/Cancel actions live inside that scroller. Change only its bottom spacing token from `pb-6` to `pb-8`, an 8 CSS px increase at the default 16 px root. The last control then has about 32 px to the panel's visible lower edge when scrolled to the end.

The wrapper's existing bottom gap is outside the panel and already separates a phone sheet from the viewport edge. The sheet overlays the app dock at z130; it does not need a dock-height offset. Do not add `env(safe-area-inset-bottom)` to the inner padding or duplicate safe-area ownership. Browser and installed mobile environments may report different insets; this proposal changes only ordinary content spacing.

## Verification and tradeoff

Add a geometry browser test before editing, using the existing mocked recipe detail route and a final scroll position. It should fail on the current approximately 24 px gap, then pass at the 32 px step within a small rendering tolerance. Repeat on 390×844 phone and 820×1180 tablet; inspect 320×568, French, 200% text and at least one edit state for reachability, focus and no clipping. Run the existing detail functional tests so buttons keep their behavior. An extra 8 px slightly increases content height on short screens; scrolling absorbs it. No API, persistence, stack, Search or Discovery-voting behavior changes.

The user-supplied JPEG transfer failed, so the specific original pixel gap remains unmeasured. Local rendered evidence supports a modest aesthetic adjustment, not a claim of a functional defect.

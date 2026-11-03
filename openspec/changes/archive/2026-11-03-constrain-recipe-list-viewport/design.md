# Design

## Context and Existing Ownership

The proposal bounds this correction to list sizing. `recipe-library` already owns `Use the visible region above the Recipes dock for results`; the delta keeps all four existing scenarios and makes settled list bounds and final-item reachability explicit. Its stack presentation, short-screen usability, pagination and detail contracts remain the preservation boundaries.

`pwa/src/app/(app)/recipes/RecipesExperience.tsx` already measures the actual dock and visual viewport with ResizeObserver plus requestAnimationFrame and assigns the canvas height. The shared `browse-results-region` has `min-h-[16rem]` in both presentations. Its list child is already `flex-1 min-h-0 overflow-y-auto`; its stack child and scroll policy have separate sizing needs. `pwa/src/components/common/Navigation.tsx` owns dock layout and finite CSS transitions. Neither the dock owner nor its measurement needs replacement for the observed defect.

Observed at 393x852 CSS pixels with 32px root text:

| Measurement after reflow | CSS pixels |
| --- | ---: |
| Canvas height and dock top | 637.5 |
| Toolbar / result-region start | 224 |
| Shared result minimum (16rem) | 512 |
| Result-region bottom | 736 |
| List viewport bottom | 720 |
| List viewport beyond dock | 82.5 |

Five local samples still had that 82.5px excess after 716–810ms, with zero mounted stack cards. The canvas clips the oversized child, so this establishes a scrollport extending outside its visible parent, not proof of content painting over the dock. CI run 41706741645, recipes job 126165503093 failed the immediate check on both attempts; its retry trace returned a 42.234375px excess. Local unchanged test repeats were one failure and two passes. Early frames sometimes met the check before dock transitions completed: those passes are not evidence of a correct settled layout.

The affected page, navigation and `unified-recipes.spec.ts` are unchanged from branch-base main `ea9b98cc25bb66b4d6913ad4b1c81dabff1f08a6`; blame assigns this wrapper and check to `6d2b4726a`. The stack-depth fix did not introduce this minimum. CI artifacts are available at https://github.com/AlexandreBrisebois/whats-for-supper/actions/runs/41706741645/artifacts/13267056684. Local diagnostic samples/captures are under `/tmp/wfs-dock-diagnostic/`, with the unchanged test run in `/tmp/wfs-dock-current.log`; these temporary files are not durable regression coverage.

## Decisions and Tradeoffs

1. Make the result wrapper's shrink constraint presentation-specific. In list mode, allow the wrapper and existing inner scroller to shrink through their flex chain to the actual remaining height. Keep the stack's existing minimum, centering, backing depth and intentional overflow behavior. The selected correction uses a shrinkable list minimum and an 8 CSS px bottom gap (the original rem padding would grow to 16px at enlarged text). Prefer this local CSS correction; do not introduce another viewport observer, global dock padding, card-height estimate or breakpoint-specific height table.
2. Preserve a usable vertical-scroll fallback when controls/context exceed the available height. A blanket zero-height list is not acceptable. Retain existing canvas scrolling where needed so a recipe name/activation target and recovery controls remain reachable, without demanding an entire card fit. Exact CSS constraint values are implementation details bounded by both the fitting-controls and too-short-controls acceptance cases; this is not permission to shrink text, targets, images or full names to hide overflow.
3. Reuse the existing measured canvas boundary and content/grid gutters. Moving/resizing the dock or removing stack minimums globally would broaden the change and could regress the stack correction. Extra bottom padding alone would conceal neither the wrong scrollport bounds nor nested clipping.
4. Replace the test's single immediate snapshot with settled-geometry evidence. Wait for fonts, force the enlarged-text layout, wait for relevant finite dock/control transitions (not all background animations), require the existing measured canvas bottom to agree with the dock within 1px rounding, then require stable consecutive frame measurements within the existing 5s assertion timeout. Stable but stale canvas bounds are not observer readiness. Check the same 0–8px gap and no overlap; do not relax the tolerance, disable normal motion to hide the defect, accept the first passing frame, or use an arbitrary sleep as the success condition. Also run reduced motion.
5. Prove last-item access with a final row known to fit the available scrollport: scroll the list itself, inspect its final row bounds and focus/activation, and ensure the canvas did not need an extra compensating scroll. `scrollIntoViewIfNeeded` alone could scroll an ancestor and hide this defect. A separate taller-row example checks readable name/activation access by scrolling without an impossible whole-row-fit assertion.

## First Observable Slice

Through the real `/recipes` route at 393x852, load a selected mock member and a consistent nonempty Explore list, enlarge text from 16px to 32px, wait for the real dock/observer/flex layout to settle, and measure the list/dock bounds. Establish red with the current source, make the minimal list-only constraint correction, and establish green before widening coverage.

The real seam is toolbar and dock reflow → existing canvas measurement → results wrapper → inner list scroller. Only HTTP is doubled using `pwa/e2e/fixtures.ts`, `setupCommonRoutes` and generated DTO-compatible builders in `pwa/e2e/mock-api.ts`. No backend, persistence, generated-client or contract changes are needed to establish this CSS defect. Extend the same slice to two Explore pages (12+12 distinct records), final-item keyboard/detail access, and the existing Search list source and continuation shape. Keep mock additions local and method-sensitive; no mock semantics redesign.

## State, Concurrency and Recovery

Sizing must not reset criteria, filters, loaded identities, position, generation/cursor or current pending/error state. Existing native scroll clamping and ordinary pagination caused by a newly visible sentinel remain valid; do not prohibit all network requests during resize. Assert no collection restart or replacement Search solely from reflow, while allowing legitimate next-page/cursor continuation and deduplicated append. Existing loading, empty and retry controls must remain reachable at constrained height.

## User Experience

Preserve English/French labels, full wrapping names, 48x48 minimum targets, visual/keyboard toolbar order and visible focus. With fitting controls, a list uses the remaining area and its last fitting row clears the dock through list scrolling. With expanded controls on a short screen, intentional vertical scrolling must keep both controls and results usable. Returning to stack retains its existing presentation-change semantics, preferred geometry, full titles, swipe/cancel/detail behavior and family panel; no stack redesign or vote action is added.

## Risks and Deferrable Questions

Removing a shared minimum indiscriminately could collapse results behind tall controls or alter stack geometry; guard both before choosing the smallest local CSS correction. A larger usable list viewport may trigger the existing pagination sentinel sooner, which is expected, but must not duplicate or restart results. The diagnostic used Chromium and CSS root-text enlargement with mocks; actual device keyboard/safe-area changes and browser-level zoom are not established by it. Browser acceptance should disclose emulator/production-build limits. No product-scope question remains open. Implementation results and remaining verification limits are recorded in tasks.md.

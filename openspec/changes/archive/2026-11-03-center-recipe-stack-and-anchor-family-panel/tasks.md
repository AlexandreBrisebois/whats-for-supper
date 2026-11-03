# Tasks

## 1. Prove the current placement gap

- [x] 1.1 Add a real-route Playwright geometry test in the existing mocked Recipes fixture before styling changes. At 390×844 and 820×1180, measure result top/bottom, front card, backing peeks, counter, Ask the Family panel and dock; assert the bottom group's alignment, retained panel inset and the card's center against the remaining card slot. Run red against the current top-packed layout. Keep existing card-size, gesture, Search and Discovery tests.

## 2. Reflow the stack without changing the panel

- [x] 2.1 In `RecipesExperience` only, give the card an intrinsic-height centered slot and let the existing counter/panel group occupy the bottom of the fitting result region in normal flow. Preserve loading/retry controls, Explore GET and Search POST state, card geometry, DOM/focus order and the existing `StackActionBar`/`DiscoveryToggleCard` dimensions, content and behavior. Run the focused geometry test green; verify the component/controller unit suites still pass.

## 3. Accept responsive and state boundaries

- [x] 3.1 Run browser acceptance on 390×844, 320×568, 390×667, 667×375, 820×1180 and 1180×820 in English/French and 200% text where relevant. Cover safe-area emulation, visual-viewport/keyboard reduction, reduced motion, Search expanded/hidden, planner context, list-to-stack, failure/retry and horizontal overflow. At fitting sizes assert the bottom group's outer edge aligns within 8 CSS px, the panel retains its existing 16 CSS px inner inset, and card centering is within 8 CSS px; at constrained sizes assert scroll reachability and no dock overlap, not forced centering. Verify tap-to-detail, swipe and Discovery toggle remain functional without visible control changes. Inspect local rendered phone/tablet screenshots; record physical-device and user-screenshot limits honestly.

## 4. Review and verify scope

- [x] 4.1 Review the change-owned diff for layout-only edits, run strict OpenSpec validation, `task prepare`, `task verify:plan` and `task verify` on the complete changed-path set under the repository harness. Record actual results, content identity and verification record. Refresh only `wfs-unify-preview` after acceptance, preserving its data and bindings. Do not commit, push, sync or archive this new proposal without a later request.

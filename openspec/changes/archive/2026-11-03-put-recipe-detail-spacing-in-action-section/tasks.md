# Tasks

## 1. Assert the requested padding owner before editing

- [x] 1.1 Extend the existing mocked detail-route Playwright geometry test to measure computed scroller and final Read/Edit action-section bottom padding separately, plus the last control-to-panel edge gap on 390×844 and 820×1180. Expect 24/8 CSS px on the Read path and preserved overall 32 px. Run red on the deployed 32/0 split; retain the existing detail functional coverage.

## 2. Move only the ordinary spacing increment

- [x] 2.1 Restore `RecipeDetailSheet` inner scroller `pb-6` and place the 8 CSS px increment on the final Read and Edit button sections. Keep edit margin, borders, surfaces, button sizes, labels and action behavior. Do not change the outer sheet, safe-area/dock clearance, stack Ask the Family panel or Discovery toggle. Run the focused owner/geometry test green and affected component/controller tests.

## 3. Accept constrained layout and verify scope

- [x] 3.1 Inspect rendered ends and run browser acceptance on phone/tablet, 320×568, French and 200% text, including edit state and keyboard focus. Confirm final controls and focus rings scroll clear of the panel edge, no overlap/double safe-area gap, and Cook/Find Similar/Ask the Family/Save/Cancel remain functional. Record physical-device and user-screenshot limits honestly.
- [x] 3.2 Review the small change-owned diff, run strict OpenSpec validation, scoped `task prepare`, `task verify:plan` and `task verify` with content identity and record path. Refresh only the isolated `wfs-unify-preview` after acceptance. Do not commit, push, sync or archive this proposal without a later request.

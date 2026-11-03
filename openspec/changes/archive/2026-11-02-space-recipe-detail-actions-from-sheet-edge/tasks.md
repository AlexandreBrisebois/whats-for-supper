# Tasks

## 1. Test the measured footer gap before editing

- [x] 1.1 Add a focused Playwright geometry assertion through the existing mocked recipe-detail route: scroll to the end and measure last action-to-panel edge on 390×844 phone and 820×1180 tablet. Assert the 32 px spacing step within a small tolerance, that the action is fully visible and that the panel retains its current viewport placement. Run it before editing and record the intended 24-to-32 px red failure; keep the existing detail functional tests intact.

## 2. Apply the single spacing-token correction

- [x] 2.1 Increase only the detail content scroller's ordinary bottom padding token from `pb-6` to `pb-8`. Leave the outer wrapper, safe-area handling, dock, buttons and DiscoveryToggleCard unchanged. Rerun the focused geometry test green and the existing `RecipeDetailSheet` unit/browser behavior tests.
- [x] 2.2 Render and inspect the scrolled end at phone/tablet, 320×568 short phone, French, 200% text and an edit state. Verify last-action and focus-ring reachability, no double bottom clearance, no clipping, and no behavior or focus-order change. Record actual geometry, screenshots and any physical-device limit.

## 3. Verify scope

- [x] 3.1 Review the small change-owned diff, run strict OpenSpec validation, scoped preparation/plan and applicable repository verification on stable content. Record commands, results, content identity and verification record. Refresh only the isolated local preview under the standing authorization after acceptance passes. Do not commit, push, sync, archive or change production.

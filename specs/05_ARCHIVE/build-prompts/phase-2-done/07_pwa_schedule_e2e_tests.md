# Prompt 07: Playwright E2E Tests for Planner (TDD)

**Context:** The Weekly Planner UI (Phase 2) has been implemented in the PWA, including the integration with Discovery Matches. We now need robust Playwright End-to-End tests to ensure the scheduling and interactions work reliably.

**Goal:** Implement comprehensive E2E tests for the Planner and Discovery-to-Planner transition.

**Instructions:**

1. **Test Environment Set-up:**
   - The CI pipeline uses the stateful `pwa/mock-api.js`. Update it to handle the full Schedule and Discovery-Voting state.
   - Ensure the mock API can simulate "Matched" recipes (recipes that have enough positive votes to appear in the planner selection drawer).

2. **Test Cases (pwa/e2e/planner.spec.ts):**
   - **Sparse Logic Verification:** Verify that if the mock data does *not* contain a Breakfast slot, the Breakfast section is physically absent from the UI.
   - **Scheduling a Match:** 
     - Open the "Plan from Matches" drawer.
     - Select a recipe.
     - Assign it to the Supper slot.
     - Verify that the UI updates locally and the item now appears in the list.
   - **Day Scrubber Navigation:** Click a future day in the horizontal Date Scrubber and verify that the view shifts to that day (and shows the correct schedule or an empty state).
   - **Cross-Slot Swapping:** (Bonus) If implemented, verify that dragging/moving a recipe from one day to another updates the API and local view.

3. **Constraints:**
   - Use user-facing ARIA labels, roles, and text for selectors.
   - Avoid `data-testid` unless necessary for complex Framer Motion elements.

4. **Verification:**
   - Run `npm run test:e2e` inside `pwa/` locally.
   - Ensure all tests pass and that they reflect the "Solar Earth" aesthetic and sparse list behavior.

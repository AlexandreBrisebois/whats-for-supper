# Phase 2: Playwright E2E Tests for Planner

**Context:** The Weekly Planner UI (Phase 2) has been implemented in the PWA. We now need robust Playwright End-to-End tests to ensure the scheduling and interactions work reliably against our CI environment.

**Constraints:**
- The CI pipeline uses the stateful `pwa/mock-api.js` instead of the full .NET backend to ensure fast, deterministic tests without database flakiness.
- All new tests should live in the `pwa/e2e` directory.
- Avoid using `data-testid` attributes unless absolutely necessary; prefer targeting user-facing ARIA labels, roles, and text.

**Instructions:**
1. Update the stateful `pwa/mock-api.js` server to handle the new endpoints:
   - Handle `GET /api/schedule` by returning mock schedule entries.
   - Handle `PATCH /api/schedule` (or the equivalent mutation endpoint) to update the in-memory state so subsequent requests reflect the new layout.
2. Create a new test file: `pwa/e2e/planner.spec.ts`.
3. Implement the following test cases:
   - **Sparse Logic Verification:** Verify that if the mock data does *not* contain a Breakfast slot, the Breakfast section is physically absent from the UI.
   - **Scheduling a Meal:** Simulate a user selecting an unscheduled recipe and adding it to the Supper slot for the current day. Verify that the UI updates locally and the item now appears in the list.
   - **Day Scrubber Navigation:** Click a future day in the horizontal Date Scrubber and verify that the view shifts to that day (and shows the correct schedule).
4. Run `npm run test:e2e` inside `pwa/` locally to ensure the new tests pass and do not break the existing onboarding and capture paths.

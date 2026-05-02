# Prompt 06: PWA Weekly Dashboard UI (TDD)

**Context:** The API Schedule endpoints are ready. Now we need to implement the UI for Phase 2: the Weekly Dashboard (Planner page), integrating the "Matches" that the family has agreed upon via Discovery.

**Goal:** Implement the Weekly Planner and recipe selection from "Matches".

**Instructions:**

1. **Test First (TDD):**
   - Update `pwa/mock-api.js` to support schedule endpoints and a "Matches" endpoint if needed (or include them in the discovery mock).
   - Create Playwright tests in `pwa/e2e/planner.spec.ts`:
     - Verify the "Day Scrubber" (Calendar strip) navigates correctly.
     - Verify that a user can select a "Match" and assign it to a meal slot.
     - Verify that empty slots (except Supper) are hidden but expandable.

2. **API Client & Matching Hook:**
   - Create `pwa/src/lib/api/schedule.ts`.
   - Create a hook `useMatches` that fetches recipes with sufficient family votes to be considered "plannable".

3. **Planner UI Implementation:**
   - Implement "Day Scrubber" component.
   - Update `pwa/src/app/(app)/planner/page.tsx`:
     - Render the 3-meal vertical list for the selected day.
     - Logic: Supper always visible. Breakfast/Lunch visible only if they have entries.
     - Add a "Plan from Matches" button that opens a drawer/modal showing matched recipes.

4. **Planning Interaction:**
   - When a "Match" is selected, call `PUT /api/schedule` to persist the assignment.
   - Ensure the UI updates instantly (optimistic update or simple re-fetch).

5. **Verification:**
   - Run `npm run test:e2e` and verify the "Solar Earth" design system tokens are respected.
 Joseph

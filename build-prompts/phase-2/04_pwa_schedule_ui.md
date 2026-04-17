# Phase 2: PWA Weekly Dashboard UI

**Context:** The API Schedule endpoints are ready. Now we need to implement the UI for Phase 2: the Weekly Dashboard (Planner page).

**Constraints:**
- Adhere strictly to the "Solar Earth" design system defined in `specs/recipe-pwa.spec.md` and `tailwind.config.ts`.
- The interactions should match the spec: 3-meal support but sparse logic (Breakfast/Lunch hidden by default unless they have recipes), plus a horizontal "Day Scrubber" at the top.

**Instructions:**
1. Create frontend API integration in `pwa/src/lib/api/schedule.ts` mapped to the new endpoints.
2. Implement the "Day Scrubber" (Calendar strip) component.
3. Update `pwa/src/app/(app)/planner/page.tsx` to render the 3-meal vertical list.
4. Implement the sparse-list logic: If Breakfast is empty, hide the Breakfast slot section. Only Supper is always visible.
5. Create a clean drag-and-drop or simple modal interface to swap recipes between days/slots.
6. Run `npm run test:e2e` inside `pwa/` (using Mock API changes) to ensure no regressions occur on existing flows. Ensure `task review` passes clean locally.

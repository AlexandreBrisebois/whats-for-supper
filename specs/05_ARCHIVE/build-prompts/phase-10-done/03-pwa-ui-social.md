# Prompt 03: PWA UI — Social Coordination & Pivot Sheet

**Persona**: Sr. Frontend Engineer (Next.js / Framer Motion / Zustand).

**Context**:
Bring the "Ask the Family" and "Planning Pivot" features to life. Decommission legacy Phase 2 components.

**TARGET FILES**:
- `pwa/src/app/(app)/planner/page.tsx`
- `pwa/src/components/planner/PlanningPivotSheet.tsx`
- `pwa/src/store/plannerStore.ts`
- `pwa/src/lib/api/planner.ts`
- `pwa/src/components/home/QuickFixChips.tsx` [DELETE]

**FORBIDDEN**:
- Do not modify `CooksMode.tsx` yet.
- Do not touch `GroceryList.tsx` yet.

**DECOMMISSIONING (CRITICAL)**:
- **Delete `QuickFixChips.tsx`**: These are now obsolete and replaced by the Phase 10 `QuickFindModal`.
- **Explicit Status Logic**: Remove any implicit frontend-only "week status" calculations. All status logic must now rely on the `WeeklyPlan.status` field from the API.

**TECHNICAL SKELETON**:

1.  **Zustand (plannerStore.ts)**:
    - Add `isVotingOpen: boolean`.
    - Add `isLocked: boolean`.
2.  **Pivot Sheet**:
    - Add **[Nudge Family]** button (only visible if `isVotingOpen`).
    - Use `navigator.share` for the nudge: `text: "Vote for supper! {URL}"`.
    - Add **[🗑️ Remove Recipe]** button (triggers `DELETE /api/schedule/day/{date}/remove`).
3.  **Planner Page**:
    - Show "Ask the Family" CTA if `!isVotingOpen && !isLocked`.
    - Implement the "Success Ring" animation when a recipe is un-assigned.
    - **Polling**: Every 30 seconds (when not locked), call `updateVoteCounts()` to refresh badges and auto-fill consensus slots.

**TDD PROTOCOL**:
- Implement Playwright test in `pwa/e2e/planner-social.spec.ts`:
    - "Verify Nudge Family button triggers Web Share".
    - "Verify Remove action updates grid immediately".

**VERIFICATION**:
- `npm run dev` (PWA)
- `npx playwright test pwa/e2e/planner-social.spec.ts`

**MICRO-HANDOVER**:
- Confirm Web Share API integration.
- Confirm removal of legacy "Quick Fix" logic.
- Confirm Pivot Sheet button layout (Thumb-zone priority).

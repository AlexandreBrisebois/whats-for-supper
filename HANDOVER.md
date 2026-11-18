# Handover

## Active OpenSpec Change — Align Family Cookbook Mission and Voice

- **Task/spec**: `openspec/changes/align-family-cookbook-mission-and-voice/` (`proposal.md`, `design.md`, `tasks.md`).
- **Worktree/branch**: `/Users/alex/Code/whats-for-supper`, branch `recipe-view-redesign`.
- **Authorized scope and source**: Retire `"Solar Earth"` nomenclature in favor of **`Shared Table`** while preserving the **contemporary family cookbook** visual aesthetic across `.agents/`, `docs/`, and capability specs; align brand naming (`What's for Supper?`) and household voice copy; advertise the `Vote Together` (`/discovery`) PWA shortcut.
- **Current checkpoint**:
  - Group 1 (1.1–1.3) documentation and harness terminology updates complete.
  - Task 2.1 failing unit and E2E test assertions updated (`pwa/src/app/(auth)/welcome/page.test.tsx`, `pwa/src/components/identity/DemoContext.test.tsx`, `pwa/src/components/capture/MinimalCapture.test.tsx`, `pwa/e2e/install-identity.spec.ts`, `pwa/e2e/welcome-demo.spec.ts`).
  - Fixed a cold-start target-scan cancellation race in `pwa/src/app/(app)/recipes/RecipesExperience.tsx` (waiting for `visibleTargetDate` before subscribing to ingredient-projection invalidation so `week_updated` SSE hints during recipe edits cannot abort the in-flight `findFirstOpenPlannerSlot` scan) and synchronized initial projection readiness in `pwa/e2e/cooking-step-scaling-live.spec.ts` and `pwa/e2e/cooking-fraction.ts`.
- **Verification evidence and content identity**: Pending completion of tasks 2.2–4.1 and `task verify`.
- **Blocker or next action**: Implement task 2.2 (PWA copy and locale updates), tasks 3.1–3.2 (`Vote Together` shortcut in `baseManifest.json`), and task 4.1 (`task prepare` and `task verify`).

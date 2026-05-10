# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Recipe Management — Reimport Logic (Ready to Start)**
   - The UI for reimporting a recipe is implemented in `ActionGearMenu.tsx` but the backend logic and `reimportRecipe` API function need full verification.
   - **Action Item**: Verify the `POST /api/recipes/{id}/import` endpoint logic and ensure it correctly handles URL-based vs. Photo-based re-acquisition.

2. **SSE Workflow — URL Capture & Social Coordination (Ready to Start)**
   - Three E2E tests are skipped with `// TODO: revisit when SSE ...` comments that mark the integration points:
     - `capture-flow.spec.ts` → "failed URL capture shows error message".
     - `home-goto.spec.ts` → "Page reload after Make This Tonight".
     - `planner-social.spec.ts` → "Verify Nudge Family button triggers Web Share".
   - ADR 035 defines the canonical E2E route-handler pattern to follow when writing SSE mock handlers.

## Recently Completed

- **Recipe Hero Actions (2026-05-10):** Integrated Camera and Regenerate actions into `RecipeDetailSheet` hero. Implemented global `ToastContainer` (ADR 042) for UI feedback. Verified with `e2e/recipe-hero-actions.spec.ts`.
- **Recipe Gear Menu (2026-05-10):** Refactored recipe detail to include a gear menu for secondary actions (Move to Bin, Reimport). Updated `Recipe` model to include `sourceType`, `canReimport`, and `imageCount`.

## Standing Notes

- **Global Toast Pattern (ADR 042).** Use `addToast` from `useUiStore` for user action feedback.
- **Playwright Mock Layering (ADR 040).** Use `route.fallback()` instead of `route.continue()` for test-specific overrides.
- **E2E Route Handler Pattern (ADR 035).** Use `new URL(route.request().url())` inside handler bodies.
- **Zero Drift Doctrine.** `task gate` must pass before ending any session.

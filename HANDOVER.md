# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Execute Phase 13 — Phase F (AI Wiring & E2E Hardening).** Spec at `.kiro/specs/phase-13-goto-synthesis.md`. Phases A–E are complete. Start at F1: wire `SynthesizeRecipeProcessor` to `IChatClient` (Gemini). Follow `RecipeAgent.DoExtractRecipeAsync` pattern exactly — text prompt instead of images, same `recipe.json`/`recipe.info` disk format.

2. **E2E tests F4–F9 are unwritten.** After F1–F2 (AI wiring + processor tests), write the six E2E tests covering: describe-it creates pending GOTO, pending state shows spinner in settings, ready GOTO enables Confirm GOTO on home, pending GOTO disables Confirm GOTO, capture path sets pending, full suite green.

3. **`confirm-goto-btn` is now always rendered, disabled when not ready.** Changed from conditional render to `disabled={!gotoReady}` — fixes the E2E test that asserted `toBeDisabled()` when no GOTO is configured. Existing tests that assert `toBeVisible()` on the button when GOTO is ready are unaffected.

4. **`SmartPivotCard` cleanup (deferred).** Component still exists in `HomeSections.tsx`, no longer rendered. Remove in a future cleanup pass.

5. **E2E SSR constraint (standing).** See ADR 032 and `.kiro/steering.md` §6. Home page state must be reached through UI actions, not schedule mocks.

## Standing Notes

- **`saveSetting` Kiota serialization fix is live.** Value passed via `additionalData`. `family_settings` table must exist — run `task down && task up` if container predates Phase 12.
- **Phase 13 Phase F remains.** F1 = AI wiring (requires live Gemini key). F4–F9 = E2E tests. F10 = `task review` clean.

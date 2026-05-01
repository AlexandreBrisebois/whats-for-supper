# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Phase 14 is complete — ready to commit.** All six issues addressed. `task review` exits clean. 17/17 E2E pass. Commit message suggestion: `feat: phase-14 ux hardening — cook's mode steps, done=cooked, close voting, plan next week transition, stale SSR fix`.

2. **Phase 13 F3 smoke test still pending.** `SynthesizeRecipeProcessor` is wired to Gemini. Run manually: describe "Our family spaghetti with homemade sauce" → confirm `status` flips to `'ready'` after ~30s.

3. **`SmartPivotCard` cleanup (deferred).** Component still exists in `HomeSections.tsx`, no longer rendered. Remove in a future cleanup pass.

4. **E2E SSR constraint (standing).** See ADR 032 and `.kiro/steering.md` §6. Home page state must be reached through UI actions, not schedule mocks.

## Standing Notes

- **Discovery ordering is live.** `DiscoveryService` orders by `VoteCount DESC`, then `LastCookedDate ASC NULLS FIRST`.
- **Gemini 400 fix is live.** `SynthesizeRecipeProcessor` no longer sends `num_ctx`.
- **ESLint ignores `src/lib/api/generated/**`.** Kiota warnings suppressed.
- **`saveSetting` Kiota serialization fix is live.** Value passed via `additionalData`.

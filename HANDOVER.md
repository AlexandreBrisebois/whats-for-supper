# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Execute Phase 13 — Phase D (PWA: Settings "Change" Sheet).** Spec at `.kiro/specs/phase-13-goto-synthesis.md`. Tasks D1–D3 remain (D4 and D5 are already done this session). The `TonightPivotCard` GOTO status gate and `gotoStatus` prop are live. Start at D1: replace the "Pick from library" button in `FamilyGOTOSettings.tsx` with the "Change" bottom sheet.

2. **`TonightPivotCard` action layout is now conditional on GOTO state.** No GOTO → only Quick Find + Order In. GOTO pending → same two buttons, "being prepared" message. GOTO ready → Confirm GOTO prominently + Quick Find + Order In in 2-col grid. Backward compat: existing values without `status` treated as ready.

3. **"Preparing recipe…" on home card is a pre-existing data issue.** One recipe in the live DB has `name = null` because its `recipe-import` workflow's `SyncRecipe` step failed. Fix: `POST /api/recipes/imports/bulk`. Operational, not a code bug.

4. **`SmartPivotCard` cleanup (deferred).** Component still exists in `HomeSections.tsx`, no longer rendered. Remove in a future cleanup pass.

5. **E2E SSR constraint (standing).** See ADR 032 and `.kiro/steering.md` §6. Home page state must be reached through UI actions, not schedule mocks.

## Completed (This Session)

- ✅ **Phase 13 — Phase A (Contract)**: Two new endpoints in OpenAPI, Kiota regenerated, E2E mocks wired. Zero drift.
- ✅ **Phase 13 — Phase B (Backend Stub Creation)**: DTOs, service methods, controller actions, 5 integration tests. 134/134 pass.
- ✅ **Phase 13 — Phase C (Workflow Plumbing)**: `goto-synthesis.yaml`, `SynthesizeRecipeProcessor` stub, `MarkGotoReadyProcessor` (no-op safe), workflow trigger wired, `recipe-import.yaml` updated. 138/138 pass. Perfect parity (43/43).
- ✅ **Phase 13 — Phase D4 + TonightPivotCard UX (partial D)**: `HomeCommandCenter` now gates GOTO on `status === 'ready'`. `TonightPivotCard` shows only Quick Find + Order In when no GOTO is configured; adds Confirm GOTO when ready. `gotoStatus` prop added. Zero type errors.

## Standing Notes

- **`saveSetting` Kiota serialization fix is live.** Value passed via `additionalData`. `family_settings` table must exist — run `task down && task up` if container predates Phase 12.
- **Phase 13 Phases D1–D3, E, F remain.** D1–D3 = "Change" bottom sheet in `FamilyGOTOSettings`. E = Capture intent wiring. F = AI wiring (requires live Gemini key).

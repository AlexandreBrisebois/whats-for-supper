# Agent Handover Journal (Active)

This file tracks the real-time execution state for **Active Tasks only**. Refer to [JOURNAL.md](JOURNAL.md) for historical archives.

## Next Session Entry Points

1. **Phase 12 is complete.** The next feature is Phase 13 — Recipe Agent (AI synthesis). The GOTO setting stores `{ description, recipeId }`. `SettingsService.SynthesizeRecipeAsync` is scaffolded as a stub in `api/src/RecipeApi/Services/SettingsService.cs`. Wire it to the AI agent to generate a real `RecipeDto` from the description and store it in the library.

2. **SmartPivotCard cleanup**: `SmartPivotCard` is no longer rendered in `HomeCommandCenter` but the component still exists in `pwa/src/components/home/HomeSections.tsx`. Remove it in a future cleanup pass (noted in phase-12 spec).

3. **Roadmap — 15 Min Fix / Pantry Pasta buttons**: These chips were on `SmartPivotCard` which is now replaced by `TonightPivotCard`. The roadmap items are deferred — no action needed now.

4. **E2E SSR constraint (standing)**: See ADR 032 and `.kiro/steering.md` §6. Any home page E2E test that needs a specific state (no recipe, cooked, skipped) must reach it through UI actions, not schedule mocks. The settings endpoint IS mockable client-side.

## Completed (Recently)

- ✅ **Phase 12 — No-Menu Home State ("Tonight Pivot")**: All four phases complete, `task review` green.
